import type { ScalarConstraints } from '@nimbox/preferences';
import type { UsePreferenceEditorResult } from '../../../../hooks/usePreferenceEditor';


export interface IntegerInputProps {
    name: string;
    register: UsePreferenceEditorResult['register'];
    constraints?: Pick<ScalarConstraints, 'minimum' | 'maximum'>;
}


export function IntegerInput(props: IntegerInputProps) {

    const { name, register, constraints } = props;
    const registerProps = register(name, { mode: 'blur' });

    return (
        <input
            type="number"
            step={1}
            min={typeof constraints?.minimum === 'number' ? constraints.minimum : undefined}
            max={typeof constraints?.maximum === 'number' ? constraints.maximum : undefined}
            {...registerProps}
        />
    );

}
