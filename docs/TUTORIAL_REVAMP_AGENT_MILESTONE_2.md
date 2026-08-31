# Tutorial Revamp Agent — Milestone 2: Revamp UI + Local Job Lifecycle

Status: **Implemented and tested, including live from the real GitHub Pages origin.**

Builds on Milestone 1 (proven: `docs/TUTORIAL_REVAMP_AGENT_MILESTONE_1.md`, live human PASS). This milestone proves **Dashboard → Revamp Modal → Local Job Creation → Job State Progress → Dashboard Progress Display**, using a safe `StubWriter`. No Antigravity, no OpenAI/QA, no writes to `data/tutorials.json`, `audits/`, or `revamped-tutorials/`, and no git operations are part of this milestone.

---

## 1. User Flow

1. User opens a tutorial page, e.g. `tutorial.html?id=esp32-digital-clock`.
2. User clicks **Revamp Tutorial** in the header actions.
3. If this browser isn't paired with the bridge yet, the modal shows a pairing prompt instead of the form — the user pastes the token printed by `node service/server.js` and clicks **Save & Continue**.
4. Once paired, the modal shows the tutorial title and an optional multiline **Revamp Instructions** textarea (placeholder shows the example: `LCD -> OLED`, `NodeMCU ESP32 -> Maker ESP32`, `Do not use Robo ESP32`).
5. User clicks **Start Revamp**. The modal switches to a progress view and polls the bridge every 1.5s.
6. Progress view shows a checklist (Job Created → Tutorial Loaded → Preparing Context → Writing → Validating → Ready for Review), the live status line, and the instructions read back verbatim.
7. User may click **Cancel Job** at any point before it finishes.
8. On completion, the modal shows "Milestone 2 stub completed successfully. No tutorial files were modified." and a **Close** button. Nothing is added to Final Output; `revampStatus` is untouched.
9. If the user closes the modal while a job is still running, reopening **Revamp Tutorial** for the same tutorial resumes showing that job's live progress (tracked via a `sessionStorage` pointer) instead of restarting the form.

## 2. UI Behavior

- **Revamp Tutorial** button added to `tutorial.html`'s header actions (`js/tutorial.js`'s dynamically-inserted "View Final Output" button now lands between it and "Open Original Tutorial").
- A single modal (`#revampModalOverlay` / `#revampModalBody`) renders three mutually-exclusive views entirely via JS (`js/revamp-agent.js`): pairing, form, progress. Clicking the backdrop or the `×` closes it.
- The Milestone 1 "Local Revamp Bridge — DEV/PROTOTYPE" panel has been **replaced**: its connectivity tools (Check Bridge, pairing token field, Test Tutorial Connection) now live inside a collapsed `<details class="revamp-debug-details"><summary>Bridge Debug (advanced)</summary>...` element at the bottom of the page — closed by default, visually secondary, clearly labeled as troubleshooting rather than the main workflow. `js/dev-bridge.js` was deleted; its logic was folded into `js/revamp-agent.js`, sharing the same `sessionStorage` pairing token.
- New CSS added to `css/style.css` under "Tutorial Revamp Agent (Milestone 2)" (modal, form fields, notices, progress checklist, debug panel) — no existing styles were changed.

## 3. API

All `/api/revamp/*` endpoints require `Authorization: Bearer <pairing token>` (same mechanism as Milestone 1's `/api/test`). CORS/origin rules are unchanged from Milestone 1.

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/revamp/start` | POST | required | Validates `tutorialId` + `instructions`, enforces one active job per tutorial, creates a job, kicks off the `StubWriter`. |
| `/api/revamp/:jobId` | GET | required | Returns the safe job DTO (no filesystem paths). |
| `/api/revamp/:jobId/cancel` | POST | required | Cancels an active job; `409` if already terminal. |

`POST /api/revamp/start` request/response:

```json
// request
{ "tutorialId": "esp32-digital-clock", "instructions": "LCD -> OLED\n..." }

// success
{ "ok": true, "jobId": "…", "state": "Queued" }

// conflict (an active job already exists for this tutorial)
// HTTP 409
{ "ok": false, "error": { "code": "job_already_active", "message": "…" }, "job": { …safe job… } }
```

Validation performed server-side, in this order: auth → `Content-Type: application/json` → `tutorialId` matches `^[a-z0-9-]+$` and exists in `data/tutorials.json` → `instructions` is a string, ≤ 4000 chars, and contains no disallowed control characters → no existing active job for that tutorial. Every failure returns `{error:{code,message}}` with an appropriate status (`400/401/404/409/413/415`).

## 4. Job Model

```json
{
  "jobId": "7947fe45-20b6-4b91-bd8f-281b711101d7",
  "tutorialId": "esp32-digital-clock",
  "title": "ESP32 Digital Clock",
  "userInstructions": "LCD -> OLED\nNodeMCU ESP32 -> Maker ESP32\nDo not use Robo ESP32",
  "state": "Ready for Review",
  "createdAt": "2026-08-31T13:44:45.102Z",
  "updatedAt": "2026-08-31T13:44:47.743Z",
  "revisionCount": 0,
  "error": null
}
```

`jobId` is a `crypto.randomUUID()` — never derived from or influenced by browser input. The in-memory `jobs` Map (in `service/jobStore.js`) is authoritative for the bridge process's lifetime; `GET`/`cancel` only ever do an exact-key Map lookup, never a filesystem read keyed by client-supplied text. A JSON mirror is written to `service/jobs/<jobId>/job.json` purely for human inspection/audit — nothing re-reads it to serve a request.

**`data/tutorials.json` is never touched by any of this.** No code path in Milestone 2 opens that file for writing.

## 5. Job States

```
Queued -> Preparing Context -> Writing -> Validating -> Ready for Review
                                                    \
                                                     -> Failed / Cancelled (from any active state)
```

`ACTIVE_STATES` = `{Queued, Preparing Context, Writing, Validating}`; `TERMINAL_STATES` = `{Ready for Review, Failed, Cancelled}`. Duplicate-job protection and cancellation both key off `TERMINAL_STATES`/`ACTIVE_STATES`, not a hardcoded switch, so `QA Review` / `Revision Required` / `Revising` can be spliced into `STATE_SEQUENCE` (in `service/jobStore.js`) later — between `Validating` and `Ready for Review` — without changing the module's public shape or the client's polling logic. They are **not** added yet, per the brief, since no QA provider exists.

## 6. StubWriter Behavior

`service/stubWriter.js` simulates the future Antigravity-backed writer:

- Advances `Preparing Context (700ms) → Writing (900ms) → Validating (600ms) → Ready for Review (400ms)`, re-reading the job from the store before each step.
- If the job has been cancelled (or vanished) in the meantime, it stops immediately — this is how cancellation works in this milestone (no real child process exists yet to kill; "cancel" just means "the next scheduled transition becomes a no-op").
- On entering `Writing`, it writes exactly one throwaway artifact to `service/jobs/<jobId>/stub-output.md` (path always built from `jobStore.jobDir(jobId)`, never from user text):

  ```md
  # Stub Tutorial Output

  Tutorial: ESP32 Digital Clock

  User Instructions:
  LCD -> OLED
  NodeMCU ESP32 -> Maker ESP32
  Do not use Robo ESP32

  This is a Milestone 2 test artifact only.
  ```

- Never touches `revamped-tutorials/`, `data/tutorials.json`, `audits/`, or `references/`. Never invokes Antigravity, a shell, or any external process.

## 7. Security

Unchanged from Milestone 1, extended consistently to the new routes:

- `127.0.0.1:47821` only; exact-match CORS allow-list (`https://marketingcytron.github.io`); `403` on any other `Origin` header; correct `OPTIONS`/Private-Network-Access preflight handling.
- Every `/api/revamp/*` endpoint requires the same pairing token (`Authorization: Bearer`, `sessionStorage`-only client-side, `crypto.timingSafeEqual` server-side) — no new auth mechanism introduced.
- `tutorialId` validated against `data/tutorials.json` before anything else happens (verified a `../../etc/passwd` payload is rejected with `400 invalid_tutorial_id` before any lookup).
- `instructions` is validated as opaque text only: string type, ≤ 4000 chars, no C0 control characters (tab/newline/carriage-return excepted). It is stored on the job record and returned verbatim by `GET` for display — it is never parsed as a path, filename, argument, or command anywhere in this milestone's code.
- No endpoint accepts a filesystem path, job directory name, or command from the browser; `jobId` in URLs is matched by `[A-Za-z0-9-]+` for routing only and then resolved via an in-memory Map, not a filesystem call.
- No response exposes a filesystem path (job DTO fields are an explicit allow-list in `jobStore.toSafeJson`).
- Logging (`service/logger.js`) records `job_created`, `job_state_changed`, `job_cancelled`, `job_failed`, `job_start_conflict` with `jobId`/`tutorialId`/`state`/`instructionsLength` — never the pairing token or an `Authorization` header value.

## 8. Runtime File Storage

```
service/jobs/                     # gitignored in full (service/jobs/ in .gitignore)
  service.log                     # newline-delimited JSON lifecycle log
  <jobId>/
    job.json                      # human-inspectable mirror of the in-memory job record
    stub-output.md                # StubWriter's throwaway test artifact (Milestone 2 only)
```

Nothing under `service/jobs/` is ever committed (verified with `git check-ignore -v service/jobs/service.log`).

## 9. Cancellation

`POST /api/revamp/:jobId/cancel`:
- `404 job_not_found` if the ID is unknown.
- `409 job_not_active` if the job is already `Ready for Review`/`Failed`/`Cancelled`.
- Otherwise sets `state = "Cancelled"`, persists, logs `job_cancelled`, returns `200`.

Because the `StubWriter` re-checks the job's state from the store before every transition, a cancelled job's state was confirmed to **stay** `Cancelled` even after waiting past the stub's total run time (verified in testing — see §10) — it does not get silently overwritten by a late-arriving `setTimeout` callback.

## 10. Test Results

All run against the live bridge process (`node service/server.js`) via `curl`, plus a live browser check.

| # | Case | Result |
|---|---|---|
| 1 | Start valid job (`esp32-digital-clock`, full instructions text) | `200`, `Queued` |
| 2 | Invalid tutorial ID (unknown slug) | `404 tutorial_not_found` |
| 2b | Invalid tutorial ID (`../../etc/passwd`) | `400 invalid_tutorial_id` — rejected before any lookup |
| 3 | Missing token | `401 unauthorized` |
| 4 | Wrong token | `401 unauthorized` |
| 5 | Oversized instructions (4001 chars) | `400 instructions_too_long` |
| 5b | Control-character instructions (``) | `400 invalid_instructions` |
| 6 | Duplicate active job (two starts back-to-back, same tutorial) | First `200 Queued`; second `409 job_already_active` with the existing job embedded |
| 7 | Job polling (`GET`) | `200`, correct/current job DTO |
| 8 | Cancel active job, then re-poll immediately and again after the stub's full run time | `200 Cancelled` both times — confirms the stub does not resurrect a cancelled job |
| 8b | Cancel an already-terminal job | `409 job_not_active` |
| 9 | Unknown job ID | `404 job_not_found` |
| 10 | Stub reaches `Ready for Review` unattended | Confirmed via poll: `Queued → … → Ready for Review` in ~2.6s, matching the sum of the stub's configured delays |
| 11 | No modification to `data/tutorials.json` | `git status --short data/tutorials.json` empty after all tests |
| 12 | No modification to `revamped-tutorials/` / `audits/` | `git status --short` empty for both after all tests |
| 13 | `scripts/validate-data.js` | 30 tutorials, 0 errors, 0 warnings, after all tests |

**Live test from the real GitHub Pages origin** (`https://marketingcytron.github.io/cytron-tutorial-dashboard/tutorial.html?id=esp32-digital-clock`), executed via a real Chrome session already permission-granted from the Milestone 1 human test:

```js
await fetch('http://127.0.0.1:47821/api/revamp/start', { method:'POST', headers:{...}, body: JSON.stringify({tutorialId:'esp32-digital-clock', instructions:'Live browser test from real origin'}) })
// -> 200 { ok:true, jobId:"7947fe45-...", state:"Queued" }

await fetch('http://127.0.0.1:47821/api/revamp/7947fe45-...', { headers:{...} })
// (after ~2.8s) -> 200 { ok:true, job:{ state:"Ready for Review", ... } }
```

Confirmed end-to-end: job creation, background progression, and polling all worked from the true production origin, not just `curl`.

## 11. Known Limitations

- **The actual button/modal UI was not click-tested against the live GitHub Pages origin**, because nothing from this milestone has been pushed (per instructions). The live check above exercised the identical API + security boundary via console-executed `fetch()`, proving the backend and auth model work from the real origin; the modal's DOM/JS was exercised locally (code review + the same functions driving the verified network calls) but not via an actual click-through on the deployed page.
- Job state lives only in memory for the bridge process's lifetime; restarting the bridge loses all in-flight job tracking (the `job.json` mirror on disk is not re-read back in). Acceptable for this milestone's short-lived stub jobs; will need a real recovery story once jobs take minutes (Antigravity) rather than seconds.
- No automated test suite (`node:test`) was added — verification is manual (`curl` matrix + live browser check), consistent with Milestone 1.
- `config.allowedOrigins` still lists only the production origin; local UI click-testing against a locally-served copy of the dashboard would require temporarily adding a dev origin, which was deliberately not done here to avoid weakening the security model for this milestone.
- The debug panel's "Test Tutorial Connection" button still calls the Milestone 1 `/api/test` endpoint, which remains in the bridge unchanged for troubleshooting purposes.

## 12. What Milestone 3 Will Replace

- `service/stubWriter.js` → a real writer that constructs the full prompt (`AGENTS.md` + tutorial record + audit + original tutorial + Maker ESP32 references + template + user instructions) and invokes Antigravity via `child_process.spawn` (no shell), per the approved architecture document's Phase 3/4.
- The stub's trivial "Validating" step → real structural/safety validation (required sections present, no leaked secrets, no leftover placeholders) on the actual generated Markdown.
- `Ready for Review` currently ends the automated pipeline with no dashboard-data side effects → once a real writer + validation exist, reaching `Ready for Review` will (only then) write the draft to `revamped-tutorials/<tutorialId>.md` and patch `data/tutorials.json`'s `revampStatus`/`revampedOutputFile`, per the architecture document's job-state design.
- `QA Review` / `Revision Required` / `Revising` states, currently absent, will be inserted into `STATE_SEQUENCE` once a `QAProvider` (starting with a no-op, later OpenAI) exists, per the architecture document's §8.
