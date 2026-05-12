import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { StringEnumInput } from './inputs/StringEnumInput';


export function StringEnumEditor(props: EditorItemProps) {

    const { register, setValue: _setValue, ...layout } = props;
    const constraints = layout.item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout {...layout}>
            <StringEnumInput name={layout.item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
