import type {
    Messages,
    PreferenceGroup,
    PreferenceLeaf,
    PreferenceNode,
    PreferenceTree,
    Property,
    Schema,
    Scope,
    Warning
} from '../types.js';
import { IssueCode, warning } from './issues.js';
import { createTranslator, type Translator, type TranslatorOptions } from './translate.js';


export interface StratifyOptions extends TranslatorOptions {

    // When set, only properties visible at this scope are included
    // (owning scope, plus downstream scopes for `overridable: true`
    // properties). When omitted, every property is emitted.
    scope?: Scope;

    // Required when `scope` is set. The host's ordered list of scopes.
    scopes?: ReadonlyArray<Scope>;

}


export interface StratifyResult {

    tree: PreferenceTree;
    warnings: Warning[];

}


// Build the hierarchical display tree. Group nodes are derived from the
// period-delimited prefixes of property keys; leaf nodes correspond to
// each property. Labels are resolved through `createTranslator` against
// the supplied `messages` bag.

export function stratify(
    schema: Schema,
    messages: Messages | undefined,
    options: StratifyOptions = {}
): StratifyResult {

    const { scope, scopes, ...translatorOptions } = options;

    const t = createTranslator(messages, translatorOptions);
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

    const warnings: Warning[] = [];
    const visibility = createVisibility(scope, scopes);

    const root: MutableGroup = createMutableGroup('', '');

    for (const [key, property] of Object.entries(schema)) {

        if (!visibility.includes(property)) {
            continue;
        }

        const segments = key.split('.').filter(Boolean);
        if (segments.length < 2) {
            warnings.push(warning({
                code: IssueCode.PROPERTY_KEY_TOO_SHORT,
                key,
                message: `Property key "${key}" must contain at least two period-delimited segments.`
            }));
            continue;
        }

        const groupSegments = segments.slice(0, -1);
        const groupPath = ensureGroupPath(root, groupSegments, t);

        const parent = groupPath[groupPath.length - 1] ?? root;
        const leaf: PreferenceLeaf = {
            kind: 'leaf',
            key,
            title: t.label(key),
            property
        };

        const order = readOrder(property);
        parent.leaves.push({ leaf, order });
        for (const node of groupPath) {
            node.minOrder = Math.min(node.minOrder, order);
        }

    }

    const tree = materializeChildren(root, collator);
    return { tree, warnings };

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
    t: Translator
): MutableGroup[] {

    let cursor = root;
    let segmentPath = '';
    const path: MutableGroup[] = [];

    for (const segment of segments) {
        segmentPath = segmentPath ? `${segmentPath}.${segment}` : segment;
        let next = cursor.groups.get(segmentPath);
        if (!next) {
            next = createMutableGroup(segmentPath, t.label(segmentPath));
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
