import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { BooleanInput } from './inputs/BooleanInput';


export function BooleanEditor(props: EditorItemProps) {

    const { register, setValue: _setValue, ...layout } = props;

    return (
        <EditorItemLayout {...layout} variant="inline">
            <BooleanInput name={layout.item.key} register={register} />
        </EditorItemLayout>
    );

}
