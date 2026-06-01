import { buildPropertyTree, type Diagnostic, type Messages, type PropertyTree, type PropertyFilter, type Schema, type Scope } from '@nimbox/preferences';
import { useMemo } from 'react';


export interface UsePropertyTreeProps {

    scope?: Scope;
    scopes: ReadonlyArray<Scope>;

    schema: Schema;
    messages?: Messages;

    onMissing?: (key: string) => void;

    filter?: PropertyFilter;

}

export interface UsePropertyTreeResult {

    tree: PropertyTree;
    diagnostics: Diagnostic[];

}

export function usePropertyTree(props: UsePropertyTreeProps): UsePropertyTreeResult {

    const { scope, scopes, schema, messages, onMissing, filter } = props;

    return useMemo(() => {
        return buildPropertyTree(schema, messages, { scope, scopes, onMissing, filter });
    }, [scope, scopes, schema, messages, onMissing, filter]);

}
