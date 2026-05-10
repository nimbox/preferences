import type { UsePreferenceEditorResult } from '../../../../hooks/usePreferenceEditor';


export interface AnyInputProps {
    name: string;
    register: UsePreferenceEditorResult['register'];
}


export function AnyInput(props: AnyInputProps) {

    const { name, register } = props;
    const registerProps = register(name, { mode: 'blur' });

    return (
        <textarea
            rows={6}
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'monospace' }}
            {...registerProps}
        />
    );

}
