import type { Diagnostic, Schema } from '../types';
import { DiagnosticCode, error } from '../diagnostics';


export interface ValidateSchemaResult {
    diagnostics: Diagnostic[];
}

// Composed-schema invariants. Per-property structural rules live in
// `validateProperties` / `validateProperty`. This function checks that
// no property key is also a strict prefix (segment-aligned) of another
// property key — i.e. no property doubles as a group node.
export function validateSchema(schema: Schema): ValidateSchemaResult {

    const diagnostics: Diagnostic[] = [];

    const propertyKeys = Object.keys(schema);
    const propertyKeySet = new Set(propertyKeys);

    for (const key of propertyKeys) {
        const segments = key.split('.');
        for (let count = 1; count < segments.length; count += 1) {
            const prefix = segments.slice(0, count).join('.');
            if (propertyKeySet.has(prefix)) {
                diagnostics.push(error({
                    code: DiagnosticCode.GROUP_PROPERTY_COLLISION,
                    key: prefix,
                    message: `Property "${prefix}" collides with the group node implied by "${key}".`
                }));
            }
        }
    }

    return { diagnostics };

}
