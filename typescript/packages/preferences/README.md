# @nimbox/preferences

Framework-agnostic core for schema-driven preferences: a flat **schema** of
property definitions plus per-scope **values** are resolved, by merge order,
into a single set of effective preferences. Also provides schema validation,
value parsing, and message localization.

> Proprietary — see [LICENSE](../../../LICENSE). Internal Nimbox use only.

## Install

Published to GitHub Packages under the `@nimbox` scope. Configure your
`.npmrc` to resolve the scope from GitHub Packages:

```
@nimbox:registry=https://npm.pkg.github.com
```

```bash
npm install @nimbox/preferences
```

## Concepts

- **Schema** — a flat map from dot-notation keys (e.g. `editor.fontSize`) to
  property definitions (`type`, `scope`, `overridable`, optional `default`,
  constraints, localization keys).
- **Values** — per-scope assignments: outer keys are scope names, inner keys
  are property keys.
- **Resolution** — given an ordered list of scopes, the schema, and the
  values, produce the merged effective preferences. A downstream scope can
  override an upstream one only when the property is `overridable`.

## Usage

```ts
import { resolvePreferences } from '@nimbox/preferences';
import type { Schema, Values } from '@nimbox/preferences';

const scopes = ['system', 'user'];

const schema: Schema = {
  'editor.fontSize': {
    type: 'integer',
    scope: 'system',
    overridable: true,
    default: 12
  }
};

const values: Values = {
  user: { 'editor.fontSize': 14 }
};

const { preferences, diagnostics } = resolvePreferences(scopes, schema, values);
// preferences -> { 'editor.fontSize': 14 }
// diagnostics -> []
```

## What's exported

- `resolvePreferences` — final, resolved values for a scope list.
- `resolvePreferenceStates` — editor-time, per-property state at a selected
  scope (effective value, what it inherits, whether it overrides).
- `validateSchema` / `validateProperties` — schema validation diagnostics.
- `parse` / `safeParse` — coerce and validate a single value against a
  property (the editor commit path).
- `buildPropertyTree` — hierarchical, localized display tree from a schema.
- `createTranslator` / `localizeSchema` / `humanizeKey` — message
  localization helpers.

## Develop

All commands run from the repository's `typescript/` directory.

```bash
npm run generate   # regenerate types from spec/*.schema.json
npm run build      # build the package
npm run typecheck
npm test
cd packages/preferences && npm run test:coverage
```
