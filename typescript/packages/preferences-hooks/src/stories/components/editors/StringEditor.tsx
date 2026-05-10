import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { StringInput } from './inputs/StringInput';


export function StringEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const constraints = item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <StringInput name={item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
