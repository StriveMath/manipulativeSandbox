# Manipulative Sandbox

A React/Vite sandbox for prototyping Strive Math manipulatives.

## Development

```bash
npm install
npm run dev
```

Use `npm run build` for a production build and `npm run lint` to check the
source.

## URLs

Each owner has a short URL that redirects to their first manipulative:

```text
/ashakv1712
/approved
```

Every manipulative has a canonical owner and manipulative path:

```text
/ashakv1712/percent-park-designer
/approved/factor-tree
```

Unknown owners, manipulatives, and paths redirect to the default manipulative.
Production hosts must serve `index.html` for unmatched paths so direct links
reach the client-side router.

## Manipulative structure

Contributor work is grouped by user, without PR-specific folders:

```text
src/manipulatives/
  index.js
  approved/
    factor-tree.jsx
  users/
    ashakv1712/
      percent-park-designer.jsx
```

To add a manipulative:

1. Put its component directly in `src/manipulatives/users/<owner>/`, or in
   `src/manipulatives/approved/` for approved work.
2. Use the manipulative's kebab-case ID as its filename.
3. Import it in `src/manipulatives/index.js` and add an entry with `id`, `name`,
   `component`, `ownerSlug`, and `ownerName`.

All manipulatives continue to render inside the shared 800×500
`ManipulativeCanvas`.
