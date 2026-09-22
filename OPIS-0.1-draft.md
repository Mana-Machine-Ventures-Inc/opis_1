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
- overlays,
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
│   ├── Collections
│   └── Overlays
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
| `environment` | MAY | Declared host environment values |
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

A protocol MAY itself conform to another protocol.

```yaml
protocols:
  ContentItem:
    description: "Artwork plus a title, suitable for carousels, grids, and stacks."

  ContentAlbum:
    description: "An album that may appear wherever a ContentItem is accepted."
    conformsTo:
      - ContentItem

  ContentArtist:
    description: "An artist that may appear wherever a ContentItem is accepted."
    conformsTo:
      - ContentItem
```

A component that conforms to `ContentAlbum` also conforms to `ContentItem`.

Conformance is transitive.

A validator MUST accept a participant that conforms to the required protocol directly, or through a protocol that itself conforms to the required protocol.

A validator MUST reject a participant that does not conform.

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

OPIS 0.1 defines eight core structural node types:

```text
stack
overlay
text
component
slot
collection
media
icon
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

A `text` node is a box that contains a text run.

```yaml
- id: label
  type: text
  content: "$arguments.label"
```

Its content MAY reference a string argument.

The box MAY be larger than the glyphs. `width` and `height` size the box. When a dimension is omitted or `intrinsic`, the box hugs the text on that axis.

Glyphs are placed inside the box with `alignment`. This is not stack `align`, and it does not require a wrapper stack.

```yaml
- id: heading
  type: text
  content: Account Name
  width:
    mode: fill
  alignment:
    inline: end
    block: start
  style:
    typography: "{core.typography.heading}"
    color: "{core.color.text.primary}"
```

`alignment.inline` legal values:

```text
start
center
end
justify
```

`alignment.block` legal values:

```text
start
center
end
```

If `alignment` is omitted, both axes default to `start`.

If the box hugs the text on an axis, alignment on that axis has no visible effect.

`justify` distributes extra inline space across wrapping lines. It requires a box wider than the unwrapped run. The last line remains `start`.

On a text node, `align: end` is a shorthand for `alignment.inline: end`. If both are present, `alignment.inline` wins.

`stretch` is not a text alignment value.

A text node MAY set `maxLines` and `truncate` as defined in §47.9.

A text node MAY set `spans` instead of a single `content` string when one box contains several runs:

```yaml
- id: title
  type: text
  spans:
    - content: "Now playing "
    - content: "Night Harbor"
      style:
        fontWeight: 700
        color: "{core.color.text.primary}"
```

Each span MAY set `content` and `style`. Span `style` MAY include `color` and the typography keys above. Omitted keys inherit from the text node. If `spans` is present, it is the text. `content` MUST NOT also be used.

This is mixed style inside one box. It is not a document model, not nested paragraphs, and not a rich-text tree.

Typography MAY include `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `lineHeight`, `letterSpacing`, `decoration`, `case`, `paragraphSpacing`, and `paragraphIndent`.

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
- video,
- or other visual assets.

```yaml
- id: hero
  type: media
  source: "$arguments.image"
  fit: crop
```

`fit` uses the same values as image fills in §47.2. Default is `crop`.

`source` MAY be a token, argument, or URL. A host that cannot fetch a source MUST still honor size, radius, and fallback fills.

`mediaKind` MAY be `image` or `video`. If omitted, the host infers from `source`.

The HTML reference host keeps sample media at `hosts/html/media/`. OPIS documents still only say the source string, not the bytes.

OPIS 0.1 does not define a media transport format.

Media argument typing may be standardized in a later version.

---

# 30. Icon nodes

An `icon` node is a template glyph identified by a logical name.

OPIS transports the name, not path data. Hosts resolve the drawing from their catalog. A host MAY substitute a native glyph of the same name (SF Symbol, VectorDrawable, SVG, and so on).

```yaml
- id: leading
  type: icon
  name: search
  kind: template
```

`name` is a string. This specification does not close the set of names. Example documents in this package use:

```text
plus
search
check
close
minus
info
warning
```

Unknown names are a host concern. A host MUST still size the node and inherit `color`.

The HTML reference host keeps one SVG file per name at `hosts/html/icons/{name}.svg`. It paints template icons from those files. OPIS documents still only say the name.

`kind` legal values:

```text
template
artwork
```

Default is `template`. Template icons take the node’s `color` (typically via the parent). Artwork icons keep their own paints.

OPIS 0.1 MUST NOT embed SVG, PDF, or path commands in the document. Those MAY live in a package as host-specific resources, referenced by the same logical name, in a later dependency spec.

An icon is usually wrapped by a component that conforms to the `Icon` protocol so it can be passed through slots:

```yaml
component:
  id: "com.example/Icon"
  name: "Icon"

protocols:
  Icon:
    description: "A glyph identified by logical name. Hosts resolve the drawing."

conformsTo:
  - Icon

arguments:
  name:
    type: enum
    values: [plus, search, check, close, minus, info, warning]
    default: search
    role: content

  kind:
    type: enum
    values: [template, artwork]
    default: template
    role: variant

structure:
  id: root
  type: icon
  name: "$arguments.name"
  kind: "$arguments.kind"
```

A control accepts that protocol, not a concrete file:

```yaml
icon:
  type: component
  accepts:
    protocol: Icon
  optional: true
  role: slot
```

```yaml
- id: icon
  type: slot
  source:
    component: "com.example/Icon"
    arguments:
      name: search
```

A `media` node is the right type for illustrated or photographic marks that are not template glyphs.

---

# 31. Overlay nodes

An `overlay` places children in one shared box and paints them back to front.

It is not a `stack`. Children do not take turns along an axis.

```yaml
- id: hero
  type: overlay
  alignment:
    inline: start
    block: end
  overflow: clip

  children:
    - id: artwork
      type: media
      width:
        mode: fill
      height:
        mode: fill

    - id: shield
      type: stack
      width:
        mode: fill
      height:
        mode: fill
      style:
        background: "{core.gradient.scrim}"

    - id: caption
      type: stack
      axis: vertical
      width:
        mode: fill
      padding: "{core.spacing.400}"
```

Paint order is participating child order. The first child is the back-most layer.

When `order` is present on an overlay, it permutes paint order. It MUST list each child ID of that node exactly once.

`gap` MUST NOT apply to an overlay.

`axis` and `distribution` MUST NOT be used to mean overlay layout.

If `overflow` is omitted on an overlay, it defaults to `clip`.

The overlay owns the box. Typical overlays give the container a size or `aspectRatio`, let back layers `fill` that box, and keep foreground content intrinsic.

`alignment` is the default pin for children that do not fill an axis:

```yaml
alignment:
  inline: start
  block: end
```

A child MAY set `pin` to place itself independently of other children:

```yaml
- id: badge
  pin:
    inline: end
    block: start
  margin: 8

- id: caption
  pin:
    inline: start
    block: end
  margin:
    inline: 12
    block: 8
```

`pin` uses the same axes and values as overlay `alignment`. If `pin` is omitted, the child uses the overlay `alignment`. If that is omitted too, non-fill children are centered on both axes.

Legal values on each axis:

```text
start
center
end
stretch
```

A child with `width: fill` stretches on the inline axis regardless of `pin.inline` or `alignment.inline`.

A child with `height: fill` stretches on the block axis regardless of `pin.block` or `alignment.block`.

`pin` is overlay placement. It is not text `alignment`. A text node that is an overlay child still uses `alignment` for glyphs inside its box, and `pin` for where that box sits in the overlay.

`margin` on an overlay child insets it from the edges it is pinned to. Padding on the overlay insets every child, including fill artwork. Prefer child `margin` for chrome that should not shrink the artwork.

A shield, scrim, or gradient ramp is a fill-size layer with a painted background. It is not a separate node type.

OPIS 0.1 does not define freeform x/y positioning, arbitrary offsets from center, or layout grids. Overlay children are pinned to the overlay box. Nested overlays express chrome in more than two corners.

---

# 32. Nested structure

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

# 33. Layout

Layout describes spatial relationships between nodes.

OPIS layout terminology is intentionally platform-neutral.

OPIS 0.1 defines:

```text
axis
gap
align
alignment
pin
distribution
wrap
width
height
minWidth
maxWidth
minHeight
maxHeight
padding
margin
aspectRatio
overflow
order
itemLayout
rotation
flip
mask
maxLines
truncate
fit
spans
```

On a text node, `alignment` places glyphs inside the text box. See §25.

A stack or collection MAY set `wrap: true` so children continue onto additional lines.

A collection MAY set `itemLayout` to impose size on each expanded child. Those constraints override the child's preferred size where specified.

A stack or overlay MAY specify `order` as a list of child node IDs.

When `order` is omitted, children participate in document order.

When `order` is present, it MUST list each child ID of that node exactly once.

On a stack, `order` is layout participation order.

On an overlay, `order` is paint order. The first participating child is painted back-most.

Node IDs MUST remain stable within a component version.

Hidden or absent children MAY appear in `order`. They still MUST NOT participate in layout.

---

# 34. Axis

A stack or collection MAY define:

```yaml
axis: horizontal
```

or:

```yaml
axis: vertical
```

---

# 35. Gap

```yaml
gap: "{core.spacing.200}"
```

A gap applies between participating children of a stack or collection.

`gap` MUST NOT apply to an overlay.

Absent or hidden children MUST NOT produce gap spacing.

---

# 36. Alignment

Cross-axis alignment of stack or collection children:

```yaml
align: start
align: center
align: end
align: stretch
align: baseline
```

`baseline` aligns participating children to the first text baseline. Hosts that cannot resolve a baseline MUST treat it as `end`.

This `align` does not place glyphs inside a text box. Text uses `alignment` as defined in §25. Overlay placement uses `pin` as defined in §31.

---

# 37. Distribution

Main-axis distribution:

```yaml
distribution: start
distribution: center
distribution: end
distribution: spaceBetween
```

Implementations MAY support additional values via extensions.

---

# 38. Padding

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

Margin uses the same shapes. It is outside the border box.

```yaml
margin: 8

margin:
  block: 8
  inline: 12

margin:
  top: 8
  right: 8
  bottom: 0
  left: 8
```

On a stack child, margin is extra space beyond `gap`. On an overlay child, margin insets the child from the edges it is pinned to.

---

# 39. Sizing

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

# 40. Intrinsic sizing

```yaml
width:
  mode: intrinsic
```

`intrinsic` means the node SHOULD use the size required by its content and layout constraints.

Host implementations determine the exact intrinsic-size algorithm.

---

# 41. Fill sizing

```yaml
width:
  mode: fill
  weight: 2
```

`fill` means the node SHOULD occupy available space offered by its parent along the relevant axis.

When several siblings fill the same axis, `weight` is their share of leftover space. Omitted `weight` is 1. Weight does not apply to overlay fill, which stretches the overlay box.

---

# 42. Minimum and maximum sizing

```yaml
minWidth: 240
maxWidth: 480
```

Values MAY reference tokens.

---

# 43. Aspect ratio

```yaml
aspectRatio: 1.7778
```

represents approximately 16:9.

---

# 44. Overflow

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

If `overflow` is omitted on an overlay, it defaults to `clip`.

---

# 45. Parent-imposed child layout

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

# 46. Visibility

Any node MAY specify:

```yaml
hidden: true
```

Hidden nodes MUST NOT participate in normal layout.

`hidden` MAY be a property expression.

---

# 47. Appearance

Paint belongs on the node, in `style`.

OPIS appearance is a portable drawing description. It MUST NOT require CSS, SwiftUI, or Figma effect objects as the interchange form.

A host MAY accept CSS color or gradient strings as authoring sugar. Canonical form is the typed objects below.

```yaml
style:
  opacity: 1
  mix: normal
  color: "{core.color.text.primary}"
  radius: "{core.radius.card}"
  cornerSmoothing: 0.6
  fills:
    - type: solid
      color: "{core.color.surface.default}"
  stroke:
    color: "{core.color.line}"
    width: 1
    align: inside
  shadows:
    - kind: drop
      x: 0
      y: 10
      blur: 30
      spread: 0
      color: "{core.color.shadow}"
  blur:
    layer: 0
    backdrop: 20
  typography: "{core.typography.body}"
```

`background` is a shorthand for one solid or gradient fill.

`shadow` as a single string is a shorthand for one drop shadow. Implementations SHOULD prefer `shadows`.

`stroke` as a color string is a shorthand for `{ width: 1, align: inside, color: <string> }`.

## 47.1 Radius

`radius` MAY be a uniform length or a logical map:

```yaml
radius: 12

radius:
  startStart: 12
  startEnd: 12
  endEnd: 0
  endStart: 0
```

`startStart` is the corner where block-start meets inline-start (top-left in LTR horizontal-tb).

`cornerSmoothing` is a number from 0 to 1. 0 is a circular arc. Values near 0.6 approximate iOS continuous corners. Hosts that cannot smooth corners MUST still honor `radius`.

## 47.2 Fills

`fills` is a back-to-front list. The first fill is painted back-most.

A fill MAY set `hidden: true`, `opacity`, and `mix`.

Fill types:

```text
solid
linearGradient
radialGradient
angularGradient
diamondGradient
image
video
```

Solid:

```yaml
type: solid
color: "{core.color.surface.default}"
```

Linear gradient. `angle` is degrees clockwise from the inline-end axis. 0 points toward inline-end. `position` on a stop is 0–1 along the gradient line.

```yaml
type: linearGradient
angle: 180
stops:
  - color: "{core.color.cover.amber}"
    position: 0
  - color: "#00000000"
    position: 1
```

Radial and angular gradients MAY set `cx` and `cy` in 0–1 of the node box. Angular `angle` is the starting heading, same convention as linear.

Diamond gradients follow Figma’s diamond interpolation. Hosts MAY approximate them with a radial fill.

Image and video fills:

```yaml
type: image
source: "$arguments.photo"
fit: crop
```

`fit` legal values:

```text
fill
fit
crop
tile
```

`fill` stretches to the box. `fit` contains. `crop` covers and clips. `tile` repeats at intrinsic size.

A `media` node MAY set `source`, `fit`, and `adjust` without putting an image in `fills`. `adjust` MAY include `exposure`, `contrast`, `saturation`, and `temperature` as signed numbers around 0.

## 47.3 Strokes

```yaml
stroke:
  color: "{core.color.line}"
  width: 1
  align: inside
  dash: [4, 4]
```

`align` legal values: `inside`, `center`, `outside`. Default `inside`.

`width` MAY be a uniform length or a side map (`top` / `right` / `bottom` / `left`, or `block` / `inline`).

`dash` is a list of on/off lengths. Omitted means a solid stroke.

`strokes` MAY be a list. Paint order is back to front.

## 47.4 Shadows

```yaml
shadows:
  - kind: drop
    x: 0
    y: 8
    blur: 24
    spread: 0
    color: "{core.color.shadow}"
    opacity: 0.16
  - kind: inner
    x: 0
    y: 1
    blur: 2
    color: "{core.color.line}"
```

`kind` is `drop` or `inner`. Offsets are in the node’s coordinate system. `blur` and `spread` are lengths.

## 47.5 Blur

```yaml
blur:
  layer: 8
  backdrop: 20
  progressive:
    start: 0
    end: 24
    along: block
    from: end
```

`layer` blurs the node’s own pixels. `backdrop` blurs content behind the node.

`progressive` interpolates blur along `inline` or `block` from `start` to `end` of that axis. `from` is `start` or `end`.

`noise` MAY be set as:

```yaml
noise:
  opacity: 0.08
```

Noise is a fine grain overlay. It MUST NOT replace a fill.

## 47.6 Blend

`mix` is the node’s blend with what is already painted.

Legal values:

```text
normal
multiply
screen
overlay
darken
lighten
plus
```

Hosts MUST treat unknown mix values as `normal`.

`opacity` is a number from 0 to 1 for the whole node.

## 47.7 Rotation

Any node MAY set:

```yaml
rotation: 15
```

Rotation is degrees clockwise about the node’s center. It does not change layout participation size.

Any node MAY set:

```yaml
flip: inline
```

`flip` legal values: `inline`, `block`, `both`. It mirrors the node about its center. It does not change layout participation size. `flip` and `rotation` compose.

## 47.8 Masks

An overlay child MAY set `mask`.

```yaml
mask: true
mask: alpha
mask: inverse
```

`true` and `alpha` are the same. That child does not paint. It clips overlay children that paint after it (front-er layers) to its alpha.

Alpha comes from the child’s fills, image/video/vector `source`, and opacity. Transparent pixels hide the layers in front. Opaque pixels show them.

A mask child MAY set `source` to a file. OPIS 0.1 does not define path commands, Bézier data, or an outline geometry language. A vector stencil is a file. SVG is the portable format. A host MAY support additional vector formats. The host uses the file’s alpha as the mask. `fit` on that child sizes the stencil the same way as media.

```yaml
- id: stencil
  type: media
  mask: alpha
  source: "/masks/star.svg"
  fit: fit
```

The HTML reference host keeps sample vector masks at `hosts/html/masks/`. OPIS documents still only say the source string, not the path data.

If the child has no paint and no source, the host MUST still clip to its box, including its radius. That is a geometric clip, not a path mask.

`inverse` shows the layers in front where the child is transparent, and hides them where it is opaque.

OPIS 0.1 does not define luminance masks or boolean path operations.

## 47.9 Text overflow

A `text` node MAY set:

```yaml
maxLines: 2
truncate: end
```

`truncate` legal values: `end`, `start`, `none`. Default `end` when `maxLines` is set.

Typography MAY also include `fontStyle` (`normal` | `italic`), `decoration` (`none` | `underline` | `lineThrough`), `case` (`none` | `uppercase` | `lowercase`), `paragraphSpacing`, and `paragraphIndent`.

---

# 48. Constraints

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

# 49. `require`

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

# 50. `forbid`

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

# 51. Conditional argument availability

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

# 52. Conditional argument prohibition

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

# 53. Property expressions

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

# 54. Independent axes

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

When two axes affect the same property, their interaction MUST be expressed as a nested `match` on that property. See §57.

---

# 55. `match`

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

# 56. Exhaustiveness

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

# 57. Nested `match`

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

# 58. `if`

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

# 59. Predicates

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

# 60. Evaluation

Property expressions are evaluated after the component’s constraints have been satisfied.

Evaluation MUST be deterministic.

Document order MUST NOT affect the result of property expressions.

Given arguments and environment, each expression MUST reduce to a single concrete value.

A resolved component MUST NOT contain unresolved `match` or `if` expressions.

Nested expressions are evaluated from the inside of the selected arm or branch.

After a `component` node is instantiated, the resolved tree MAY represent the result as:

```yaml
type: instance
component: "com.example/Button"
children:
  - ...
```

`instance` is a resolved form. It is not an authoring node type.

---

# 61. No document-level overrides

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

# 62. Authoring `when` trees

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


# 63. Environment

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

# 64. Composition

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

# 65. Open composition

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

# 66. Example: Button

```yaml
$schema: "https://opis-spec.org/schema/0.1"

opis: "0.1"

component:
  id: "com.example/Button"
  name: "Button"
  version: "1.0.0"

protocols:
  Action:
    description: "A labeled control that can be placed in action collections."

conformsTo:
  - Action

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
    values: [small, medium, large, xlarge]
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
    accepts:
      protocol: Icon
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
        large, xlarge:
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
              large, xlarge:
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
                large, xlarge: "{core.spacing.500}"

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

`large, xlarge` is one match arm covering two size values.

No top-level override list is required.

---

# 67. Example: Modal

```yaml
opis: "0.1"

component:
  id: "com.example/Modal"
  name: "Modal"
  version: "1.0.0"

arguments:
  icon:
    type: component
    accepts:
      protocol: Icon
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

# 68. Example: Carousel

```yaml
opis: "0.1"

component:
  id: "com.example/Carousel"
  name: "Carousel"
  version: "1.0.0"

arguments:
  items:
    type: component[]
    accepts:
      protocol: ContentItem
    minItems: 1

  density:
    type: enum
    values: [compact, standard, spacious]
    default: standard
    role: variant

structure:
  id: root
  type: collection
  source: "$arguments.items"
  overflow: scroll
  width:
    mode: fill

  layout:
    axis: horizontal
    align: start
    distribution: start
    gap:
      match:
        on: "$arguments.density"
        cases:
          compact: "{core.spacing.200}"
          standard: "{core.spacing.400}"
          spacious: "{core.spacing.600}"

  itemLayout:
    width:
      mode: fixed
      value: 140
```

Any component that conforms to `ContentItem` may be supplied, including through a more specific protocol such as `ContentAlbum` or `ContentArtist`.

`HeroTile` is an overlay that still conforms to `ContentAlbum`, so it can sit in the same carousel as a plain album tile.

---

# 69. Component scale

OPIS does not distinguish between “component,” “section,” and “page” at the schema level.

The following are all valid OPIS components:

```text
Icon
Button
SearchField
Card
NavigationBar
Carousel
HeroTile
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

# 70. What OPIS deliberately does not model

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

# 71. Documentation boundary

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

# 72. Implementation boundary

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

# 73. Canonicalization

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

# 74. Round-trip expectations

A conforming OPIS-aware tool SHOULD preserve all standard OPIS semantics when importing and exporting a document.

A tool MAY lose tool-specific information not represented by OPIS.

A tool MUST NOT silently reinterpret unsupported standard OPIS semantics.

If a tool cannot represent a OPIS feature, it SHOULD:

1. preserve that feature as opaque data where possible,
2. indicate that the feature is unsupported,
3. avoid destructive rewriting.

---

# 75. Extensions

Experimental or vendor-specific information SHOULD be placed under:

```yaml
extensions:
  com.example.tool:
    ...
```

Extensions MUST NOT redefine standard OPIS behavior.

A conforming implementation MAY ignore extensions.

---

# 76. Validation levels

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

# 77. Static analysis goals

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

# 78. AI and tooling

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

# 79. Relationship to authoring languages

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

# 80. Relationship to visual editors

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

# 81. Relationship to DTCG

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

# 82. Relationship to documentation specifications

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

# 83. Minimal conformance

A minimum conforming OPIS 0.1 implementation MUST support:

- document parsing,
- component identity,
- primitive arguments,
- enum arguments,
- component arguments,
- component collections,
- structure trees,
- stack nodes,
- overlay nodes,
- text nodes,
- text box alignment,
- component nodes,
- slot nodes,
- collection nodes,
- media nodes,
- icon nodes,
- axis layout,
- alignment,
- gap,
- padding,
- margin,
- pin,
- fill weight,
- sizing,
- DTCG references,
- property expressions (`match` and `if`),
- match exhaustiveness,
- constraints,
- protocol conformance.
- appearance (`style` fills, radius, stroke, shadows, blur, mix).

---

# 84. Future areas

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
freeform positioned layout
vector path IR
rich text documents
internationalization semantics
```

These MAY be standardized in later OPIS versions or companion specifications.

---

# 85. Summary

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
text box size
inline alignment
block alignment
justification
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

