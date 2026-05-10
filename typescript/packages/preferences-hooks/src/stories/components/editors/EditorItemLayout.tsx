import type { PreferenceLeaf, PreferenceState } from '@nimbox/preferences';
import type { ReactNode } from 'react';
import type { UsePreferenceEditorDraftEntry, UsePreferenceEditorResult } from '../../../hooks/usePreferenceEditor';
import '../styles.css';


export interface EditorItemProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    register: UsePreferenceEditorResult['register'];

    preference: PreferenceState | undefined;
    draft: UsePreferenceEditorDraftEntry | undefined;

}

export interface EditorItemLayoutProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    draft: UsePreferenceEditorDraftEntry | undefined;

    children: ReactNode;

}

export function EditorItemLayout(props: EditorItemLayoutProps) {

    const { item, breadcrumbs, draft, children } = props;

    return (
        <div className="editor-item">

            <div style={{ fontWeight: 'bold' }}>
                {breadcrumbs.length > 0 && (<span>{breadcrumbs.join(' » ')}{' » '}</span>)}
                {item.title}
            </div>

            {item.property.description && (
                <div>
                    <span style={{ color: 'gray' }}>{item.property.description}</span>
                </div>
            )}

            <div>
                {children}
            </div>

            {draft?.error && (
                <div>
                    {JSON.stringify(draft.error)}
                </div>
            )}

        </div>
    );

}
