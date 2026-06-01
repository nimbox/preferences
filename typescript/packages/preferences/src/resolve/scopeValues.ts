import type { Scope, Values } from '../types';


export function isPresent(values: Values, scope: Scope, key: string): boolean {

    const scopeValues = values[scope];
    if (!scopeValues || !Object.prototype.hasOwnProperty.call(scopeValues, key)) {
        return false;
    }

    // Spec line 578-580: a `null` value is treated identically to an absent key.
    return scopeValues[key] !== null;

}


export function readPresent(values: Values, scope: Scope, key: string): unknown {

    if (!isPresent(values, scope, key)) {
        return undefined;
    }
    return values[scope]?.[key];

}
