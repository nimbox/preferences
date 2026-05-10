import { EditorItemLayout, type EditorItemProps } from './EditorItemLayout';


export function StringEnumEditor(props: EditorItemProps) {

    const { item, breadcrumbs, register, error } = props;
    const registerProps = register(item.key);

    const options = item.property.enum ?? [];
    const labels = item.property.enumLabels;

    return (
        <EditorItemLayout item={item} breadcrumbs={breadcrumbs} error={error}>
            <select {...registerProps}>
                {options.map((option, index) => {

                    const label = labels?.[index] ?? String(option);

                    return (
                        <option key={`${item.key}-${String(option)}`} value={String(option)}>
                            {label}
                        </option>
                    );

                })}
            </select>
        </EditorItemLayout>
    );

}
