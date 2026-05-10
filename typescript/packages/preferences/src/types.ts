import type { Messages } from './generated/messages';
import type { Property, PropertyItem } from './generated/property';
import type { Values } from './generated/values';


// Re-export the generated spec types so this module is the single source
// of truth for consumers.

export type { Messages, Property, PropertyItem, Values };


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
