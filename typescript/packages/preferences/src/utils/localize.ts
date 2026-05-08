import type { Messages, Property } from '../types.js';
import { createTranslator, type TranslatorOptions } from './translate.js';


// Returns a copy of `property` with key-or-text fields resolved through
// the supplied `messages` bag. Other fields pass through unchanged.

export function localizeProperty(
    property: Property,
    messages: Messages | undefined,
    options: TranslatorOptions = {}
): Property {

    const t = createTranslator(messages, options);

    const localized: Property = { ...property };

    if (typeof property.description === 'string') {
        localized.description = t.keyOrText(property.description);
    }

    if (typeof property.deprecationMessage === 'string') {
        localized.deprecationMessage = t.keyOrText(property.deprecationMessage);
    }
    if (typeof property.patternErrorMessage === 'string') {
        localized.patternErrorMessage = t.keyOrText(property.patternErrorMessage);
    }
    if (Array.isArray(property.enumLabels)) {
        localized.enumLabels = property.enumLabels.map((label) => t.keyOrText(String(label)));
    }
    if (Array.isArray(property.enumDescriptions)) {
        localized.enumDescriptions = property.enumDescriptions.map((description) => t.keyOrText(String(description)));
    }

    return localized;

}
