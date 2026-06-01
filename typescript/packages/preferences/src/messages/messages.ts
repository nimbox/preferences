// Helpers for the Messages Contract.
//
// A *key reference* is a string of the form `%K%` where `K` is a
// structural message key. Authors can place key references in any
// "key-or-text" field; consumers detect them with `isKeyReference`
// and recover the inner key with `extractKey`.
//
// `humanizeKey` is the spec's fallback derivation used by the
// Resolution Algorithm when `messages[K]` is absent: it converts a
// structural key into human-readable display text (e.g.
// `backgroundColor` → `"Background color"`).


// Spec: `^%[A-Za-z][A-Za-z0-9._-]*%$`.
const KEY_REFERENCE_PATTERN = /^%[A-Za-z][A-Za-z0-9._-]*%$/;


export function isKeyReference(value: unknown): value is string {
    return typeof value === 'string' && KEY_REFERENCE_PATTERN.test(value);
}


export function extractKey(reference: string): string {
    return reference.slice(1, -1);
}


// Last segment of `key` (period-delimited), camelCase split into words,
// first letter capitalized. Spec example: `backgroundColor` →
// "Background color".

export function humanizeKey(key: string): string {

    const segments = key.split('.').filter(Boolean);
    const tail = segments[segments.length - 1] ?? key;

    const words = tail
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return tail;
    }

    const [head, ...rest] = words;
    if (!head) {
        return tail;
    }

    const headCapitalized = head.charAt(0).toUpperCase() + head.slice(1);
    const tailLowered = rest.map((word) => word.toLowerCase());
    return [headCapitalized, ...tailLowered].join(' ');

}
