# Tutorial Revamp Agent — Milestone 1: Dashboard ↔ Local Bridge Connectivity

Status: **Implemented and live-tested. This is a connectivity proof-of-concept only — not the Tutorial Revamp Agent.**

No Antigravity, no OpenAI/QA, no tutorial generation, and no writes to `data/tutorials.json`, `audits/`, or `revamped-tutorials/` are part of this milestone.

---

## 1. What Was Implemented

- A minimal, zero-dependency Node.js local bridge (`service/server.js`, `service/config.js`, `service/README.md`) exposing exactly two endpoints: `GET /health` (unauthenticated) and `POST /api/test` (authenticated, read-only tutorial-ID lookup).
- A one-time, locally-generated pairing token mechanism (no secret in the repo).
- A small, clearly-marked development-only panel added to `tutorial.html` ("Local Revamp Bridge — DEV / PROTOTYPE") plus `js/dev-bridge.js`, which can check bridge health, save a pairing token, and test a tutorial-ID round trip.
- `.gitignore` (new file) so the generated pairing token is never committed.
- A **live browser test** against the real deployed dashboard (`https://marketingcytron.github.io/cytron-tutorial-dashboard/`) using a Chrome browser session, run from the actual GitHub Pages origin against the actual local bridge — not a simulation.

## 2. Local Bridge Architecture

Plain Node `http` server, no framework, no `npm install` required:

```
service/
  server.js    # routing, CORS, auth, the two handlers
  config.js    # port, allowed origins, file paths — no secrets
  README.md    # run instructions, pairing, endpoint reference
  .pairing-token.json   # generated at first run, gitignored, never committed
```

- Binds to `127.0.0.1:47821` only (never `0.0.0.0`).
- Reads `data/tutorials.json` fresh on each `/api/test` call, purely to look up `{id, title}` in memory — no path derived from client input ever touches the filesystem.
- No shell execution, no arbitrary-path endpoint, no browser-suppliable "command" field anywhere in the code.

## 3. Authorization / Pairing Mechanism

Because the dashboard's JavaScript is public (served from a public GitHub Pages repo), **no token can be embedded in it**. Pairing works like Jupyter's or VS Code's device-pairing flow:

1. On first run, the bridge generates a random 256-bit token (`crypto.randomBytes(32)`), writes it to `service/.pairing-token.json` (gitignored, `0o600`), and prints it once to the console.
2. The user copies that token out of the terminal and pastes it into the dashboard's "Local Revamp Bridge" panel.
3. The dashboard stores it in that browser tab's `sessionStorage`, scoped to the dashboard's own origin — not `localStorage`, so it does not persist indefinitely: a page reload in the same session retains it, but closing the tab/browser clears it and the user must re-pair next session. This is deliberate for V1, since this token will eventually authorize state-changing bridge actions on a public dashboard.
4. Every authenticated request sends `Authorization: Bearer <token>`; the bridge compares it with `crypto.timingSafeEqual` (constant-time, to resist timing attacks).
5. `GET /health` needs no token and returns nothing sensitive — used only to light up a connectivity indicator.
6. To rotate: stop the bridge, delete `service/.pairing-token.json`, restart. Every previously-paired browser must re-pair.

This satisfies "CORS alone is not sufficient protection": even a request from the exact allowed origin is rejected by `/api/test` without a valid token.

## 4. API Endpoints

| Endpoint | Auth | Effect |
|---|---|---|
| `GET /health` | None | Returns `{ok, service, version}` only. |
| `POST /api/test` | `Authorization: Bearer <token>` | Validates `tutorialId` against `^[a-z0-9-]+$`, looks it up in `data/tutorials.json`, returns `{ok, tutorialId, title, message}`. Read-only; modifies nothing. |

All other paths → `404 not_found`. Wrong method on a known path → `405 method_not_allowed` with an `Allow` header. Non-JSON `POST /api/test` → `415`. Oversized body (>10 KB) → `413`. Disallowed `Origin` header → `403 origin_not_allowed` (checked for every route, not just browser-CORS-enforced paths).

**Local verification (via `curl`, all passed exactly as designed):**

| Case | Result |
|---|---|
| `GET /health` | `200`, no CORS headers (no Origin sent) |
| `GET /health` with disallowed `Origin: https://evil.example.com` | `403 origin_not_allowed` |
| `GET /health` with allowed Origin | `200` + `Access-Control-Allow-Origin` echoed |
| `POST /api/test` with no `Authorization` | `401 unauthorized` |
| `POST /api/test` with wrong token | `401 unauthorized` |
| `POST /api/test` with correct token, valid id (`esp32-digital-clock`) | `200` with correct title |
| `POST /api/test` with correct token, unknown id | `404 tutorial_not_found` |
| `POST /api/test` with correct token, `tutorialId: "../../etc/passwd"` | `400 invalid_tutorial_id` (traversal attempt rejected by the slug regex before any lookup) |
| `POST /api/test` with `Content-Type: text/plain` | `415 unsupported_media_type` |
| Unknown path `/api/anything` | `404 not_found` |
| Wrong method `POST /health` | `405 method_not_allowed`, `Allow: GET, OPTIONS` |
| `OPTIONS` preflight with `Access-Control-Request-Private-Network: true` | `204` including `Access-Control-Allow-Private-Network: true` |

## 5. Browser Security Model

Two independent browser gates apply to a request from `https://marketingcytron.github.io` to `http://127.0.0.1:47821`:

1. **CORS** — satisfied: the bridge echoes `Access-Control-Allow-Origin` only for the exact allowed origin, and handles the `OPTIONS` preflight (verified above).
2. **Chromium Local Network Access (LNA)** — the modern successor to the older "Private Network Access" preflight-only model. This is a **user-permission gate**, conceptually identical to camera/microphone permissions: a public secure-context page reaching a loopback/private address requires the user to explicitly grant a "local network access" permission the first time, independent of and in addition to CORS. Confirmed live (§8) via `navigator.permissions.query({name: 'local-network-access'})` returning `state: "prompt"` in the browser used for this test (Chrome 151).

## 6. How to Start the Bridge

```
node service/server.js
```

No `npm install` needed (zero external dependencies). The console prints the port, allowed origin(s), and the one-time pairing token. Leave the terminal running; `Ctrl+C` to stop.

**For this milestone's testing, the bridge was started and left running** on `127.0.0.1:47821` for the duration of the test.

## 7. How to Test From Localhost

Verified with `curl` — see the table in §4. All 12 cases behaved exactly as designed, including the CORS/PNA-preflight header check and the path-traversal rejection test.

## 8. How to Test From GitHub Pages (Live Result)

Using a real Chrome browser session (via a browser-automation tool), navigated to the actual live URL:

```
https://marketingcytron.github.io/cytron-tutorial-dashboard/tutorial.html?id=esp32-digital-clock
```

(This URL currently serves the dashboard as committed to `main` — it does not yet include the new dev panel, since nothing from this milestone has been pushed. The test instead executed the same `fetch()` calls the dev panel will make, directly in that page's real JavaScript console context, which exercises the identical browser origin/security boundary.)

**Result:**

```js
await fetch('http://127.0.0.1:47821/health')
```

This call **never resolved or rejected** — it sat in `pending` for as long as it was observed (tested up to a 5-second client-side timeout). `chrome://` network inspection confirmed the request was stuck at `statusCode: pending`. The local bridge's own access log showed **zero incoming connections** from these attempts (it did log the earlier disallowed-origin `curl` test, proving the log itself works) — meaning the request never left the browser's network stack to reach the server at all.

Diagnostic follow-up in the same page:

```js
await navigator.permissions.query({ name: 'local-network-access' })
// → { state: "prompt" }
```

This confirms the browser (Chrome 151 in this environment) implements the **Local Network Access** permission and has not yet been granted it for this origin → this session's requests are being held pending a user-facing permission prompt that requires a real human gesture to answer — something browser automation cannot click on the user's behalf (it is native Chrome UI, not page DOM, and deliberately not scriptable).

## 9. Chrome / Private Network Access (and Local Network Access) Considerations

- The old model (a `403`/CORS-style rejection, fixable purely with response headers like `Access-Control-Allow-Private-Network: true`) is **not** what current Chrome does. Chrome now gates the request on an explicit, per-origin **user permission**, similar to geolocation or camera access. The bridge already sends the correct legacy PNA preflight header (verified in §4's last row) — that header is necessary but no longer sufficient by itself.
- This is by-design browser behavior protecting users from arbitrary public websites silently probing or reaching into their local network — it is not a bug in this bridge, and it should **not** be bypassed with Chrome flags, disabled security features, or other workarounds. That would defeat the exact protection this milestone's security model depends on.
- **Expected real-world behavior** (not fully verified live, because automation cannot click a native permission prompt — see §11): when a real user, in their own normal Chrome window, triggers the first cross-origin request to the bridge (e.g. clicking "Check Bridge" in the dev panel), Chrome should show a one-time permission prompt such as "marketingcytron.github.io wants to access devices on your local network," with Allow/Block. Clicking Allow should let this and future requests from that origin through, and the grant should persist per-origin (visible/manageable via the page's site-info/padlock permissions, or `chrome://settings/content`).

## 10. Known Limitations

- **This milestone could not fully confirm the "Allow" path**, because it requires clicking a native Chrome permission prompt, which browser automation intentionally cannot do (it's outside the page's DOM and outside what `Page.captureScreenshot` renders). A real human must perform this one click during a normal, interactive Chrome session.
- The dev panel added to `tutorial.html` in this milestone has **not been pushed/deployed** — the live URL tested against still serves the previous `main` branch content. The live test instead ran the equivalent `fetch()` calls directly in that page's console, which exercises the identical origin/CORS/LNA boundary the dev panel will use once deployed.
- `allowedOrigins` in `config.js` currently lists only the production GitHub Pages origin. If local development against a locally-served copy of the dashboard is needed later, a local static-server origin (e.g. `http://127.0.0.1:5500`) will need to be added there temporarily.
- No automated test suite was added in this milestone (none existed in the repo before it); verification here is manual (`curl` table in §4, plus the live browser test in §8).
- The bridge has no logging file yet beyond console output — acceptable for this connectivity-only milestone, called out as a gap for the next stage.

## 11. Result: **REQUIRES LIVE TEST (by a human)**

Not a clean PASS and not BLOCKED — precisely:

- **PASS, verified live:** CORS allow-listing, `Origin` rejection, the CORS/PNA preflight response (including `Access-Control-Allow-Private-Network: true`), pairing-token authorization, tutorial-ID validation (including a path-traversal attempt), and all error-handling paths — all confirmed against the real bridge process.
- **REQUIRES LIVE TEST, by a human, not by automation:** whether the full flow completes end-to-end from the real `https://marketingcytron.github.io` origin once Chrome's Local Network Access permission prompt is manually granted. The technical design is confirmed correct and necessary; the remaining step is a one-time human click that this session's tooling cannot perform.

## 12. Next Recommended Step

A human should, in their own normal Chrome window:

1. Start the bridge (`node service/server.js`) and keep it running.
2. Open `https://marketingcytron.github.io/cytron-tutorial-dashboard/tutorial.html?id=esp32-digital-clock` (note: needs this milestone's changes deployed first, or test via the browser console directly against the current live page in the meantime).
3. Trigger a request to `http://127.0.0.1:47821/health` (via the dev panel's "Check Bridge" button once deployed, or via the browser console) and watch for Chrome's local-network-access permission prompt; click Allow.
4. Confirm `GET /health` then succeeds, and that `POST /api/test` (after pasting the console-printed pairing token into the dev panel) succeeds for `esp32-digital-clock`.
5. Report back whether the permission prompt appeared as expected and whether it persisted across a page reload — that closes out Milestone 1 with a genuine PASS and unblocks Phase 2 (prompt construction / Antigravity invocation) from the approved architecture document.
