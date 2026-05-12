import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { ObjectInput } from './inputs/ObjectInput';


export function ObjectEditor(props: EditorItemProps) {

    const { register, setValue: _setValue, ...layout } = props;

    return (
        <EditorItemLayout {...layout}>
            <ObjectInput name={layout.item.key} register={register} />
        </EditorItemLayout>
    );

}
