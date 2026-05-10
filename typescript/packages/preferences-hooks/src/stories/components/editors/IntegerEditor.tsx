import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { IntegerInput } from './inputs/IntegerInput';


export function IntegerEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const constraints = item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <IntegerInput name={item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
