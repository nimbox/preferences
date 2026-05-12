import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { IntegerInput } from './inputs/IntegerInput';


export function IntegerEditor(props: EditorItemProps) {

    const { register, setValue: _setValue, ...layout } = props;
    const constraints = layout.item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout {...layout}>
            <IntegerInput name={layout.item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
