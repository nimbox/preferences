import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function AnyEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const registerProps = register(item.key);

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <textarea
                rows={6}
                spellCheck={false}
                style={{ width: '100%', fontFamily: 'monospace' }}
                {...registerProps}
            />
        </EditorItemLayout>
    );

}
