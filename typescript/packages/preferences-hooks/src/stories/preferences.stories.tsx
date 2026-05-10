import { createPropertyFilter, type Messages, type PropertyKey, type Schema, type Scope, type Values } from '@nimbox/preferences';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import messagesEnFixture from '../../../../../fixtures/messages.en.json';
import schemaFixture from '../../../../../fixtures/schema.json';
import scopesFixture from '../../../../../fixtures/scopes.json';
import valuesFixture from '../../../../../fixtures/values.json';
import { usePreferenceEditor } from '../hooks/usePreferenceEditor';
import { usePreferenceTree } from '../hooks/usePreferenceTree';
import { EditorPane } from './components/EditorPane';
import { GroupPane } from './components/GroupPane';
import { SelectScope } from './components/SelectScope';


type StoryArgs = {
    depth: number;
    onChange: (scope: Scope, key: PropertyKey, value: unknown) => void;
};

const schema = schemaFixture as unknown as Schema;
const messages = messagesEnFixture as unknown as Messages;

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
            onChange: async (nextScope, key, value) => {
                setResolvedValues((current) => {
                    return {
                        ...current,
                        [nextScope]: {
                            ...(current[nextScope] ?? {}),
                            [key]: value
                        }
                    };
                });
                args.onChange(nextScope, key, value);
            }
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', width: '75%', height: '100vh', marginLeft: 'auto', marginRight: 'auto' }}>

                <div style={{ padding: '1rem' }}>
                    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: '100%' }} />
                </div>

                <div style={{ padding: '1rem' }}>
                    <SelectScope value={scope} onChange={setScope} scopes={scopesFixture} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>

                    <div style={{ flex: '0 0 240px', padding: '0 1rem', overflow: 'auto' }}>
                        <GroupPane
                            nodes={tree}
                            depth={args.depth}
                        />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, padding: '0 1rem', overflow: 'auto' }}>
                        <EditorPane
                            nodes={tree}
                            scope={scope}
                            depth={args.depth}
                            register={editor.register}
                            state={editor.state}
                            drafts={editor.drafts}
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
