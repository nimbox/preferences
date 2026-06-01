import { describe, expect, it } from 'vitest';
import { valuesAreEqual } from './valuesAreEqual';
import { resolvePreferenceStates } from '../resolve/resolvePreferenceStates';
import type { Schema, Values } from '../types';


describe('valuesAreEqual', () => {

    it('compares equal primitives as equal', () => {
        expect(valuesAreEqual(1, 1)).toBe(true);
        expect(valuesAreEqual('a', 'a')).toBe(true);
        expect(valuesAreEqual(true, true)).toBe(true);
    });

    it('compares differing primitives as unequal', () => {
        expect(valuesAreEqual(1, 2)).toBe(false);
        expect(valuesAreEqual('a', 'b')).toBe(false);
        expect(valuesAreEqual(true, false)).toBe(false);
    });

    it('treats null and undefined per Object.is', () => {
        expect(valuesAreEqual(null, null)).toBe(true);
        expect(valuesAreEqual(undefined, undefined)).toBe(true);
        expect(valuesAreEqual(null, undefined)).toBe(false);
    });

    it('treats NaN as equal to NaN', () => {
        expect(valuesAreEqual(NaN, NaN)).toBe(true);
    });

    // The regression this fix targets: JSON.stringify is key-order
    // sensitive, so reordered keys used to read as an override.
    it('treats objects with reordered keys as equal', () => {
        expect(valuesAreEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });

    it('treats nested objects with reordered keys as equal', () => {
        expect(valuesAreEqual({ x: { a: 1, b: 2 } }, { x: { b: 2, a: 1 } })).toBe(true);
    });

    it('respects array order', () => {
        expect(valuesAreEqual([1, 2], [1, 2])).toBe(true);
        expect(valuesAreEqual([1, 2], [2, 1])).toBe(false);
    });

    it('compares arrays of differing length as unequal', () => {
        expect(valuesAreEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it('treats arrays of objects with reordered keys as equal', () => {
        expect(valuesAreEqual(
            [{ a: 1, b: 2 }],
            [{ b: 2, a: 1 }]
        )).toBe(true);
    });

    it('detects extra or missing keys', () => {
        expect(valuesAreEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
        expect(valuesAreEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('detects a differing nested value', () => {
        expect(valuesAreEqual({ x: { a: 1 } }, { x: { a: 2 } })).toBe(false);
    });

    it('distinguishes arrays from objects and across types', () => {
        expect(valuesAreEqual([], {})).toBe(false);
        expect(valuesAreEqual(1, '1')).toBe(false);
    });

});


describe('resolvePreferenceStates — isOverridden uses structural equality', () => {

    it('does not flag a reordered-key object as an override', () => {

        const schema: Schema = {
            'editor.layout': {
                type: 'object',
                scope: 'global',
                overridable: true,
                default: { a: 1, b: 2 }
            }
        };

        // `user` authors the same object the `global` default provides,
        // only with the keys in a different order.
        const values: Values = {
            user: { 'editor.layout': { b: 2, a: 1 } }
        };

        const { states } = resolvePreferenceStates('user', ['global', 'user'], schema, values);
        const state = states['editor.layout'];

        expect(state?.isDefined).toBe(true);
        expect(state?.isOverridden).toBe(false);

    });

});
