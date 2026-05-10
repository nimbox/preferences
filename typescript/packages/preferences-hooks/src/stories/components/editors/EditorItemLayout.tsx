import type { PreferenceLeaf } from '@nimbox/preferences';
import type { CSSProperties, ReactNode } from 'react';
import type { EditorError, UsePreferenceEditorResult } from '../../../hooks/usePreferenceEditor';
import '../styles.css';


const descriptionTextStyle: CSSProperties = { color: 'gray' };

const inlineRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem'
};

const inlineLabelStyle: CSSProperties = {
    ...inlineRowStyle,
    cursor: 'pointer'
};


export type EditorItemLayoutVariant = 'default' | 'inline';


export interface EditorItemProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    register: UsePreferenceEditorResult['register'];
    setValue: UsePreferenceEditorResult['setValue'];

    error: EditorError | undefined;

}


export interface EditorItemLayoutProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    error: EditorError | undefined;

    children: ReactNode;

    variant?: EditorItemLayoutVariant;

}


export function EditorItemLayout(props: EditorItemLayoutProps) {

    const { item, breadcrumbs, error, children, variant = 'default' } = props;

    const title = (
        <div style={{ fontWeight: 'bold' }}>
            {breadcrumbs.length > 0 && (<span>{breadcrumbs.join(' » ')}{' » '}</span>)}
            {item.title}
        </div>
    );

    const errorBlock = error && (
        <div style={{ color: 'crimson' }}>
            {error.message}
        </div>
    );

    if (variant === 'inline') {

        const description = item.property.description;
        const row = description ? (
            <label style={inlineLabelStyle}>
                {children}
                <span style={descriptionTextStyle}>{description}</span>
            </label>
        ) : (
            <div style={inlineRowStyle}>{children}</div>
        );

        return (
            <div className="editor-item">
                {title}
                {row}
                {errorBlock}
            </div>
        );

    }

    return (
        <div className="editor-item">

            {title}

            {item.property.description && (
                <div>
                    <span style={descriptionTextStyle}>{item.property.description}</span>
                </div>
            )}

            <div>
                {children}
            </div>

            {errorBlock}

        </div>
    );

}
