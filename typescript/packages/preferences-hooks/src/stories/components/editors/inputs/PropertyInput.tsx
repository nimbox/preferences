import type { ScalarConstraints } from '@nimbox/preferences';
import type { UsePreferenceEditorResult } from '../../../../hooks/usePreferenceEditor';
import { AnyInput } from './AnyInput';
import { BooleanInput } from './BooleanInput';
import { IntegerInput } from './IntegerInput';
import { NumberInput } from './NumberInput';
import { ObjectInput } from './ObjectInput';
import { StringEnumInput } from './StringEnumInput';
import { StringInput } from './StringInput';


export interface PropertyInputProps {
    name: string;
    register: UsePreferenceEditorResult['register'];
    constraints: ScalarConstraints;
}


export function PropertyInput(props: PropertyInputProps) {

    const { name, register, constraints } = props;

    switch (constraints.type) {

        case 'boolean':
            return <BooleanInput name={name} register={register} />;

        case 'string': {
            const hasEnum = Array.isArray(constraints.enum) && constraints.enum.length > 0;
            return hasEnum
                ? <StringEnumInput name={name} register={register} constraints={constraints} />
                : <StringInput name={name} register={register} constraints={constraints} />;
        }

        case 'integer':
            return <IntegerInput name={name} register={register} constraints={constraints} />;

        case 'number':
            return <NumberInput name={name} register={register} constraints={constraints} />;

        case 'object':
            return <ObjectInput name={name} register={register} />;

        case 'any':
        default:
            return <AnyInput name={name} register={register} />;

    }

}
