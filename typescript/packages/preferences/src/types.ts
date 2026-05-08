import type {
    PreferenceMessages,
    PreferenceProperty,
    PreferencePropertyItem,
    PreferenceValues
} from './generated/index.js';


// Spec vocabulary aliases over the JSON-Schema-generated names.

export type Property = PreferenceProperty;
export type PropertyItem = PreferencePropertyItem;
export type Messages = PreferenceMessages;
export type Values = PreferenceValues;

export type Scope = string;
export type PropertyKey = string;
export type MessageKey = string;

export type Schema = Record<PropertyKey, Property>;

export type Preferences = Record<PropertyKey, unknown>;

// Hierarchical display nodes (see Hierarchical Display Expectations).

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

// Editor-time per-property resolution detail (used by `resolveAtScope`).

export interface PreferenceState {

    value: unknown;

    isDefined: boolean;
    isOverridden: boolean;

    inheritedValue: unknown;
    inheritedScope: Scope | null;

    defaultValue: unknown;
    defaultScope: Scope;

}

// Diagnostics produced by validation and resolution.

export interface Issue {

    code: string;
    message: string;

    scope?: Scope;
    key?: PropertyKey;
    path?: ReadonlyArray<string | number>;

}

export type Warning = Issue;
