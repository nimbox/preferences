import type { PropertyNode, PropertyKey } from '@nimbox/preferences';


/**
 * Collects group keys for which the preferences editor renders a heading
 * (same rules as EditorTree: `level <= depth` when visiting a group).
 */
export function collectVisibleGroupKeys(nodes: PropertyNode[], depth: number, level = 0): PropertyKey[] {

    const keys: PropertyKey[] = [];

    for (const node of nodes) {
        if (node.kind === 'group') {
            if (level <= depth) {
                keys.push(node.key);
                keys.push(...collectVisibleGroupKeys(node.children, depth, level + 1));
            } else {
                keys.push(...collectVisibleGroupKeys(node.children, depth, level + 1));
            }
        }
    }

    return keys;

}
