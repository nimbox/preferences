import type { PreferenceGroup, PreferenceNode } from '@nimbox/preferences';
import { useMemo } from 'react';


export interface GroupPaneProps {
    nodes: PreferenceNode[];
    depth: number;
}

function filterTree(nodes: PreferenceNode[], depth: number, level = 0): PreferenceGroup[] {

    const result: PreferenceGroup[] = [];

    for (const node of nodes) {
        if (node.kind !== 'group') continue;
        const children =
            level < depth
                ? filterTree(node.children, depth, level + 1)
                : [];
        result.push({ ...node, children });
    }

    return result;

}

function GroupRow(props: { group: PreferenceGroup; level: number }) {

    const { group, level } = props;

    return (
        <div>

            <div style={{ paddingLeft: `${level * 0.75}rem` }}>{group.title}</div>

            {/*
             * `PropertyGroup.children` is typed as `PropertyNode[]` so the 
             * guard narrows to `PropertyGroup`. After `filterGroupTree`, 
             * every child is a group at runtime.
             */}
            {group.children.map((g) => (g.kind === 'group')
                ? (<GroupRow key={g.key} group={g} level={level + 1} />)
                : null
            )}

        </div>
    );

}

export function GroupPane(props: GroupPaneProps) {

    const { nodes, depth } = props;
    const groups = useMemo(() => filterTree(nodes, depth), [nodes, depth]);

    return (
        <div>
            {groups.map((g) => (
                <GroupRow key={g.key} group={g} level={0} />
            ))}
        </div>
    );

}
