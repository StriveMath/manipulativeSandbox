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

## Verification

After code changes, run targeted lint checks and `npm run build` when practical.
For browser-facing work, also verify the relevant route against the running
development server.

More specific instructions under `src/live/AGENTS.md` apply when converting or
editing Live manipulatives.
