// Structural deep-equality for preference values (JSON: primitives,
// arrays, plain objects). Object key order is irrelevant; array order
// is significant. Assumes acyclic, JSON-shaped data.
export function valuesAreEqual(left: unknown, right: unknown): boolean {

    if (Object.is(left, right)) {
        return true;
    }

    if (typeof left !== 'object' || left === null
        || typeof right !== 'object' || right === null) {
        return false;
    }

    const leftIsArray = Array.isArray(left);
    if (leftIsArray !== Array.isArray(right)) {
        return false;
    }

    if (leftIsArray) {
        const a = left as unknown[];
        const b = right as unknown[];
        return a.length === b.length
            && a.every((item, index) => valuesAreEqual(item, b[index]));
    }

    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    const aKeys = Object.keys(a);
    return aKeys.length === Object.keys(b).length
        && aKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(b, key)
            && valuesAreEqual(a[key], b[key]));

}
