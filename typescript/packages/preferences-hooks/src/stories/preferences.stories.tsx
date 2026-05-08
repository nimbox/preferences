import type {
    Messages,
    PropertyKey,
    Schema,
    Scope,
    Values
} from '@nimbox/preferences';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import messagesEnFixture from '../../../../../fixtures/messages.en.json';
import schemaFixture from '../../../../../fixtures/schema.json';
import scopesFixture from '../../../../../fixtures/scopes.json';
import valuesFixture from '../../../../../fixtures/values.json';
import { useEditor } from '../hooks/useEditor';
import { usePreferences } from '../hooks/usePreferences';
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
        const [resolvedValues, setResolvedValues] = useState<Values>(
            valuesFixture as unknown as Values
        );

        const { tree } = usePreferences({
            schema,
            scope,
            scopes: scopesFixture,
            messages
        });

        const editor = useEditor({
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
            <div>

                <div style={{ padding: '1rem' }}>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ padding: '1rem' }}>
                    <SelectScope value={scope} onChange={setScope} scopes={scopesFixture} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: '0 0 240px' }}>
                        <GroupPane nodes={tree} depth={args.depth} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
