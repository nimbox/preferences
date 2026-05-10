import type { Property, PropertyKey } from '../types';


export type PropertyFilter = (key: PropertyKey, property: Property) => boolean;


/**
 * Build a simple case-insensitive substring predicate for filtering
 * properties by user query. Returns `undefined` when the query is
 * empty so callers (and `buildPreferenceTree`) can cheaply skip the
 * filter step.
 *
 * The predicate matches against:
 *  - the property key (e.g. `editor.font.size`), and
 *  - the localized `description` text on the property.
 *
 * Callers should pass an already-localized property (the schema
 * `buildPreferenceTree` produces internally already is).
 *
 * @param query - The raw user query (will be trimmed and lowercased).
 * @returns A predicate, or `undefined` when the query is empty.
 */
export function createPropertyFilter(query: string): PropertyFilter | undefined {

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    return (key, property) => {

        if (key.toLowerCase().includes(normalized)) {
            return true;
        }

        const description = typeof property.description === 'string'
            ? property.description.toLowerCase()
            : '';
        return description.includes(normalized);

    };

}
