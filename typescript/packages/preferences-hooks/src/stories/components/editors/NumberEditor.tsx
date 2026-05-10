import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { NumberInput } from './inputs/NumberInput';


export function NumberEditor(props: EditorItemProps) {

    const { register, setValue: _setValue, ...layout } = props;
    const constraints = layout.item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout {...layout}>
            <NumberInput name={layout.item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
