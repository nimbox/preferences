This library has many parts that are related to each other. Parts are
not par of the specification, but are the pieces that make the
specification come to life.

* **Specification** - The specification is the core of the library. It
  defines the schema, the values, and the preferences.
* **Value Parser** - Parses an object or string into a value for a given
  property. 
* **Preferences Resolution** - Merges all the values into a single
  preferences object. 
* **Schema Validator** - Validates a given schema against the
  specification. This is meant to test if the published fixtures are
  valid against the specification.
* **Tree Hook** - The hook that can be used to build the display tree of
  the preferences.
* **Editor Hook** - The hook that helps edit the preferences. The editor
  hook acts on a single preference item and is loosely modeled after
  React Hook Form.
* **Navigation Hooks** - The hooks that help navigate the preferences,
  although they could be found on other libraries.
