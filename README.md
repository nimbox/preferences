# @nimbox/preferences

A schema-driven preference management library. Define preferences once as a
**schema**, assign values per **scope**, and resolve them — by merge order —
into the effective settings your app reads. Includes validation, value
parsing, localization, and React hooks for building an editor UI.

> Proprietary software — see [LICENSE](LICENSE). Internal Nimbox use only.

## The model

- **Schema** — property *definitions*: each property has a `type`, an owning
  `scope`, an `overridable` flag, an optional `default`, constraints, and
  localization keys. No values.
- **Values** — per-scope *assignments* of values to properties.
- **Preferences** — the *resolved values* produced from a schema and values
  for a given, ordered list of scopes.

### Merge-order resolution

Scopes are an ordered list, e.g.:

1. `system`
2. `global`
3. `application`
4. `user`

A property's owning `scope` is where resolution begins. When a property is
`overridable`, scopes *downstream* of the owner may replace its value;
otherwise the owner's value is locked. These scope names are just an example —
host applications define their own ordered scope list and authorization rules.

## Packages

The TypeScript packages live under [`typescript/`](typescript) (an npm
workspace) and publish to GitHub Packages under the `@nimbox` scope:

| Package | Description |
| --- | --- |
| [`@nimbox/preferences`](typescript/packages/preferences) | Framework-agnostic core: resolution, validation, parsing, localization. |
| [`@nimbox/preferences-react`](typescript/packages/preferences-react) | React hooks for building schema-driven preference editors. |

The canonical JSON Schemas live in [`spec/`](spec) and are published to an
external schemas repository by CI on changes under `spec/`.

## Getting started

All commands run from `typescript/`:

```bash
cd typescript
npm install
npm run generate    # regenerate TS types from spec/*.schema.json
npm run build       # build both packages
npm run typecheck
npm test
```

## Documentation

- [Specification](docs/specification.md) — the canonical contract.
- [Value parser](docs/value-parser.md) — coercion and validation rules.
- [Issues](docs/issues.md) — the `PropertyIssue` / diagnostic model.
- [Blocks](docs/blocks.md) — how the core source is organized.
- [Design](docs/design.md) — design notes.
