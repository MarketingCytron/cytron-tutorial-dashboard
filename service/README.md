# Cytron Tutorial Revamp Bridge — Milestone 1 (Connectivity Proof-of-Concept)

This is **not** the Tutorial Revamp Agent. It proves that the live GitHub
Pages dashboard can securely reach a local Node.js service on the user's
Windows PC (`Dashboard ↔ Local Bridge Connectivity`). It does not call
Antigravity or OpenAI, does not generate tutorials, and does not modify
`data/tutorials.json`, `audits/`, or `revamped-tutorials/`.

## Requirements

- Node.js (tested with v24.x). No `npm install` needed — zero external
  dependencies, only Node's built-in `http`, `crypto`, `fs`, `url` modules.

## Start the bridge

From the repository root:

```
node service/server.js
```

On first run it creates `service/.pairing-token.json` (gitignored — never
commit this file) containing a randomly generated pairing token, and prints
that token to the console:

```
Cytron Tutorial Revamp Bridge v0.1.0
Listening on http://127.0.0.1:47821 (loopback only)
Allowed origin(s): https://marketingcytron.github.io

Pairing token (paste this once into the dashboard's "Local Revamp Bridge" panel):

  <64-character-hex-token>

Token is stored at: E:\cytron-tutorial-dashboard\service\.pairing-token.json
Delete that file and restart the bridge to rotate the token.

Health check: http://127.0.0.1:47821/health
Press Ctrl+C to stop.
```

Leave this terminal window running while you use the dashboard. Press
`Ctrl+C` to stop it.

## Pairing (how authorization works)

The dashboard is public (GitHub Pages), so no secret can be embedded in its
JavaScript. Instead:

1. The bridge generates a random 256-bit token the first time it runs and
   persists it locally in `service/.pairing-token.json` (outside git).
2. You copy that token out of the terminal, once, and paste it into the
   small "Local Revamp Bridge" development panel at the bottom of a
   tutorial page (`tutorial.html`).
3. The dashboard stores the token in that browser tab's `sessionStorage`
   (under the dashboard's own origin — never sent anywhere except back to
   the bridge). It is deliberately **not** persisted in `localStorage`: the
   dashboard is public, and this token will eventually authorize
   state-changing bridge actions, so it must not survive indefinitely.
   Reloading the page keeps it; closing the tab/browser clears it and the
   user must re-paste it next session.
4. Every state-changing/authenticated request from the dashboard sends the
   token as `Authorization: Bearer <token>`. The bridge compares it with a
   constant-time comparison (`crypto.timingSafeEqual`) to avoid timing
   attacks.

`GET /health` requires no token and returns nothing sensitive (no file
paths, no token, no tutorial content) — it exists purely so the dashboard
can show a green/red connectivity dot.

To rotate the token (e.g. you think it leaked, or you're resetting for a
clean demo): stop the bridge, delete `service/.pairing-token.json`, and
start the bridge again. Every browser that had the old token pasted in will
need to re-pair.

## Endpoints

### `GET /health` — unauthenticated

```
curl http://127.0.0.1:47821/health
```

```json
{ "ok": true, "service": "Cytron Tutorial Revamp Bridge", "version": "0.1.0" }
```

### `POST /api/test` — authenticated, read-only

Validates that `tutorialId` exists in `data/tutorials.json` and echoes back
its title. It never reads or writes any other file, never accepts a path or
command from the caller, and never modifies anything.

```
curl -X POST http://127.0.0.1:47821/api/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d "{\"tutorialId\":\"esp32-digital-clock\"}"
```

```json
{
  "ok": true,
  "tutorialId": "esp32-digital-clock",
  "title": "ESP32 Digital Clock",
  "message": "Bridge communication successful"
}
```

Error responses use `{ "error": { "code": "...", "message": "..." } }`, for
example `unauthorized`, `invalid_tutorial_id`, `tutorial_not_found`,
`origin_not_allowed`, `unsupported_media_type`, `method_not_allowed`,
`not_found`.

## Security model (what this milestone enforces)

- Binds to `127.0.0.1` only — never reachable from the LAN.
- Fixed port `47821` (see `config.js`).
- CORS allow-list is exact-match against `config.allowedOrigins`
  (`https://marketingcytron.github.io`) — never `*`.
- Any request carrying an `Origin` header not on the allow-list is rejected
  with `403` before it reaches any route logic (defends against non-CORS
  clients spoofing an origin, not just browsers).
- `OPTIONS` preflights are handled explicitly, including responding
  `Access-Control-Allow-Private-Network: true` when Chromium's Private
  Network Access preflight asks for it.
- `POST /api/test` requires the pairing token; CORS alone is never treated
  as sufficient authorization.
- No endpoint accepts a filesystem path, shell command, or arbitrary
  identifier from the browser — `tutorialId` is validated against a strict
  `^[a-z0-9-]+$` pattern and then looked up in an in-memory parse of
  `data/tutorials.json`; nothing derived from client input ever touches
  `fs` path construction.
- Responses never include file paths, the pairing token, or audit/tutorial
  content beyond `id`/`title`.
- Request bodies are capped at 10 KB.

## Testing from the live GitHub Pages dashboard

Open `https://marketingcytron.github.io/cytron-tutorial-dashboard/tutorial.html?id=esp32-digital-clock`
in Chrome with the bridge running locally, then use the "Local Revamp
Bridge" panel at the bottom of the page. See
`docs/TUTORIAL_REVAMP_AGENT_MILESTONE_1.md` for the full test log, exact
Chrome/CORS/Private Network Access behavior observed, and result.
