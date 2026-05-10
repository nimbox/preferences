import type { Property, PropertyItem } from '../types';


export interface ParseIssue {
    readonly code?: string;
    readonly input?: unknown;
    readonly path: ReadonlyArray<PropertyKey>;
    readonly message: string;
}


export class ParseError extends Error {

    readonly issues: ParseIssue[];

    constructor(issues: ParseIssue[]) {
        super(issues[0]?.message ?? 'Parse failed');
        this.name = 'ParseError';
        this.issues = issues;
    }

}


export type ParsePropertyValue = (property: Property, value: unknown) => unknown;

export type ParseSafeResult =
    | { success: true; data: unknown }
    | { success: false; error: ParseError };


export function isParseError(error: unknown): error is ParseError {
    return error instanceof ParseError;
}


export const parse: ParsePropertyValue = (property, value) => {

    const result = parseSafe(property, value);
    if (!result.success) {
        throw result.error;
    }

    return result.data;

};


export function parseSafe(property: Property, value: unknown): ParseSafeResult {

    switch (property.type) {

        case 'boolean':
            return parseBoolean(value);

        case 'integer':
            return parseNumeric(property, value, true);

        case 'number':
            return parseNumeric(property, value, false);

        case 'string':
            return parseString(property, value);

        case 'object':
            return parseObject(value);

        case 'array':
            return parseArray(property, value);

        case 'any':
            return { success: true, data: value };

        default:
            return { success: true, data: value };

    }

}


function parseBoolean(value: unknown): ParseSafeResult {

    if (typeof value === 'boolean') {
        return { success: true, data: value };
    }
    if (typeof value === 'string') {
        if (value === 'true') return { success: true, data: true };
        if (value === 'false') return { success: true, data: false };
    }
    return { success: true, data: Boolean(value) };

}


function parseNumeric(property: Property, value: unknown, integer: boolean): ParseSafeResult {

    const text = String(value ?? '').trim();
    if (!text) {
        return failure('number-required', value, integer ? 'validation.integer.required' : 'validation.number.required');
    }

    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
        return failure('number-invalid', value, integer ? 'validation.integer.invalid' : 'validation.number.invalid');
    }

    if (integer && !Number.isInteger(parsed)) {
        return failure('integer-invalid', value, 'validation.integer.invalid');
    }

    if (typeof property.minimum === 'number' && parsed < property.minimum) {
        return failure('number-minimum', parsed, 'validation.number.minimum');
    }
    if (typeof property.maximum === 'number' && parsed > property.maximum) {
        return failure('number-maximum', parsed, 'validation.number.maximum');
    }

    return { success: true, data: parsed };

}


function parseString(property: Property, value: unknown): ParseSafeResult {

    const parsed = String(value ?? '');

    if (typeof property.minLength === 'number' && parsed.length < property.minLength) {
        return failure('string-min-length', parsed, 'validation.string.minLength');
    }
    if (typeof property.maxLength === 'number' && parsed.length > property.maxLength) {
        return failure('string-max-length', parsed, 'validation.string.maxLength');
    }

    if (typeof property.pattern === 'string' && property.pattern.length > 0) {
        let regex: RegExp | null = null;
        try {
            regex = new RegExp(property.pattern);
        } catch {
            regex = null;
        }
        if (regex && !regex.test(parsed)) {
            return failure(
                'string-pattern',
                parsed,
                String(property.patternErrorMessage || 'validation.string.pattern')
            );
        }
    }

    return { success: true, data: parsed };

}


function parseObject(value: unknown): ParseSafeResult {

    if (isRecord(value)) {
        return { success: true, data: value };
    }

    try {
        const parsed = JSON.parse(String(value ?? ''));
        if (!isRecord(parsed)) {
            return failure('object-invalid', parsed, 'validation.object.requiredObject');
        }
        return { success: true, data: parsed };
    } catch {
        return failure('object-json', value, 'validation.object.invalidJson');
    }

}


function parseArray(property: Property, value: unknown): ParseSafeResult {

    let parsed: unknown;
    if (Array.isArray(value)) {
        parsed = value;
    } else {
        try {
            parsed = JSON.parse(String(value ?? ''));
        } catch {
            return failure('array-json', value, 'validation.array.invalidJson');
        }
    }

    if (!Array.isArray(parsed)) {
        return failure('array-invalid', parsed, 'validation.array.requiredArray');
    }

    if (typeof property.minItems === 'number' && parsed.length < property.minItems) {
        return failure('array-min-items', parsed, 'validation.array.minItems');
    }
    if (typeof property.maxItems === 'number' && parsed.length > property.maxItems) {
        return failure('array-max-items', parsed, 'validation.array.maxItems');
    }

    const items = property.items;
    if (items && typeof items === 'object' && items.type !== 'any') {
        for (let index = 0; index < parsed.length; index += 1) {
            const element = parsed[index];
            if (!matchesItemType(element, items)) {
                return {
                    success: false,
                    error: new ParseError([{
                        code: 'array-item-type',
                        input: element,
                        path: [index],
                        message: 'validation.array.itemType'
                    }])
                };
            }
        }
    }

    return { success: true, data: parsed };

}


function matchesItemType(value: unknown, items: PropertyItem): boolean {

    switch (items.type) {
        case 'boolean':
            return typeof value === 'boolean';
        case 'integer':
            return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
        case 'number':
            return typeof value === 'number' && Number.isFinite(value);
        case 'string':
            return typeof value === 'string';
        case 'object':
            return isRecord(value);
        case 'any':
            return true;
        default:
            return false;
    }

}


function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}


function failure(code: string, input: unknown, message: string): ParseSafeResult {
    return {
        success: false,
        error: new ParseError([{ code, input, path: [], message }])
    };
}
