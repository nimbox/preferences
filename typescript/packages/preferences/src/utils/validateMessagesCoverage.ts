import type { Diagnostic, Messages, Schema } from '../types';
import { DiagnosticCode, warning } from './diagnostics';
import { extractKey, isKeyReference } from './messages';


// Walks every property's key-or-text fields, every property key (used
// as a leaf tree label), and every implied group prefix; warns for any
// referenced message key that is missing from `messages`. Missing keys
// never invalidate a Schema; they only emit warning-severity diagnostics.
export function validateMessagesCoverage(
    schema: Schema,
    messages: Messages | undefined
): Diagnostic[] {

    const diagnostics: Diagnostic[] = [];

    const present = (key: string): boolean => {
        if (!messages) {
            return false;
        }
        return Object.prototype.hasOwnProperty.call(messages, key);
    };

    const ensureKey = (key: string, label: string) => {
        if (!present(key)) {
            diagnostics.push(warning({
                code: DiagnosticCode.MISSING_MESSAGE_KEY,
                key,
                message: `Missing message key "${key}" (${label}).`
            }));
        }
    };

    const propertyKeys = Object.keys(schema);
    const groupKeys = collectGroupKeys(propertyKeys);

    for (const propertyKey of propertyKeys) {
        ensureKey(propertyKey, `tree label for property "${propertyKey}"`);

        const property = schema[propertyKey];
        if (!property) continue;

        coverKeyOrText(property.description, `${propertyKey}.description`, ensureKey);
        if (property.deprecationMessage) {
            coverKeyOrText(property.deprecationMessage, `${propertyKey}.deprecationMessage`, ensureKey);
        }
        if (Array.isArray(property.enumLabels)) {
            property.enumLabels.forEach((label, index) => {
                coverKeyOrText(label, `${propertyKey}.enumLabels[${index}]`, ensureKey);
            });
        }
        if (Array.isArray(property.enumDescriptions)) {
            property.enumDescriptions.forEach((description, index) => {
                coverKeyOrText(description, `${propertyKey}.enumDescriptions[${index}]`, ensureKey);
            });
        }
    }

    for (const groupKey of groupKeys) {
        ensureKey(groupKey, `tree label for group "${groupKey}"`);
    }

    return diagnostics;

}


function coverKeyOrText(
    value: unknown,
    label: string,
    ensureKey: (key: string, label: string) => void
): void {
    if (isKeyReference(value)) {
        ensureKey(extractKey(value), label);
    }
}


function collectGroupKeys(propertyKeys: ReadonlyArray<string>): ReadonlyArray<string> {

    const groups = new Set<string>();
    for (const key of propertyKeys) {
        const segments = key.split('.');
        for (let count = 1; count < segments.length; count += 1) {
            groups.add(segments.slice(0, count).join('.'));
        }
    }
    for (const propertyKey of propertyKeys) {
        groups.delete(propertyKey);
    }
    return Array.from(groups);

}
