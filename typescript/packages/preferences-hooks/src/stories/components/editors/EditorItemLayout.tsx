import type { PreferenceLeaf } from '@nimbox/preferences';
import type { ReactNode } from 'react';
import type { EditorError, UsePreferenceEditorResult } from '../../../hooks/usePreferenceEditor';
import '../styles.css';


export interface EditorItemProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    register: UsePreferenceEditorResult['register'];

    error: EditorError | undefined;

}


export interface EditorItemLayoutProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    error: EditorError | undefined;

    children: ReactNode;

}


export function EditorItemLayout(props: EditorItemLayoutProps) {

    const { item, breadcrumbs, error, children } = props;

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

            {error && (
                <div style={{ color: 'crimson' }}>
                    {error.message}
                </div>
            )}

        </div>
    );

}
