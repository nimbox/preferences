import type { Property, Schema } from '../types';
import type { Translator } from './translator';


/**
 * Returns a copy of `property` with key-or-text fields interpolated
 * through the supplied `translator`. Other fields pass through
 * unchanged.
 *
 * @param property - The property whose key-or-text fields
 * (`description`, `deprecationMessage`, `patternErrorMessage`,
 * `enumLabels`, `enumDescriptions`) should be interpolated.
 * @param translator - Translator used to interpolate `%K%`
 * references; literal values pass through unchanged.
 * @returns A new property with interpolated text fields. The input is
 * not mutated.
 */
export function localizeProperty(
    property: Property,
    translator: Translator
): Property {

    const localized: Property = { ...property };

    if (typeof property.description === 'string') {
        localized.description = translator.interpolate(property.description);
    }

    if (typeof property.deprecationMessage === 'string') {
        localized.deprecationMessage = translator.interpolate(property.deprecationMessage);
    }
    if (typeof property.patternErrorMessage === 'string') {
        localized.patternErrorMessage = translator.interpolate(property.patternErrorMessage);
    }
    if (Array.isArray(property.enumLabels)) {
        localized.enumLabels = property.enumLabels.map((label: string) => translator.interpolate(String(label)));
    }
    if (Array.isArray(property.enumDescriptions)) {
        localized.enumDescriptions = property.enumDescriptions.map((description: string) => translator.interpolate(String(description)));
    }

    return localized;

}


/**
 * Returns a copy of `schema` with every property's key-or-text fields
 * interpolated through the supplied `translator`.
 *
 * @param schema - The schema whose properties should be localized.
 * @param translator - Translator used to interpolate `%K%` references
 * on each property's key-or-text fields.
 * @returns A new schema whose properties are independent localized
 * copies of the input. The input is not mutated.
 */
export function localizeSchema(
    schema: Schema,
    translator: Translator
): Schema {

    const localized: Schema = {};

    for (const [key, property] of Object.entries(schema)) {
        localized[key] = localizeProperty(property, translator);
    }

    return localized;

}
