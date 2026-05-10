import { parseSafe, resolveAtScope, type Diagnostic, type ParseIssue, type PreferenceState, type Property, type PropertyKey, type Schema, type Scope, type Values } from '@nimbox/preferences';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeHandler, RegisterElement } from '../types';


export type EditorError =
    | { kind: 'parse'; issues: ParseIssue[]; message: string; rawValue: string }
    | { kind: 'commit'; message: string; rawValue: string };


export type EditorErrors = Record<Scope, Record<PropertyKey, EditorError>>;


export interface UsePreferenceEditorProps {

    scope: Scope;
    scopes: ReadonlyArray<Scope>;

    schema: Schema;
    values: Values;

    onChange: (scope: Scope, key: PropertyKey, value: unknown) => Promise<void>;

}


export interface UsePreferenceEditorRegisterResult {

    name: PropertyKey;

    defaultValue: string;
    defaultChecked: boolean;

    onChange: ChangeHandler;
    onBlur: ChangeHandler;

}


export interface UsePreferenceEditorResult {

    state: Record<PropertyKey, PreferenceState>;
    diagnostics: Diagnostic[];

    errors: EditorErrors;

    register: (key: PropertyKey) => UsePreferenceEditorRegisterResult;
    reset: (key: PropertyKey) => void;

}


interface EditorConfig {
    scope: Scope;
    scopes: ReadonlyArray<Scope>;
    schema: Schema;
    values: Values;
    onChange: (scope: Scope, key: PropertyKey, value: unknown) => Promise<void>;
}


export function usePreferenceEditor(props: UsePreferenceEditorProps): UsePreferenceEditorResult {

    const { schema, scope, scopes, values, onChange } = props;

    const [errors, setErrors] = useState<EditorErrors>({});

    // Latest config snapshot, read by event handlers at commit time so
    // async commits never write to a stale scope and so `register` can
    // remain stable across renders.
    const configRef = useRef<EditorConfig>({ scope, scopes, schema, values, onChange });
    useEffect(() => {
        configRef.current = { scope, scopes, schema, values, onChange };
    });

    const { state, diagnostics } = useMemo(() => {
        return resolveAtScope(scope, scopes, schema, values);
    }, [scope, scopes, schema, values]);

    const commit = useCallback((event: { target: RegisterElement }, key: PropertyKey): void => {
        void runCommit({
            event,
            key,
            configRef,
            setErrors
        });
    }, []);

    const register = useCallback((key: PropertyKey): UsePreferenceEditorRegisterResult => {

        const cfg = configRef.current;
        const property = cfg.schema[key];
        const errored = errors[cfg.scope]?.[key];
        const sourceValue = errored ? errored.rawValue : state[key]?.value;

        const timing = property ? commitTiming(property) : 'blur';

        return {
            name: key,
            defaultValue: toInputValue(sourceValue),
            defaultChecked: toInputChecked(sourceValue),
            onChange: (event) => {
                if (timing === 'change') {
                    commit(event, key);
                }
            },
            onBlur: (event) => {
                if (timing === 'blur') {
                    commit(event, key);
                }
            }
        };

    }, [errors, state, commit]);

    const reset = useCallback((key: PropertyKey) => {
        setErrors((current) => clearErrorEntry(current, configRef.current.scope, key));
    }, []);

    return {
        state,
        diagnostics,
        errors,
        register,
        reset
    };

}


// Utils

function commitTiming(property: Property): 'change' | 'blur' {

    if (property.type === 'boolean') {
        return 'change';
    }
    if (property.type === 'string'
        && Array.isArray(property.enum)
        && property.enum.length > 0) {
        return 'change';
    }
    return 'blur';

}


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


async function runCommit(params: {
    event: { target: RegisterElement };
    key: PropertyKey;
    configRef: { current: EditorConfig };
    setErrors: Dispatch<SetStateAction<EditorErrors>>;
}): Promise<void> {

    const { event, key, configRef, setErrors } = params;
    const cfg = configRef.current;
    const property = cfg.schema[key];

    const rawValue = isCheckboxInput(event.target)
        ? String(event.target.checked)
        : String(event.target.value ?? '');
    const inputValue: unknown = isCheckboxInput(event.target)
        ? event.target.checked
        : event.target.value;

    // Without a schema entry there is nothing to parse against. The
    // dispatcher should never reach here for unknown keys, so treat
    // it as a programmer error and skip the commit.
    if (!property) {
        return;
    }

    const result = parseSafe(property, inputValue);
    if (!result.success) {
        setErrors((current) => setErrorEntry(current, cfg.scope, key, {
            kind: 'parse',
            issues: result.error.issues,
            message: result.error.message,
            rawValue
        }));
        return;
    }

    try {
        await cfg.onChange(cfg.scope, key, result.data);
        setErrors((current) => clearErrorEntry(current, cfg.scope, key));
    } catch (error) {
        setErrors((current) => setErrorEntry(current, cfg.scope, key, {
            kind: 'commit',
            message: error instanceof Error ? error.message : 'Failed to save preference',
            rawValue
        }));
    }

}


function isCheckboxInput(target: RegisterElement): target is HTMLInputElement {
    return target instanceof HTMLInputElement && target.type === 'checkbox';
}


function setErrorEntry(
    current: EditorErrors,
    scope: Scope,
    key: PropertyKey,
    entry: EditorError
): EditorErrors {

    return {
        ...current,
        [scope]: {
            ...(current[scope] ?? {}),
            [key]: entry
        }
    };

}


function clearErrorEntry(
    current: EditorErrors,
    scope: Scope,
    key: PropertyKey
): EditorErrors {

    const scopeErrors = current[scope];
    if (!scopeErrors || !(key in scopeErrors)) {
        return current;
    }

    const nextScopeErrors = { ...scopeErrors };
    delete nextScopeErrors[key];

    if (Object.keys(nextScopeErrors).length === 0) {
        const next = { ...current };
        delete next[scope];
        return next;
    }

    return {
        ...current,
        [scope]: nextScopeErrors
    };

}
