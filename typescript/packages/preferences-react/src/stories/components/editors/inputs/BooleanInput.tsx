import type { UsePreferenceEditorResult } from '../../../../hooks/usePreferenceEditor';


export interface BooleanInputProps {
    name: string;
    register: UsePreferenceEditorResult['register'];
}


export function BooleanInput(props: BooleanInputProps) {

    const { name, register } = props;
    const registerProps = register(name, { mode: 'change' });

    return (
        <input type="checkbox" {...registerProps} />
    );

}
