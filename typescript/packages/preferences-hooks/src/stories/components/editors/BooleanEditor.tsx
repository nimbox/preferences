import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function BooleanEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, draft } = props;
    const registerProps = register(item.key, { mode: 'change' });

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} draft={draft}>
            <input type="checkbox" {...registerProps} />
        </EditorItemLayout>
    );

}
