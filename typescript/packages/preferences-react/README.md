# @nimbox/preferences-react

React **hooks** for building schema-driven preference editors on top of
[`@nimbox/preferences`](../preferences). This package ships hooks only — it
brings the resolution/validation state into React and leaves the markup and
styling to you.

> Proprietary — see [LICENSE](../../../LICENSE). Internal Nimbox use only.

## Install

Published to GitHub Packages under the `@nimbox` scope. Configure your
`.npmrc` to resolve the scope from GitHub Packages:

```
@nimbox:registry=https://npm.pkg.github.com
```

```bash
npm install @nimbox/preferences-react @nimbox/preferences
```

`react` and `react-dom` are peer dependencies.

## Hooks

- `usePreferenceEditor` — the editor engine: resolves per-property state,
  tracks parse/commit errors, and exposes `register`, `setValue`, `clear`,
  and `reset` for wiring uncontrolled inputs to a scope's values.
- `usePropertyTree` — builds the localized, hierarchical property tree for
  rendering grouped sections.
- `useScrollSpy`, `useScrollToSection`, `useSectionNavigationSync`,
  `useSectionRegistry` — helpers for section navigation in a long editor.

## Usage

```tsx
import { usePreferenceEditor } from '@nimbox/preferences-react';

function FontSizeField({ schema, values, onChange }) {
  const { register } = usePreferenceEditor({
    scope: 'user',
    scopes: ['system', 'user'],
    schema,
    values,
    onChange // (scope, key, value) => Promise<void>
  });

  return <input type="number" {...register('editor.fontSize')} />;
}
```

See `src/stories/` for a full editor composed from these hooks (run via
Storybook).

## Develop

From the repository's `typescript/` directory:

```bash
npm run build
npm run typecheck
cd packages/preferences-react && npm run storybook
```
