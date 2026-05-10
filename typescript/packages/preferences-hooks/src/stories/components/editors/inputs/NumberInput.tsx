import type { ScalarConstraints } from '@nimbox/preferences';
import type { UsePreferenceEditorResult } from '../../../../hooks/usePreferenceEditor';


export interface NumberInputProps {
    name: string;
    register: UsePreferenceEditorResult['register'];
    constraints?: Pick<ScalarConstraints, 'minimum' | 'maximum'>;
}


export function NumberInput(props: NumberInputProps) {

    const { name, register, constraints } = props;
    const registerProps = register(name, { mode: 'blur' });

    return (
        <input
            type="number"
            step="any"
            min={typeof constraints?.minimum === 'number' ? constraints.minimum : undefined}
            max={typeof constraints?.maximum === 'number' ? constraints.maximum : undefined}
            {...registerProps}
        />
    );

}
