import type { ScalarConstraints } from '@nimbox/preferences';
import { useEffect, useRef, useState } from 'react';
import type { UsePreferenceEditorRegisterOptions, UsePreferenceEditorRegisterResult } from '../../../hooks/usePreferenceEditor';
import type { ChangeHandler, RegisterElement } from '../../../types';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { PropertyInput } from './inputs/PropertyInput';


// Local helpers

function readInputValue(target: RegisterElement): unknown {
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        return target.checked;
    }
    return target.value;
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


function toInputChecked(value: unknown): boolean {
    if (typeof value === 'string') {
        return value === 'true';
    }
    return Boolean(value);
}


function coerce(raw: unknown, itemType: ScalarConstraints['type']): unknown {

    switch (itemType) {

        case 'boolean':
            if (typeof raw === 'boolean') return raw;
            if (raw === 'true') return true;
            if (raw === 'false') return false;
            return Boolean(raw);

        case 'integer': {
            const text = String(raw ?? '').trim();
            if (!text) return raw;
            const n = Number(text);
            return Number.isFinite(n) ? n : raw;
        }

        case 'number': {
            const text = String(raw ?? '').trim();
            if (!text) return raw;
            const n = Number(text);
            return Number.isFinite(n) ? n : raw;
        }

        case 'string':
            return typeof raw === 'string' ? raw : String(raw ?? '');

        case 'object':
        case 'any':
        default:
            if (typeof raw === 'string') {
                try { return JSON.parse(raw); } catch { return raw; }
            }
            return raw;

    }

}


function defaultElement(itemType: ScalarConstraints['type']): unknown {
    switch (itemType) {
        case 'boolean': return false;
        case 'integer':
        case 'number': return 0;
        case 'string': return '';
        case 'object': return {};
        case 'any':
        default: return '';
    }
}


export function ArrayEditor(props: EditorItemProps) {

    const { register, setValue, ...layout } = props;
    const { item } = layout;

    const property = item.property as unknown as { items?: ScalarConstraints };
    const itemConstraints = property.items ?? { type: 'any' as const } as ScalarConstraints;
    const itemType = itemConstraints.type;

    // Booleans and enums commit on `change` — render inline.
    // Other types commit on `blur` — render with edit/save toggle.
    const isInline = itemType === 'boolean'
        || (Array.isArray(itemConstraints.enum) && itemConstraints.enum.length > 0);

    // Seed local items from the resolved value.
    const initialItems = useInitialItems(item.key, props);
    const [items, setItems] = useState<unknown[]>(initialItems);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const valueSnapshot = JSON.stringify(layout.preferenceState?.value ?? null);
    useEffect(() => {
        try {
            const parsed: unknown = valueSnapshot === 'null' ? null : JSON.parse(valueSnapshot);
            setItems(Array.isArray(parsed) ? [...parsed] : []);
        } catch {
            setItems([]);
        }
        setEditingIndex(null);
    }, [valueSnapshot, item.key]);

    const inputContainerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (editingIndex === null) {
            return;
        }
        const input = inputContainerRef.current?.querySelector('input, textarea, select') as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
            | null;
        input?.focus();
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.select?.();
        }
    }, [editingIndex]);

    const commitItems = (next: unknown[]) => {
        setValue(item.key, next.map((value) => coerce(value, itemType)));
    };

    // Per-row register factory bound to the row index. Honors the
    // `mode` declared by whichever Input calls register, and never
    // reads the (potentially stale) `items` after a `setItems` call.
    const makeRowRegister = (
        index: number
    ) => (
        _name: string,
        options?: UsePreferenceEditorRegisterOptions
    ): UsePreferenceEditorRegisterResult => {

            const mode = options?.mode ?? 'blur';
            const current = items[index];

            const onEvent: ChangeHandler = (event) => {
                const next = items.slice();
                next[index] = readInputValue(event.target);
                setItems(next);
                commitItems(next);
            };

            return {
                name: `${item.key}[${index}]`,
                defaultValue: toInputValue(current),
                defaultChecked: toInputChecked(current),
                onChange: (event) => {
                    if (mode === 'change') {
                        onEvent(event);
                    }
                },
                onBlur: (event) => {
                    if (mode === 'blur') {
                        onEvent(event);
                        setEditingIndex(null);
                    }
                }
            };

        };

    const handleDelete = (index: number) => {
        const next = items.filter((_, i) => i !== index);
        setItems(next);
        if (editingIndex !== null && editingIndex === index) {
            setEditingIndex(null);
        }
        commitItems(next);
    };

    const handleAdd = () => {
        const next = [...items, defaultElement(itemType)];
        setItems(next);
        if (isInline) {
            commitItems(next);
        } else {
            setEditingIndex(next.length - 1);
        }
    };

    const handleEdit = (index: number) => {
        setEditingIndex(index);
    };

    return (
        <EditorItemLayout {...layout}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map((value, index) => {

                    const rowRegister = makeRowRegister(index);
                    const isEditing = editingIndex === index;

                    return (
                        <li
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.25rem 0'
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}
                                ref={isEditing ? inputContainerRef : undefined}>
                                {isInline || isEditing ? (
                                    <PropertyInput
                                        name={`${item.key}[${index}]`}
                                        register={rowRegister}
                                        constraints={itemConstraints}
                                    />
                                ) : (
                                    <span style={{ fontFamily: 'monospace' }}>
                                        {toInputValue(value) || <em style={{ color: 'gray' }}>(empty)</em>}
                                    </span>
                                )}
                            </div>
                            {!isInline && !isEditing && (
                                <button type="button" onClick={() => handleEdit(index)} aria-label="edit">
                                    edit
                                </button>
                            )}
                            <button type="button" onClick={() => handleDelete(index)} aria-label="delete">
                                delete
                            </button>
                        </li>
                    );

                })}
            </ul>
            <button type="button" onClick={handleAdd} aria-label="add">
                add
            </button>
        </EditorItemLayout>
    );

}


// Seed local items from the resolved state for `item.key` at mount.
function useInitialItems(_key: string, props: EditorItemProps): unknown[] {

    // Read from the current register's `defaultValue` route by
    // calling register once with a dummy mode and parsing the JSON
    // back. This keeps the same "rawValue on error" semantics for
    // the array as a whole (defaultValue is the JSON-serialized
    // current value when no error is pending).
    const reg = props.register(props.item.key, { mode: 'blur' });
    const raw = reg.defaultValue;
    if (!raw) {
        return [];
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }

}
