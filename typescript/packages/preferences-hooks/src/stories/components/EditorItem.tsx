import type { PreferenceLeaf, PreferenceState } from '@nimbox/preferences';
import type { UseEditorDraftEntry, UseEditorResult } from '../../hooks/useEditor';
import './styles.css';


export interface EditorItemProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    register: UseEditorResult['register'];

    preference: PreferenceState | undefined;
    draft: UseEditorDraftEntry | undefined;

}

export function EditorItem(props: EditorItemProps) {

    const { item, breadcrumbs, register, draft } = props;

    const isBoolean = item.property.type === 'boolean';
    const isStringEnum = item.property.type === 'string'
        && Array.isArray(item.property.enum)
        && item.property.enum.length > 0;

    const mode = isBoolean || isStringEnum ? 'change' : 'blur';
    const registerProps = register(item.key, { mode });

    return (
        <div className="editor-item">

            <div>
                {breadcrumbs.length > 0 && (<span>{breadcrumbs.join(' » ')}{' » '}</span>)}
                {item.title}
            </div>

            {item.property.description && (
                <div>
                    {item.property.description}
                </div>
            )}

            <div>
                {isStringEnum ? (
                    <select {...registerProps}>
                        {item.property.enum?.map((option, index) => {
                            const label = item.property.enumLabels?.[index] ?? String(option);
                            return (
                                <option key={`${item.key}-${String(option)}`} value={String(option)}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                ) : (
                    <input
                        type={isBoolean ? 'checkbox' : 'text'}
                        {...registerProps}
                    />
                )}
            </div>

            {draft?.error && (
                <div>
                    {JSON.stringify(draft.error)}
                </div>
            )}

        </div>
    );

}
