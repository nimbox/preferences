import { describe, expect, it } from 'vitest';

import { DiagnosticCode } from '../diagnostics';
import type { Diagnostic, Property, Scope, Schema, Values } from '../types';
import { resolvePreferenceStates } from './resolvePreferenceStates';


function prop(opts: {
    type?: Property['type'];
    scope: Scope;
    overridable: boolean;
    default?: unknown;
}): Property {
    const base: Record<string, unknown> = {
        type: opts.type ?? 'string',
        scope: opts.scope,
        overridable: opts.overridable
    };
    if ('default' in opts) {
        base.default = opts.default;
    }
    return base as Property;
}

function byCode(diagnostics: ReadonlyArray<Diagnostic>, code: string): Diagnostic[] {
    return diagnostics.filter((d) => d.code === code);
}


// =============================================================================
// Selected scope upstream of the property's owning scope
// =============================================================================

describe('resolvePreferenceStates — selected scope upstream of property scope', () => {

    it('returns an all-default, non-editable state', () => {
        const scopes: Scope[] = ['system', 'global', 'user'];
        const schema: Schema = { 'a.b': prop({ scope: 'user', overridable: true, default: 'd' }) };
        const values: Values = { user: { 'a.b': 'usr' } };

        const { states } = resolvePreferenceStates('system', scopes, schema, values);
        const state = states['a.b'];

        expect(state).toEqual({
            value: 'd',
            isDefined: false,
            isOverridden: false,
            inheritedValue: 'd',
            inheritedScope: 'user',
            defaultValue: 'd',
            defaultScope: 'user'
        });
    });

});


// =============================================================================
// Owning scope, overridable
// =============================================================================

describe('resolvePreferenceStates — owning scope (overridable)', () => {

    const scopes: Scope[] = ['global', 'user'];

    it('marks a differing own value as defined and overridden, inheriting the default', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'v' } };

        const { states } = resolvePreferenceStates('global', scopes, schema, values);
        const state = states['a.b'];

        expect(state?.value).toBe('v');
        expect(state?.isDefined).toBe(true);
        expect(state?.isOverridden).toBe(true);
        expect(state?.inheritedValue).toBe('d');
        expect(state?.inheritedScope).toBe('global');
        expect(state?.defaultValue).toBe('d');
        expect(state?.defaultScope).toBe('global');
    });

    it('is defined but not overridden when the own value equals the default', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'd' } };

        const state = resolvePreferenceStates('global', scopes, schema, values).states['a.b'];
        expect(state?.isDefined).toBe(true);
        expect(state?.isOverridden).toBe(false);
    });

    it('falls back to the default when nothing is authored', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };

        const state = resolvePreferenceStates('global', scopes, schema, {}).states['a.b'];
        expect(state?.value).toBe('d');
        expect(state?.isDefined).toBe(false);
        expect(state?.isOverridden).toBe(false);
    });

});


// =============================================================================
// Downstream scope, overridable
// =============================================================================

describe('resolvePreferenceStates — downstream scope (overridable)', () => {

    const scopes: Scope[] = ['global', 'user'];

    it('shows the inherited own-scope value when the selected scope authors nothing', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'g' } };

        const state = resolvePreferenceStates('user', scopes, schema, values).states['a.b'];
        expect(state?.value).toBe('g');
        expect(state?.inheritedValue).toBe('g');
        expect(state?.inheritedScope).toBe('global');
        expect(state?.isDefined).toBe(false);
        expect(state?.isOverridden).toBe(false);
    });

    it('reports an override authored at the selected scope', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'g' }, user: { 'a.b': 'u' } };

        const state = resolvePreferenceStates('user', scopes, schema, values).states['a.b'];
        expect(state?.value).toBe('u');
        expect(state?.inheritedValue).toBe('g');
        expect(state?.inheritedScope).toBe('global');
        expect(state?.isDefined).toBe(true);
        expect(state?.isOverridden).toBe(true);
    });

    it('is defined but not overridden when the selected value equals what it inherits', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'g' }, user: { 'a.b': 'g' } };

        const state = resolvePreferenceStates('user', scopes, schema, values).states['a.b'];
        expect(state?.isDefined).toBe(true);
        expect(state?.isOverridden).toBe(false);
    });

    it('inherits from the closest defining scope, skipping intermediates', () => {
        const wide: Scope[] = ['s0', 's1', 's2', 's3'];
        const schema: Schema = { 'a.b': prop({ scope: 's0', overridable: true, default: 'd' }) };
        const values: Values = { s1: { 'a.b': 'v1' }, s3: { 'a.b': 'v3' } };

        const state = resolvePreferenceStates('s3', wide, schema, values).states['a.b'];
        expect(state?.value).toBe('v3');
        expect(state?.inheritedValue).toBe('v1');
        expect(state?.inheritedScope).toBe('s1');
        expect(state?.isOverridden).toBe(true);
    });

    it('detects object overrides structurally', () => {
        const schema: Schema = {
            obj: prop({ type: 'object', scope: 'global', overridable: true, default: { a: 1 } })
        };
        const values: Values = { global: { obj: { a: 1 } }, user: { obj: { a: 2 } } };

        const state = resolvePreferenceStates('user', scopes, schema, values).states.obj;
        expect(state?.isOverridden).toBe(true);
    });

});


// =============================================================================
// Non-overridable
// =============================================================================

describe('resolvePreferenceStates — non-overridable', () => {

    const scopes: Scope[] = ['global', 'user'];

    it('inherits the default at the owning scope', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'v' } };

        const { states, diagnostics } = resolvePreferenceStates('global', scopes, schema, values);
        const state = states['a.b'];

        expect(state?.value).toBe('v');
        expect(state?.inheritedValue).toBe('d');
        expect(state?.inheritedScope).toBe('global');
        expect(state?.isDefined).toBe(true);
        expect(state?.isOverridden).toBe(true);
        expect(diagnostics).toEqual([]);
    });

    it('keeps the locked value and warns when a downstream scope authors one', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { user: { 'a.b': 'usr' } };

        const { states, diagnostics } = resolvePreferenceStates('user', scopes, schema, values);
        const state = states['a.b'];

        expect(state?.value).toBe('d');          // not 'usr' — locked at global
        expect(state?.isDefined).toBe(false);
        expect(state?.isOverridden).toBe(false);

        const warnings = byCode(diagnostics, DiagnosticCode.NON_OVERRIDABLE_OVERRIDE);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.scope).toBe('user');
        expect(warnings[0]?.key).toBe('a.b');
    });

});


// =============================================================================
// Null and missing values
// =============================================================================

describe('resolvePreferenceStates — null and missing values', () => {

    const scopes: Scope[] = ['global', 'user'];

    it('treats a null selected-scope value as absent', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': null } };

        const state = resolvePreferenceStates('global', scopes, schema, values).states['a.b'];
        expect(state?.value).toBe('d');
        expect(state?.isDefined).toBe(false);
    });

    it('reports an undefined default and the owning scope as defaultScope', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true }) };

        const state = resolvePreferenceStates('global', scopes, schema, {}).states['a.b'];
        expect(state?.defaultValue).toBeUndefined();
        expect(state?.defaultScope).toBe('global');
        expect(state?.value).toBeUndefined();
    });

});


// =============================================================================
// Scope selection
// =============================================================================

describe('resolvePreferenceStates — scope selection', () => {

    const scopes: Scope[] = ['global', 'user'];
    const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
    const values: Values = { user: { 'a.b': 'u' } };

    it('uses the last scope when the scope argument is empty', () => {
        const empty = resolvePreferenceStates('', scopes, schema, values).states['a.b'];
        const explicit = resolvePreferenceStates('user', scopes, schema, values).states['a.b'];
        expect(empty).toEqual(explicit);
        expect(empty?.value).toBe('u');
    });

    it('uses the last scope when the scope argument is not in the list', () => {
        const unknown = resolvePreferenceStates('ghost', scopes, schema, values).states['a.b'];
        expect(unknown?.value).toBe('u');
        expect(unknown?.isDefined).toBe(true);
    });

});


// =============================================================================
// Diagnostics and multiple properties
// =============================================================================

describe('resolvePreferenceStates — diagnostics and multiple properties', () => {

    const scopes: Scope[] = ['global', 'user'];

    it('warns and omits the state for a property with an unknown scope', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'ghost', overridable: true, default: 'd' }) };

        const { states, diagnostics } = resolvePreferenceStates('user', scopes, schema, {});
        expect(states['a.b']).toBeUndefined();
        expect(byCode(diagnostics, DiagnosticCode.UNKNOWN_PROPERTY_SCOPE)).toHaveLength(1);
    });

    it('produces no diagnostics on a clean resolution', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { user: { 'a.b': 'u' } };
        const { diagnostics } = resolvePreferenceStates('user', scopes, schema, values);
        expect(diagnostics).toEqual([]);
    });

    it('computes a state per property independently', () => {
        const schema: Schema = {
            'a.b': prop({ scope: 'global', overridable: true, default: 1 }),
            'c.d': prop({ scope: 'global', overridable: false, default: 'x' })
        };
        const values: Values = { global: { 'a.b': 2 } };

        const { states } = resolvePreferenceStates('global', scopes, schema, values);
        expect(states['a.b']?.value).toBe(2);
        expect(states['a.b']?.isDefined).toBe(true);
        expect(states['c.d']?.value).toBe('x');
        expect(states['c.d']?.isDefined).toBe(false);
    });

});
