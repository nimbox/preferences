import type { Diagnostic, Property, PropertyItem, ScalarConstraints, Schema } from '../types';
import { DiagnosticCode, error } from './diagnostics';
import { checkScalarValue } from './parse';


const PROPERTY_TYPES = new Set([
    'boolean', 'integer', 'number', 'string', 'array', 'object', 'any'
] as const);

const ITEM_TYPES = new Set([
    'boolean', 'integer', 'number', 'string', 'object', 'any'
] as const);

const ENUM_COMPATIBLE_TYPES = new Set([
    'integer', 'string'
] as const);

const PROPERTY_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]+)+$/;


// Per-property validation. Covers the spec Validation Contract →
// Property Checks, Constraint Consistency, and the property-default
// type/enum/constraint rules.
export function validateProperty(key: string, property: Property): Diagnostic[] {

    const errors: Diagnostic[] = [];

    if (!PROPERTY_KEY_PATTERN.test(key)) {
        errors.push(error({
            code: DiagnosticCode.PROPERTY_KEY_TOO_SHORT,
            key,
            message: `Property key "${key}" must contain at least two period-delimited segments.`
        }));
    }

    if (!property || typeof property !== 'object' || Array.isArray(property)) {
        errors.push(error({
            code: DiagnosticCode.INVALID_TYPE,
            key,
            message: `Property "${key}" must be an object.`
        }));
        return errors;
    }

    const propertyType = property.type;
    if (typeof propertyType !== 'string' || !PROPERTY_TYPES.has(propertyType as never)) {
        errors.push(error({
            code: DiagnosticCode.INVALID_TYPE,
            key,
            message: `Property "${key}" has invalid \`type\` "${String(propertyType)}".`
        }));
    }

    if (propertyType === 'array') {
        const items = property.items;
        if (!items || typeof items !== 'object' || Array.isArray(items)) {
            errors.push(error({
                code: DiagnosticCode.INVALID_ITEMS,
                key,
                message: `Property "${key}" of type "array" must declare \`items\`.`
            }));
        } else if (typeof items.type !== 'string' || !ITEM_TYPES.has(items.type as never)) {
            errors.push(error({
                code: DiagnosticCode.INVALID_ITEMS,
                key,
                message: `Property "${key}" has invalid \`items.type\` "${String(items.type)}".`
            }));
        } else {
            validateScalarConstraints(key, items as unknown as ScalarConstraints, ['items'], errors);
        }
    } else if (property.items !== undefined) {
        errors.push(error({
            code: DiagnosticCode.INVALID_ITEMS,
            key,
            message: `Property "${key}" of type "${String(propertyType)}" must not declare \`items\`.`
        }));
    }

    if (typeof property.scope !== 'string' || property.scope.length === 0) {
        errors.push(error({
            code: DiagnosticCode.MISSING_SCOPE,
            key,
            message: `Property "${key}" is missing a non-empty \`scope\`.`
        }));
    }

    if (typeof property.overridable !== 'boolean') {
        errors.push(error({
            code: DiagnosticCode.MISSING_OVERRIDABLE,
            key,
            message: `Property "${key}" is missing a boolean \`overridable\`.`
        }));
    }

    if (property.description !== undefined) {
        if (typeof property.description !== 'string' || property.description.length === 0) {
            errors.push(error({
                code: DiagnosticCode.INVALID_DESCRIPTION,
                key,
                message: `Property "${key}" \`description\` must be a non-empty string when present.`
            }));
        }
    }

    if (property.deprecationMessage !== undefined) {
        if (typeof property.deprecationMessage !== 'string' || property.deprecationMessage.length === 0) {
            errors.push(error({
                code: DiagnosticCode.INVALID_DEPRECATION_MESSAGE,
                key,
                message: `Property "${key}" \`deprecationMessage\` must be a non-empty string when present.`
            }));
        }
    }

    if (property.order !== undefined && typeof property.order !== 'number') {
        errors.push(error({
            code: DiagnosticCode.INVALID_ORDER,
            key,
            message: `Property "${key}" \`order\` must be a number when present.`
        }));
    }

    if (typeof propertyType === 'string' && propertyType !== 'array') {
        validateScalarConstraints(key, property as ScalarConstraints, [], errors);
    } else if (propertyType === 'array') {
        // Property root cannot itself carry scalar constraints when
        // the root type is `array`. Element constraints belong on
        // `items`. Surface a diagnostic if any leaked through.
        rejectMisplacedScalarConstraints(key, property, errors);
    }

    if (typeof property.minItems === 'number' && typeof property.maxItems === 'number'
        && property.minItems > property.maxItems) {
        errors.push(error({
            code: DiagnosticCode.BOUND_INVERTED,
            key,
            message: `Property "${key}" has \`minItems\` (${property.minItems}) > \`maxItems\` (${property.maxItems}).`
        }));
    }

    if (Object.prototype.hasOwnProperty.call(property, 'default')) {
        validateDefault(key, property, errors);
    }

    return errors;

}


// Per-schema validation: every property in the (flat) schema, no
// composed-schema collision checks (those live in `validateSchema`).
export function validateProperties(schema: Schema): Diagnostic[] {

    const errors: Diagnostic[] = [];
    for (const [key, property] of Object.entries(schema)) {
        errors.push(...validateProperty(key, property));
    }
    return errors;

}


/**
 * Validate the scalar-constraint shape carried by `constraints`
 * against the in-context `type`. Used both at the property root (for
 * scalar properties) and on `items` (for array properties).
 *
 * @param key - Owning property key, for diagnostic context.
 * @param constraints - The constraint-bearing object to validate.
 * @param path - Diagnostic path prefix; `[]` for root-level
 * constraints, `['items']` when called for array element
 * constraints.
 * @param errors - Diagnostic sink.
 */
function validateScalarConstraints(
    key: string,
    constraints: ScalarConstraints,
    path: ReadonlyArray<string>,
    errors: Diagnostic[]
): void {

    const constraintEnum = constraints.enum;
    const labels = constraints.enumLabels;
    const descriptions = constraints.enumDescriptions;
    const ctxType = constraints.type;
    const where = path.length > 0 ? path.join('.') + '.' : '';

    if (constraintEnum !== undefined && !Array.isArray(constraintEnum)) {
        errors.push(error({
            code: DiagnosticCode.INVALID_TYPE,
            key,
            path,
            message: `Property "${key}" \`${where}enum\` must be an array when present.`
        }));
        return;
    }

    if (constraintEnum !== undefined
        && typeof ctxType === 'string'
        && !ENUM_COMPATIBLE_TYPES.has(ctxType as never)) {
        errors.push(error({
            code: DiagnosticCode.ENUM_TYPE_MISMATCH,
            key,
            path,
            message: `Property "${key}" declares \`${where}enum\` but \`${where}type\` "${ctxType}" is not enum-compatible. Valid types: integer, string.`
        }));
    }

    if (Array.isArray(labels)) {
        if (!Array.isArray(constraintEnum)) {
            errors.push(error({
                code: DiagnosticCode.ENUM_LABELS_LENGTH_MISMATCH,
                key,
                path,
                message: `Property "${key}" \`${where}enumLabels\` requires \`${where}enum\`.`
            }));
        } else if (labels.length !== constraintEnum.length) {
            errors.push(error({
                code: DiagnosticCode.ENUM_LABELS_LENGTH_MISMATCH,
                key,
                path,
                message: `Property "${key}" \`${where}enumLabels.length\` (${labels.length}) must equal \`${where}enum.length\` (${constraintEnum.length}).`
            }));
        }
        labels.forEach((label, index) => {
            if (typeof label !== 'string' || label.length === 0) {
                errors.push(error({
                    code: DiagnosticCode.EMPTY_ENUM_LABEL,
                    key,
                    path: [...path, 'enumLabels', index],
                    message: `Property "${key}" \`${where}enumLabels[${index}]\` must be a non-empty string.`
                }));
            }
        });
    }

    if (Array.isArray(descriptions)) {
        if (!Array.isArray(constraintEnum)) {
            errors.push(error({
                code: DiagnosticCode.ENUM_DESCRIPTIONS_LENGTH_MISMATCH,
                key,
                path,
                message: `Property "${key}" \`${where}enumDescriptions\` requires \`${where}enum\`.`
            }));
        } else if (descriptions.length !== constraintEnum.length) {
            errors.push(error({
                code: DiagnosticCode.ENUM_DESCRIPTIONS_LENGTH_MISMATCH,
                key,
                path,
                message: `Property "${key}" \`${where}enumDescriptions.length\` (${descriptions.length}) must equal \`${where}enum.length\` (${constraintEnum.length}).`
            }));
        }
        descriptions.forEach((description, index) => {
            if (typeof description !== 'string' || description.length === 0) {
                errors.push(error({
                    code: DiagnosticCode.EMPTY_ENUM_DESCRIPTION,
                    key,
                    path: [...path, 'enumDescriptions', index],
                    message: `Property "${key}" \`${where}enumDescriptions[${index}]\` must be a non-empty string.`
                }));
            }
        });
    }

    if (typeof constraints.minimum === 'number' && typeof constraints.maximum === 'number'
        && constraints.minimum > constraints.maximum) {
        errors.push(error({
            code: DiagnosticCode.BOUND_INVERTED,
            key,
            path,
            message: `Property "${key}" has \`${where}minimum\` (${constraints.minimum}) > \`${where}maximum\` (${constraints.maximum}).`
        }));
    }

    if (typeof constraints.minLength === 'number' && typeof constraints.maxLength === 'number'
        && constraints.minLength > constraints.maxLength) {
        errors.push(error({
            code: DiagnosticCode.BOUND_INVERTED,
            key,
            path,
            message: `Property "${key}" has \`${where}minLength\` (${constraints.minLength}) > \`${where}maxLength\` (${constraints.maxLength}).`
        }));
    }

    if (typeof constraints.pattern === 'string' && constraints.pattern.length > 0) {
        try {
            new RegExp(constraints.pattern);
        } catch {
            errors.push(error({
                code: DiagnosticCode.INVALID_PATTERN,
                key,
                path,
                message: `Property "${key}" \`${where}pattern\` is not a valid regular expression.`
            }));
        }
    }

}


// When `type` is `array`, scalar-constraint fields are forbidden at
// the property root — they belong on `items`. Emit a diagnostic if
// any leaked through.
function rejectMisplacedScalarConstraints(
    key: string,
    property: Property,
    errors: Diagnostic[]
): void {

    const fields: Array<keyof ScalarConstraints> = [
        'enum', 'enumLabels', 'enumDescriptions',
        'minimum', 'maximum',
        'minLength', 'maxLength',
        'pattern', 'patternErrorMessage', 'format'
    ];

    for (const field of fields) {
        if ((property as Record<string, unknown>)[field] !== undefined) {
            errors.push(error({
                code: DiagnosticCode.ENUM_TYPE_MISMATCH,
                key,
                message: `Property "${key}" of type "array" must not declare \`${field}\` at the root; declare it on \`items\` instead.`
            }));
        }
    }

}


function validateDefault(key: string, property: Property, errors: Diagnostic[]): void {

    const defaultValue: unknown = property.default;
    const propertyType = property.type;

    if (!isOfDeclaredType(propertyType, defaultValue, property.items?.type)) {
        errors.push(error({
            code: DiagnosticCode.INVALID_DEFAULT_TYPE,
            key,
            message: `Property "${key}" \`default\` does not match \`type\` "${String(propertyType)}".`
        }));
        return;
    }

    if (propertyType !== 'array' && propertyType !== 'object' && propertyType !== 'any') {
        const result = checkScalarValue(property as ScalarConstraints, defaultValue);
        if (!result.success) {
            errors.push(error({
                code: result.error.issues[0]?.code === 'enum-mismatch'
                    ? DiagnosticCode.ENUM_DEFAULT_MISMATCH
                    : DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                key,
                message: `Property "${key}" \`default\` violates a scalar constraint: ${result.error.message}.`
            }));
        }
    }

    if (propertyType === 'array' && Array.isArray(defaultValue)) {
        if (typeof property.minItems === 'number' && defaultValue.length < property.minItems) {
            errors.push(error({
                code: DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                key,
                message: `Property "${key}" \`default.length\` (${defaultValue.length}) < \`minItems\` (${property.minItems}).`
            }));
        }
        if (typeof property.maxItems === 'number' && defaultValue.length > property.maxItems) {
            errors.push(error({
                code: DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                key,
                message: `Property "${key}" \`default.length\` (${defaultValue.length}) > \`maxItems\` (${property.maxItems}).`
            }));
        }
        const items = property.items;
        if (items && typeof items.type === 'string' && items.type !== 'any') {
            defaultValue.forEach((element, index) => {
                if (!isOfDeclaredType(items.type, element)) {
                    errors.push(error({
                        code: DiagnosticCode.INVALID_DEFAULT_TYPE,
                        key,
                        path: ['default', index],
                        message: `Property "${key}" \`default[${index}]\` does not match \`items.type\` "${items.type}".`
                    }));
                    return;
                }
                const result = checkScalarValue(items as unknown as ScalarConstraints, element);
                if (!result.success) {
                    errors.push(error({
                        code: result.error.issues[0]?.code === 'enum-mismatch'
                            ? DiagnosticCode.ENUM_DEFAULT_MISMATCH
                            : DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                        key,
                        path: ['default', index],
                        message: `Property "${key}" \`default[${index}]\` violates an item constraint: ${result.error.message}.`
                    }));
                }
            });
        }
    }

}


function isOfDeclaredType(
    declaredType: unknown,
    value: unknown,
    itemType?: PropertyItem['type']
): boolean {

    switch (declaredType) {
        case 'boolean':
            return typeof value === 'boolean';
        case 'integer':
            return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
        case 'number':
            return typeof value === 'number' && Number.isFinite(value);
        case 'string':
            return typeof value === 'string';
        case 'array':
            if (!Array.isArray(value)) {
                return false;
            }
            if (typeof itemType !== 'string' || itemType === 'any') {
                return true;
            }
            return value.every((element) => isOfDeclaredType(itemType, element));
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'any':
            return true;
        default:
            return false;
    }

}
