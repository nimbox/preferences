import type { Messages } from '../types';
import { extractKey, humanizeKey, isKeyReference } from './messages';


export interface TranslatorOptions {

    onMissing?: (key: string) => void;

}

export interface Translator {

    // Look up a structural message key (e.g. `editor.font.size`) via
    // `messages[K] ?? humanizeKey(K)` per spec Messages Contract →
    // Resolution Algorithm. Always treats input as a key.
    lookup(key: string): string;

    // Interpolate a key-or-text field. If the value matches `%K%`,
    // look up `K` via `lookup`; otherwise return the value as literal
    // Markdown.
    interpolate(value: string): string;

}

export function createTranslator(
    messages: Messages | undefined,
    options: TranslatorOptions = {}
): Translator {

    const { onMissing } = options;

    const lookup = (key: string): string => {

        const text = messages?.[key];
        if (typeof text === 'string' && text.length > 0) {
            return text;
        }

        onMissing?.(key);
        return humanizeKey(key);

    };

    return {
        lookup,
        interpolate(value: string): string {
            if (typeof value !== 'string') {
                return '';
            }
            if (isKeyReference(value)) {
                return lookup(extractKey(value));
            }
            return value;
        }
    };

}
