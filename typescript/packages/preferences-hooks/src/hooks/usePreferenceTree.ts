import { buildPreferenceTree, type Diagnostic, type Messages, type PreferenceTree, type PropertyFilter, type Schema, type Scope } from '@nimbox/preferences';
import { useMemo } from 'react';


export interface UsePreferenceTreeProps {

    scope?: Scope;
    scopes: ReadonlyArray<Scope>;

    schema: Schema;
    messages?: Messages;

    onMissing?: (key: string) => void;

    filter?: PropertyFilter;

}

export interface UsePreferenceTreeResult {

    tree: PreferenceTree;
    diagnostics: Diagnostic[];

}

export function usePreferenceTree(props: UsePreferenceTreeProps): UsePreferenceTreeResult {

    const { scope, scopes, schema, messages, onMissing, filter } = props;

    return useMemo(() => {
        return buildPreferenceTree(schema, messages, { scope, scopes, onMissing, filter });
    }, [scope, scopes, schema, messages, onMissing, filter]);

}
