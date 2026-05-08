import {
    parseSafe,
    ParseError,
    resolveAtScope,
    type PreferenceState,
    type Property,
    type PropertyKey,
    type Schema,
    type Scope,
    type Values,
    type Warning
} from '@nimbox/preferences';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ChangeHandler, RefCallback, RegisterElement } from '../types';


export interface UseEditorCommitError {
    type: 'commit';
    message: string;
}

export type ParseErrorLike = ParseError | UseEditorCommitError;

export interface UseEditorDraftEntry {
    value: string;
    error: ParseErrorLike | null;
}

export type UseEditorDrafts = Record<Scope, Record<PropertyKey, UseEditorDraftEntry>>;

export interface UseEditorProps {

    schema: Schema;

    scope: Scope;
    scopes: ReadonlyArray<Scope>;

    values: Values;

    onChange: (scope: Scope, key: PropertyKey, value: unknown) => Promise<void>;

}

export interface UseEditorRegisterResult {

    ref: RefCallback;

    name: string;

    onChange: ChangeHandler;
    onBlur: ChangeHandler;

}

export interface UseEditorRegisterOptions {
    mode: 'change' | 'blur';
}

export interface UseEditorResult {

    state: Record<PropertyKey, PreferenceState>;
    warnings: Warning[];

    drafts: UseEditorDrafts;

    register: (key: PropertyKey, options: UseEditorRegisterOptions) => UseEditorRegisterResult;
    reset: (key: PropertyKey) => void;

}


export function useEditor(props: UseEditorProps): UseEditorResult {

    const { schema, scope, scopes, values, onChange } = props;
    const [drafts, setDrafts] = useState<UseEditorDrafts>({});

    const { state, warnings } = useMemo(() => {
        return resolveAtScope(scope, scopes, schema, values);
    }, [scope, scopes, schema, values]);

    return {
        state,
        warnings,
        drafts,
        register: (key: PropertyKey, options: UseEditorRegisterOptions) => {
            return {
                name: key,
                ref: (instance) => {

                    if (!instance) {
                        return;
                    }

                    const draftValue = drafts[scope]?.[key]?.value;
                    const value = draftValue ?? state[key]?.value;
                    if (instance.type === 'checkbox') {
                        (instance as HTMLInputElement).checked = toInputChecked(value);
                        return;
                    }

                    instance.value = toInputValue(value);

                },
                onChange: (event) => {
                    if (options.mode !== 'change') {
                        return;
                    }
                    void commitOnEvent({
                        event,
                        key,
                        scope,
                        property: schema[key],
                        onChange,
                        setDrafts
                    });
                },
                onBlur: (event) => {
                    if (options.mode !== 'blur') {
                        return;
                    }
                    void commitOnEvent({
                        event,
                        key,
                        scope,
                        property: schema[key],
                        onChange,
                        setDrafts
                    });
                }
            };
        },
        reset: (key: PropertyKey) => {
            setDrafts((currentDrafts) => clearDraftEntry(currentDrafts, scope, key));
        }
    };

}

// Utils

function toInputChecked(value: unknown): boolean {

    if (typeof value === 'string') {
        return value === 'true';
    }

    return Boolean(value);

}

function toInputValue(value: unknown): string {

    if (value === undefined || value === null) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value);

}

async function commitOnEvent(params: {
    event: { target: RegisterElement };
    key: PropertyKey;
    scope: Scope;
    property: Property | undefined;
    onChange: (scope: Scope, key: PropertyKey, value: unknown) => Promise<void>;
    setDrafts: Dispatch<SetStateAction<UseEditorDrafts>>;
}): Promise<void> {

    const { event, key, scope, property, onChange, setDrafts } = params;
    const rawDraftValue = isCheckboxInput(event.target)
        ? String(event.target.checked)
        : String(event.target.value ?? '');
    const rawInputValue: unknown = isCheckboxInput(event.target)
        ? event.target.checked
        : event.target.value;

    if (property) {
        const result = parseSafe(property, rawInputValue);
        if (!result.success) {
            setDrafts((currentDrafts) => setDraftEntry(currentDrafts, scope, key, {
                value: rawDraftValue,
                error: result.error
            }));
            return;
        }

        try {
            await onChange(scope, key, result.data);
            setDrafts((currentDrafts) => clearDraftEntry(currentDrafts, scope, key));
        } catch (error) {
            setDrafts((currentDrafts) => setDraftEntry(currentDrafts, scope, key, {
                value: rawDraftValue,
                error: createCommitError(error)
            }));
        }
        return;
    }

    try {
        await onChange(scope, key, rawInputValue);
        setDrafts((currentDrafts) => clearDraftEntry(currentDrafts, scope, key));
    } catch (error) {
        setDrafts((currentDrafts) => setDraftEntry(currentDrafts, scope, key, {
            value: rawDraftValue,
            error: createCommitError(error)
        }));
    }

}

function isCheckboxInput(target: RegisterElement): target is HTMLInputElement {
    return target instanceof HTMLInputElement && target.type === 'checkbox';
}

function createCommitError(error: unknown): UseEditorCommitError {

    const message = error instanceof Error
        ? error.message
        : 'Failed to save preference';

    return {
        type: 'commit',
        message
    };

}

function setDraftEntry(
    currentDrafts: UseEditorDrafts,
    scope: Scope,
    key: PropertyKey,
    entry: UseEditorDraftEntry
): UseEditorDrafts {

    return {
        ...currentDrafts,
        [scope]: {
            ...(currentDrafts[scope] ?? {}),
            [key]: entry
        }
    };

}

function clearDraftEntry(
    currentDrafts: UseEditorDrafts,
    scope: Scope,
    key: PropertyKey
): UseEditorDrafts {

    const scopeDrafts = currentDrafts[scope];
    if (!scopeDrafts || !(key in scopeDrafts)) {
        return currentDrafts;
    }

    const nextScopeDrafts = { ...scopeDrafts };
    delete nextScopeDrafts[key];

    if (Object.keys(nextScopeDrafts).length === 0) {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[scope];
        return nextDrafts;
    }

    return {
        ...currentDrafts,
        [scope]: nextScopeDrafts
    };

}
