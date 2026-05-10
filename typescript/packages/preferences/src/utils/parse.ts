import type { Property, ScalarConstraints } from '../types';


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
        case 'integer':
        case 'number':
        case 'string':
            return parseScalar(property as ScalarConstraints, value);

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


/**
 * Coerce `value` to the type declared in `constraints`, then check
 * the scalar constraints (enum, min/max, length, pattern). Used at
 * event time where input values arrive as strings from the DOM.
 *
 * For default validation (where coercion is not desired) call
 * `checkScalarValue` instead.
 */
export function parseScalar(constraints: ScalarConstraints, value: unknown): ParseSafeResult {

    switch (constraints.type) {

        case 'boolean':
            return parseBoolean(constraints, value);

        case 'integer':
            return parseNumeric(constraints, value, true);

        case 'number':
            return parseNumeric(constraints, value, false);

        case 'string':
            return parseString(constraints, value);

        case 'object':
            return parseObject(value);

        case 'any':
            return { success: true, data: value };

        default:
            return { success: true, data: value };

    }

}


/**
 * Constraint check that assumes `value` is already of the declared
 * scalar type. Performs only enum/min/max/length/pattern checks; no
 * coercion. Used by `validateDefault` after a strict type check.
 */
export function checkScalarValue(constraints: ScalarConstraints, value: unknown): ParseSafeResult {

    switch (constraints.type) {

        case 'boolean':
            return checkEnum(constraints, value);

        case 'integer':
        case 'number':
            return checkNumeric(constraints, value as number);

        case 'string':
            return checkString(constraints, value as string);

        case 'object':
        case 'any':
        default:
            return { success: true, data: value };

    }

}


function parseBoolean(constraints: ScalarConstraints, value: unknown): ParseSafeResult {

    let coerced: boolean;
    if (typeof value === 'boolean') {
        coerced = value;
    } else if (typeof value === 'string') {
        if (value === 'true') coerced = true;
        else if (value === 'false') coerced = false;
        else coerced = Boolean(value);
    } else {
        coerced = Boolean(value);
    }

    return checkEnum(constraints, coerced);

}


function parseNumeric(constraints: ScalarConstraints, value: unknown, integer: boolean): ParseSafeResult {

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

    return checkNumeric(constraints, parsed);

}


function parseString(constraints: ScalarConstraints, value: unknown): ParseSafeResult {

    const parsed = String(value ?? '');
    return checkString(constraints, parsed);

}


function checkNumeric(constraints: ScalarConstraints, parsed: number): ParseSafeResult {

    if (typeof constraints.minimum === 'number' && parsed < constraints.minimum) {
        return failure('number-minimum', parsed, 'validation.number.minimum');
    }
    if (typeof constraints.maximum === 'number' && parsed > constraints.maximum) {
        return failure('number-maximum', parsed, 'validation.number.maximum');
    }

    return checkEnum(constraints, parsed);

}


function checkString(constraints: ScalarConstraints, parsed: string): ParseSafeResult {

    if (typeof constraints.minLength === 'number' && parsed.length < constraints.minLength) {
        return failure('string-min-length', parsed, 'validation.string.minLength');
    }
    if (typeof constraints.maxLength === 'number' && parsed.length > constraints.maxLength) {
        return failure('string-max-length', parsed, 'validation.string.maxLength');
    }

    if (typeof constraints.pattern === 'string' && constraints.pattern.length > 0) {
        let regex: RegExp | null = null;
        try {
            regex = new RegExp(constraints.pattern);
        } catch {
            regex = null;
        }
        if (regex && !regex.test(parsed)) {
            return failure(
                'string-pattern',
                parsed,
                String(constraints.patternErrorMessage || 'validation.string.pattern')
            );
        }
    }

    return checkEnum(constraints, parsed);

}


function checkEnum(constraints: ScalarConstraints, value: unknown): ParseSafeResult {

    if (Array.isArray(constraints.enum) && constraints.enum.length > 0) {
        const member = constraints.enum.some((candidate) => candidate === value);
        if (!member) {
            return failure('enum-mismatch', value, 'validation.enum.mismatch');
        }
    }

    return { success: true, data: value };

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
        const itemsAsScalar = items as unknown as ScalarConstraints;
        const result: unknown[] = [];
        for (let index = 0; index < parsed.length; index += 1) {
            const element = parsed[index];
            const itemResult = parseScalar(itemsAsScalar, element);
            if (!itemResult.success) {
                return {
                    success: false,
                    error: new ParseError(itemResult.error.issues.map((issue) => ({
                        ...issue,
                        path: [index, ...issue.path]
                    })))
                };
            }
            result.push(itemResult.data);
        }
        return { success: true, data: result };
    }

    return { success: true, data: parsed };

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
