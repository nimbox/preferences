import type { InvalidEnumPropertyIssue, InvalidFormatPropertyIssue, InvalidJsonPropertyIssue, InvalidPatternPropertyIssue, InvalidTypePropertyIssue, IssuePathSegment, PropertyIssue, PropertyIssueBase, TooBigPropertyIssue, TooSmallPropertyIssue } from './generated/issue';
import type { Messages } from './generated/messages';
import type { Property, PropertyItem } from './generated/property';
import type { Values } from './generated/values';


// Re-export the generated spec types so this module is the single source
// of truth for consumers.

export type {
    InvalidEnumPropertyIssue,
    InvalidFormatPropertyIssue,
    InvalidJsonPropertyIssue,
    InvalidPatternPropertyIssue,
    InvalidTypePropertyIssue,
    IssuePathSegment,
    Messages,
    Property,
    PropertyIssue,
    PropertyIssueBase,
    PropertyItem,
    TooBigPropertyIssue,
    TooSmallPropertyIssue,
    Values
};


// Runtime validation for a string `format`. Consumers supply one
// validator per format name; the parser runs it against the string
// value. The library ships no built-in validators.
export type FormatValidator = (value: string) => boolean;


// The canonical, documented format names. `format` is not restricted
// to this set — any name is allowed, validated by a consumer-supplied
// `FormatValidator`. These literals exist for autocomplete and docs.
export type CanonicalFormat = 'date' | 'time' | 'email' | 'ipv4' | 'ipv6' | 'uri' | 'uuid';


// Constraints that apply to a single scalar value. The generated
// `ScalarConstraints` is open (no enumerated properties) because the
// JSON Schema `$ref` mechanism doesn't preserve property lists across
// `additionalProperties`. This precise hand-rolled shape is what the
// runtime utilities (parse, validate, localize) operate on. Both
// `Property` (when scalar) and `PropertyItem` are structurally
// assignable to it.
export interface ScalarConstraints {

    type: 'boolean' | 'integer' | 'number' | 'string' | 'object' | 'any';

    enum?: ReadonlyArray<unknown>;
    enumLabels?: string[];
    enumDescriptions?: string[];

    minimum?: number;
    maximum?: number;

    minLength?: number;
    maxLength?: number;

    pattern?: string;
    patternErrorMessage?: string;

    // Canonical names autocomplete; the `string & {}` arm keeps the
    // field open to any consumer-defined format without collapsing the
    // union to `string`.
    format?: CanonicalFormat | (string & {});

}


export type Scope = string;

export type PropertyKey = string;
export type MessageKey = string;

export type Schema = Record<PropertyKey, Property>;
export type Preferences = Record<PropertyKey, unknown>;

// Hierarchical display nodes.

export interface PreferenceGroup {

    kind: 'group';

    key: PropertyKey;
    title: string;

    children: PreferenceNode[];

}

export interface PreferenceLeaf {

    kind: 'leaf';

    key: PropertyKey;
    title: string;

    property: Property;

}

export type PreferenceNode = PreferenceGroup | PreferenceLeaf;
export type PreferenceTree = PreferenceNode[];

// Editor-time per-property resolution detail.

export interface PreferenceState {

    value: unknown;

    isDefined: boolean;
    isOverridden: boolean;

    inheritedValue: unknown;
    inheritedScope: Scope;

    defaultValue: unknown;
    defaultScope: Scope;

}

// Diagnostics produced by validation and resolution.

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {

    code: string;
    severity: DiagnosticSeverity;
    message: string;

    scope?: Scope;
    key?: PropertyKey;
    path?: ReadonlyArray<string | number>;

}
