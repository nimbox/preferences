import type { ScalarConstraints } from '@nimbox/preferences';
import type { UsePreferenceEditorResult } from '../../../../hooks/usePreferenceEditor';


export interface StringEnumInputProps {
    name: string;
    register: UsePreferenceEditorResult['register'];
    constraints: Pick<ScalarConstraints, 'enum' | 'enumLabels'>;
}


export function StringEnumInput(props: StringEnumInputProps) {

    const { name, register, constraints } = props;
    const registerProps = register(name, { mode: 'change' });

    const options = constraints.enum ?? [];
    const labels = constraints.enumLabels;

    return (
        <select {...registerProps}>
            {options.map((option, index) => {

                const label = labels?.[index] ?? String(option);

                return (
                    <option key={`${name}-${String(option)}`} value={String(option)}>
                        {label}
                    </option>
                );

            })}
        </select>
    );

}
