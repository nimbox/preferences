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
    registerSection?: (sectionId: string, element: HTMLElement | null) => void;
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
    registerSection?: (sectionId: string, element: HTMLElement | null) => void;
}) {

    const { nodes, level, scope, depth, breadcrumbs, register, setValue, clear, state, errors, registerSection } = props;

    return (
        <>
            {nodes.map((node) => {

                if (node.kind === 'group') {
                    if (level <= depth) {
                        const sectionId = String(node.key);
                        const subtree = (
                            <>
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
                                    registerSection={registerSection}
                                />
                            </>
                        );
                        if (registerSection) {
                            return (
                                <div
                                    key={node.key}
                                    className="editor-pane__section"
                                    ref={(el) => {
                                        registerSection(sectionId, el);
                                    }}
                                >
                                    {subtree}
                                </div>
                            );
                        }
                        return (
                            <Fragment key={node.key}>
                                {subtree}
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
                            registerSection={registerSection}
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

    const { nodes, scope, depth, register, setValue, clear, state, errors, registerSection } = props;

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
                registerSection={registerSection}
            />
        </div>
    );

}
