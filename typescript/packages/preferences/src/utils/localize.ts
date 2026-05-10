import type { Property, PropertyItem, ScalarConstraints, Schema } from '../types';
import type { Translator } from './translator';


/**
 * Interpolate the key-or-text fields carried by `constraints`
 * (`enumLabels`, `enumDescriptions`, `patternErrorMessage`) through
 * the supplied translator. Other fields pass through unchanged.
 *
 * Used by `localizeProperty` for both the property root and, when
 * present, `property.items` — element constraints carry the same
 * key-or-text fields as scalar properties.
 */
export function interpolateScalarText<T extends ScalarConstraints>(
    constraints: T,
    translator: Translator
): T {

    const localized: T = { ...constraints };

    if (Array.isArray(constraints.enumLabels)) {
        localized.enumLabels = constraints.enumLabels.map((label: string) => translator.interpolate(String(label)));
    }
    if (Array.isArray(constraints.enumDescriptions)) {
        localized.enumDescriptions = constraints.enumDescriptions.map((description: string) => translator.interpolate(String(description)));
    }
    if (typeof constraints.patternErrorMessage === 'string') {
        localized.patternErrorMessage = translator.interpolate(constraints.patternErrorMessage);
    }

    return localized;

}


/**
 * Returns a copy of `property` with key-or-text fields interpolated
 * through the supplied `translator`. Other fields pass through
 * unchanged.
 *
 * @param property - The property whose key-or-text fields
 * (`description`, `deprecationMessage`, scalar-constraint text on
 * the property and on `items`) should be interpolated.
 * @param translator - Translator used to interpolate `%K%`
 * references; literal values pass through unchanged.
 * @returns A new property with interpolated text fields. The input is
 * not mutated.
 */
export function localizeProperty(
    property: Property,
    translator: Translator
): Property {

    let localized: Property = { ...property };

    if (typeof property.description === 'string') {
        localized.description = translator.interpolate(property.description);
    }

    if (typeof property.deprecationMessage === 'string') {
        localized.deprecationMessage = translator.interpolate(property.deprecationMessage);
    }

    // Scalar-constraint text at the property root (only meaningful
    // for scalar property types; harmless when fields are absent).
    localized = interpolateScalarText(localized as ScalarConstraints, translator) as Property;

    // Scalar-constraint text on `items` for array properties.
    if (property.items && typeof property.items === 'object') {
        localized.items = interpolateScalarText(property.items as PropertyItem & ScalarConstraints, translator);
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
