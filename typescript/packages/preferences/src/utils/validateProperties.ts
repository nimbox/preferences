import type { Diagnostic, Property, Schema } from '../types';
import { DiagnosticCode, error } from './diagnostics';


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

    validateEnumShape(key, property, errors);
    validateConstraintConsistency(key, property, errors);

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


function validateEnumShape(key: string, property: Property, errors: Diagnostic[]): void {

    const propertyEnum = property.enum;
    const labels = property.enumLabels;
    const descriptions = property.enumDescriptions;

    if (propertyEnum !== undefined && !Array.isArray(propertyEnum)) {
        errors.push(error({
            code: DiagnosticCode.INVALID_TYPE,
            key,
            message: `Property "${key}" \`enum\` must be an array when present.`
        }));
        return;
    }

    if (propertyEnum !== undefined
        && typeof property.type === 'string'
        && !ENUM_COMPATIBLE_TYPES.has(property.type as never)) {
        errors.push(error({
            code: DiagnosticCode.ENUM_TYPE_MISMATCH,
            key,
            message: `Property "${key}" declares \`enum\` but \`type\` "${property.type}" is not enum-compatible. Valid types: integer, string.`
        }));
    }

    if (Array.isArray(labels)) {
        if (!Array.isArray(propertyEnum)) {
            errors.push(error({
                code: DiagnosticCode.ENUM_LABELS_LENGTH_MISMATCH,
                key,
                message: `Property "${key}" \`enumLabels\` requires \`enum\`.`
            }));
        } else if (labels.length !== propertyEnum.length) {
            errors.push(error({
                code: DiagnosticCode.ENUM_LABELS_LENGTH_MISMATCH,
                key,
                message: `Property "${key}" \`enumLabels.length\` (${labels.length}) must equal \`enum.length\` (${propertyEnum.length}).`
            }));
        }
        labels.forEach((label, index) => {
            if (typeof label !== 'string' || label.length === 0) {
                errors.push(error({
                    code: DiagnosticCode.EMPTY_ENUM_LABEL,
                    key,
                    path: ['enumLabels', index],
                    message: `Property "${key}" \`enumLabels[${index}]\` must be a non-empty string.`
                }));
            }
        });
    }

    if (Array.isArray(descriptions)) {
        if (!Array.isArray(propertyEnum)) {
            errors.push(error({
                code: DiagnosticCode.ENUM_DESCRIPTIONS_LENGTH_MISMATCH,
                key,
                message: `Property "${key}" \`enumDescriptions\` requires \`enum\`.`
            }));
        } else if (descriptions.length !== propertyEnum.length) {
            errors.push(error({
                code: DiagnosticCode.ENUM_DESCRIPTIONS_LENGTH_MISMATCH,
                key,
                message: `Property "${key}" \`enumDescriptions.length\` (${descriptions.length}) must equal \`enum.length\` (${propertyEnum.length}).`
            }));
        }
        descriptions.forEach((description, index) => {
            if (typeof description !== 'string' || description.length === 0) {
                errors.push(error({
                    code: DiagnosticCode.EMPTY_ENUM_DESCRIPTION,
                    key,
                    path: ['enumDescriptions', index],
                    message: `Property "${key}" \`enumDescriptions[${index}]\` must be a non-empty string.`
                }));
            }
        });
    }

}


function validateConstraintConsistency(key: string, property: Property, errors: Diagnostic[]): void {

    if (typeof property.minimum === 'number' && typeof property.maximum === 'number'
        && property.minimum > property.maximum) {
        errors.push(error({
            code: DiagnosticCode.BOUND_INVERTED,
            key,
            message: `Property "${key}" has \`minimum\` (${property.minimum}) > \`maximum\` (${property.maximum}).`
        }));
    }

    if (typeof property.minLength === 'number' && typeof property.maxLength === 'number'
        && property.minLength > property.maxLength) {
        errors.push(error({
            code: DiagnosticCode.BOUND_INVERTED,
            key,
            message: `Property "${key}" has \`minLength\` (${property.minLength}) > \`maxLength\` (${property.maxLength}).`
        }));
    }

    if (typeof property.minItems === 'number' && typeof property.maxItems === 'number'
        && property.minItems > property.maxItems) {
        errors.push(error({
            code: DiagnosticCode.BOUND_INVERTED,
            key,
            message: `Property "${key}" has \`minItems\` (${property.minItems}) > \`maxItems\` (${property.maxItems}).`
        }));
    }

    if (typeof property.pattern === 'string' && property.pattern.length > 0) {
        try {
            new RegExp(property.pattern);
        } catch {
            errors.push(error({
                code: DiagnosticCode.INVALID_PATTERN,
                key,
                message: `Property "${key}" \`pattern\` is not a valid regular expression.`
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

    if (Array.isArray(property.enum)) {
        const matches = property.enum.some((member: unknown) => deepEqual(member, defaultValue));
        if (!matches) {
            errors.push(error({
                code: DiagnosticCode.ENUM_DEFAULT_MISMATCH,
                key,
                message: `Property "${key}" \`default\` is not a member of \`enum\`.`
            }));
        }
    }

    if (propertyType === 'integer' || propertyType === 'number') {
        const numeric = defaultValue as number;
        if (typeof property.minimum === 'number' && numeric < property.minimum) {
            errors.push(error({
                code: DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                key,
                message: `Property "${key}" \`default\` (${numeric}) < \`minimum\` (${property.minimum}).`
            }));
        }
        if (typeof property.maximum === 'number' && numeric > property.maximum) {
            errors.push(error({
                code: DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                key,
                message: `Property "${key}" \`default\` (${numeric}) > \`maximum\` (${property.maximum}).`
            }));
        }
    }

    if (propertyType === 'string') {
        const text = defaultValue as string;
        if (typeof property.minLength === 'number' && text.length < property.minLength) {
            errors.push(error({
                code: DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                key,
                message: `Property "${key}" \`default\` length (${text.length}) < \`minLength\` (${property.minLength}).`
            }));
        }
        if (typeof property.maxLength === 'number' && text.length > property.maxLength) {
            errors.push(error({
                code: DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                key,
                message: `Property "${key}" \`default\` length (${text.length}) > \`maxLength\` (${property.maxLength}).`
            }));
        }
        if (typeof property.pattern === 'string' && property.pattern.length > 0) {
            let regex: RegExp | null = null;
            try {
                regex = new RegExp(property.pattern);
            } catch {
                regex = null;
            }
            if (regex && !regex.test(text)) {
                errors.push(error({
                    code: DiagnosticCode.DEFAULT_CONSTRAINT_VIOLATION,
                    key,
                    message: `Property "${key}" \`default\` does not match \`pattern\`.`
                }));
            }
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
        const itemType = property.items?.type;
        if (typeof itemType === 'string' && itemType !== 'any') {
            defaultValue.forEach((element, index) => {
                if (!isOfDeclaredType(itemType, element)) {
                    errors.push(error({
                        code: DiagnosticCode.INVALID_DEFAULT_TYPE,
                        key,
                        path: ['default', index],
                        message: `Property "${key}" \`default[${index}]\` does not match \`items.type\` "${itemType}".`
                    }));
                }
            });
        }
    }

}


function isOfDeclaredType(
    declaredType: unknown,
    value: unknown,
    itemType?: string
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


function deepEqual(left: unknown, right: unknown): boolean {

    if (Object.is(left, right)) {
        return true;
    }

    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch {
        return false;
    }

}
