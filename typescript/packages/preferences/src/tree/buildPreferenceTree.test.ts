import { describe, expect, it } from 'vitest';

import { DiagnosticCode } from '../diagnostics';
import type { Diagnostic, PreferenceGroup, PreferenceLeaf, PreferenceNode, Property, Scope, Schema } from '../types';
import { buildPreferenceTree } from './buildPreferenceTree';


function prop(opts: {
    type?: Property['type'];
    scope?: Scope;
    overridable?: boolean;
    order?: number;
    description?: string;
    default?: unknown;
} = {}): Property {
    const base: Record<string, unknown> = {
        type: opts.type ?? 'string',
        scope: opts.scope ?? 'user',
        overridable: opts.overridable ?? false
    };
    if (opts.order !== undefined) base.order = opts.order;
    if (opts.description !== undefined) base.description = opts.description;
    if ('default' in opts) base.default = opts.default;
    return base as Property;
}

// Narrowing helpers — throw (rather than return undefined) so a wrong
// node kind fails the test with a clear message.
function asGroup(node: PreferenceNode | undefined): PreferenceGroup {
    if (!node || node.kind !== 'group') {
        throw new Error(`expected a group node, got ${node?.kind ?? 'undefined'}`);
    }
    return node;
}

function asLeaf(node: PreferenceNode | undefined): PreferenceLeaf {
    if (!node || node.kind !== 'leaf') {
        throw new Error(`expected a leaf node, got ${node?.kind ?? 'undefined'}`);
    }
    return node;
}

function keysOf(nodes: ReadonlyArray<PreferenceNode>): string[] {
    return nodes.map((n) => n.key);
}

function byCode(diagnostics: ReadonlyArray<Diagnostic>, code: string): Diagnostic[] {
    return diagnostics.filter((d) => d.code === code);
}


// =============================================================================
// Group derivation and titles
// =============================================================================

describe('buildPreferenceTree — grouping and titles', () => {

    it('derives a group from a dotted key and humanizes titles without messages', () => {
        const schema: Schema = { 'window.title': prop() };
        const { tree, diagnostics } = buildPreferenceTree(schema, undefined);

        expect(diagnostics).toEqual([]);
        expect(tree).toHaveLength(1);

        const group = asGroup(tree[0]);
        expect(group.key).toBe('window');
        expect(group.title).toBe('Window');
        expect(group.children).toHaveLength(1);

        const leaf = asLeaf(group.children[0]);
        expect(leaf.key).toBe('window.title');
        expect(leaf.title).toBe('Title');
        expect(leaf.property.type).toBe('string');
    });

    it('nests groups for keys deeper than two segments', () => {
        const schema: Schema = { 'a.b.c.d': prop() };
        const { tree } = buildPreferenceTree(schema, undefined);

        const a = asGroup(tree[0]);
        expect([a.key, a.title]).toEqual(['a', 'A']);

        const ab = asGroup(a.children[0]);
        expect([ab.key, ab.title]).toEqual(['a.b', 'B']);

        const abc = asGroup(ab.children[0]);
        expect([abc.key, abc.title]).toEqual(['a.b.c', 'C']);

        const leaf = asLeaf(abc.children[0]);
        expect(leaf.key).toBe('a.b.c.d');
        expect(leaf.title).toBe('D');
    });

    it('places multiple leaves under a single shared group', () => {
        const schema: Schema = { 'm.apple': prop(), 'm.zebra': prop() };
        const { tree } = buildPreferenceTree(schema, undefined);

        expect(tree).toHaveLength(1);
        const group = asGroup(tree[0]);
        expect(keysOf(group.children)).toEqual(['m.apple', 'm.zebra']);
    });

    it('uses messages for group and leaf titles when provided', () => {
        const schema: Schema = { 'window.title': prop() };
        const messages = { window: 'Window Pane', 'window.title': 'The Title' };
        const { tree } = buildPreferenceTree(schema, messages);

        const group = asGroup(tree[0]);
        expect(group.title).toBe('Window Pane');
        expect(asLeaf(group.children[0]).title).toBe('The Title');
    });

});


// =============================================================================
// Localization of leaf property fields
// =============================================================================

describe('buildPreferenceTree — leaf property localization', () => {

    it('interpolates %key% references in the leaf property description', () => {
        const schema: Schema = { 'a.b': prop({ description: '%desc.k%' }) };
        const messages = { 'desc.k': 'Localized description' };
        const { tree } = buildPreferenceTree(schema, messages);

        const leaf = asLeaf(asGroup(tree[0]).children[0]);
        expect(leaf.property.description).toBe('Localized description');
    });

    it('passes literal (non-reference) descriptions through unchanged', () => {
        const schema: Schema = { 'a.b': prop({ description: 'Plain text' }) };
        const { tree } = buildPreferenceTree(schema, {});

        const leaf = asLeaf(asGroup(tree[0]).children[0]);
        expect(leaf.property.description).toBe('Plain text');
    });

});


// =============================================================================
// Ordering — explicit order, alphabetical fallback, minOrder propagation
// =============================================================================

describe('buildPreferenceTree — ordering', () => {

    it('sorts siblings alphabetically by title when no order is given', () => {
        const schema: Schema = { 'm.zebra': prop(), 'm.apple': prop() };
        const { tree } = buildPreferenceTree(schema, undefined);
        expect(keysOf(asGroup(tree[0]).children)).toEqual(['m.apple', 'm.zebra']);
    });

    it('honors explicit order ahead of alphabetical title', () => {
        const schema: Schema = {
            'm.apple': prop({ order: 2 }),
            'm.zebra': prop({ order: 1 })
        };
        const { tree } = buildPreferenceTree(schema, undefined);
        expect(keysOf(asGroup(tree[0]).children)).toEqual(['m.zebra', 'm.apple']);
    });

    it('orders groups by the minimum order of their descendant leaves', () => {
        const schema: Schema = {
            'a.leaf': prop({ order: 10 }),
            'b.leaf': prop({ order: 5 })
        };
        const { tree } = buildPreferenceTree(schema, undefined);
        // Group 'b' (minOrder 5) precedes 'a' (minOrder 10) despite a<b.
        expect(keysOf(tree)).toEqual(['b', 'a']);
    });

    it('breaks ties on equal order and title by key', () => {
        const schema: Schema = { 'g.x': prop(), 'g.y': prop() };
        const messages = { 'g.x': 'Same', 'g.y': 'Same' };
        const { tree } = buildPreferenceTree(schema, messages);
        expect(keysOf(asGroup(tree[0]).children)).toEqual(['g.x', 'g.y']);
    });

});


// =============================================================================
// Scope visibility
// =============================================================================

describe('buildPreferenceTree — scope visibility', () => {

    const scopes: Scope[] = ['system', 'global', 'user'];

    it('includes only the selected scope and overridable upstream scopes', () => {
        const schema: Schema = {
            'g.sys': prop({ scope: 'system', overridable: false }),
            'g.glob': prop({ scope: 'global', overridable: true }),
            'g.globNo': prop({ scope: 'global', overridable: false }),
            'g.usr': prop({ scope: 'user', overridable: false })
        };

        // Viewed at 'user': own-scope 'g.usr' + overridable-upstream 'g.glob'.
        const { tree } = buildPreferenceTree(schema, undefined, { scope: 'user', scopes });
        expect(keysOf(asGroup(tree[0]).children)).toEqual(['g.glob', 'g.usr']);
    });

    it('excludes downstream and non-overridable upstream properties', () => {
        const schema: Schema = {
            'g.sys': prop({ scope: 'system', overridable: false }),
            'g.glob': prop({ scope: 'global', overridable: true }),
            'g.globNo': prop({ scope: 'global', overridable: false }),
            'g.usr': prop({ scope: 'user', overridable: false })
        };

        // Viewed at 'global': own-scope global props; system upstream is
        // non-overridable (excluded); user is downstream (excluded).
        const { tree } = buildPreferenceTree(schema, undefined, { scope: 'global', scopes });
        expect(keysOf(asGroup(tree[0]).children)).toEqual(['g.glob', 'g.globNo']);
    });

    it('drops groups that become empty after scope filtering', () => {
        const schema: Schema = {
            'a.usr': prop({ scope: 'user' }),
            'b.sys': prop({ scope: 'system' })
        };
        const { tree } = buildPreferenceTree(schema, undefined, { scope: 'system', scopes });
        expect(keysOf(tree)).toEqual(['b']);
    });

    it('silently excludes properties whose scope is not in the list (no diagnostic)', () => {
        const schema: Schema = { 'a.ghost': prop({ scope: 'ghost' }) };
        const { tree, diagnostics } = buildPreferenceTree(schema, undefined, { scope: 'user', scopes });
        expect(tree).toEqual([]);
        expect(diagnostics).toEqual([]);
    });

    it('applies no filtering when the selected scope is not in the list', () => {
        const schema: Schema = {
            'a.x': prop({ scope: 'system' }),
            'b.y': prop({ scope: 'user' })
        };
        const { tree } = buildPreferenceTree(schema, undefined, { scope: 'ghost', scopes });
        expect(keysOf(tree)).toEqual(['a', 'b']);
    });

    it('includes every property when no scope is supplied', () => {
        const schema: Schema = {
            'a.x': prop({ scope: 'system' }),
            'b.y': prop({ scope: 'user' })
        };
        const { tree } = buildPreferenceTree(schema, undefined);
        expect(keysOf(tree)).toEqual(['a', 'b']);
    });

});


// =============================================================================
// Custom filter predicate
// =============================================================================

describe('buildPreferenceTree — filter', () => {

    it('drops properties the filter rejects', () => {
        const schema: Schema = { 'a.keep': prop(), 'a.drop': prop() };
        const { tree } = buildPreferenceTree(schema, undefined, {
            filter: (key) => key.endsWith('keep')
        });
        expect(keysOf(asGroup(tree[0]).children)).toEqual(['a.keep']);
    });

    it('removes groups left empty by the filter', () => {
        const schema: Schema = { 'g.x': prop(), 'h.y': prop() };
        const { tree } = buildPreferenceTree(schema, undefined, {
            filter: (key) => key.startsWith('h')
        });
        expect(keysOf(tree)).toEqual(['h']);
    });

});


// =============================================================================
// Diagnostics and translator options
// =============================================================================

describe('buildPreferenceTree — diagnostics and onMissing', () => {

    it('warns about and skips a property key with fewer than two segments', () => {
        const schema: Schema = { single: prop(), 'a.b': prop() };
        const { tree, diagnostics } = buildPreferenceTree(schema, undefined);

        expect(keysOf(tree)).toEqual(['a']);
        const warnings = byCode(diagnostics, DiagnosticCode.PROPERTY_KEY_TOO_SHORT);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.key).toBe('single');
    });

    it('invokes onMissing for structural keys absent from messages', () => {
        const seen: string[] = [];
        const schema: Schema = { 'a.b': prop() };
        buildPreferenceTree(schema, undefined, { onMissing: (key) => seen.push(key) });
        expect(seen).toEqual(['a', 'a.b']);
    });

    it('does not invoke onMissing for keys present in messages', () => {
        const seen: string[] = [];
        const schema: Schema = { 'a.b': prop() };
        const messages = { a: 'A group', 'a.b': 'A leaf' };
        buildPreferenceTree(schema, messages, { onMissing: (key) => seen.push(key) });
        expect(seen).toEqual([]);
    });

});
