import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { AnyInput } from './inputs/AnyInput';


export function AnyEditor(props: EditorItemProps) {

    const { register, setValue: _setValue, ...layout } = props;

    return (
        <EditorItemLayout {...layout}>
            <AnyInput name={layout.item.key} register={register} />
        </EditorItemLayout>
    );

}
