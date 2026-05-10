import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function IntegerEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const registerProps = register(item.key);

    const { minimum, maximum } = item.property;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <input
                type="number"
                step={1}
                min={typeof minimum === 'number' ? minimum : undefined}
                max={typeof maximum === 'number' ? maximum : undefined}
                {...registerProps}
            />
        </EditorItemLayout>
    );

}
