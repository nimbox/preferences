import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { NumberInput } from './inputs/NumberInput';


export function NumberEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const constraints = item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <NumberInput name={item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
