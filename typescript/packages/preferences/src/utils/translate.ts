import type { Messages } from '../types.js';


export interface TranslatorOptions {

    debug?: boolean;
    onMissing?: (key: string) => void;

}


export interface Translator {

    // Resolve a structural message key (e.g. `editor.font.size`) via
    // `messages[K] ?? deriveLabel(K)` per spec Messages Contract →
    // Resolution Algorithm.
    label(structuralKey: string): string;

    // Resolve a key-or-text field. If the value matches `%K%`, look up
    // `K` via `label`; otherwise return the value as literal Markdown.
    keyOrText(value: string): string;

}


// Spec: `^%[A-Za-z][A-Za-z0-9._-]*%$`.
const KEY_REFERENCE_PATTERN = /^%[A-Za-z][A-Za-z0-9._-]*%$/;


export function createTranslator(
    messages: Messages | undefined,
    options: TranslatorOptions = {}
): Translator {

    const { debug = false, onMissing } = options;

    const lookup = (key: string): string => {

        const text = messages?.[key];
        if (typeof text === 'string' && text.length > 0) {
            return text;
        }

        if (debug) {
            console.warn(`[preferences] Missing message key="${key}".`);
        }
        onMissing?.(key);

        return deriveLabel(key);

    };

    return {
        label(structuralKey: string): string {
            return lookup(structuralKey);
        },
        keyOrText(value: string): string {
            if (typeof value !== 'string') {
                return '';
            }
            if (KEY_REFERENCE_PATTERN.test(value)) {
                return lookup(value.slice(1, -1));
            }
            return value;
        }
    };

}


// Last segment of `key` (period-delimited), camelCase split into words,
// first letter capitalized. Spec example: `backgroundColor` →
// "Background color".
export function deriveLabel(key: string): string {

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
