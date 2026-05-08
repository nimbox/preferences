import type { Messages, Schema, Warning } from '../types.js';
import { IssueCode, warning } from './issues.js';


// Spec: `^%[A-Za-z][A-Za-z0-9._-]*%$`.
const KEY_REFERENCE_PATTERN = /^%[A-Za-z][A-Za-z0-9._-]*%$/;


// Walks every property's key-or-text fields, every property key (used
// as a leaf tree label), and every implied group prefix; warns for any
// referenced message key that is missing from `messages`. Missing keys
// never invalidate a Schema; they only emit warnings.
export function validateMessagesCoverage(
    schema: Schema,
    messages: Messages | undefined
): Warning[] {

    const warnings: Warning[] = [];

    const present = (key: string): boolean => {
        if (!messages) {
            return false;
        }
        return Object.prototype.hasOwnProperty.call(messages, key);
    };

    const ensureKey = (key: string, label: string) => {
        if (!present(key)) {
            warnings.push(warning({
                code: IssueCode.MISSING_MESSAGE_KEY,
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

    return warnings;

}


function coverKeyOrText(
    value: unknown,
    label: string,
    ensureKey: (key: string, label: string) => void
): void {
    if (typeof value !== 'string') {
        return;
    }
    if (KEY_REFERENCE_PATTERN.test(value)) {
        const inner = value.slice(1, -1);
        ensureKey(inner, label);
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
