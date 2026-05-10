import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function IntegerEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, draft } = props;
    const registerProps = register(item.key, { mode: 'blur' });

    const { minimum, maximum } = item.property;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} draft={draft}>
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
