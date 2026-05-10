import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { ObjectInput } from './inputs/ObjectInput';


export function ObjectEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <ObjectInput name={item.key} register={register} />
        </EditorItemLayout>
    );

}
