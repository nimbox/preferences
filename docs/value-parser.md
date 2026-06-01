# Value Parser

The **Value Parser** turns an object or string into a typed value for a
given property. Its input is the kind of value an editor control produces —
often a raw string from the DOM — and its output is a value of the property's
declared type, checked against the property's constraints.

Source: [`typescript/packages/preferences/src/utils/parse.ts`](../typescript/packages/preferences/src/utils/parse.ts).

## Two explicit phases

Parsing is two distinct steps, run in order:

1. **Coercion** — `unknown` → a value of the declared type. No constraint
   checking. Coercion may fail with `invalid_type` (e.g. `"abc"` is not a
   number) or `invalid_json` (object/array text that does not parse).
2. **Validation** — checks the typed value against the scalar constraints
   (enum, min/max, length, pattern, format). Validation may fail with
   `too_small`, `too_big`, `invalid_enum`, `invalid_pattern`, or
   `invalid_format`.

The split matters because the two concerns answer different questions —
*"is this the right type?"* versus *"does this typed value satisfy the
constraints?"* — and because each phase maps cleanly onto a disjoint set of
[`PropertyIssue`](issues.md) codes:

| Phase | May fail with |
|-------|---------------|
| Coercion | `invalid_type`, `invalid_json` |
| Validation | `too_small`, `too_big`, `invalid_enum`, `invalid_pattern`, `invalid_format` |

## Per-type behavior

| Type | Coercion | Validation |
|------|----------|------------|
| `boolean` | any → boolean (`"true"`/`"false"` recognized, else truthiness); never fails | none |
| `integer` / `number` | trim + `Number`; `invalid_type` when empty, non-finite, or (integer) not whole | range (`minimum`/`maximum`), then `enum` |
| `string` | `String(value ?? '')`; never fails | length (`minLength`/`maxLength`), `pattern`, `format`, then `enum` |
| `object` | record passes; string → `JSON.parse`; `invalid_json` / `invalid_type` | none |
| `array` | array passes; string → `JSON.parse`; `invalid_json` / `invalid_type` | length (`minItems`/`maxItems`), then coerce + validate each element against `items` |
| `any` | non-strings pass; string → `JSON.parse`; `invalid_json` | none |

For arrays, a failing element's issue carries its index in `path` (e.g.
`[1]` for the second element).

## Entry points

| Function | Phase | Notes |
|----------|-------|-------|
| `parse(property, value, formatValidators?)` | coerce → validate | Throws `PropertyError` on failure; returns the value on success. |
| `safeParse(property, value, formatValidators?)` | coerce → validate | Returns `{ success: true, data }` or `{ success: false, error }`; never throws. Dispatches by `property.type`. |
| `parseScalar(constraints, value, formatValidators?)` | coerce → validate | The scalar pipeline; composes the two functions below. |
| `coerceScalar(constraints, value)` | coerce only | Phase 1 in isolation. |
| `checkScalarValue(constraints, value, formatValidators?)` | validate only | Phase 2 in isolation. Assumes `value` is already of the declared type. |

### Format gating

`format` is only checked when `formatValidators` is supplied. When it is
omitted, format is not checked at all — this is how `checkScalarValue` is reused
by [`validateProperties`](../typescript/packages/preferences/src/utils/validateProperties.ts)
to validate **defaults**, where the value is already typed and format is not
enforced. When validators are supplied (even `{}`), format is enforced and
**fails closed**: a declared `format` with no matching validator is treated as
not passing.

## Tests

[`parse.test.ts`](../typescript/packages/preferences/src/utils/parse.test.ts)
covers the parser, organized around the two phases — coercion
(`coerceScalar`), validation (`checkScalarValue`), and end-to-end composition
(`parse` / `safeParse`). Run with `npm test` from `typescript/`.

## See also

- [`issues.md`](issues.md) — the `PropertyIssue` union the parser emits.
- [`blocks.md`](blocks.md) — how the Value Parser fits among the library's parts.
