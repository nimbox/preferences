import type { Diagnostic } from '../types';


// Stable diagnostic codes. Some are taken verbatim from
// docs/specification.md "Example Validation Errors"; the rest follow the
// same SHOUTING_SNAKE_CASE convention.

export const DiagnosticCode = {

    // Property contract

    PROPERTY_KEY_TOO_SHORT: 'PROPERTY_KEY_TOO_SHORT',
    INVALID_TYPE: 'INVALID_TYPE',
    INVALID_ITEMS: 'INVALID_ITEMS',
    MISSING_SCOPE: 'MISSING_SCOPE',
    MISSING_OVERRIDABLE: 'MISSING_OVERRIDABLE',
    INVALID_DESCRIPTION: 'INVALID_DESCRIPTION',
    INVALID_DEFAULT_TYPE: 'INVALID_DEFAULT_TYPE',
    ENUM_DEFAULT_MISMATCH: 'ENUM_DEFAULT_MISMATCH',
    DEFAULT_CONSTRAINT_VIOLATION: 'DEFAULT_CONSTRAINT_VIOLATION',
    INVALID_DEPRECATION_MESSAGE: 'INVALID_DEPRECATION_MESSAGE',
    INVALID_ORDER: 'INVALID_ORDER',

    // Enum

    ENUM_TYPE_MISMATCH: 'ENUM_TYPE_MISMATCH',
    ENUM_LABELS_LENGTH_MISMATCH: 'ENUM_LABELS_LENGTH_MISMATCH',
    ENUM_DESCRIPTIONS_LENGTH_MISMATCH: 'ENUM_DESCRIPTIONS_LENGTH_MISMATCH',
    EMPTY_ENUM_LABEL: 'EMPTY_ENUM_LABEL',
    EMPTY_ENUM_DESCRIPTION: 'EMPTY_ENUM_DESCRIPTION',

    // Constraint consistency

    BOUND_INVERTED: 'BOUND_INVERTED',
    INVALID_PATTERN: 'INVALID_PATTERN',

    // Messages coverage

    MISSING_MESSAGE_KEY: 'MISSING_MESSAGE_KEY',

    // Composed schema (host-side composition surfaces these)

    PROPERTY_KEY_CONFLICT: 'PROPERTY_KEY_CONFLICT',
    GROUP_PROPERTY_COLLISION: 'GROUP_PROPERTY_COLLISION',

    // Resolution

    UNKNOWN_PROPERTY_KEY: 'UNKNOWN_PROPERTY_KEY',
    UNKNOWN_PROPERTY_SCOPE: 'UNKNOWN_PROPERTY_SCOPE',
    NON_OVERRIDABLE_OVERRIDE: 'NON_OVERRIDABLE_OVERRIDE',
    UPSTREAM_VALUE_IGNORED: 'UPSTREAM_VALUE_IGNORED'

} as const;

export type DiagnosticCode = typeof DiagnosticCode[keyof typeof DiagnosticCode];


export function error(diagnostic: Omit<Diagnostic, 'severity'> & { code: DiagnosticCode }): Diagnostic {
    return { ...diagnostic, severity: 'error' };
}

export function warning(diagnostic: Omit<Diagnostic, 'severity'> & { code: DiagnosticCode }): Diagnostic {
    return { ...diagnostic, severity: 'warning' };
}
