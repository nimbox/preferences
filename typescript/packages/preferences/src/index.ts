export type {
    PreferenceMessages,
    PreferenceProperty,
    PreferencePropertyItem,
    PreferenceValues
} from './generated/index.js';

export type {
    Issue,
    Messages,
    MessageKey,
    PreferenceGroup,
    PreferenceLeaf,
    PreferenceNode,
    PreferenceState,
    PreferenceTree,
    Preferences,
    Property,
    PropertyItem,
    PropertyKey,
    Schema,
    Scope,
    Values,
    Warning
} from './types.js';

export { IssueCode } from './utils/issues.js';
export type { IssueInit } from './utils/issues.js';

export { validateProperty, validateProperties } from './utils/validateProperties.js';

export { validateSchema } from './utils/validateSchema.js';
export type { ValidateSchemaResult } from './utils/validateSchema.js';

export { validateMessagesCoverage } from './utils/validateMessagesCoverage.js';

export { resolvePreferences } from './utils/resolvePreferences.js';
export type { ResolvePreferencesResult } from './utils/resolvePreferences.js';

export { resolveAtScope } from './utils/resolveAtScope.js';
export type { ResolveAtScopeResult } from './utils/resolveAtScope.js';

export {
    isParseError,
    parse,
    parseSafe,
    ParseError
} from './utils/parse.js';
export type { ParseIssue, ParseSafeResult, ParsePropertyValue } from './utils/parse.js';

export { createTranslator, deriveLabel } from './utils/translate.js';
export type { Translator, TranslatorOptions } from './utils/translate.js';

export { localizeProperty } from './utils/localize.js';

export { stratify } from './utils/stratify.js';
export type { StratifyOptions, StratifyResult } from './utils/stratify.js';
