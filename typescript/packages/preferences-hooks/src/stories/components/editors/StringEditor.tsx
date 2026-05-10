import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function StringEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const registerProps = register(item.key);

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <input type="text" {...registerProps} />
        </EditorItemLayout>
    );

}
