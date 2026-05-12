import type { PreferenceGroup, PreferenceNode, PropertyKey } from '@nimbox/preferences';
import classNames from 'classnames';
import { useCallback, useMemo, useState } from 'react';
import './styles.css';


export interface GroupPaneProps {
    nodes: PreferenceNode[];
    depth: number;
    activeSectionKey: PropertyKey | null;
    onSectionSelect: (key: PropertyKey) => void;
}


export function GroupPane(props: GroupPaneProps) {

    const { nodes, depth, activeSectionKey, onSectionSelect } = props;

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
        <div className="group-pane">
            {groups.map((g) => (
                <GroupRow
                    key={g.key}
                    group={g}
                    level={0}
                    depth={depth}
                    isExpanded={isExpanded}
                    onToggle={onToggle}
                    activeSectionKey={activeSectionKey}
                    onSectionSelect={onSectionSelect}
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
    activeSectionKey: PropertyKey | null;
    onSectionSelect: (key: PropertyKey) => void;
}


function GroupRow(props: GroupRowProps) {

    const { group, level, depth, isExpanded, onToggle, activeSectionKey, onSectionSelect } = props;

    const expanded = isExpanded(group.key);
    const hasExpandableChildren =
        level < depth &&
        group.children.some((c) => c.kind === 'group');

    const isActive = activeSectionKey === group.key;

    return (
        <div>
            <div
                className={classNames('group-pane__row', {
                    'group-pane__row--active': isActive
                })}
                style={{ paddingLeft: `${level * 0.75}rem` }}
            >
                <div className="group-pane__rowInner">
                    {hasExpandableChildren
                        ? (
                            <button
                                type="button"
                                className="group-pane__chevron"
                                onClick={() => onToggle(group.key)}
                                aria-expanded={expanded}
                                aria-label={expanded ? 'Collapse group' : 'Expand group'}
                            >
                                {expanded ? '▼' : '▶'}
                            </button>
                        )
                        : (
                            <span className="group-pane__chevronPlaceholder" aria-hidden />
                        )}
                    <button
                        type="button"
                        className="group-pane__title"
                        onClick={() => onSectionSelect(group.key)}
                    >
                        {group.title}
                    </button>
                </div>
            </div>

            {expanded && level < depth && group.children.map((g) =>
                g.kind === 'group'
                    ? (
                        <GroupRow
                            key={g.key}
                            group={g}
                            level={level + 1}
                            depth={depth}
                            isExpanded={isExpanded}
                            onToggle={onToggle}
                            activeSectionKey={activeSectionKey}
                            onSectionSelect={onSectionSelect}
                        />
                    )
                    : null
            )}

        </div>
    );

}
