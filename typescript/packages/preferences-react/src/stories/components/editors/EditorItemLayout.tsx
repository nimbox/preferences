import type { PreferenceLeaf, PreferenceState } from '@nimbox/preferences';
import classNames from 'classnames';
import type { CSSProperties, ReactNode } from 'react';
import type { EditorError, UsePreferenceEditorResult } from '../../../hooks/usePreferenceEditor';
import { OverridableIcon } from '../icons/OverridableIcon';
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

const headerRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem'
};

const titleBlockStyle: CSSProperties = {
    fontWeight: 'bold',
    flex: 1,
    minWidth: 0
};


export type EditorItemLayoutVariant = 'default' | 'inline';


export interface EditorItemProps {

    item: PreferenceLeaf;
    breadcrumbs: string[];

    register: UsePreferenceEditorResult['register'];
    setValue: UsePreferenceEditorResult['setValue'];
    clear: UsePreferenceEditorResult['clear'];

    preferenceState: PreferenceState | undefined;

    error: EditorError | undefined;

}


export type EditorItemLayoutProps =
    Pick<EditorItemProps, 'item' | 'breadcrumbs' | 'error' | 'clear' | 'preferenceState'> & {

        children: ReactNode;

        variant?: EditorItemLayoutVariant;

    };


export function EditorItemLayout(props: EditorItemLayoutProps) {

    const { item, breadcrumbs, error, children, variant = 'default', clear, preferenceState } = props;

    const isDefined = Boolean(preferenceState?.isDefined);
    const showClear = isDefined;
    const itemClassName = classNames('editor-item', {
        'editor-item--defined': isDefined
    });

    const headerRow = (
        <div style={headerRowStyle}>
            <div style={titleBlockStyle}>
                {breadcrumbs.length > 0 && (<span>{breadcrumbs.join(' » ')}{' » '}</span>)}
                {item.title}
            </div>
            <button
                type="button"
                className={classNames('editor-item__clear', {
                    'editor-item__clear--hidden': !showClear
                })}
                disabled={!showClear}
                aria-hidden={!showClear}
                onClick={() => clear(item.key)}
            >
                Clear
            </button>
            <OverridableIcon overridable={item.property.overridable} />
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
            <div className={itemClassName}>
                {headerRow}
                {row}
                {errorBlock}
            </div>
        );

    }

    return (
        <div className={itemClassName}>

            {headerRow}

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
