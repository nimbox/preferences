import { AnyEditor } from './editors/AnyEditor';
import { ArrayEditor } from './editors/ArrayEditor';
import { BooleanEditor } from './editors/BooleanEditor';
import { type EditorItemProps } from './editors/EditorItemLayout';
import { IntegerEditor } from './editors/IntegerEditor';
import { NumberEditor } from './editors/NumberEditor';
import { ObjectEditor } from './editors/ObjectEditor';
import { StringEditor } from './editors/StringEditor';
import { StringEnumEditor } from './editors/StringEnumEditor';


export type { EditorItemProps } from './editors/EditorItemLayout';

export function EditorItem(props: EditorItemProps) {

    const { property } = props.item;

    switch (property.type) {

        case 'string': {
            const hasEnum = Array.isArray(property.enum) && property.enum.length > 0;
            return hasEnum ? <StringEnumEditor {...props} /> : <StringEditor {...props} />;
        }

        case 'boolean':
            return <BooleanEditor {...props} />;

        case 'number':
            return <NumberEditor {...props} />;

        case 'integer':
            return <IntegerEditor {...props} />;

        case 'object':
            return <ObjectEditor {...props} />;

        case 'array':
            return <ArrayEditor {...props} />;

        case 'any':
            return <AnyEditor {...props} />;

        default:
            return <AnyEditor {...props} />;

    }

}
