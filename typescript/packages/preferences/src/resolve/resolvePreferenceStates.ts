import type { Diagnostic, PreferenceState, PropertyKey, Schema, Scope, Values } from '../types';
import { DiagnosticCode, warning } from '../diagnostics';
import { isPresent } from './scopeValues';


export interface ResolvePreferenceStatesResult {

    state: Record<PropertyKey, PreferenceState>;
    diagnostics: Diagnostic[];

}


// Computes the editor-time view of every property "as seen at
// selectedScope". For each property:
//
// - `value`            effective value the user sees at selectedScope
// - `isDefined`        whether selectedScope has its own value for this
//                      property (only meaningful when selectedScope is
//                      editable: at the property's own scope, or
//                      downstream when the property is overridable)
// - `isOverridden`     `isDefined` and the value differs from the
//                      inherited one
// - `inheritedValue`   what the value would be if selectedScope did not
//                      author a value
// - `inheritedScope`   scope the inherited value was authored at, or
//                      `defaultScope` when it falls back to default

export function resolvePreferenceStates(
    scope: Scope,
    scopes: ReadonlyArray<Scope>,
    schema: Schema,
    values: Values
): ResolvePreferenceStatesResult {

    const diagnostics: Diagnostic[] = [];
    const state: Record<PropertyKey, PreferenceState> = {};

    const selectedScope = scope && scopes.includes(scope)
        ? scope
        : scopes[scopes.length - 1] ?? '';
    const selectedScopeIndex = scopes.indexOf(selectedScope);

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

        const defaultValue = property.default;
        const defaultScope = property.scope;

        if (selectedScopeIndex < propertyScopeIndex) {
            state[key] = {
                value: defaultValue,
                isDefined: false,
                isOverridden: false,
                inheritedValue: defaultValue,
                inheritedScope: defaultScope,
                defaultValue,
                defaultScope
            };
            continue;
        }

        const ceiling = property.overridable ? selectedScopeIndex : propertyScopeIndex;

        const closest = closestDefined(scopes, ceiling, propertyScopeIndex, key, values);
        const inherited = closestDefined(scopes, ceiling - 1, propertyScopeIndex, key, values);

        const value = closest ? closest.value : defaultValue;
        const inheritedValue = inherited ? inherited.value : defaultValue;
        const inheritedScope = inherited ? inherited.scope : defaultScope;

        const editableHere = selectedScopeIndex === propertyScopeIndex
            || (property.overridable && selectedScopeIndex > propertyScopeIndex);
        const isDefined = editableHere && isPresent(values, selectedScope, key);
        const isOverridden = isDefined && !valuesAreEqual(value, inheritedValue);

        state[key] = {
            value,
            isDefined,
            isOverridden,
            inheritedValue,
            inheritedScope,
            defaultValue,
            defaultScope
        };

        if (!property.overridable) {
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

    }

    return { state, diagnostics };

}


function closestDefined(
    scopes: ReadonlyArray<Scope>,
    ceilingIndex: number,
    propertyScopeIndex: number,
    key: string,
    values: Values
): { value: unknown; scope: Scope } | null {

    for (let index = ceilingIndex; index >= propertyScopeIndex; index -= 1) {
        const scopeName = scopes[index];
        if (!scopeName) continue;
        if (isPresent(values, scopeName, key)) {
            return { value: values[scopeName]?.[key], scope: scopeName };
        }
    }

    return null;

}


function valuesAreEqual(left: unknown, right: unknown): boolean {

    if (Object.is(left, right)) {
        return true;
    }

    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch {
        return false;
    }

}
