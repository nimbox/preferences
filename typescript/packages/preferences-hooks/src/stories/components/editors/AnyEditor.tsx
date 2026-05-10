import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { AnyInput } from './inputs/AnyInput';


export function AnyEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <AnyInput name={item.key} register={register} />
        </EditorItemLayout>
    );

}
