import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function StringEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, draft } = props;
    const registerProps = register(item.key, { mode: 'blur' });

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} draft={draft}>
            <input type="text" {...registerProps} />
        </EditorItemLayout>
    );

}
