import type { Preferences, Schema, Scope, Values, Warning } from '../types.js';
import { IssueCode, warning } from './issues.js';


export interface ResolvePreferencesResult {

    preferences: Preferences;
    warnings: Warning[];

}


export function resolvePreferences(
    scopes: ReadonlyArray<Scope>,
    schema: Schema,
    values: Values
): ResolvePreferencesResult {

    const warnings: Warning[] = [];
    const preferences: Preferences = {};

    const knownKeys = new Set(Object.keys(schema));

    for (const scope of scopes) {
        const scopeValues = values[scope];
        if (!scopeValues) {
            continue;
        }
        for (const key of Object.keys(scopeValues)) {
            if (!knownKeys.has(key)) {
                warnings.push(warning({
                    code: IssueCode.UNKNOWN_PROPERTY_KEY,
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
            warnings.push(warning({
                code: IssueCode.UNKNOWN_PROPERTY_SCOPE,
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
                warnings.push(warning({
                    code: IssueCode.UPSTREAM_VALUE_IGNORED,
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
                    warnings.push(warning({
                        code: IssueCode.NON_OVERRIDABLE_OVERRIDE,
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

    return { preferences, warnings };

}


function isPresent(values: Values, scope: Scope, key: string): boolean {

    const scopeValues = values[scope];
    if (!scopeValues || !Object.prototype.hasOwnProperty.call(scopeValues, key)) {
        return false;
    }
    // Spec line 578-580: a `null` value is treated identically to an absent key.
    return scopeValues[key] !== null;

}


function readPresent(values: Values, scope: Scope, key: string): unknown {

    if (!isPresent(values, scope, key)) {
        return undefined;
    }
    return values[scope]?.[key];

}
