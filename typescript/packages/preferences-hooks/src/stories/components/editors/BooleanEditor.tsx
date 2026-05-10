import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { BooleanInput } from './inputs/BooleanInput';


export function BooleanEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error} variant="inline">
            <BooleanInput name={item.key} register={register} />
        </EditorItemLayout>
    );

}
