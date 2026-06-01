import type { Diagnostic, Preferences, Schema, Scope, Values } from '../types';
import { DiagnosticCode, warning } from './diagnostics';
import { isPresent, readPresent } from './scopeValues';


export interface ResolvePreferencesResult {

    preferences: Preferences;
    diagnostics: Diagnostic[];

}

export function resolvePreferences(
    scopes: ReadonlyArray<Scope>,
    schema: Schema,
    values: Values
): ResolvePreferencesResult {

    const diagnostics: Diagnostic[] = [];
    const preferences: Preferences = {};

    const knownKeys = new Set(Object.keys(schema));

    for (const scope of scopes) {
        const scopeValues = values[scope];
        if (!scopeValues) {
            continue;
        }
        for (const key of Object.keys(scopeValues)) {
            if (!knownKeys.has(key)) {
                diagnostics.push(warning({
                    code: DiagnosticCode.UNKNOWN_PROPERTY_KEY,
                    scope,
                    key,
                    message: `Unknown property key "${key}" in scope "${scope}".`
                }));
            }
        }
    }

    for (const [key, property] of Object.entries(schema)) {

        const propertyScopeIndex = scopes.indexOf(property.scope);
        if (propertyScopeIndex === -1) {
            diagnostics.push(warning({
                code: DiagnosticCode.UNKNOWN_PROPERTY_SCOPE,
                key,
                scope: property.scope,
                message: `Property "${key}" declares unknown scope "${property.scope}".`
            }));
            continue;
        }

        for (let index = 0; index < propertyScopeIndex; index += 1) {
            const upstreamScope = scopes[index];
            if (upstreamScope === undefined) continue;
            if (isPresent(values, upstreamScope, key)) {
                diagnostics.push(warning({
                    code: DiagnosticCode.UPSTREAM_VALUE_IGNORED,
                    key,
                    scope: upstreamScope,
                    message: `Value for "${key}" at scope "${upstreamScope}" is ignored: it precedes the property scope "${property.scope}".`
                }));
            }
        }

        const baseline = readPresent(values, property.scope, key);
        let resolved: unknown = baseline === undefined ? property.default : baseline;

        if (property.overridable) {
            for (let index = propertyScopeIndex + 1; index < scopes.length; index += 1) {
                const downstreamScope = scopes[index];
                if (downstreamScope === undefined) continue;
                const candidate = readPresent(values, downstreamScope, key);
                if (candidate !== undefined) {
                    resolved = candidate;
                }
            }
        } else {
            for (let index = propertyScopeIndex + 1; index < scopes.length; index += 1) {
                const downstreamScope = scopes[index];
                if (downstreamScope === undefined) continue;
                if (isPresent(values, downstreamScope, key)) {
                    diagnostics.push(warning({
                        code: DiagnosticCode.NON_OVERRIDABLE_OVERRIDE,
                        key,
                        scope: downstreamScope,
                        message: `Value for non-overridable "${key}" at scope "${downstreamScope}" is ignored: locked at "${property.scope}".`
                    }));
                }
            }
        }

        if (resolved !== undefined) {
            preferences[key] = resolved;
        }

    }

    return { preferences, diagnostics };

}


