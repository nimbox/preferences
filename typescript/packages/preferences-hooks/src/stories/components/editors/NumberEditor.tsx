import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function NumberEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const registerProps = register(item.key);

    const { minimum, maximum } = item.property;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <input
                type="number"
                step="any"
                min={typeof minimum === 'number' ? minimum : undefined}
                max={typeof maximum === 'number' ? maximum : undefined}
                {...registerProps}
            />
        </EditorItemLayout>
    );

}
