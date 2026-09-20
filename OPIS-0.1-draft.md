# OPIS 0.1
## Open Interface Specification

**Status:** Draft  
**Version:** 0.1  
**File extensions:** `.opis.yaml`, `.opis.yml`  
**Purpose:** Portable, declarative specification of user-interface components and their composition.

---

# 1. Introduction

OPIS is a declarative specification for describing the semantic structure of user-interface components.

OPIS defines:

- components,
- typed arguments,
- component protocols,
- component composition,
- nested structure,
- collections,
- layout,
- sizing,
- property expressions,
- validity constraints,
- and references to external design tokens.

OPIS does **not** define:

- application logic,
- network behavior,
- data fetching,
- navigation,
- prototype flows,
- event handling,
- animation timelines,
- documentation systems,
- source-code implementation,
- canvas-editor metadata,
- or the values of design tokens.

OPIS is intended to sit between design tools and implementation frameworks.

A OPIS document describes **what an interface object is**, rather than how a particular platform implements it.

A OPIS component may be rendered or consumed by:

- visual design tools,
- documentation generators,
- code generators,
- UI frameworks,
- design-system tooling,
- static analyzers,
- linters,
- AI agents,
- testing systems,
- and other OPIS-aware tools.

---

# 2. Design principles

OPIS follows several principles.

## 2.1 Declarative

A OPIS document describes a result and its constraints.

It does not execute arbitrary user code.

## 2.2 Deterministic

Given the same component definition, arguments, environment, and token values, a conforming OPIS evaluator MUST produce the same resolved component model.

## 2.3 Statically analyzable

Tools SHOULD be able to determine:

- available arguments,
- possible argument values,
- component dependencies,
- protocol conformance,
- possible structural configurations,
- token dependencies,
- property expression results,
- inexhaustive or invalid `match` expressions,
- and invalid configurations

without executing arbitrary code.

## 2.4 Platform-neutral

OPIS MUST NOT require concepts specific to:

- CSS,
- HTML,
- React,
- SwiftUI,
- Jetpack Compose,
- Flutter,
- Figma,
- Penpot,
- or any other particular renderer.

Platform bindings MAY translate OPIS concepts into platform-specific primitives.

## 2.5 Composable

Complex components SHOULD be formed by composing smaller components rather than through inheritance.

## 2.6 Explicit

Semantically meaningful differences SHOULD be represented explicitly rather than inferred from visual appearance.

## 2.7 Interoperable

OPIS SHOULD reuse existing open specifications where appropriate.

Design token values SHOULD use the W3C Design Tokens Community Group format rather than being redefined by OPIS.

---

# 3. Conceptual model

A OPIS component consists of:

```text
Component
├── Identity
├── Token imports
├── Arguments
├── Protocol conformance
├── Constraints
├── Structure
│   ├── Nodes
│   ├── Component instances
│   ├── Slots
│   └── Collections
├── Layout
└── Property expressions
```

The core relationship is:

```text
Arguments
    ↓

Constraints
    ↓

Structure + Layout + Property expressions
    ↓

Resolved Component
```

---

# 4. Document structure

A OPIS file MUST contain a top-level object.

A typical document is:

```yaml
$schema: "https://opis-spec.org/schema/0.1"

opis: "0.1"

component:
  id: "com.example/Button"
  name: "Button"
  version: "1.0.0"

imports:
  tokens:
    - namespace: core
      source: "./core.tokens.json"

arguments:
  ...

conformsTo:
  ...

constraints:
  ...

structure:
  ...
```

Variation is expressed on properties inside `structure`, not as a top-level override list.

The following top-level properties are defined:

| Property | Required | Meaning |
|---|---:|---|
| `$schema` | SHOULD | Schema identifier |
| `opis` | MUST | OPIS specification version |
| `component` | MUST | Component identity |
| `imports` | MAY | External resources |
| `protocols` | MAY | Protocols declared by the document |
| `arguments` | MAY | Component inputs |
| `conformsTo` | MAY | Protocols implemented by the component |
| `constraints` | MAY | Validity rules |
| `structure` | MUST | Component structure |
| `extensions` | MAY | Vendor or experimental metadata |

Unknown top-level properties MUST NOT alter standard OPIS semantics.

---

# 5. Component identity

Every component MUST have a stable identifier.

```yaml
component:
  id: "com.acme.design/Button"
  name: "Button"
  version: "2.1.0"
```

## 5.1 `id`

`id` uniquely identifies the component within its design-system namespace.

Recommended format:

```text
<reverse-domain-or-namespace>/<ComponentName>
```

Example:

```text
com.acme.design/Button
```

OPIS does not require reverse-domain notation.

## 5.2 `name`

`name` is the human-readable component name.

## 5.3 `version`

`version` SHOULD use semantic versioning.

Versioning semantics are outside the normative scope of OPIS 0.1, but tools MAY use versions for dependency resolution.

---

# 6. Token integration

OPIS does not define design-token values.

Token documents SHOULD conform to DTCG.

Example:

```yaml
imports:
  tokens:
    - namespace: core
      source: "./core.tokens.json"

    - namespace: product
      source: "./product.tokens.json"
```

Tokens are referenced using their imported namespace.

Example:

```yaml
background: "{product.color.action.primary}"
gap: "{core.spacing.200}"
```

A OPIS processor MUST preserve token references until token resolution is explicitly requested.

Tools SHOULD NOT automatically replace token references with literal values during interchange.

This preserves semantic identity.

---

# 7. Arguments

Arguments are typed inputs accepted by a component.

Arguments are the primary mechanism for representing:

- visual variants,
- content,
- state-like configuration,
- optional component slots,
- collections,
- and configurable layout behavior.

Example:

```yaml
arguments:
  size:
    type: enum
    values:
      - small
      - medium
      - large
    default: medium

  label:
    type: string

  icon:
    type: component
    accepts: "com.acme.design/Icon"
    optional: true

  disabled:
    type: boolean
    default: false
```

---

# 8. Argument types

OPIS 0.1 defines the following primitive argument types:

```text
string
number
boolean
enum
component
component[]
```

Future versions MAY add additional types.

---

# 9. Strings

```yaml
label:
  type: string
```

Strings MAY define a default.

```yaml
label:
  type: string
  default: "Continue"
```

Strings MAY be optional.

```yaml
supportingText:
  type: string
  optional: true
```

---

# 10. Numbers

```yaml
progress:
  type: number
```

Numbers MAY specify bounds.

```yaml
progress:
  type: number
  minimum: 0
  maximum: 1
```

Numeric arguments SHOULD represent semantic input values rather than raw visual dimensions when a token or layout property would be more appropriate.

---

# 11. Booleans

```yaml
disabled:
  type: boolean
  default: false
```

---

# 12. Enums

Enums describe a finite set of values.

```yaml
size:
  type: enum
  values:
    - small
    - medium
    - large
  default: medium
```

Enums SHOULD be preferred over freeform strings when the accepted value set is known.

---

# 13. Component arguments

A component argument accepts another component.

```yaml
icon:
  type: component
  accepts: "com.acme.design/Icon"
  optional: true
```

A component argument MAY accept a protocol instead of a concrete component.

```yaml
content:
  type: component
  accepts:
    protocol: "ContentBlock"
```

---

# 14. Component collections

A component collection accepts zero or more child components.

```yaml
actions:
  type: component[]
  accepts:
    protocol: "Action"

  minItems: 1
  maxItems: 3
```

`minItems` defaults to `0`.

If `maxItems` is omitted, the collection is unbounded.

---

# 15. Optional arguments

Any argument MAY specify:

```yaml
optional: true
```

An optional argument may be absent.

A required argument MUST be supplied unless it defines a default.

---

# 16. Argument metadata

Arguments MAY provide a short description.

```yaml
tone:
  type: enum
  values: [primary, secondary, destructive]
  description: "Visual emphasis and semantic tone."
```

Descriptions are informational.

They MUST NOT affect rendering semantics.

Full documentation belongs outside the core OPIS specification.

---

# 17. Argument roles

Tools MAY annotate arguments with a semantic authoring role.

```yaml
size:
  type: enum
  values: [small, medium, large]
  role: variant
```

Defined advisory roles include:

```text
variant
content
state
slot
```

Argument roles MUST NOT change evaluation semantics.

A OPIS processor MAY ignore them.

---

# 18. Protocols

Protocols define contracts that multiple components may satisfy.

A protocol allows components to accept categories of components without enumerating every concrete implementation.

Example:

```yaml
protocols:
  CarouselItem:
    description: "Content suitable for placement within a carousel."
```

A component conforms using:

```yaml
conformsTo:
  - CarouselItem
```

---

# 19. Protocol identity

Protocols SHOULD use stable identifiers when shared across files.

Example:

```yaml
protocols:
  - id: "com.acme.protocol/CarouselItem"
    name: "CarouselItem"
```

For small local documents, shorthand names MAY be used.

---

# 20. Protocol requirements

OPIS 0.1 permits protocols to declare required semantic capabilities.

Example:

```yaml
protocols:
  Action:
    requires:
      semantics:
        role: action
```

Protocol requirements SHOULD remain declarative.

Protocols MUST NOT contain executable logic.

---

# 21. Protocol-based arguments

```yaml
arguments:
  items:
    type: component[]
    accepts:
      protocol: "CarouselItem"
```

Any component supplied to `items` MUST conform to `CarouselItem`.

A validator MUST report protocol violations.

---

# 22. Structure

Every component MUST define a structural root.

```yaml
structure:
  id: root
  type: stack
  axis: horizontal
```

Structure is represented as a tree.

Each node MAY have:

```text
id
type
children
layout properties
style references
content bindings
visibility
```

Node IDs MUST be unique within a component.

---

# 23. Node types

OPIS 0.1 defines six core structural node types:

```text
stack
text
component
slot
collection
media
```

Implementations MAY define extension node types, but extension nodes MUST NOT silently change the meaning of standard node types.

---

# 24. Stack nodes

A `stack` is a layout container.

Example:

```yaml
structure:
  id: root
  type: stack
  axis: horizontal
  gap: "{core.spacing.200}"
  align: center

  children:
    - ...
```

A stack MAY contain arbitrary OPIS nodes.

---

# 25. Text nodes

A `text` node represents textual content.

```yaml
- id: label
  type: text
  content: "$arguments.label"
```

Its content MAY reference a string argument.

Text presentation SHOULD use token references when possible.

```yaml
style:
  typography: "{core.typography.button}"
  color: "{core.color.text.primary}"
```

---

# 26. Component nodes

A `component` node instantiates another OPIS component.

```yaml
- id: closeButton
  type: component
  component: "com.acme.design/Button"

  arguments:
    kind: icon
    icon: "$arguments.closeIcon"
```

Arguments MAY be:

- literals,
- token references,
- or bindings to parent arguments.

---

# 27. Slot nodes

A `slot` places a component argument into the structural tree.

```yaml
- id: leadingIcon
  type: slot
  source: "$arguments.icon"
```

If the referenced argument is optional and absent, the slot contributes no child to layout.

Its absence MUST NOT create spacing by itself.

---

# 28. Collection nodes

A `collection` expands a `component[]` argument into repeated children.

Example:

```yaml
- id: actions
  type: collection
  source: "$arguments.actions"

  layout:
    axis: horizontal
    gap: "{core.spacing.200}"
```

The order of rendered children MUST match the order of items supplied to the collection unless explicitly overridden.

---

# 29. Media nodes

A `media` node represents externally supplied media such as:

- images,
- illustrations,
- video thumbnails,
- or other visual assets.

OPIS 0.1 does not define a media transport format.

Example:

```yaml
- id: hero
  type: media
  source: "$arguments.image"
```

Media argument typing may be standardized in a later version.

---

# 30. Nested structure

Nodes MAY contain arbitrarily nested children where their node type permits it.

Example:

```yaml
structure:
  id: root
  type: stack
  axis: vertical

  children:
    - id: header
      type: stack
      axis: horizontal

      children:
        - id: icon
          type: slot
          source: "$arguments.icon"

        - id: heading
          type: stack
          axis: vertical

          children:
            - id: title
              type: text
              content: "$arguments.title"

            - id: explainer
              type: text
              content: "$arguments.explainer"
```

Nested structure is the standard method for describing composite components.

---

# 31. Layout

Layout describes spatial relationships between nodes.

OPIS layout terminology is intentionally platform-neutral.

OPIS 0.1 defines:

```text
axis
gap
align
distribution
width
height
minWidth
maxWidth
minHeight
maxHeight
padding
aspectRatio
overflow
order
```

A stack MAY specify `order` as a list of child node IDs.

When `order` is omitted, children participate in document order.

When `order` is present, it MUST list each child ID of that node exactly once.

Node IDs MUST remain stable within a component version.

Hidden or absent children MAY appear in `order`. They still MUST NOT participate in layout.

---

# 32. Axis

A stack or collection MAY define:

```yaml
axis: horizontal
```

or:

```yaml
axis: vertical
```

---

# 33. Gap

```yaml
gap: "{core.spacing.200}"
```

A gap applies between participating children.

Absent or hidden children MUST NOT produce gap spacing.

---

# 34. Alignment

Cross-axis alignment:

```yaml
align: start
align: center
align: end
align: stretch
```

---

# 35. Distribution

Main-axis distribution:

```yaml
distribution: start
distribution: center
distribution: end
distribution: spaceBetween
```

Implementations MAY support additional values via extensions.

---

# 36. Padding

Padding MAY be represented uniformly:

```yaml
padding: "{core.spacing.300}"
```

or directionally:

```yaml
padding:
  block: "{core.spacing.300}"
  inline: "{core.spacing.400}"
```

or:

```yaml
padding:
  top: 12
  right: 16
  bottom: 12
  left: 16
```

Logical directions SHOULD be preferred where possible.

---

# 37. Sizing

OPIS supports portable sizing modes.

A dimension MAY be:

```text
fixed
intrinsic
fill
```

Example:

```yaml
width:
  mode: fill

height:
  mode: intrinsic
```

Fixed:

```yaml
height:
  mode: fixed
  value: 48
```

Token-based fixed sizing:

```yaml
height:
  mode: fixed
  value: "{core.control.height.large}"
```

---

# 38. Intrinsic sizing

```yaml
width:
  mode: intrinsic
```

`intrinsic` means the node SHOULD use the size required by its content and layout constraints.

Host implementations determine the exact intrinsic-size algorithm.

---

# 39. Fill sizing

```yaml
width:
  mode: fill
```

`fill` means the node SHOULD occupy available space offered by its parent along the relevant axis.

---

# 40. Minimum and maximum sizing

```yaml
minWidth: 240
maxWidth: 480
```

Values MAY reference tokens.

---

# 41. Aspect ratio

```yaml
aspectRatio: 1.7778
```

represents approximately 16:9.

---

# 42. Overflow

OPIS 0.1 defines:

```text
visible
clip
scroll
```

Example:

```yaml
overflow: scroll
```

Scroll direction is inferred from layout axis unless otherwise extended.

---

# 43. Parent-imposed child layout

A parent MAY impose layout constraints on collection children.

Example:

```yaml
- id: cards
  type: collection
  source: "$arguments.items"

  layout:
    axis: horizontal
    gap: "{core.spacing.300}"

  itemLayout:
    width:
      mode: fixed
      value: 280
```

Parent-imposed constraints override a child's preferred size where the specified constraint applies.

Tools SHOULD distinguish:

```text
child preference
```

from:

```text
parent constraint
```

when presenting layout diagnostics.

---

# 44. Visibility

Any node MAY specify:

```yaml
hidden: true
```

Hidden nodes MUST NOT participate in normal layout.

`hidden` MAY be a property expression.

---

# 45. Constraints

Constraints define which argument configurations are valid.

Constraints do not define appearance.

Example:

```yaml
constraints:
  - require:
      when:
        eq:
          - "$arguments.kind"
          - text

      then:
        exists: "$arguments.label"
```

---

# 46. `require`

A requirement states that when one predicate is satisfied, another predicate MUST also be satisfied.

```yaml
- require:
    when:
      eq:
        - "$arguments.kind"
        - text

    then:
      exists: "$arguments.label"
```

---

# 47. `forbid`

A forbidden condition identifies an invalid configuration.

```yaml
- forbid:
    all:
      - eq:
          - "$arguments.kind"
          - icon

      - exists: "$arguments.label"

      - neq:
          - "$environment.platform"
          - tv
```

A conforming validator MUST report a matching forbidden condition as invalid.

---

# 48. Conditional argument availability

Arguments MAY define availability conditions.

```yaml
iconPosition:
  type: enum
  values: [leading, trailing]

  availableWhen:
    exists: "$arguments.icon"
```

An argument that is supplied while unavailable MUST produce a validation error.

---

# 49. Conditional argument prohibition

```yaml
label:
  type: string
  optional: true

  forbiddenWhen:
    all:
      - eq:
          - "$arguments.kind"
          - icon

      - neq:
          - "$environment.platform"
          - tv
```

This is shorthand for an equivalent constraint.

---

# 50. Property expressions

Valid arguments affect appearance and structure through **property expressions**.

A property value MAY be:

- a literal,
- a token reference,
- a `match` expression,
- or an `if` expression.

Example:

```yaml
height:
  match:
    on: "$arguments.size"
    cases:
      small:
        mode: fixed
        value: "{core.control.height.small}"
      medium:
        mode: fixed
        value: "{core.control.height.medium}"
      large:
        mode: fixed
        value: "{core.control.height.large}"
```

Any assignable property MAY be an expression, including layout properties, `hidden`, `order`, `style` fields, and nested fields such as `padding.inline`.

A property value is a `match` expression when it is an object that contains `match`.

A property value is an `if` expression when it is an object that contains `if`, `then`, and `else`.

Other object forms, such as sizing `mode` or directional `padding`, are concrete values.

A property MUST have exactly one definition. It is either a concrete value or a single expression. There is no document-level override list.

Property expressions MUST be declarative.

Property expressions MUST NOT execute arbitrary functions.

OPIS 0.1 MUST NOT use a top-level `conditions` list, `when`/`set` patches, or document order to resolve variation.

---

# 51. Independent axes

Independent argument dimensions compose by writing to different properties.

```yaml
height:
  match:
    on: "$arguments.size"
    cases:
      small:
        mode: fixed
        value: "{core.control.height.small}"
      medium:
        mode: fixed
        value: "{core.control.height.medium}"
      large:
        mode: fixed
        value: "{core.control.height.large}"

style:
  background:
    match:
      on: "$arguments.tone"
      cases:
        primary: "{core.color.action.primary}"
        secondary: "{core.color.action.secondary}"
        destructive: "{core.color.action.destructive}"
```

A large destructive button receives both results because `size` owns `height` and `tone` owns `background`.

When two axes affect the same property, their interaction MUST be expressed as a nested `match` on that property. See §54.

---

# 52. `match`

`match` selects a value from a finite selector.

```yaml
hidden:
  match:
    on: "$arguments.kind"
    cases:
      text: false
      icon: true
```

The object form is:

```yaml
match:
  on: <selector>
  cases:
    <arm>: <value>
  else: <value>
```

`on` MUST be an argument or environment selector.

OPIS 0.1 `match` selectors MUST have a finite value set:

```text
enum
boolean
```

Each key in `cases` MUST name one legal selector value, or several legal values separated by commas.

```yaml
cases:
  small: "{core.control.height.small}"
  medium: "{core.control.height.medium}"
  large, xlarge: "{core.control.height.large}"
```

`large, xlarge` is two arms that share one value. It is equivalent to writing both keys separately.

A selector value MUST NOT appear in more than one `cases` key.

The value of an arm MAY itself be a literal, a token reference, or another property expression.

---

# 53. Exhaustiveness

A `match` on an enum or boolean MUST be exhaustive.

A `match` is exhaustive when every legal selector value appears as a `cases` key, appears in a comma-separated `cases` key, or when `else` is present.

A validator MUST report an inexhaustive `match` as an error.

Unknown `cases` keys MUST be reported as an error.

If every legal value is already present in `cases`, `else` SHOULD NOT be used. Tools MAY warn that `else` is unreachable.

```yaml
order:
  match:
    on: "$arguments.iconPosition"
    cases:
      leading:
        - icon
        - label
      trailing:
        - label
        - icon
```

---

# 54. Nested `match`

When one property depends on more than one argument, nest `match` expressions inside the property that depends on both.

```yaml
width:
  match:
    on: "$arguments.kind"
    cases:
      text:
        mode: intrinsic
      icon:
        match:
          on: "$arguments.size"
          cases:
            small:
              mode: fixed
              value: "{core.control.height.small}"
            medium:
              mode: fixed
              value: "{core.control.height.medium}"
            large:
              mode: fixed
              value: "{core.control.height.large}"
```

The inner `match` is the intersection. It is local to that property.

Axes MUST NOT be multiplied into a document-level grid of patches.

---

# 55. `if`

`if` selects between two values using a predicate.

```yaml
gap:
  if:
    exists: "$arguments.icon"
  then: "{core.spacing.200}"
  else: 0
```

The object form is:

```yaml
if: <predicate>
then: <value>
else: <value>
```

`then` and `else` MUST both be present.

Either branch MAY be a nested property expression.

Use `match` when the selector is a finite enum or boolean.

Use `if` for existence checks and other predicates that are not finite enumerations.

A `match` selector MUST reference:

- a required argument,
- an argument with a default,
- or a declared environment value.

An optional argument without a default MUST NOT be used as a `match` selector. Use `if` with `exists` instead.

---

# 56. Predicates

Predicates are used by constraints and by `if`.

OPIS 0.1 defines:

```text
eq
neq
exists
not
all
any
gt
gte
lt
lte
count
```

Equality:

```yaml
eq:
  - "$arguments.size"
  - large
```

Existence:

```yaml
exists: "$arguments.icon"
```

Boolean composition:

```yaml
all:
  - eq: ["$arguments.kind", icon]
  - exists: "$arguments.icon"
```

```yaml
any:
  - eq: ["$arguments.size", large]
  - eq: ["$arguments.size", medium]
```

```yaml
not:
  exists: "$arguments.icon"
```

Collection predicates:

```yaml
gte:
  - count: "$arguments.actions"
  - 2
```

A processor SHOULD be able to statically evaluate collection-count predicates when argument values are known.

---

# 57. Evaluation

Property expressions are evaluated after the component’s constraints have been satisfied.

Evaluation MUST be deterministic.

Document order MUST NOT affect the result of property expressions.

Given arguments and environment, each expression MUST reduce to a single concrete value.

A resolved component MUST NOT contain unresolved `match` or `if` expressions.

Nested expressions are evaluated from the inside of the selected arm or branch.

---

# 58. No document-level overrides

The following are not part of OPIS 0.1:

```text
top-level conditions:
when / set patches
intersection conditions
last-wins assignment
specificity by document order
```

Those forms recreate a variant matrix: every colliding combination becomes another global rule.

Variation belongs on the property that changes. Validity belongs in constraints. Structure belongs in the tree.

A conforming implementation MUST reject a top-level `conditions` property as an error.

---

# 59. Authoring `when` trees

OPIS is an interchange representation.

A higher-level authoring language or visual editor MAY expose nested `when` trees to humans.

Such trees MUST compile to property expressions.

Example authoring sugar:

```text
when kind is icon
  width = control.height[size]
```

MUST compile to a `match` on `width`, not to a global patch list.

Nested `when` is not a normative OPIS 0.1 construct.

---


# 60. Environment

OPIS distinguishes component arguments from renderer-provided environmental context.

Arguments are supplied by the component's caller.

Environment values are supplied by the host.

Example namespace:

```text
$environment.platform
$environment.viewport.width
$environment.input
$environment.contrast
```

OPIS 0.1 does not define a mandatory environment vocabulary.

Specifications and ecosystems MAY define standardized environment profiles separately.

A component MUST NOT assume the presence of an environment value unless it declares that dependency.

Example:

```yaml
environment:
  platform:
    type: enum
    values:
      - web
      - ios
      - android
      - tv
```

---

# 61. Composition

OPIS favors composition over inheritance.

A component may contain other components:

```yaml
- id: action
  type: component
  component: "com.acme.design/Button"

  arguments:
    tone: primary
    label: "$arguments.actionLabel"
```

OPIS 0.1 does not define component inheritance.

---

# 62. Open composition

Protocols allow a parent to accept components it does not know about in advance.

Example:

```yaml
protocols:
  CarouselItem: {}
```

```yaml
arguments:
  items:
    type: component[]
    accepts:
      protocol: CarouselItem
```

This allows independently defined components to participate in the parent composition.

---

# 63. Example: Button

```yaml
$schema: "https://opis-spec.org/schema/0.1"

opis: "0.1"

component:
  id: "com.example/Button"
  name: "Button"
  version: "1.0.0"

imports:
  tokens:
    - namespace: core
      source: "./core.tokens.json"

arguments:
  kind:
    type: enum
    values: [text, icon]
    default: text
    role: variant

  size:
    type: enum
    values: [small, medium, large]
    default: medium
    role: variant

  tone:
    type: enum
    values: [primary, secondary, destructive]
    default: primary
    role: variant

  label:
    type: string
    optional: true
    role: content

  icon:
    type: component
    accepts: "com.example/Icon"
    optional: true
    role: slot

  iconPosition:
    type: enum
    values: [leading, trailing]
    default: leading

    availableWhen:
      exists: "$arguments.icon"

constraints:
  - require:
      when:
        eq: ["$arguments.kind", text]

      then:
        exists: "$arguments.label"

  - forbid:
      all:
        - eq: ["$arguments.kind", icon]
        - not:
            exists: "$arguments.icon"

structure:
  id: root
  type: stack
  axis: horizontal
  align: center
  distribution: center

  gap:
    match:
      on: "$arguments.kind"
      cases:
        text: "{core.spacing.200}"
        icon: 0

  height:
    match:
      on: "$arguments.size"
      cases:
        small:
          mode: fixed
          value: "{core.control.height.small}"
        medium:
          mode: fixed
          value: "{core.control.height.medium}"
        large:
          mode: fixed
          value: "{core.control.height.large}"

  width:
    match:
      on: "$arguments.kind"
      cases:
        text:
          mode: intrinsic
        icon:
          match:
            on: "$arguments.size"
            cases:
              small:
                mode: fixed
                value: "{core.control.height.small}"
              medium:
                mode: fixed
                value: "{core.control.height.medium}"
              large:
                mode: fixed
                value: "{core.control.height.large}"

  padding:
    match:
      on: "$arguments.kind"
      cases:
        icon: 0
        text:
          block: "{core.spacing.200}"
          inline:
            match:
              on: "$arguments.size"
              cases:
                small: "{core.spacing.300}"
                medium: "{core.spacing.400}"
                large: "{core.spacing.500}"

  order:
    match:
      on: "$arguments.iconPosition"
      cases:
        leading:
          - icon
          - label
        trailing:
          - label
          - icon

  style:
    background:
      match:
        on: "$arguments.tone"
        cases:
          primary: "{core.color.action.primary}"
          secondary: "{core.color.action.secondary}"
          destructive: "{core.color.action.destructive}"
    radius: "{core.radius.control}"

  children:
    - id: icon
      type: slot
      source: "$arguments.icon"

    - id: label
      type: text
      content: "$arguments.label"
      hidden:
        match:
          on: "$arguments.kind"
          cases:
            text: false
            icon: true

      style:
        typography: "{core.typography.button}"
        color:
          match:
            on: "$arguments.tone"
            cases:
              primary: "{core.color.text.onAction}"
              secondary: "{core.color.text.primary}"
              destructive: "{core.color.text.onAction}"
```

`size` owns `height`. `tone` owns fill and label color. `kind` and `size` interact only inside `width` and `padding`, as nested `match` expressions on those properties.

No top-level override list is required.

---

# 64. Example: Modal

```yaml
opis: "0.1"

component:
  id: "com.example/Modal"
  name: "Modal"
  version: "1.0.0"

arguments:
  icon:
    type: component
    accepts: "com.example/Icon"
    optional: true

  title:
    type: string

  explainer:
    type: string
    optional: true

  content:
    type: component
    accepts:
      protocol: ModalContent
    optional: true

  actions:
    type: component[]
    accepts:
      protocol: Action
    minItems: 1
    maxItems: 3

structure:
  id: root
  type: stack
  axis: vertical
  gap: "{core.spacing.500}"

  children:

    - id: header
      type: stack
      axis: horizontal
      align: start
      gap: "{core.spacing.300}"

      children:

        - id: icon
          type: slot
          source: "$arguments.icon"

        - id: heading
          type: stack
          axis: vertical
          gap: "{core.spacing.100}"

          children:

            - id: title
              type: text
              content: "$arguments.title"

            - id: explainer
              type: text
              content: "$arguments.explainer"

    - id: content
      type: slot
      source: "$arguments.content"

    - id: actions
      type: collection
      source: "$arguments.actions"

      layout:
        axis: horizontal
        distribution: end
        gap: "{core.spacing.200}"
```

Optional absent nodes collapse naturally.

No separate modal variant is needed for:

```text
with icon
without icon
with explainer
without explainer
one action
two actions
three actions
```

Those are ordinary argument configurations.

---

# 65. Example: Carousel

```yaml
opis: "0.1"

protocols:
  CarouselItem:
    description: "A component suitable for presentation in a carousel."

component:
  id: "com.example/Carousel"
  name: "Carousel"
  version: "1.0.0"

arguments:
  items:
    type: component[]
    accepts:
      protocol: CarouselItem
    minItems: 1

  density:
    type: enum
    values:
      - compact
      - standard
      - spacious
    default: standard

structure:
  id: root
  type: collection
  source: "$arguments.items"

  layout:
    axis: horizontal
    overflow: scroll
    gap:
      match:
        on: "$arguments.density"
        cases:
          compact: "{core.spacing.200}"
          standard: "{core.spacing.300}"
          spacious: "{core.spacing.500}"

    padding:
      inline: "{core.spacing.400}"

  itemLayout:
    width:
      mode: fixed
      value: 280

    height:
      mode: intrinsic
```

Any component conforming to `CarouselItem` may be supplied.

---

# 66. Component scale

OPIS does not distinguish between “component,” “section,” and “page” at the schema level.

The following are all valid OPIS components:

```text
Icon
Button
SearchField
Card
NavigationBar
Carousel
Modal
SettingsSection
ProductHeader
CheckoutPanel
PageShell
ProductDetailsPage
```

The same composition model applies recursively.

A component SHOULD remain declarative and reusable regardless of scale.

---

# 67. What OPIS deliberately does not model

A OPIS component MUST NOT contain arbitrary application logic.

The following are outside OPIS 0.1:

```text
HTTP requests
database operations
authentication logic
analytics
navigation flows
business rules
arbitrary scripting
prototype transitions
runtime event handlers
application state stores
```

Hosts MAY bind application behavior to OPIS components externally.

---

# 68. Documentation boundary

OPIS MAY contain concise descriptions necessary to understand component APIs.

Example:

```yaml
description: "Controls visual emphasis."
```

OPIS SHOULD NOT become the canonical location for:

- long-form usage documentation,
- migration guides,
- design rationale,
- screenshots,
- release histories,
- ownership metadata,
- tutorials,
- do/don't galleries,
- or organizational policy.

Those concerns SHOULD be represented by documentation systems such as DSDS or other external formats referencing the OPIS component.

---

# 69. Implementation boundary

OPIS describes semantic interface structure.

It does not define implementation framework mappings.

A separate binding may map:

```text
OPIS stack
→ CSS flexbox

OPIS stack
→ SwiftUI HStack/VStack

OPIS stack
→ Compose Row/Column
```

Likewise:

```text
com.example/Button
→ React Button

com.example/Button
→ SwiftUI ButtonStyle

com.example/Button
→ Compose Button
```

Such mappings are outside OPIS 0.1.

---

# 70. Canonicalization

A OPIS implementation SHOULD be able to convert valid authoring YAML into a canonical resolved intermediate representation.

Canonicalization SHOULD:

- normalize shorthand values,
- resolve local references,
- preserve external token references,
- assign explicit defaults,
- normalize predicates,
- normalize property expressions,
- verify `match` exhaustiveness,
- verify node IDs,
- verify component references,
- verify protocol conformance,
- and validate argument constraints.

The canonical representation SHOULD be serializable as JSON.

YAML is the recommended human-readable interchange syntax.

---

# 71. Round-trip expectations

A conforming OPIS-aware tool SHOULD preserve all standard OPIS semantics when importing and exporting a document.

A tool MAY lose tool-specific information not represented by OPIS.

A tool MUST NOT silently reinterpret unsupported standard OPIS semantics.

If a tool cannot represent a OPIS feature, it SHOULD:

1. preserve that feature as opaque data where possible,
2. indicate that the feature is unsupported,
3. avoid destructive rewriting.

---

# 72. Extensions

Experimental or vendor-specific information SHOULD be placed under:

```yaml
extensions:
  com.example.tool:
    ...
```

Extensions MUST NOT redefine standard OPIS behavior.

A conforming implementation MAY ignore extensions.

---

# 73. Validation levels

OPIS tools SHOULD distinguish at least three classes of issue.

## Error

The document cannot be interpreted consistently.

Examples:

```text
unknown referenced argument
duplicate node ID
invalid enum value
protocol violation
inexhaustive match
unknown match arm
forbidden argument combination
missing required argument
```

## Warning

The document is valid but potentially problematic.

Examples:

```text
unused argument
unreachable match arm
redundant else
component dependency cycle
unbounded collection in constrained layout
```

## Advisory

A design-system quality observation.

Examples:

```text
literal value could reference a token
argument has no description
deeply nested match expressions
property depends on unusually many arguments
```

Advisories MUST NOT invalidate a document.

---

# 74. Static analysis goals

A OPIS implementation SHOULD make the following questions answerable without arbitrary code execution:

```text
What arguments does Button accept?

What are all values of Button.size?

Which components can appear inside Carousel?

Which token does Modal use for section spacing?

When is Button.label hidden?

Can Button(kind: icon, icon: nil) exist?

Which expression defines Button height?

Which components depend on the Action protocol?

Which combinations of arguments are invalid?

Which components reference this token?

Which nodes may appear for this argument configuration?
```

This property is fundamental to OPIS.

---

# 75. AI and tooling

OPIS is intentionally suitable for machine manipulation.

An agent modifying OPIS SHOULD be able to operate on semantic concepts such as:

```text
increase large Button padding
add a compact Card variant
allow PromotionalCard in Carousel
make explainer optional
restrict Modal to three actions
replace a literal spacing value with a DTCG token
```

without inferring those concepts from rendered pixels.

Machine use does not change OPIS semantics.

---

# 76. Relationship to authoring languages

OPIS is a specification, not necessarily the preferred human authoring language.

Higher-level languages MAY compile to OPIS.

For example:

```text
PDL
 ↓
OPIS
```

A higher-level language may provide:

- nested `when` trees that compile to `match`,
- concise syntax,
- declarations,
- reusable expressions,
- authoring conveniences,
- source organization,
- IDE features,
- or macros,

provided its compiled result conforms to OPIS.

OPIS itself SHOULD remain conservative and portable.

---

# 77. Relationship to visual editors

A visual editor MAY use OPIS as:

- its canonical component representation,
- an interchange representation,
- an export format,
- an import format,
- or a semantic layer alongside a looser scene graph.

A visual editor is not required to represent every freeform canvas object as a OPIS component.

An editor MAY support progressive formalization:

```text
freeform object
      ↓
structured group
      ↓
component candidate
      ↓
OPIS component
```

This allows exploratory design to remain flexible while stable design decisions become portable semantic definitions.

---

# 78. Relationship to DTCG

DTCG defines design values.

OPIS consumes them.

Conceptually:

```text
DTCG
────────────────────────
color
spacing
typography
radius
dimension
shadow
etc.

        ↓

OPIS
────────────────────────
component arguments
structure
layout
composition
property expressions
constraints
protocols
```

OPIS MUST NOT introduce a competing generic token system.

---

# 79. Relationship to documentation specifications

Documentation systems may reference OPIS components and derive structured information from them.

For example:

```text
DSDS
 ↓ references
Button.opis.yaml
```

Documentation may combine:

- component identity from OPIS,
- tokens from DTCG,
- source files from implementation repositories,
- prose usage guidance,
- examples,
- accessibility evidence,
- and organizational metadata.

OPIS itself remains focused on interface definition.

---

# 80. Minimal conformance

A minimum conforming OPIS 0.1 implementation MUST support:

- document parsing,
- component identity,
- primitive arguments,
- enum arguments,
- component arguments,
- component collections,
- structure trees,
- stack nodes,
- text nodes,
- component nodes,
- slot nodes,
- collection nodes,
- axis layout,
- alignment,
- gap,
- padding,
- sizing,
- DTCG references,
- property expressions (`match` and `if`),
- match exhaustiveness,
- constraints,
- protocol conformance.

---

# 81. Future areas

The following are intentionally deferred:

```text
accessibility semantics
discriminated argument unions
standard environment vocabulary
focus semantics
interaction contracts
events
state machines
animation
prototype scenarios
data schemas
implementation bindings
package/dependency resolution
component version negotiation
responsive layout primitives
grid layout
overlay/absolute layout
vector graphics
rich text
internationalization semantics
```

These MAY be standardized in later OPIS versions or companion specifications.

---

# 82. Summary

OPIS defines a portable semantic contract for user-interface composition.

The central model is:

```text
Tokens         → DTCG

Inputs         → Arguments

Compatibility  → Protocols

Validity       → Constraints

Composition    → Structure

Geometry       → Layout

Variation      → Property expressions

Implementation → External bindings

Documentation  → External documentation specs
```

OPIS treats components as typed, parameterized, composable interface objects rather than as collections of rendered frames.

Its goal is not to replace visual design tools or programming frameworks.

Its goal is to provide a shared representation between them.

A Button, Modal, Carousel, Section, or Page can therefore exist as a durable semantic artifact independent of the tool used to draw it and the framework used to implement it.


---

# Appendix A — Proposed OPIS Runtime and Reference Renderer

**Status:** Non-normative architecture proposal

This appendix describes a portable runtime and rendering architecture for OPIS. It does not expand the normative OPIS 0.1 schema.

The purpose of the runtime is to make a OPIS component executable and visually verifiable across multiple environments while preserving a single semantic source of truth.

The runtime SHOULD support:

- browser-based component viewing,
- desktop viewers,
- headless CI rendering,
- visual regression testing,
- iOS prototypes,
- Android prototypes,
- TV and other embedded prototype environments,
- and AI-agent comparison against platform-native implementations.

The runtime SHOULD NOT require every host to independently reimplement OPIS semantics.

## A.1 Architectural principle

The OPIS runtime should separate semantic resolution, layout, and rendering.

```text
OPIS
 ↓
OPIS Core
 ↓
Resolved Component Tree
 ↓
OPIS Layout
 ↓
Canonical Layout Tree
 ↓
OPIS Render Tree
 ↓
Rendering Backend
```

The canonical semantic and layout results are more fundamental than any specific graphics backend.

A browser, iOS application, Android application, desktop application, or CI process should be able to consume the same resolved representation.

## A.2 `opis-core`

`opis-core` should be a portable implementation of OPIS semantics.

It should be responsible for:

```text
parsing
schema validation
argument validation
protocol conformance
constraint evaluation
property-expression evaluation
DTCG token resolution
component expansion
environment evaluation
```

`opis-core` should contain no platform-specific UI dependencies.

Given:

```text
Button.opis.yaml
+
arguments
+
environment
+
DTCG token documents
```

it should produce a deterministic **Resolved OPIS Tree**.

The Resolved OPIS Tree should no longer contain unresolved `match` or `if` expressions.

For example:

```yaml
component: com.example/Button

arguments:
  size: large
  tone: primary
  label: Continue

environment:
  platform: ios
```

may resolve to a tree whose layout and style properties are already fully selected.

## A.3 `opis-layout`

`opis-layout` should convert the Resolved OPIS Tree into canonical geometry.

It should produce exact layout information such as:

```json
{
  "id": "label",
  "x": 44,
  "y": 14,
  "width": 72,
  "height": 20,
  "baseline": 29
}
```

The layout engine should be portable and deterministic.

A library such as Taffy may be used internally to implement stack, sizing, alignment, intrinsic measurement, fill behavior, gap, and related layout semantics.

However:

> OPIS semantics define the layout model. The layout library is an implementation detail.

The behavior of OPIS layout MUST NOT be defined merely as "whatever CSS Flexbox does."

## A.4 Canonical scene representation

After layout, the runtime should produce a **OPIS Render Tree**.

The OPIS Render Tree is a platform-neutral scene description containing fully resolved drawing primitives and geometry.

It should contain no:

```text
arguments
property expressions
protocols
token aliases
```

Those concepts have already been resolved.

A Render Tree may contain primitives such as:

```text
Group
Rect
RoundedRect
Text
Image
Path
Clip
Transform
```

Example:

```json
{
  "type": "group",
  "id": "button",
  "frame": [0, 0, 124, 48],
  "children": [
    {
      "type": "roundedRect",
      "frame": [0, 0, 124, 48],
      "radius": 8,
      "fill": "#3478F6"
    },
    {
      "type": "text",
      "id": "label",
      "text": "Continue",
      "origin": [20, 14],
      "font": "Inter",
      "size": 16
    }
  ]
}
```

This representation acts as the portability boundary between OPIS semantics and rendering implementations.

## A.5 Rendering backends

The Render Tree may be consumed by multiple backends.

```text
                    ┌→ Reference rasterizer
                    ├→ Browser renderer
OPIS Render Tree ────┼→ iOS renderer
                    ├→ Android renderer
                    ├→ Desktop renderer
                    └→ SVG/debug renderer
```

Backends MUST NOT reinterpret OPIS component semantics.

They render already-resolved layout and drawing instructions.

## A.6 Reference renderer

OPIS should provide one authoritative reference rasterizer.

Its purpose is to provide:

- deterministic screenshots,
- visual verification,
- regression testing,
- Figma migration comparison,
- agent evaluation,
- and conformance testing for alternative renderers.

A graphics stack such as Skia is a strong candidate for the reference backend.

The reference renderer should support at least:

```text
rectangles
rounded rectangles
fills
strokes
clipping
gradients
shadows
images
vector paths
text
```

The reference renderer should run headlessly.

Example conceptual CLI:

```bash
dis render Button.opis.yaml \
  --arg size=large \
  --arg tone=primary \
  --width 320 \
  --scale 2 \
  --output button.png
```

## A.7 Fonts and typography

Typography must be deterministic enough to support meaningful cross-platform validation.

A OPIS package or runtime environment should therefore be able to identify exact font resources.

Example:

```yaml
fonts:
  Inter:
    source: "./fonts/InterVariable.ttf"
    sha256: "..."
```

A reference renderer should control:

```text
font file
font version
font size
font weight
variable-font axes
OpenType features
letter spacing
line height
text shaping
fallback behavior
locale/script
```

A shaping engine such as HarfBuzz and a font engine such as FreeType may be used by the reference renderer.

Exact pixel rasterization across operating systems is not required for a platform-native implementation to be considered semantically correct.

Glyph metrics, line breaking, baseline position, layout geometry, and semantic styling should be compared independently from raw pixel output.

## A.8 Portable runtime

The core runtime should be portable across hosts.

A recommended architectural split is:

```text
opis-core
  semantic resolution

opis-layout
  canonical geometry

opis-scene
  canonical Render Tree

opis-reference-renderer
  authoritative raster output
```

Only the final rendering layer should depend on a particular graphics backend.

This permits the same OPIS semantic implementation to be reused by:

```text
Web
iOS
Android
macOS
Windows
Linux
TV
CI
AI sandboxes
```

## A.9 WebAssembly

The portable portions of the runtime should be designed so that they can compile to WebAssembly.

A browser viewer could therefore use:

```text
OPIS files
   ↓
opis-core.wasm
   ↓
opis-layout.wasm
   ↓
OPIS Render Tree
   ↓
CanvasKit or another browser graphics backend
```

This preserves the same semantic and layout implementation used by native and headless tooling.

A future runtime distribution may expose an interface conceptually similar to:

```text
load_component(bytes)
set_arguments(values)
set_environment(values)
resolve()
layout(width, height)
render_tree()
```

The host does not need to understand OPIS internals beyond this interface.

## A.10 Native prototype hosts

A lightweight **OPIS Player** may embed the runtime on native platforms.

A OPIS Player could load:

```text
components
DTCG tokens
fonts
assets
environment
```

and render the result locally.

Conceptually:

```text
OPIS Player

Open project
Connect to development server
Load local bundle
Scan project code / QR link
```

The same prototype could then execute on:

```text
iPhone
iPad
Android
Web
Desktop
TV
```

Each host supplies its own environment.

Example:

```yaml
platform: ios
viewport:
  width: 393
  height: 852
input: touch
```

A TV host may instead provide:

```yaml
platform: tv
input: remote
```

Property expressions may then resolve against those declared environment values.

## A.11 Reference rendering vs native rendering

The reference renderer and native prototype renderers should be treated as sibling implementations.

```text
                         OPIS Runtime
                              ↓
                    Canonical Render Tree
                    ↙         ↓         ↘
             Reference      iOS       Android
               Skia         host        host
```

The reference renderer provides an authoritative visual target.

Native hosts may use native graphics primitives where doing so improves:

- accessibility,
- native text rendering,
- native scrolling,
- focus behavior,
- input handling,
- or platform integration.

The ability to compare native output against the reference is a feature rather than a failure of abstraction.

## A.12 Verification hierarchy

OPIS conformance should not depend exclusively on screenshot similarity.

A comparison system should distinguish multiple levels of correctness.

### Semantic equivalence

```text
correct component
correct arguments
correct child structure
correct protocol participants
```

### Geometry equivalence

```text
frames
padding
gaps
alignment
constraints
baselines
```

### Typography equivalence

```text
font
weight
glyph advances
line breaking
baseline
line height
```

### Visual primitive equivalence

```text
fills
strokes
radius
opacity
shadows
images
```

### Pixel similarity

```text
final rendered image comparison
```

A platform implementation may therefore report:

```text
Semantic        PASS
Geometry        PASS
Typography      PASS
Visual values   PASS
Pixel match     98.7%
```

rather than failing because of insignificant rasterization differences.

## A.13 Geometry manifest

Every reference render should be capable of emitting a machine-readable geometry manifest.

Example:

```json
{
  "component": "com.example/Button",
  "arguments": {
    "size": "large",
    "tone": "primary"
  },
  "nodes": {
    "root": {
      "frame": [0, 0, 124, 48]
    },
    "icon": {
      "frame": [20, 16, 16, 16]
    },
    "label": {
      "frame": [44, 14, 60, 20],
      "baseline": 29
    }
  }
}
```

This allows agents and platform test systems to diagnose *why* an implementation differs from the reference rather than relying only on image similarity.

## A.14 Agent verification workflow

A coding agent should be able to use OPIS as an executable UI contract.

For example:

```text
OPIS component
     ↓
agent writes SwiftUI
     ↓
iOS simulator
     ↓
screenshot + geometry evidence
     ↓
OPIS comparison
     ↓
agent corrects implementation
```

Equivalent workflows should be possible for:

```text
Android / Compose
Web / HTML + CSS
Flutter
other UI frameworks
```

This makes OPIS useful not only as a design interchange format, but also as a target for automated implementation verification.

## A.15 Figma migration verification

The runtime should support the Figma-to-OPIS migration workflow.

```text
Figma component
      ↓
structured extraction
      ↓
AI-assisted semantic inference
      ↓
OPIS
      ↓
reference render
      ↓
comparison with Figma source
```

The comparison should separately report:

```text
semantic match
layout match
token/style match
typography match
pixel similarity
```

AI-generated OPIS should therefore be testable against the source representation before a designer accepts the migration.

The reference renderer is part of the trust model for migration.

## A.16 Component matrix rendering

A OPIS viewer should be able to enumerate valid combinations of finite arguments and render them as a component matrix.

For example:

```text
             Primary       Secondary      Destructive

Small        [Button]       [Button]        [Button]

Medium       [Button]       [Button]        [Button]

Large        [Button]       [Button]        [Button]
```

Additional arguments may be controlled interactively:

```text
Icon: none | leading | trailing
Platform: web | ios | tv
```

Invalid configurations defined by OPIS constraints should not be rendered as valid states.

This provides a generated catalogue directly from the component contract.

## A.17 Runtime state and prototypes

Runtime interactivity is intentionally outside OPIS 0.1.

However, the runtime architecture should not prevent a future companion specification from introducing limited component-local state.

Examples may eventually include:

```text
selected
expanded
checked
focused
currentPage
```

Such state should remain declarative and should not introduce general application programming into OPIS.

A future prototype or scenario specification may compose OPIS components and describe screen-level navigation separately.

Conceptually:

```text
OPIS
component definition

OPIS Runtime
component execution

Prototype / Scenario Spec
screens and navigation
```

The component specification should remain useful independently from any prototype system.

## A.18 Initial implementation strategy

A practical initial implementation may consist of three deliverables:

```text
1. Figma → OPIS importer

2. OPIS validator + portable runtime

3. OPIS viewer + reference renderer
```

Together they form a closed verification loop:

```text
Existing design
      ↓
Extract
      ↓
OPIS semantic contract
      ↓
Reference render
      ↓
Visual + structural verification
```

Only after this loop is reliable is it necessary to build:

```text
code generators
native OPIS Players
bidirectional synchronization
prototype manifests
advanced agent workflows
full visual editing
```

This reduces the amount of infrastructure required before OPIS provides practical value.

## A.19 Strategic role

The runtime turns OPIS from a passive schema into an executable contract.

The intended relationship is:

```text
                    Figma / Design Tool
                           ↕
                          OPIS
                           ↓
                     OPIS Runtime
                    ↙     ↓      ↘
                 Viewer   CI    Agents
                           ↓
             Platform-native implementations
              ↙          ↓          ↘
            iOS       Android       Web
```

The reference renderer provides a stable target while platform-native implementations remain free to use their own rendering systems.

The result is a portable semantic and visual contract between design intent and implementation.

