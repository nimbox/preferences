import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { StringInput } from './inputs/StringInput';


export function StringEditor(props: EditorItemProps) {

    const { register, setValue: _setValue, ...layout } = props;
    const constraints = layout.item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout {...layout}>
            <StringInput name={layout.item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
