import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function ObjectEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, draft } = props;
    const registerProps = register(item.key, { mode: 'blur' });

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} draft={draft}>
            <textarea
                rows={6}
                spellCheck={false}
                style={{ width: '100%', fontFamily: 'monospace' }}
                {...registerProps}
            />
        </EditorItemLayout>
    );

}
