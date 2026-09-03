# Repository agent instructions

## Local app workflow

This is a Vite app. A successful `npm run build` only writes production files
to `dist/`; it does not start a web server.

When the user asks to run, open, preview, test, or provide a local URL:

1. Check whether port 5173 already has a working listener. Do not trust stale
   terminal status alone.
2. If the app is not reachable, start `npm run dev` and keep it running.
3. Wait for Vite's ready message, then verify the requested route with an HTTP
   request.
4. Only provide a URL after that request succeeds.

The development command is pinned to `127.0.0.1:5173` with strict port
selection. The canonical local base URL is:

```text
http://127.0.0.1:5173
```

Do not claim that a local server is available after running only
`npm run build`. Do not start a duplicate server when a healthy one is already
listening.

## Design style for manipulatives

These conventions come from design review of the polygon-angles manipulative
(`src/manipulatives/users/ashakv1712/polygon-interior-angles.jsx`) and apply to
new and revised manipulatives.

Layout

- Use the vertical space for the visual. Remove explanatory banners, dialog
  bubbles and "insight" text; the diagram and the formula should carry the
  lesson on their own.
- Controls go above the visual in short labelled rows, e.g. `Sides:` with the
  shape choices on the first row and `Choose a formula:` with the mode choices
  on the second. Put a `Hide answers` / `Show answers` toggle at the top right
  of the first row.
- Default to the simplest mode a student would meet first (e.g. exterior
  angles), not the most advanced one.
- Summary cards sit in one row under the visual. Centre their content. Give
  cards that hold a formula more width than cards that hold a single number,
  and shrink the single-number cards so everything fits without wrapping.
- When a mode shows two things side by side (a shape and a circle), split the
  canvas into equal halves so they are evenly spaced. Centre shapes by their
  visible top/bottom extent, not by their mathematical origin.

Formulas

- Show the algebraic form first, then the substituted form on its own line
  below it, separated by a thin dashed rule. Never chain them on one line with
  `=` or `→`; students need to read each step on its own.
- Render formulas as plain text, not as pills or badges.
- Colour-code consistently: variables (`n`) in one colour, each constant
  (`360°`, `180°`) in its own colour, derived values (sums) in another, and
  operators in neutral grey. Reuse the same colour for the same quantity in the
  diagram and in the formula.
- Keep the formula structure fixed when the student drags the shape. If the
  answer no longer applies (the shape became irregular), blank the answer
  (`—`) rather than swapping in a different formula or message.

Visual

- Colours in a derived diagram (e.g. wedges in an angle-sum circle) must match
  the colours of the corresponding parts of the source shape.
- Use solid strokes for borders; avoid dotted or dashed outlines on primary
  shapes.
- Angle and value labels drawn on the canvas should be large (18–20px bold);
  labels under ~14px are too small to read at the 800×500 frame.
- Titles on canvas elements are short and literal (`Sum of exterior angles`);
  drop running totals or status lines that duplicate the summary cards.

State indicators

- State that follows from the student's actions (regular vs irregular) is shown
  as a small read-only pill, never as a toggle the student flips manually.
- When an action can be undone (reset to regular after dragging), the pill
  becomes the button that undoes it, and only then.

Composition and learning flow

- Establish clear regions for the model, explanation, and controls; prevent
  overlap and visual clutter.
- Align mathematical notation consistently across steps, including operators,
  fractions, symbols, units, and values.
- Break animations into meaningful learning stages so each transformation and
  its purpose are understandable.
- Preserve visual identity—colour, shape, labels, and borders—while objects
  transform so learners can track them.

Interaction

- Prefer direct manipulation when it makes the concept or relationship easier
  to understand.
- Make interaction targets generous and show the effect of each action
  immediately across all related representations.
- Reveal guidance and valid next actions contextually; remove instructions once
  they are no longer needed.
- Reset only the state named by the control and preserve unrelated user choices.
- Use consistent visual encoding for the same concept, and keep motion short,
  cancellable, and non-blocking.

## Verification

After code changes, run targeted lint checks and `npm run build` when practical.
For browser-facing work, also verify the relevant route against the running
development server.

More specific instructions under `src/live/AGENTS.md` apply when converting or
editing Live manipulatives.
