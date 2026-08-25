# Converting an approved manipulative to Live

Use these instructions when recoding an approved sandbox manipulative for the
Live area. The original approved manipulative is the visual and interaction
reference. Do not replace it unless the user explicitly asks.

## Required folder shape

Each Live manipulative has exactly two files:

```text
src/live/<manipulative-id>/
  data.json
  <ComponentName>.jsx
```

- `data.json` contains only `props` and `state`.
- The JSX file contains the controlled React component.
- Shared viewer, synchronization, reset, and data-inspector behavior stays
  outside manipulative folders.
- `src/live/factor-tree/` is the reference implementation.

## Data contract

`data.json` must have this shape:

```json
{
  "props": {},
  "state": {}
}
```

### `props`

Author-time configuration: target values, equations, available tools, labels,
options, limits, and other choices made before the student starts.

- Props are immutable while the student plays.
- The component must read author-controlled values from `props`; do not leave
  duplicate hard-coded values in JSX.
- Never call a setter for props.

### `state`

The complete serializable runtime-state seed.

- The Live shell deep-copies this object on first mount and Reset.
- Every student action that changes the mathematical work must update this
  state through `setState`.
- Store enough information to reconstruct the same visible mathematical result
  in another client.

State must be minimal. A field belongs in shared state only when it records an
independent student action or outcome that another client cannot derive from
`props` plus the rest of `state`.

Do not store:

- values already present in `props`
- generated IDs or array indexes
- parent/child references that follow from nesting
- coordinates, dimensions, or other layout data that code can calculate
- totals, labels, validation results, or completion flags that code can derive
- cached copies of any other state field
- default false/empty fields when absence has one clear meaning

Derive those values during render or in pure helper functions. For example, the
Factor Tree seed stores only its two empty factor branches. Its root value comes
from `props.startNumber`; node IDs, relationships, coordinates, and completion
are all computed by the component.

Before adding a state field, apply this test: if deleting the field still lets a
fresh client reconstruct the exact student work deterministically, delete it.
An explicit completion or validation field is justified only when it records a
non-derivable event or author-required decision rather than a calculation.

Both sections must be valid JSON. Do not store functions, React elements,
class instances, refs, DOM nodes, `Map`, `Set`, `Date`, `undefined`, `NaN`, or
`Infinity`.

## Component contract

Export a component with this interface:

```jsx
export default function Manipulative({ props, state, setState }) {
  // render from props and state
}
```

Use functional updates for runtime changes:

```jsx
setState((previousState) => ({
  ...previousState,
  value: nextValue,
}))
```

Do not copy synchronized state into component-local `useState`. Doing so creates
two sources of truth and breaks mirroring between clients.

Local state is allowed only for transient presentation that does not need to
appear in the other client, such as:

- hover and focus state
- open/closed tooltips
- animation-in-progress flags
- timer and element refs

If refreshing or mounting a second client would lose meaningful student work,
that information belongs in shared `state`, not local state.

## Conversion process

1. Inventory the approved component's inputs, interactions, local state, refs,
   random values, and derived values.
2. Classify each value as immutable `props`, minimal synchronized runtime
   `state`, derived data, or transient local UI state.
3. Write a useful authored seed in `data.json`. Do not use an empty placeholder
   if the approved activity expects a target or starting layout.
4. Remove duplicated and derivable fields from the proposed JSON before coding.
5. Copy and recode the approved component so all meaningful rendering comes
   from `props`, minimal `state`, and pure derived values, and all meaningful
   actions use `setState`.
6. Preserve the approved visual behavior, accessibility, hover controls, and
   number-input styling.
7. Register the component and its JSON in `src/live/index.js` with a unique
   `id`, display `name`, and original `sandboxPath`. The shared route is then
   `/live/<id>`.
8. Do not add a new backend, store, context, viewer, reset button, or inspector
   inside the manipulative folder.

## Canvas requirements

- The component must fit the shared 800×500 `ManipulativeCanvas`.
- Keep page, shell, canvas, and manipulative content overflow hidden.
- Do not introduce scrollbars.
- Scale or compact content that can grow.
- Keep action buttons hidden until hover when practical.
- Inputs must remain obvious white bordered boxes, and number inputs must not
  show browser spinner arrows.
- Use Tailwind classes for layout and simple styling.

## Verification checklist

Before considering a conversion complete:

- Open `/live/<id>` and confirm both clients initially match `data.json.state`.
- Edit in User A and confirm User B updates immediately.
- Edit in User B and confirm User A updates immediately.
- Confirm author-time props cannot be changed by student interactions.
- Confirm “See data” reflects every meaningful action and contains only
  JSON-serializable values.
- Confirm shared state contains no values derivable from props or other state.
- Confirm Reset restores a fresh copy of the exact state seed.
- Confirm transient hover/focus behavior does not pollute shared state.
- Confirm both clients remain inside their 800×500 canvases without scrollbars.
- Run ESLint on changed files and run `npm run build`.
