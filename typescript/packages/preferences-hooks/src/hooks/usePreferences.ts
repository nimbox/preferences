import {
    stratify,
    type Messages,
    type PreferenceTree,
    type Schema,
    type Scope,
    type Warning
} from '@nimbox/preferences';
import { useMemo } from 'react';


export interface UsePreferencesProps {

    schema: Schema;

    scopes: ReadonlyArray<Scope>;
    scope?: Scope;

    messages?: Messages;

    debug?: boolean;

}

export interface UsePreferencesResult {

    tree: PreferenceTree;
    warnings: Warning[];

}


export function usePreferences(props: UsePreferencesProps): UsePreferencesResult {

    const { schema, scopes, scope, messages, debug = false } = props;

    return useMemo(() => {
        return stratify(schema, messages, { scope, scopes, debug });
    }, [schema, messages, scope, scopes, debug]);

}
