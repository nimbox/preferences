import { describe, expect, it } from 'vitest';

import type { FormatValidator, Property, ScalarConstraints } from '../types';
import {
    checkScalarValue,
    coerceScalar,
    isInvalidEnumIssue,
    isInvalidFormatIssue,
    isInvalidJsonIssue,
    isInvalidPatternIssue,
    isInvalidTypeIssue,
    isPropertyError,
    isTooBigIssue,
    isTooSmallIssue,
    parse,
    PropertyError,
    safeParse,
    type SafeParseResult
} from './parse';


// A `Property` needs `scope`/`overridable` beyond the scalar constraints;
// this helper keeps the composition tests terse.
function property(constraints: Partial<Property> & { type: Property['type'] }): Property {
    return { scope: 'user', overridable: true, ...constraints } as Property;
}


function expectFailure(result: SafeParseResult) {
    expect(result.success).toBe(false);
    if (result.success) {
        throw new Error('expected a failure result');
    }
    return result.error.issues[0];
}


function expectSuccess(result: SafeParseResult) {
    expect(result.success).toBe(true);
    if (!result.success) {
        throw new Error('expected a success result');
    }
    return result.data;
}


// =============================================================================
// Phase 1 — Coercion (`coerceScalar`): unknown -> typed value
// =============================================================================

describe('coerceScalar', () => {

    describe('boolean', () => {

        const constraints: ScalarConstraints = { type: 'boolean' };

        it('passes booleans through', () => {
            expect(expectSuccess(coerceScalar(constraints, true))).toBe(true);
            expect(expectSuccess(coerceScalar(constraints, false))).toBe(false);
        });

        it('coerces the strings "true" and "false"', () => {
            expect(expectSuccess(coerceScalar(constraints, 'true'))).toBe(true);
            expect(expectSuccess(coerceScalar(constraints, 'false'))).toBe(false);
        });

        it('coerces other values by truthiness and never fails', () => {
            expect(expectSuccess(coerceScalar(constraints, ''))).toBe(false);
            expect(expectSuccess(coerceScalar(constraints, 'anything'))).toBe(true);
            expect(expectSuccess(coerceScalar(constraints, 0))).toBe(false);
            expect(expectSuccess(coerceScalar(constraints, 1))).toBe(true);
        });

    });

    describe('integer / number', () => {

        it('coerces numeric strings', () => {
            expect(expectSuccess(coerceScalar({ type: 'number' }, '3.5'))).toBe(3.5);
            expect(expectSuccess(coerceScalar({ type: 'integer' }, ' 42 '))).toBe(42);
        });

        it('fails invalid_type on empty input', () => {
            const issue = expectFailure(coerceScalar({ type: 'number' }, ''));
            expect(isInvalidTypeIssue(issue)).toBe(true);
        });

        it('fails invalid_type on non-numeric text', () => {
            const issue = expectFailure(coerceScalar({ type: 'number' }, 'abc'));
            expect(isInvalidTypeIssue(issue)).toBe(true);
        });

        it('fails invalid_type when an integer receives a fractional value', () => {
            const issue = expectFailure(coerceScalar({ type: 'integer' }, '1.5'));
            expect(isInvalidTypeIssue(issue)).toBe(true);
        });

    });

    describe('string', () => {

        it('coerces any value to a string and never fails', () => {
            expect(expectSuccess(coerceScalar({ type: 'string' }, 'hi'))).toBe('hi');
            expect(expectSuccess(coerceScalar({ type: 'string' }, 42))).toBe('42');
            expect(expectSuccess(coerceScalar({ type: 'string' }, null))).toBe('');
        });

    });

    describe('object', () => {

        const constraints: ScalarConstraints = { type: 'object' };

        it('passes records through', () => {
            const record = { a: 1 };
            expect(expectSuccess(coerceScalar(constraints, record))).toBe(record);
        });

        it('parses JSON object text', () => {
            expect(expectSuccess(coerceScalar(constraints, '{"a":1}'))).toEqual({ a: 1 });
        });

        it('fails invalid_json on malformed text', () => {
            const issue = expectFailure(coerceScalar(constraints, '{not json'));
            expect(isInvalidJsonIssue(issue)).toBe(true);
        });

        it('fails invalid_type when JSON parses to a non-record', () => {
            const issue = expectFailure(coerceScalar(constraints, '[1,2]'));
            expect(isInvalidTypeIssue(issue)).toBe(true);
        });

    });

    describe('any', () => {

        const constraints: ScalarConstraints = { type: 'any' };

        it('passes non-strings through unchanged', () => {
            expect(expectSuccess(coerceScalar(constraints, 42))).toBe(42);
            const obj = { a: 1 };
            expect(expectSuccess(coerceScalar(constraints, obj))).toBe(obj);
        });

        it('JSON-parses strings', () => {
            expect(expectSuccess(coerceScalar(constraints, '[1,2]'))).toEqual([1, 2]);
        });

        it('fails invalid_json on malformed text', () => {
            const issue = expectFailure(coerceScalar(constraints, 'not json'));
            expect(isInvalidJsonIssue(issue)).toBe(true);
        });

    });

});


// =============================================================================
// Phase 2 — Validation (`checkScalarValue`): constraints on a typed value
// =============================================================================

describe('checkScalarValue', () => {

    describe('numeric range', () => {

        it('accepts a value within bounds', () => {
            expect(expectSuccess(checkScalarValue({ type: 'number', minimum: 0, maximum: 10 }, 5))).toBe(5);
        });

        it('fails too_small below the minimum', () => {
            const issue = expectFailure(checkScalarValue({ type: 'number', minimum: 0 }, -1));
            expect(isTooSmallIssue(issue)).toBe(true);
        });

        it('fails too_big above the maximum', () => {
            const issue = expectFailure(checkScalarValue({ type: 'number', maximum: 10 }, 11));
            expect(isTooBigIssue(issue)).toBe(true);
        });

    });

    describe('enum', () => {

        const constraints: ScalarConstraints = { type: 'string', enum: ['a', 'b'] };

        it('accepts a member', () => {
            expect(expectSuccess(checkScalarValue(constraints, 'a'))).toBe('a');
        });

        it('fails invalid_enum on a non-member', () => {
            const issue = expectFailure(checkScalarValue(constraints, 'c'));
            expect(isInvalidEnumIssue(issue)).toBe(true);
        });

    });

    describe('string length and pattern', () => {

        it('fails too_small below minLength', () => {
            const issue = expectFailure(checkScalarValue({ type: 'string', minLength: 3 }, 'ab'));
            expect(isTooSmallIssue(issue)).toBe(true);
        });

        it('fails too_big above maxLength', () => {
            const issue = expectFailure(checkScalarValue({ type: 'string', maxLength: 3 }, 'abcd'));
            expect(isTooBigIssue(issue)).toBe(true);
        });

        it('fails invalid_pattern when the regex does not match', () => {
            const issue = expectFailure(checkScalarValue({ type: 'string', pattern: '^[0-9]+$' }, 'abc'));
            expect(isInvalidPatternIssue(issue)).toBe(true);
        });

    });

    describe('format gating', () => {

        const constraints: ScalarConstraints = { type: 'string', format: 'even' };
        const validators: Record<string, FormatValidator> = {
            even: (value) => value.length % 2 === 0
        };

        it('does not check format when formatValidators is omitted', () => {
            // The default-validation path: format is gated off entirely.
            expect(expectSuccess(checkScalarValue(constraints, 'abc'))).toBe('abc');
        });

        it('enforces format when validators are supplied', () => {
            expect(expectSuccess(checkScalarValue(constraints, 'abcd', validators))).toBe('abcd');
            const issue = expectFailure(checkScalarValue(constraints, 'abc', validators));
            expect(isInvalidFormatIssue(issue)).toBe(true);
        });

        it('fails closed when a declared format has no matching validator', () => {
            const issue = expectFailure(checkScalarValue(constraints, 'abcd', {}));
            expect(isInvalidFormatIssue(issue)).toBe(true);
        });

    });

});


// =============================================================================
// Composition — `parse` / `safeParse`: coerce, then validate, in order
// =============================================================================

describe('safeParse / parse composition', () => {

    it('runs coercion before validation (constraint issue surfaces, not a type issue)', () => {
        // "150" coerces fine to a number, then fails the maximum check.
        const issue = expectFailure(safeParse(property({ type: 'integer', maximum: 100 }), '150'));
        expect(isTooBigIssue(issue)).toBe(true);
    });

    it('stops at coercion when the value cannot be typed', () => {
        const issue = expectFailure(safeParse(property({ type: 'integer', maximum: 100 }), 'abc'));
        expect(isInvalidTypeIssue(issue)).toBe(true);
    });

    it('coerces and validates a string scalar end to end', () => {
        expect(expectSuccess(safeParse(property({ type: 'string', enum: ['a', 'b'] }), 'a'))).toBe('a');
    });

    describe('array', () => {

        const arrayProperty = property({
            type: 'array',
            items: { type: 'integer', minimum: 0 },
            minItems: 1
        });

        it('parses array JSON text and validates each element', () => {
            expect(expectSuccess(safeParse(arrayProperty, '[1,2,3]'))).toEqual([1, 2, 3]);
        });

        it('reports the index path of the first failing element', () => {
            const result = safeParse(arrayProperty, [1, -5, 3]);
            const issue = expectFailure(result);
            expect(isTooSmallIssue(issue)).toBe(true);
            expect(issue.path).toEqual([1]);
        });

        it('fails too_small below minItems', () => {
            const issue = expectFailure(safeParse(arrayProperty, []));
            expect(isTooSmallIssue(issue)).toBe(true);
        });

        it('fails invalid_json on malformed array text', () => {
            const issue = expectFailure(safeParse(arrayProperty, 'not json'));
            expect(isInvalidJsonIssue(issue)).toBe(true);
        });

    });

    describe('parse (throwing) vs safeParse', () => {

        it('parse throws a PropertyError on failure', () => {
            try {
                parse(property({ type: 'integer' }), 'abc');
                throw new Error('expected parse to throw');
            } catch (error) {
                expect(isPropertyError(error)).toBe(true);
                expect(error).toBeInstanceOf(PropertyError);
            }
        });

        it('parse returns the coerced + validated value on success', () => {
            expect(parse(property({ type: 'integer', maximum: 100 }), '42')).toBe(42);
        });

        it('safeParse returns a result object instead of throwing', () => {
            expect(safeParse(property({ type: 'integer' }), 'abc').success).toBe(false);
        });

    });

});
