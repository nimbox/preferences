import { describe, expect, it } from 'vitest';

import { DiagnosticCode } from '../diagnostics';
import type { Diagnostic, Property, Scope, Schema, Values } from '../types';
import { resolvePreferences } from './resolvePreferences';


// A `Property` needs `type`/`scope`/`overridable`; `default` is included
// only when explicitly supplied so "no default" cases stay faithful.
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

function codes(diagnostics: ReadonlyArray<Diagnostic>): string[] {
    return diagnostics.map((d) => d.code);
}

function byCode(diagnostics: ReadonlyArray<Diagnostic>, code: string): Diagnostic[] {
    return diagnostics.filter((d) => d.code === code);
}


// =============================================================================
// Defaults and own-scope values
// =============================================================================

describe('resolvePreferences — defaults and own-scope values', () => {

    const scopes: Scope[] = ['system', 'global', 'user'];

    it('falls back to the default when no value is authored', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, {});
        expect(preferences['a.b']).toBe('d');
        expect(diagnostics).toEqual([]);
    });

    it('omits the key entirely when there is no default and no value', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false }) };
        const { preferences } = resolvePreferences(scopes, schema, {});
        expect('a.b' in preferences).toBe(false);
    });

    it('uses the own-scope value over the default', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'owned' } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe('owned');
    });

    it('preserves falsy own-scope values instead of substituting the default', () => {
        const schema: Schema = {
            'n': prop({ type: 'number', scope: 'global', overridable: false, default: 10 }),
            'b': prop({ type: 'boolean', scope: 'global', overridable: false, default: true }),
            's': prop({ type: 'string', scope: 'global', overridable: false, default: 'x' })
        };
        const values: Values = { global: { n: 0, b: false, s: '' } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences.n).toBe(0);
        expect(preferences.b).toBe(false);
        expect(preferences.s).toBe('');
    });

    it('treats a null own-scope value as absent and falls back to the default', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { global: { 'a.b': null } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe('d');
    });

});


// =============================================================================
// Overridable properties — downstream scopes may replace the value
// =============================================================================

describe('resolvePreferences — overridable', () => {

    const scopes: Scope[] = ['system', 'global', 'user'];

    it('lets a downstream scope override the own-scope value', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'system', overridable: true, default: 'd' }) };
        const values: Values = { system: { 'a.b': 'sys' }, user: { 'a.b': 'usr' } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe('usr');
    });

    it('takes the last present downstream value among several', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'system', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'glob' }, user: { 'a.b': 'usr' } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe('usr');
    });

    it('applies a downstream override even when it is not the last scope', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'system', overridable: true, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'glob' } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe('glob');
    });

    it('ignores a null downstream value and keeps the upstream value', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'system', overridable: true, default: 'd' }) };
        const values: Values = { system: { 'a.b': 'sys' }, user: { 'a.b': null } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe('sys');
    });

    it('lets a falsy downstream value override a truthy default', () => {
        const schema: Schema = { flag: prop({ type: 'boolean', scope: 'system', overridable: true, default: true }) };
        const values: Values = { user: { flag: false } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences.flag).toBe(false);
    });

    it('resolves to a downstream value when there is no default', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'system', overridable: true }) };
        const values: Values = { user: { 'a.b': 'usr' } };
        const { preferences } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe('usr');
    });

    it('omits the key when nothing is authored and there is no default', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'system', overridable: true }) };
        const { preferences } = resolvePreferences(scopes, schema, {});
        expect('a.b' in preferences).toBe(false);
    });

});


// =============================================================================
// Non-overridable properties — locked at the owning scope
// =============================================================================

describe('resolvePreferences — non-overridable', () => {

    it('ignores a downstream value and emits NON_OVERRIDABLE_OVERRIDE', () => {
        const scopes: Scope[] = ['global', 'user'];
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { user: { 'a.b': 'usr' } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        expect(preferences['a.b']).toBe('d');
        const warnings = byCode(diagnostics, DiagnosticCode.NON_OVERRIDABLE_OVERRIDE);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.scope).toBe('user');
        expect(warnings[0]?.key).toBe('a.b');
    });

    it('emits one warning per downstream scope that authors a value', () => {
        const scopes: Scope[] = ['a', 'b', 'c', 'd'];
        const schema: Schema = { 'k.x': prop({ scope: 'a', overridable: false, default: 'd' }) };
        const values: Values = { c: { 'k.x': 'C' }, d: { 'k.x': 'D' } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        expect(preferences['k.x']).toBe('d');
        const warnings = byCode(diagnostics, DiagnosticCode.NON_OVERRIDABLE_OVERRIDE);
        expect(warnings.map((w) => w.scope)).toEqual(['c', 'd']);
    });

});


// =============================================================================
// Upstream values — authored before the property's owning scope
// =============================================================================

describe('resolvePreferences — upstream values', () => {

    const scopes: Scope[] = ['system', 'global', 'user'];

    it('ignores an upstream value and emits UPSTREAM_VALUE_IGNORED', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'user', overridable: false, default: 'd' }) };
        const values: Values = { global: { 'a.b': 'glob' } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        expect(preferences['a.b']).toBe('d');
        const warnings = byCode(diagnostics, DiagnosticCode.UPSTREAM_VALUE_IGNORED);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.scope).toBe('global');
        expect(warnings[0]?.key).toBe('a.b');
    });

    it('still uses the own-scope value while ignoring the upstream one', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { system: { 'a.b': 'sys' }, global: { 'a.b': 'glob' } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        expect(preferences['a.b']).toBe('glob');
        expect(codes(diagnostics)).toContain(DiagnosticCode.UPSTREAM_VALUE_IGNORED);
    });

    it('warns about upstream values even for overridable properties', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: true, default: 'd' }) };
        const values: Values = { system: { 'a.b': 'sys' } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        expect(preferences['a.b']).toBe('d');
        expect(byCode(diagnostics, DiagnosticCode.UPSTREAM_VALUE_IGNORED)).toHaveLength(1);
    });

});


// =============================================================================
// Diagnostics — unknown keys/scopes, empty inputs, happy path
// =============================================================================

describe('resolvePreferences — diagnostics', () => {

    const scopes: Scope[] = ['system', 'global', 'user'];

    it('warns about a value for a key not in the schema', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { user: { 'x.y': 1 } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        const warnings = byCode(diagnostics, DiagnosticCode.UNKNOWN_PROPERTY_KEY);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.scope).toBe('user');
        expect(warnings[0]?.key).toBe('x.y');
        expect('x.y' in preferences).toBe(false);
    });

    it('warns once per scope an unknown key appears in', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'global', overridable: false, default: 'd' }) };
        const values: Values = { global: { 'x.y': 1 }, user: { 'x.y': 2 } };
        const { diagnostics } = resolvePreferences(scopes, schema, values);
        expect(byCode(diagnostics, DiagnosticCode.UNKNOWN_PROPERTY_KEY)).toHaveLength(2);
    });

    it('warns about a property declaring a scope not in the scope list and omits it', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'ghost', overridable: false, default: 'd' }) };
        const values: Values = { user: { 'a.b': 'usr' } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        const warnings = byCode(diagnostics, DiagnosticCode.UNKNOWN_PROPERTY_SCOPE);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.key).toBe('a.b');
        expect(warnings[0]?.scope).toBe('ghost');
        expect('a.b' in preferences).toBe(false);
    });

    it('warns for every property when the scope list is empty', () => {
        const schema: Schema = {
            'a.b': prop({ scope: 'user', overridable: false, default: 1 }),
            'c.d': prop({ scope: 'global', overridable: false, default: 2 })
        };
        const { preferences, diagnostics } = resolvePreferences([], schema, {});
        expect(preferences).toEqual({});
        expect(byCode(diagnostics, DiagnosticCode.UNKNOWN_PROPERTY_SCOPE)).toHaveLength(2);
    });

    it('produces no diagnostics on a clean resolution', () => {
        const schema: Schema = { 'a.b': prop({ scope: 'system', overridable: true, default: 1 }) };
        const values: Values = { user: { 'a.b': 2 } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);
        expect(preferences['a.b']).toBe(2);
        expect(diagnostics).toEqual([]);
    });

    it('marks every diagnostic with warning severity', () => {
        const schema: Schema = {
            'a.b': prop({ scope: 'global', overridable: false, default: 'd' }),
            'ghost.k': prop({ scope: 'ghost', overridable: false })
        };
        const values: Values = { system: { 'a.b': 'up' }, user: { 'a.b': 'down', 'x.y': 9 } };
        const { diagnostics } = resolvePreferences(scopes, schema, values);
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics.every((d) => d.severity === 'warning')).toBe(true);
    });

});


// =============================================================================
// Multiple properties resolve independently
// =============================================================================

describe('resolvePreferences — multiple properties', () => {

    it('resolves each property independently', () => {
        const scopes: Scope[] = ['system', 'user'];
        const schema: Schema = {
            'a.b': prop({ scope: 'system', overridable: true, default: 1 }),
            'c.d': prop({ scope: 'system', overridable: false, default: 'x' }),
            'e.f': prop({ scope: 'user', overridable: false, default: true })
        };
        const values: Values = { user: { 'a.b': 2, 'c.d': 'ignored' } };
        const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);

        expect(preferences['a.b']).toBe(2);      // overridden downstream
        expect(preferences['c.d']).toBe('x');     // locked at system
        expect(preferences['e.f']).toBe(true);    // default
        expect(byCode(diagnostics, DiagnosticCode.NON_OVERRIDABLE_OVERRIDE)).toHaveLength(1);
    });

});
