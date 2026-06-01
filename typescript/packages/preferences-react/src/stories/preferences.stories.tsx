import { createPropertyFilter, type Messages, type PropertyKey, type Schema, type Scope, type Values } from '@nimbox/preferences';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import messagesEnFixture from '../../../../../fixtures/messages.en.json';
import schemaFixture from '../../../../../fixtures/schema.json';
import scopesFixture from '../../../../../fixtures/scopes.json';
import valuesFixture from '../../../../../fixtures/values.json';
import { usePreferenceEditor } from '../hooks/usePreferenceEditor';
import { usePreferenceTree } from '../hooks/usePreferenceTree';
import { useSectionNavigationSync } from '../hooks/useSectionNavigationSync';
import { collectVisibleGroupKeys } from './collectVisibleGroupKeys';
import { EditorPane } from './components/EditorPane';
import { GroupPane } from './components/GroupPane';
import { SelectScope } from './components/SelectScope';


type StoryArgs = {
    depth: number;
    onChange: (scope: Scope, key: PropertyKey, value: unknown) => void;
};

const schema = schemaFixture as unknown as Schema;
const messages = messagesEnFixture as unknown as Messages;

// Consumer-supplied format validators. The library ships none; a declared
// `format` with no matching validator here would fail closed.
const formatValidators = {
    date: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value),
    uri: (value: string) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }
};


const meta = {
    title: 'Preferences/Preferences1',
    parameters: {
        layout: 'fullscreen'
    },
    argTypes: {
        onChange: { action: 'onChange' }
    },
    args: {
        depth: 1
    },
    render: (args) => {

        const [query, setQuery] = useState('');
        const [scope, setScope] = useState<Scope>('user');
        const [resolvedValues, setResolvedValues] = useState<Values>(valuesFixture as unknown as Values);

        // Editable JSON mirror of `resolvedValues`. Lets us mutate values
        // directly (the external-update path) to exercise that the editor
        // fields stay in sync. Commits on blur; reverts on invalid JSON.
        const [draft, setDraft] = useState(() => JSON.stringify(resolvedValues, null, 4));
        const draftRef = useRef<HTMLTextAreaElement | null>(null);
        useEffect(() => {
            if (draftRef.current === document.activeElement) {
                return;
            }
            setDraft(JSON.stringify(resolvedValues, null, 4));
        }, [resolvedValues]);
        const commitDraft = useCallback(() => {
            try {
                setResolvedValues(JSON.parse(draft) as Values);
            } catch {
                setDraft(JSON.stringify(resolvedValues, null, 4));
            }
        }, [draft, resolvedValues]);

        const filter = useMemo(() => createPropertyFilter(query), [query]);

        const { tree } = usePreferenceTree({
            schema,
            scope,
            scopes: scopesFixture,
            messages,
            filter
        });

        const editor = usePreferenceEditor({
            schema,
            scope,
            scopes: scopesFixture,
            values: resolvedValues,
            formatValidators,
            onChange: async (nextScope, key, value) => {
                setResolvedValues((current) => {
                    const scopeValues = { ...(current[nextScope] ?? {}) };
                    if (value == null) {
                        delete scopeValues[key];
                    } else {
                        scopeValues[key] = value;
                    }
                    const next: Values = { ...current };
                    if (Object.keys(scopeValues).length === 0) {
                        delete next[nextScope];
                    } else {
                        next[nextScope] = scopeValues;
                    }
                    return next;
                });
                args.onChange(nextScope, key, value);
            }
        });

        const editorScrollRef = useRef<HTMLDivElement | null>(null);
        const sectionIds = useMemo(
            () => collectVisibleGroupKeys(tree, args.depth).map((key) => String(key)),
            [tree, args.depth]
        );

        const {
            activeSectionId,
            registerSection,
            scrollToSection,
            releaseForcedActiveSection
        } = useSectionNavigationSync({
            containerRef: editorScrollRef,
            sectionIds
        });

        const onSectionSelect = useCallback((key: PropertyKey) => {
            void scrollToSection(String(key), { behavior: 'smooth' });
        }, [scrollToSection]);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', width: '75%', height: '100vh', marginLeft: 'auto', marginRight: 'auto' }}>

                <div style={{ padding: '1rem' }}>
                    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: '100%' }} />
                </div>

                <div style={{ padding: '1rem' }}>
                    <SelectScope value={scope} onChange={setScope} scopes={scopesFixture} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>

                    <div style={{ flex: '0 0 180px', padding: '0 1rem', overflow: 'auto' }}>
                        <GroupPane
                            nodes={tree}
                            depth={args.depth}
                            activeSectionKey={activeSectionId}
                            onSectionSelect={onSectionSelect}
                        />
                    </div>

                    <div
                        ref={editorScrollRef}
                        style={{ flex: 1, minWidth: 0, padding: '0 1rem', overflow: 'auto' }}
                        onScroll={releaseForcedActiveSection}
                    >
                        <EditorPane
                            key={scope}
                            nodes={tree}
                            scope={scope}
                            depth={args.depth}
                            register={editor.register}
                            setValue={editor.setValue}
                            clear={editor.clear}
                            states={editor.states}
                            errors={editor.errors}
                            registerSection={registerSection}
                        />
                    </div>

                    <div
                        style={{
                            flex: '0 0 38%',
                            maxWidth: 'min(480px, 45vw)',
                            minWidth: 0,
                            padding: '0 1rem',
                            overflow: 'auto',
                            borderLeft: '1px solid #e5e7eb'
                        }}
                    >
                        <textarea
                            ref={draftRef}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={commitDraft}
                            spellCheck={false}
                            style={{
                                width: '100%',
                                height: '100%',
                                boxSizing: 'border-box',
                                border: 'none',
                                resize: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: 12,
                                lineHeight: 1.45,
                                whiteSpace: 'pre',
                                wordBreak: 'break-word'
                            }}
                        />
                    </div>

                </div>

            </div>
        );

    }
} satisfies Meta<StoryArgs>;
export default meta;


type Story = StoryObj<StoryArgs>;

export const Default: Story = {};
