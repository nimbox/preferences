import type { InvalidEnumPropertyIssue, InvalidFormatPropertyIssue, InvalidJsonPropertyIssue, InvalidPatternPropertyIssue, InvalidTypePropertyIssue, IssuePathSegment, PropertyIssue, PropertyIssueBase, TooBigPropertyIssue, TooSmallPropertyIssue } from '../generated/issue';
import type { FormatValidator, Property, ScalarConstraints } from '../types';


// -----------------------------------------------------------------------------
// Public error type, parse types, and exported issue guards
// -----------------------------------------------------------------------------

export class PropertyError extends Error {

    readonly issues: PropertyIssue[];

    constructor(issues: PropertyIssue[]) {
        super(issues[0]?.message ?? 'Parse failed');
        this.name = 'PropertyError';
        this.issues = issues;
    }

}

export type ParsePropertyValue = (property: Property, value: unknown, formatValidators?: Record<string, FormatValidator>) => unknown;

export type SafeParseResult =
    | { success: true; data: unknown }
    | { success: false; error: PropertyError };


export function isPropertyError(error: unknown): error is PropertyError {
    return error instanceof PropertyError;
}


export function isTooSmallIssue(issue: PropertyIssue): issue is TooSmallPropertyIssue {
    return issue.code === 'too_small';
}


export function isTooBigIssue(issue: PropertyIssue): issue is TooBigPropertyIssue {
    return issue.code === 'too_big';
}


export function isInvalidTypeIssue(issue: PropertyIssue): issue is InvalidTypePropertyIssue {
    return issue.code === 'invalid_type';
}


export function isInvalidEnumIssue(issue: PropertyIssue): issue is InvalidEnumPropertyIssue {
    return issue.code === 'invalid_enum';
}


export function isInvalidPatternIssue(issue: PropertyIssue): issue is InvalidPatternPropertyIssue {
    return issue.code === 'invalid_pattern';
}


export function isInvalidFormatIssue(issue: PropertyIssue): issue is InvalidFormatPropertyIssue {
    return issue.code === 'invalid_format';
}


export function isInvalidJsonIssue(issue: PropertyIssue): issue is InvalidJsonPropertyIssue {
    return issue.code === 'invalid_json';
}


// -----------------------------------------------------------------------------
// Entry points: throwing `parse` and `safeParse` dispatcher by property kind
// -----------------------------------------------------------------------------

export const parse: ParsePropertyValue = (property, value, formatValidators) => {

    const result = safeParse(property, value, formatValidators);
    if (!result.success) {
        throw result.error;
    }

    return result.data;

};


export function safeParse(property: Property, value: unknown, formatValidators?: Record<string, FormatValidator>): SafeParseResult {

    switch (property.type) {

        case 'boolean':
        case 'integer':
        case 'number':
        case 'string':
            return parseScalar(property as ScalarConstraints, value, formatValidators);

        case 'array':
            return parseArray(property, value, formatValidators);

        case 'object': {
            const coerced = coerceObject(value);
            return coerced.success ? checkObject(coerced.data) : coerced;
        }

        case 'any': {
            const coerced = coerceAny(value);
            return coerced.success ? checkAny(coerced.data) : coerced;
        }

        default: {
            const coerced = coerceAny(value);
            return coerced.success ? checkAny(coerced.data) : coerced;
        }

    }

}


// -----------------------------------------------------------------------------
// The two explicit phases
//
// Parsing a scalar is two distinct steps, composed by `parseScalar`:
//
//   1. Coercion  (`coerceScalar`)  — `unknown` → a value of the declared
//      type. Coercion may fail with `invalid_type` (e.g. "abc" is not a
//      number) or `invalid_json` (object/array text that does not parse).
//
//   2. Validation (`checkScalarValue`) — checks the typed value against the
//      scalar constraints (enum, min/max, length, pattern, format). Validation
//      may fail with `too_small`, `too_big`, `invalid_enum`, `invalid_pattern`,
//      or `invalid_format`.
//
// The two phases map cleanly onto the `PropertyIssue` codes, and either can be
// run on its own. `coerceScalar` is used at event time where input arrives as
// strings from the DOM. `checkScalarValue` is reused by `validateProperties`
// for default validation, where the value is already typed (no coercion) and
// — by omitting `formatValidators` — format is not checked.
// -----------------------------------------------------------------------------

/**
 * Coerce `value` to the type declared in `constraints`, then validate it
 * against the scalar constraints. The full event-time pipeline.
 */
export function parseScalar(constraints: ScalarConstraints, value: unknown, formatValidators?: Record<string, FormatValidator>): SafeParseResult {

    const coerced = coerceScalar(constraints, value);
    if (!coerced.success) {
        return coerced;
    }

    return checkScalarValue(constraints, coerced.data, formatValidators);

}


/**
 * Phase 1 — coercion. Turn `value` into a value of the type declared in
 * `constraints`. Performs no constraint checking. May fail with
 * `invalid_type` or `invalid_json`.
 */
export function coerceScalar(constraints: ScalarConstraints, value: unknown): SafeParseResult {

    switch (constraints.type) {

        case 'boolean':
            return coerceBoolean(value);

        case 'integer':
            return coerceNumeric(value, true);

        case 'number':
            return coerceNumeric(value, false);

        case 'string':
            return coerceString(value);

        case 'object':
            return coerceObject(value);

        case 'any':
            return coerceAny(value);

        default:
            return coerceAny(value);

    }

}


/**
 * Phase 2 — validation. Check `value`, assumed to already be of the declared
 * scalar type, against the constraints (enum/min/max/length/pattern/format);
 * no coercion. May fail with `too_small`, `too_big`, `invalid_enum`,
 * `invalid_pattern`, or `invalid_format`.
 *
 * `formatValidators` gates `format` checking: when omitted (the default
 * validation path used by `validateProperties`) format is not checked at all.
 */
export function checkScalarValue(constraints: ScalarConstraints, value: unknown, formatValidators?: Record<string, FormatValidator>): SafeParseResult {

    switch (constraints.type) {

        case 'boolean':
            return checkBoolean(value as boolean);

        case 'integer':
        case 'number':
            return checkNumeric(constraints, value as number);

        case 'string':
            return checkString(constraints, value as string, formatValidators);

        case 'object':
            return checkObject(value);

        case 'any':
            return checkAny(value);

        default:
            return checkAny(value);

    }

}


// -----------------------------------------------------------------------------
// Internal: `PropertyIssue` builders and `fail` helper
// -----------------------------------------------------------------------------

interface IssueFields {
    input: unknown;
    path?: IssuePathSegment[];
    message: string;
}


type IssueInput = Exclude<PropertyIssueBase['input'], undefined>;


function toIssueInput(input: unknown): IssueInput {
    if (input === undefined) {
        return null;
    }
    return input as IssueInput;
}


function tooSmall(params: IssueFields & { origin: TooSmallPropertyIssue['origin']; minimum: number }): TooSmallPropertyIssue {
    return {
        code: 'too_small',
        origin: params.origin,
        minimum: params.minimum,
        path: params.path ?? [],
        message: params.message,
        input: toIssueInput(params.input)
    };
}


function tooBig(params: IssueFields & { origin: TooBigPropertyIssue['origin']; maximum: number }): TooBigPropertyIssue {
    return {
        code: 'too_big',
        origin: params.origin,
        maximum: params.maximum,
        path: params.path ?? [],
        message: params.message,
        input: toIssueInput(params.input)
    };
}


function invalidType(params: IssueFields & { expected: string }): InvalidTypePropertyIssue {
    return {
        code: 'invalid_type',
        expected: params.expected,
        path: params.path ?? [],
        message: params.message,
        input: toIssueInput(params.input)
    };
}


function invalidEnum(params: IssueFields & { options: readonly unknown[] }): InvalidEnumPropertyIssue {
    return {
        code: 'invalid_enum',
        options: [...params.options] as InvalidEnumPropertyIssue['options'],
        path: params.path ?? [],
        message: params.message,
        input: toIssueInput(params.input)
    };
}


function invalidPattern(params: IssueFields & { pattern: string }): InvalidPatternPropertyIssue {
    return {
        code: 'invalid_pattern',
        pattern: params.pattern,
        path: params.path ?? [],
        message: params.message,
        input: toIssueInput(params.input)
    };
}


function invalidFormat(params: IssueFields & { format: string }): InvalidFormatPropertyIssue {
    return {
        code: 'invalid_format',
        format: params.format,
        path: params.path ?? [],
        message: params.message,
        input: toIssueInput(params.input)
    };
}


function invalidJson(params: IssueFields): InvalidJsonPropertyIssue {
    return {
        code: 'invalid_json',
        path: params.path ?? [],
        message: params.message,
        input: toIssueInput(params.input)
    };
}


function fail(issue: PropertyIssue): SafeParseResult {
    return {
        success: false,
        error: new PropertyError([issue])
    };
}


// -----------------------------------------------------------------------------
// Boolean
// -----------------------------------------------------------------------------

// Coercion: any → boolean. Never fails.
function coerceBoolean(value: unknown): SafeParseResult {

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

    return { success: true, data: coerced };

}


// Validation: booleans carry no constraints.
function checkBoolean(value: boolean): SafeParseResult {

    return { success: true, data: value };

}


// -----------------------------------------------------------------------------
// Number / integer
// -----------------------------------------------------------------------------

// Coercion: string/unknown → finite number (or integer). Fails with
// `invalid_type` when the text is empty, non-numeric, or (for integers) not a
// whole number.
function coerceNumeric(value: unknown, integer: boolean): SafeParseResult {

    const text = String(value ?? '').trim();
    if (!text) {
        return fail(invalidType({
            expected: integer ? 'integer' : 'number',
            input: value,
            message: integer ? 'validation.integer.required' : 'validation.number.required'
        }));
    }

    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
        return fail(invalidType({
            expected: integer ? 'integer' : 'number',
            input: value,
            message: integer ? 'validation.integer.invalid' : 'validation.number.invalid'
        }));
    }

    if (integer && !Number.isInteger(parsed)) {
        return fail(invalidType({
            expected: 'integer',
            input: value,
            message: 'validation.integer.invalid'
        }));
    }

    return { success: true, data: parsed };

}


// Validation: numeric range (min/max), then enum membership.
function checkNumeric(constraints: ScalarConstraints, parsed: number): SafeParseResult {

    if (typeof constraints.minimum === 'number' && parsed < constraints.minimum) {
        return fail(tooSmall({
            origin: 'number',
            minimum: constraints.minimum,
            input: parsed,
            message: 'validation.number.minimum'
        }));
    }
    if (typeof constraints.maximum === 'number' && parsed > constraints.maximum) {
        return fail(tooBig({
            origin: 'number',
            maximum: constraints.maximum,
            input: parsed,
            message: 'validation.number.maximum'
        }));
    }

    return checkEnum(constraints, parsed);

}


// -----------------------------------------------------------------------------
// String
// -----------------------------------------------------------------------------

// Coercion: any → string. Never fails.
function coerceString(value: unknown): SafeParseResult {

    return { success: true, data: String(value ?? '') };

}


// Validation: length (min/max), pattern, format, then enum membership.
// `formatValidators` gates `format` checking: when omitted (e.g. the
// `checkScalarValue` default-validation path) format is not checked at
// all. When supplied — even as `{}` — format is enforced: a declared
// `format` with no matching validator fails closed.
function checkString(constraints: ScalarConstraints, parsed: string, formatValidators?: Record<string, FormatValidator>): SafeParseResult {

    if (typeof constraints.minLength === 'number' && parsed.length < constraints.minLength) {
        return fail(tooSmall({
            origin: 'string',
            minimum: constraints.minLength,
            input: parsed,
            message: 'validation.string.minLength'
        }));
    }
    if (typeof constraints.maxLength === 'number' && parsed.length > constraints.maxLength) {
        return fail(tooBig({
            origin: 'string',
            maximum: constraints.maxLength,
            input: parsed,
            message: 'validation.string.maxLength'
        }));
    }

    if (typeof constraints.pattern === 'string' && constraints.pattern.length > 0) {
        let regex: RegExp | null = null;
        try {
            regex = new RegExp(constraints.pattern);
        } catch {
            regex = null;
        }
        if (regex && !regex.test(parsed)) {
            return fail(invalidPattern({
                pattern: constraints.pattern,
                input: parsed,
                message: String(constraints.patternErrorMessage || 'validation.string.pattern')
            }));
        }
    }

    if (formatValidators !== undefined && typeof constraints.format === 'string' && constraints.format.length > 0) {
        const validator = formatValidators[constraints.format];
        // Fail closed: an unsupplied validator counts as "did not pass".
        if (!validator || !validator(parsed)) {
            return fail(invalidFormat({
                format: constraints.format,
                input: parsed,
                message: 'validation.string.format'
            }));
        }
    }

    return checkEnum(constraints, parsed);

}


// -----------------------------------------------------------------------------
// Enum (shared terminal check for numeric and string scalars)
// -----------------------------------------------------------------------------

function checkEnum(constraints: ScalarConstraints, value: unknown): SafeParseResult {

    if (Array.isArray(constraints.enum) && constraints.enum.length > 0) {
        const member = constraints.enum.some((candidate) => candidate === value);
        if (!member) {
            return fail(invalidEnum({
                options: constraints.enum,
                input: value,
                message: 'validation.enum.mismatch'
            }));
        }
    }

    return { success: true, data: value };

}


// -----------------------------------------------------------------------------
// Array
// -----------------------------------------------------------------------------

function parseArray(property: Property, value: unknown, formatValidators?: Record<string, FormatValidator>): SafeParseResult {

    const coerced = coerceArray(value);
    if (!coerced.success) {
        return coerced;
    }

    return checkArray(property, coerced.data as unknown[], formatValidators);

}


// Coercion: array passes through; a string is `JSON.parse`d. Fails with
// `invalid_json` (text is not JSON) or `invalid_type` (parsed to a non-array).
function coerceArray(value: unknown): SafeParseResult {

    let parsed: unknown;
    if (Array.isArray(value)) {
        parsed = value;
    } else {
        try {
            parsed = JSON.parse(String(value ?? ''));
        } catch {
            return fail(invalidJson({
                input: value,
                message: 'validation.array.invalidJson'
            }));
        }
    }

    if (!Array.isArray(parsed)) {
        return fail(invalidType({
            expected: 'array',
            input: parsed,
            message: 'validation.array.requiredArray'
        }));
    }

    return { success: true, data: parsed };

}


// Validation: array length (min/max), then coerce + validate each element
// against the `items` constraints.
function checkArray(property: Property, parsed: unknown[], formatValidators?: Record<string, FormatValidator>): SafeParseResult {

    if (typeof property.minItems === 'number' && parsed.length < property.minItems) {
        return fail(tooSmall({
            origin: 'array',
            minimum: property.minItems,
            input: parsed,
            message: 'validation.array.minItems'
        }));
    }
    if (typeof property.maxItems === 'number' && parsed.length > property.maxItems) {
        return fail(tooBig({
            origin: 'array',
            maximum: property.maxItems,
            input: parsed,
            message: 'validation.array.maxItems'
        }));
    }

    const items = property.items;
    if (items && typeof items === 'object' && items.type !== 'any') {
        const itemsAsScalar = items as unknown as ScalarConstraints;
        const result: unknown[] = [];
        for (let index = 0; index < parsed.length; index += 1) {
            const element = parsed[index];
            const itemResult = parseScalar(itemsAsScalar, element, formatValidators);
            if (!itemResult.success) {
                return {
                    success: false,
                    error: new PropertyError(itemResult.error.issues.map((issue) => ({
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


// -----------------------------------------------------------------------------
// Object
// -----------------------------------------------------------------------------

// Coercion: a record passes through; a string is `JSON.parse`d. Fails with
// `invalid_json` (text is not JSON) or `invalid_type` (parsed to a non-record).
function coerceObject(value: unknown): SafeParseResult {

    if (isRecord(value)) {
        return { success: true, data: value };
    }

    try {
        const parsed = JSON.parse(String(value ?? ''));
        if (!isRecord(parsed)) {
            return fail(invalidType({
                expected: 'object',
                input: parsed,
                message: 'validation.object.requiredObject'
            }));
        }
        return { success: true, data: parsed };
    } catch {
        return fail(invalidJson({
            input: value,
            message: 'validation.object.invalidJson'
        }));
    }

}


// Validation: objects carry no constraints.
function checkObject(value: unknown): SafeParseResult {

    return { success: true, data: value };

}


// -----------------------------------------------------------------------------
// Any (optional JSON parse when value is a string)
// -----------------------------------------------------------------------------

// Coercion: non-strings pass through unchanged; a string is `JSON.parse`d.
// Fails with `invalid_json` when the string is not valid JSON.
function coerceAny(value: unknown): SafeParseResult {

    if (typeof value !== 'string') {
        return { success: true, data: value };
    }

    try {
        return { success: true, data: JSON.parse(value) };
    } catch {
        return fail(invalidJson({
            input: value,
            message: 'validation.any.invalidJson'
        }));
    }

}


// Validation: `any` carries no constraints.
function checkAny(value: unknown): SafeParseResult {

    return { success: true, data: value };

}


// -----------------------------------------------------------------------------
// Small utilities
// -----------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
