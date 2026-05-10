import type { PreferenceGroup, PreferenceNode, PropertyKey } from '@nimbox/preferences';
import { useCallback, useMemo, useState } from 'react';


export interface GroupPaneProps {
    nodes: PreferenceNode[];
    depth: number;
}

export function GroupPane(props: GroupPaneProps) {

    const { nodes, depth } = props;

    const groups = useMemo(
        () => nodes.filter((n): n is PreferenceGroup => n.kind === 'group'),
        [nodes]
    );

    const [expandedKeys, setExpandedKeys] = useState<Set<PropertyKey>>(() => new Set());

    const isExpanded = useCallback(
        (key: PropertyKey) => expandedKeys.has(key),
        [expandedKeys]
    );

    const onToggle = useCallback((key: PropertyKey) => {
        setExpandedKeys((current) => {
            const next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    return (
        <div>
            {groups.map((g) => (
                <GroupRow
                    key={g.key}
                    group={g}
                    level={0}
                    depth={depth}
                    isExpanded={isExpanded}
                    onToggle={onToggle}
                />
            ))}
        </div>
    );

}

interface GroupRowProps {
    group: PreferenceGroup;
    level: number;
    depth: number;
    isExpanded: (key: PropertyKey) => boolean;
    onToggle: (key: PropertyKey) => void;
}

function GroupRow(props: GroupRowProps) {

    const { group, level, depth, isExpanded, onToggle } = props;

    const expanded = isExpanded(group.key);
    const hasExpandableChildren =
        level < depth &&
        group.children.some((c) => c.kind === 'group');

    return (
        <div>

            <button
                type="button"
                onClick={() => onToggle(group.key)}
                aria-expanded={expanded}
                disabled={!hasExpandableChildren}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'none',
                    border: 'none',
                    paddingTop: '0.125rem',
                    paddingBottom: '0.125rem',
                    paddingRight: 0,
                    paddingLeft: `${level * 0.75}rem`,
                    cursor: hasExpandableChildren ? 'pointer' : 'default',
                    width: '100%',
                    textAlign: 'left'
                }}
            >
                <span style={{ width: '1ch', display: 'inline-block' }}>
                    {hasExpandableChildren ? (expanded ? '▼' : '▶') : ''}
                </span>
                {group.title}
            </button>

            {expanded && level < depth && group.children.map((g) =>
                g.kind === 'group'
                    ? <GroupRow
                        key={g.key}
                        group={g}
                        level={level + 1}
                        depth={depth}
                        isExpanded={isExpanded}
                        onToggle={onToggle}
                    />
                    : null
            )}

        </div>
    );

}
