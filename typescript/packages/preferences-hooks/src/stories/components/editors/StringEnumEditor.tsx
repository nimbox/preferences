import type { ScalarConstraints } from '@nimbox/preferences';
import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';
import { StringEnumInput } from './inputs/StringEnumInput';


export function StringEnumEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const constraints = item.property as unknown as ScalarConstraints;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <StringEnumInput name={item.key} register={register} constraints={constraints} />
        </EditorItemLayout>
    );

}
