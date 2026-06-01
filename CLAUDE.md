# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands are run from the `typescript/` directory.

```bash
# Install dependencies
npm install

# Generate TypeScript types from JSON schemas (must run before build/typecheck)
npm run generate

# Build both packages
npm run build

# Type check both packages
npm run typecheck

# Run tests (Vitest; core preferences package)
npm test
cd packages/preferences && npm run test:watch   # watch mode

# Lint (react package only)
cd packages/preferences-react && npm run lint

# Storybook dev server for React components
cd packages/preferences-react && npm run storybook

# Watch mode for development
npm run build:watch   # from individual package dir
```

## Architecture

This is a **schema-driven preference management library** with two npm packages in a workspace monorepo under `typescript/`:

- **`@nimbox/preferences`** (`packages/preferences/`) — Core library: resolution algorithm, validation, parsing, localization
- **`@nimbox/preferences-react`** (`packages/preferences-react/`) — React UI components for editing preferences

### Key Concepts

1. **Schema** (`spec/schema.schema.json`): A flat map from dot-notation keys (e.g., `editor.fontSize`) to Property definitions. Each Property has a `type`, `scope`, `overridable` flag, optional `default`, constraints, and localization keys.

2. **Values** (`spec/values.schema.json`): Per-scope assignments of property values. Outer keys are scope names; inner keys are property keys.

3. **Resolution**: `resolvePreferences()` takes an ordered list of scopes, a Schema, and per-scope Values, and produces a merged Preferences object. If `overridable: true`, downstream scopes can override upstream values; otherwise the owning scope wins.

4. **PropertyIssue**: Discriminated union of validation errors (`too_small`, `too_big`, `invalid_type`, `invalid_enum`, `invalid_pattern`, `invalid_json`) with path tracking.

### Source Layout

- `spec/` — JSON Schema definitions (canonical, published via CI to external repo)
- `fixtures/` — Example schema/values/messages data; VS Code maps these to `spec/` schemas for IDE validation
- `typescript/packages/preferences/src/utils/` — All core logic (resolvePreferences, parse, localize, buildPreferenceTree, validateSchema, etc.)
- `typescript/packages/preferences/src/generated/` — Auto-generated TypeScript types from JSON schemas (do not edit manually)
- `typescript/packages/preferences-react/src/` — React hooks and components

### Code Generation

TypeScript types in `src/generated/` are produced from `spec/property.schema.json` (and other schema files) using `json-schema-to-typescript`. Always run `npm run generate` after modifying any `spec/*.schema.json` file.

### Publishing

The `spec/` schemas are published to an external repository via `.github/workflows/publish-schemas.yaml` on any push that modifies files under `spec/`.
