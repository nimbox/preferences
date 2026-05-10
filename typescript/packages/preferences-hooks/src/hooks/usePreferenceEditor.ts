import { ParseError, parseSafe, resolveAtScope, type Diagnostic, type PreferenceState, type Property, type PropertyKey, type Schema, type Scope, type Values } from '@nimbox/preferences';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import type { ChangeHandler, RefCallback, RegisterElement } from '../types';


export interface UsePreferenceEditorCommitError {
    type: 'commit';
    message: string;
}

export type ParseErrorLike = ParseError | UsePreferenceEditorCommitError;

export interface UsePreferenceEditorDraftEntry {
    value: string;
    error: ParseErrorLike | null;
}

export type UsePreferenceEditorDrafts = Record<Scope, Record<PropertyKey, UsePreferenceEditorDraftEntry>>;

export interface UsePreferenceEditorProps {

    scope: Scope;
    scopes: ReadonlyArray<Scope>;

    schema: Schema;
    values: Values;

    onChange: (scope: Scope, key: PropertyKey, value: unknown) => Promise<void>;

}

export interface UsePreferenceEditorRegisterResult {

    ref: RefCallback;

    name: string;

    onChange: ChangeHandler;
    onBlur: ChangeHandler;

}

export interface UsePreferenceEditorRegisterOptions {
    mode: 'change' | 'blur';
}

export interface UsePreferenceEditorResult {

    state: Record<PropertyKey, PreferenceState>;
    diagnostics: Diagnostic[];

    drafts: UsePreferenceEditorDrafts;

    register: (key: PropertyKey, options: UsePreferenceEditorRegisterOptions) => UsePreferenceEditorRegisterResult;
    reset: (key: PropertyKey) => void;

}


export function usePreferenceEditor(props: UsePreferenceEditorProps): UsePreferenceEditorResult {

    const { schema, scope, scopes, values, onChange } = props;
    const [drafts, setDrafts] = useState<UsePreferenceEditorDrafts>({});

    const { state, diagnostics } = useMemo(() => {
        return resolveAtScope(scope, scopes, schema, values);
    }, [scope, scopes, schema, values]);

    return {
        state,
        diagnostics,
        drafts,
        register: (key: PropertyKey, options: UsePreferenceEditorRegisterOptions) => {
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
                    return;

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

    return JSON.stringify(value, null, 2);

}

async function commitOnEvent(params: {
    event: { target: RegisterElement };
    key: PropertyKey;
    scope: Scope;
    property: Property | undefined;
    onChange: (scope: Scope, key: PropertyKey, value: unknown) => Promise<void>;
    setDrafts: Dispatch<SetStateAction<UsePreferenceEditorDrafts>>;
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

function createCommitError(error: unknown): UsePreferenceEditorCommitError {

    const message = error instanceof Error
        ? error.message
        : 'Failed to save preference';

    return {
        type: 'commit',
        message
    };

}

function setDraftEntry(
    currentDrafts: UsePreferenceEditorDrafts,
    scope: Scope,
    key: PropertyKey,
    entry: UsePreferenceEditorDraftEntry
): UsePreferenceEditorDrafts {

    return {
        ...currentDrafts,
        [scope]: {
            ...(currentDrafts[scope] ?? {}),
            [key]: entry
        }
    };

}

function clearDraftEntry(
    currentDrafts: UsePreferenceEditorDrafts,
    scope: Scope,
    key: PropertyKey
): UsePreferenceEditorDrafts {

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
