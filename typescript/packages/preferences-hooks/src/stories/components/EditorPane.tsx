import type { PreferenceNode } from '@nimbox/preferences';
import { Fragment } from 'react';
import type { UsePreferenceEditorResult } from '../../hooks/usePreferenceEditor';
import { EditorItem } from './EditorItem';
import './styles.css';


export interface EditorPaneProps {
    scope: string;
    nodes: PreferenceNode[];
    depth: number;
    register: UsePreferenceEditorResult['register'];
    setValue: UsePreferenceEditorResult['setValue'];
    clear: UsePreferenceEditorResult['clear'];
    state: UsePreferenceEditorResult['state'];
    errors: UsePreferenceEditorResult['errors'];
}

function Heading(props: {
    level: number;
    children: React.ReactNode
}) {

    const n = Math.min(Math.max(props.level, 0) + 1, 6);
    const Tag = `h${n}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    return <Tag>{props.children}</Tag>;

}

function EditorTree(props: {
    nodes: PreferenceNode[];
    level: number;
    scope: string;
    depth: number;
    breadcrumbs: string[];
    register: UsePreferenceEditorResult['register'];
    setValue: UsePreferenceEditorResult['setValue'];
    clear: UsePreferenceEditorResult['clear'];
    state: UsePreferenceEditorResult['state'];
    errors: UsePreferenceEditorResult['errors'];
}) {

    const { nodes, level, scope, depth, breadcrumbs, register, setValue, clear, state, errors } = props;

    return (
        <>
            {nodes.map((node) => {

                if (node.kind === 'group') {
                    if (level <= depth) {
                        return (
                            <Fragment key={node.key}>
                                <Heading level={level}>{node.title}</Heading>
                                <EditorTree
                                    nodes={node.children}
                                    level={level + 1}
                                    scope={scope}
                                    depth={depth}
                                    breadcrumbs={breadcrumbs}
                                    register={register}
                                    setValue={setValue}
                                    clear={clear}
                                    state={state}
                                    errors={errors}
                                />
                            </Fragment>
                        );
                    }
                    return (
                        <EditorTree
                            key={node.key}
                            nodes={node.children}
                            level={level + 1}
                            scope={scope}
                            depth={depth}
                            breadcrumbs={[...breadcrumbs, node.title]}
                            register={register}
                            setValue={setValue}
                            clear={clear}
                            state={state}
                            errors={errors}
                        />
                    );
                }

                return (
                    <EditorItem
                        key={node.key}
                        item={node}
                        breadcrumbs={breadcrumbs}
                        register={register}
                        setValue={setValue}
                        clear={clear}
                        preferenceState={state[node.key]}
                        error={errors[scope]?.[node.key]}
                    />
                );

            })}
        </>
    );
}

export function EditorPane(props: EditorPaneProps) {

    const { nodes, scope, depth, register, setValue, clear, state, errors } = props;

    return (
        <div className="editor-pane">
            <EditorTree
                nodes={nodes}
                level={0}
                scope={scope}
                depth={depth}
                breadcrumbs={[]}
                register={register}
                setValue={setValue}
                clear={clear}
                state={state}
                errors={errors}
            />
        </div>
    );

}
