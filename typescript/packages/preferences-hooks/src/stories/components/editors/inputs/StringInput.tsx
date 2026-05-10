import type { ScalarConstraints } from '@nimbox/preferences';
import type { UsePreferenceEditorResult } from '../../../../hooks/usePreferenceEditor';


export interface StringInputProps {
    name: string;
    register: UsePreferenceEditorResult['register'];
    constraints?: Pick<ScalarConstraints, 'minLength' | 'maxLength' | 'pattern'>;
}


export function StringInput(props: StringInputProps) {

    const { name, register, constraints } = props;
    const registerProps = register(name, { mode: 'blur' });

    return (
        <input
            type="text"
            minLength={constraints?.minLength}
            maxLength={constraints?.maxLength}
            pattern={constraints?.pattern}
            {...registerProps}
        />
    );

}
