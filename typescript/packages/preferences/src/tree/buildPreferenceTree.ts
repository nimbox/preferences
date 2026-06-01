import type { Diagnostic, Messages, PreferenceGroup, PreferenceLeaf, PreferenceNode, PreferenceTree, Property, Schema, Scope } from '../types';
import { DiagnosticCode, warning } from './diagnostics';
import type { PropertyFilter } from './filter';
import { localizeSchema } from './localize';
import { createTranslator, type Translator, type TranslatorOptions } from './translator';


export interface BuildPreferenceTreeOptions extends TranslatorOptions {

    // When set, only properties visible at this scope are included
    // (owning scope, plus downstream scopes for `overridable: true`
    // properties). When omitted, every property is emitted.
    scope?: Scope;

    // Required when `scope` is set. The host's ordered list of
    // scopes.
    scopes?: ReadonlyArray<Scope>;

    // Optional predicate run after localization. Properties for
    // which this returns `false` are dropped before group nodes are
    // derived, so empty groups disappear automatically.
    filter?: PropertyFilter;

}

export interface BuildPreferenceTreeResult {

    tree: PreferenceTree;
    diagnostics: Diagnostic[];

}

/**
 * Build the hierarchical display tree.
 *
 * The input schema is first localized in-full (every property's
 * key-or-text fields interpolated against `messages`); then group
 * nodes are derived from the period-delimited prefixes of property
 * keys, and leaf nodes correspond to each property. Tree titles for
 * keys are looked up through the same translator.
 *
 * @param schema - The preference schema to display.
 * @param messages - Optional messages bag used to interpolate
 * key-or-text fields and look up tree titles. When absent, titles
 * fall back to `humanizeKey` and key-or-text fields pass through
 * unchanged.
 * @param options - Optional scope filter and translator options
 * (`onMissing`).
 * @returns The localized tree and any diagnostics produced while
 * building it.
 */
export function buildPreferenceTree(
    schema: Schema,
    messages: Messages | undefined,
    options: BuildPreferenceTreeOptions = {}
): BuildPreferenceTreeResult {

    const { scope, scopes, filter, ...translatorOptions } = options;

    const translator = createTranslator(messages, translatorOptions);
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

    const localizedSchema = localizeSchema(schema, translator);

    const diagnostics: Diagnostic[] = [];
    const visibility = createVisibility(scope, scopes);

    const root: MutableGroup = createMutableGroup('', '');

    for (const [key, property] of Object.entries(localizedSchema)) {

        if (!visibility.includes(property)) {
            continue;
        }
        if (filter && !filter(key, property)) {
            continue;
        }

        const segments = key.split('.').filter(Boolean);
        if (segments.length < 2) {
            diagnostics.push(warning({
                code: DiagnosticCode.PROPERTY_KEY_TOO_SHORT,
                key,
                message: `Property key "${key}" must contain at least two period-delimited segments.`
            }));
            continue;
        }

        const groupSegments = segments.slice(0, -1);
        const groupPath = ensureGroupPath(root, groupSegments, translator);

        const parent = groupPath[groupPath.length - 1] ?? root;
        const leaf: PreferenceLeaf = {
            kind: 'leaf',
            key,
            title: translator.lookup(key),
            property
        };

        const order = readOrder(property);
        parent.leaves.push({ leaf, order });
        for (const node of groupPath) {
            node.minOrder = Math.min(node.minOrder, order);
        }

    }

    const tree = materializeChildren(root, collator);
    return { tree, diagnostics };

}


// Internal mutable tree.

interface MutableGroup {

    key: string;
    title: string;
    minOrder: number;

    groups: Map<string, MutableGroup>;
    leaves: Array<{ leaf: PreferenceLeaf; order: number }>;

}

function createMutableGroup(key: string, title: string): MutableGroup {
    return {
        key,
        title,
        minOrder: Number.POSITIVE_INFINITY,
        groups: new Map<string, MutableGroup>(),
        leaves: []
    };
}

function ensureGroupPath(
    root: MutableGroup,
    segments: ReadonlyArray<string>,
    translator: Translator
): MutableGroup[] {

    let cursor = root;
    let segmentPath = '';
    const path: MutableGroup[] = [];

    for (const segment of segments) {
        segmentPath = segmentPath ? `${segmentPath}.${segment}` : segment;
        let next = cursor.groups.get(segmentPath);
        if (!next) {
            next = createMutableGroup(segmentPath, translator.lookup(segmentPath));
            cursor.groups.set(segmentPath, next);
        }
        path.push(next);
        cursor = next;
    }

    return path;

}

function materializeChildren(
    group: MutableGroup,
    collator: Intl.Collator
): PreferenceNode[] {

    const children: Array<{ node: PreferenceNode; order: number; title: string; key: string }> = [];

    for (const child of group.groups.values()) {
        const node: PreferenceGroup = {
            kind: 'group',
            key: child.key,
            title: child.title,
            children: materializeChildren(child, collator)
        };
        children.push({ node, order: child.minOrder, title: child.title, key: child.key });
    }

    for (const { leaf, order } of group.leaves) {
        children.push({ node: leaf, order, title: leaf.title, key: leaf.key });
    }

    children.sort((left, right) => {
        if (left.order !== right.order) {
            return left.order - right.order;
        }
        const byTitle = collator.compare(left.title, right.title);
        if (byTitle !== 0) {
            return byTitle;
        }
        return collator.compare(left.key, right.key);
    });

    return children.map((entry) => entry.node);

}

function readOrder(property: Property): number {
    return typeof property.order === 'number' ? property.order : Number.POSITIVE_INFINITY;
}

interface Visibility {
    includes(property: Property): boolean;
}

function createVisibility(scope: Scope | undefined, scopes: ReadonlyArray<Scope> | undefined): Visibility {

    if (!scope || !scopes || scopes.length === 0) {
        return { includes: () => true };
    }

    const indexByName = new Map(scopes.map((name, index) => [name, index]));
    const selectedIndex = indexByName.get(scope);
    if (selectedIndex === undefined) {
        return { includes: () => true };
    }

    return {
        includes(property: Property): boolean {
            const propertyIndex = indexByName.get(property.scope);
            if (propertyIndex === undefined) {
                return false;
            }
            if (propertyIndex === selectedIndex) {
                return true;
            }
            return propertyIndex < selectedIndex && property.overridable;
        }
    };

}
