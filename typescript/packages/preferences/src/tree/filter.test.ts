import { describe, expect, it } from 'vitest';

import type { Property } from '../types';
import { createPropertyFilter } from './filter';


function prop(opts: { description?: string } = {}): Property {
    const base: Record<string, unknown> = {
        type: 'string',
        scope: 'user',
        overridable: false
    };
    if (opts.description !== undefined) base.description = opts.description;
    return base as Property;
}


describe('createPropertyFilter — empty query', () => {

    it('returns undefined for an empty string', () => {
        expect(createPropertyFilter('')).toBeUndefined();
    });

    it('returns undefined for a whitespace-only string', () => {
        expect(createPropertyFilter('   ')).toBeUndefined();
    });

});


describe('createPropertyFilter — key matching', () => {

    it('matches a substring of the key', () => {
        const filter = createPropertyFilter('font');
        expect(filter?.('editor.fontSize', prop())).toBe(true);
    });

    it('rejects a key with no match and no matching description', () => {
        const filter = createPropertyFilter('zzz');
        expect(filter?.('editor.fontSize', prop())).toBe(false);
    });

    it('matches the key case-insensitively', () => {
        const filter = createPropertyFilter('FONT');
        expect(filter?.('editor.fontSize', prop())).toBe(true);
    });

    it('trims the query before matching', () => {
        const filter = createPropertyFilter('  font  ');
        expect(filter?.('editor.fontSize', prop())).toBe(true);
    });

});


describe('createPropertyFilter — description matching', () => {

    it('matches a substring of the description when the key does not match', () => {
        const filter = createPropertyFilter('size of');
        expect(filter?.('editor.fontSize', prop({ description: 'The size of the font' }))).toBe(true);
    });

    it('matches the description case-insensitively', () => {
        const filter = createPropertyFilter('SIZE');
        expect(filter?.('editor.x', prop({ description: 'controls size' }))).toBe(true);
    });

    it('returns false when neither key nor description matches', () => {
        const filter = createPropertyFilter('color');
        expect(filter?.('editor.fontSize', prop({ description: 'The size of the font' }))).toBe(false);
    });

    it('handles a property without a description', () => {
        const filter = createPropertyFilter('color');
        expect(filter?.('editor.fontSize', prop())).toBe(false);
    });

    it('ignores a non-string description', () => {
        const filter = createPropertyFilter('123');
        // description is not a string -> treated as no description text
        const weird = { type: 'string', scope: 'user', overridable: false, description: 123 } as unknown as Property;
        expect(filter?.('editor.fontSize', weird)).toBe(false);
    });

});
