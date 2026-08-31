# Cytron Tutorial Revamp Agent V1 — Architecture

Status: **Design only. Nothing in this document has been implemented.**
Scope: turn the static Cytron Tutorial Validation Dashboard into a control center that can trigger, track, and surface AI-assisted tutorial revamps, using a local Windows bridge service the GitHub Pages dashboard talks to over `localhost`.

---

## 1. Current Dashboard Architecture

The repository is a **pure static site** — no backend, no build step, no `package.json` at the repo root, no bundler. It is served by GitHub Pages from `origin` = `https://github.com/MarketingCytron/cytron-tutorial-dashboard.git`, live at `https://marketingcytron.github.io/cytron-tutorial-dashboard/`.

**Pages** (all plain HTML, share one sidebar, each loads `js/app.js` + a page-specific script):

| Page | Script | Purpose |
|---|---|---|
| `index.html` | `js/app.js` | Landing dashboard |
| `tutorials.html` | `js/tutorials.js` | List + filters + a `?tab=final-output` tab that lists any tutorial with a `revampedOutputFile` |
| `tutorial.html` | `js/tutorial.js` | Single-tutorial audit view: validity, scores, keep/update/remove, evidence, links, rendered audit Markdown. Has an `.tutorial-actions` header slot with "Open Original Tutorial", and conditionally injects a "View Final Output" button when `revampedOutputFile` exists. **This is where the new "Revamp Tutorial" button belongs.** |
| `final-output.html` | `js/final-output.js` | Fetches and renders the Markdown at `tutorial.revampedOutputFile` |
| `revamp.html` | `js/revamp.js` | "Revamp Queue" — a filtered/sorted *view* of tutorials needing work by priority. Unrelated to job execution; do not confuse with the new revamp-agent feature. |
| `methodology.html` | — | Static documentation |

**Data flow**: `js/app.js` exposes a shared `Utils` object. `Utils.loadData()` fetches `data/tutorials.json` once (relative to `Utils.getBasePath()`, which derives the correct prefix so it works both at the repo root and under the GitHub Pages subpath) and caches it in memory for the page's lifetime. `Utils.renderMarkdown()` is a small hand-rolled Markdown-to-HTML renderer (no external Markdown library) used by both the audit view and the Final Output view.

**Persistent state lives entirely in files, hand-edited by Claude Code today**:
- `data/tutorials.json` — one JSON array of tutorial records (schema fully defined in `CLAUDE.md`). Fields relevant to revamping: `id`, `auditFile`, `revampedOutputFile`, `revampStatus`, `decision`, `priority`, `preparationDate`, `publishDate`, `makerEsp32`, `hardwareUsed`.
- `audits/[slug].md` — full technical audit, human/AI readable, referenced by `auditFile`.
- `revamped-tutorials/[slug].md` — the AI-authored draft, referenced by `revampedOutputFile`. Two golden examples exist: `esp32-clap-switch.md`, `esp32-digital-clock.md`.
- `AGENTS.md` — the actual revamp *workflow spec*: source hierarchy (original tutorial → dashboard/audit → Maker ESP32 AI Coding Pack → official docs → Cytron Tutorial Template), required draft structure, safety rules, and the required trailing `# INTERNAL EDITOR NOTES — DO NOT PUBLISH` block (Revamp Change Log, Outstanding Verification, Media Replacement Plan). **This file is effectively the prompt template for the tutorial writer today**, executed manually by a human invoking Claude Code.
- `references/Cytron Tutorial Template *.pdf`, `references/Maker ESP32 Datasheet *.pdf` — currently untracked (`git status` shows `references/` and `tmp/` as new/untracked). `tmp/maker-esp32-datasheet/` and `tmp/pdf-template-review/` appear to be prior one-off PDF-extraction scratch directories.
- `scripts/validate-data.js` — a dependency-free Node script (`node scripts/validate-data.js`) that checks JSON syntax, unique IDs, enum values, and that `auditFile`/`revampedOutputFile` actually exist on disk. Run manually today.

**External reference repo**: `E:\Cytron-AI-Coding-Pack\cytron-ai-coding-pack-maker-esp32\` contains `pin-map.md`, `board-features.md`, `product-context.md`, `electrical-and-safety-rules.md`, `troubleshooting.md`, `sample-code/*.ino` — the material `AGENTS.md` already tells a human/Claude Code to consult when the target hardware is Maker ESP32.

No JavaScript dependency manager, no test framework, and no server-side code exist anywhere in this repo today. Node is available locally (`v24.20.0`, `npm 12.0.2`), but nothing currently runs it besides the validator script.

---

## 2. Constraints Discovered

1. **GitHub Pages is static-only.** It cannot run Antigravity, Claude Code, git, or any Node process. A local bridge on the user's Windows PC is required — the brief's assumption is confirmed correct, not just an unverified guess.
2. **The dashboard is public-facing.** The GitHub repo/Pages URL is a normal public GitHub Pages site. Anyone who loads that URL in a browser is running the dashboard's JS. That means the local bridge must not trust "the request came from the dashboard's JS" as a security boundary by itself — see §12.
3. **No existing build tooling.** Anything added must run with zero-install "just open the HTML" simplicity for the dashboard, and a simple `npm install && npm start` for the service. Do not introduce a bundler/framework for the static site.
4. **`fetch()`-based data loading assumes the site is served, not opened via `file://`.** Chrome blocks `fetch()` of local files under `file://`. The dashboard is presumably already tested via GitHub Pages or a local static server (e.g. `npx serve`, VS Code Live Server) — the new bridge doesn't change this, but local end-to-end testing of the new feature must use a served origin, not double-clicking the HTML file.
5. **Cross-origin browser calls from `https://marketingcytron.github.io` to `http://localhost:PORT`** face two independent browser behaviors that must both be satisfied:
   - **CORS**: the bridge must return `Access-Control-Allow-Origin` matching the exact dashboard origin (not `*`) and handle the preflight `OPTIONS` request, since JSON `POST` bodies trigger a preflight.
   - **Private Network Access (PNA)**: Chromium now requires a secure-context page fetching a private/loopback address to receive `Access-Control-Allow-Private-Network: true` on the preflight response, and (increasingly) may require a permission prompt. This needs live verification in the target browser — flagged in §18.
6. **`tutorials.json` is git-tracked and hand-schema'd** (`CLAUDE.md` defines it, `scripts/validate-data.js` enforces enums). Any field the bridge writes automatically (e.g. a new `revampStatus` value, `revampedOutputFile`) must stay compatible with that schema and validator, or the validator/schema must be deliberately extended as part of this work.
7. **`AGENTS.md`'s existing rule** "add `revampedOutputFile` ... only when explicitly instructed" was written for a human typing instructions to Claude Code. In the new system, clicking "Start Revamp" *is* the explicit instruction — the bridge automating that write is a deliberate, in-scope reinterpretation, not a violation, but it's worth the user's explicit sign-off since it changes who edits `tutorials.json` (see §9).
8. **Antigravity CLI is not present in `PATH` on this machine.** Its exact invocation contract (executable name, non-interactive/headless flags, stdin vs. prompt-file input, auth requirements, context-size limits, exit codes) is unverified and is the single biggest unknown blocking real implementation (§18).

---

## 3. Proposed V1 Architecture

```
Browser (https://marketingcytron.github.io/cytron-tutorial-dashboard/)
  tutorial.html + js/revamp-agent.js
        │  fetch() with X-Revamp-Token header, CORS-preflighted JSON
        ▼
Local Bridge Service (Node.js, http://127.0.0.1:<port>, loopback-only)
        │
        ├─ tutorialRepo   → reads/validates data/tutorials.json, audits/, original URL
        ├─ promptBuilder  → assembles AGENTS.md + record + audit + references + instructions
        ├─ antigravityRunner → spawns Antigravity CLI (argv array, no shell)
        ├─ validator      → structural + safety checks on the generated Markdown
        ├─ qaProvider     → pluggable interface; V1 ships a no-op "always pass" implementation
        ├─ jobStore       → persists job state/log to jobs/<jobId>.json + .log
        └─ writer         → the ONLY code path allowed to write revamped-tutorials/*.md
                            and patch data/tutorials.json (never the browser, never Antigravity directly)
```

Key architectural decision: **the browser never writes to the filesystem, never talks to Antigravity, and never edits `tutorials.json` directly.** It only calls the bridge's HTTP API and polls job status. The bridge is the sole process with filesystem and CLI-execution privileges, and it is the sole writer of `tutorials.json`/`revamped-tutorials/`, which keeps a single, auditable choke point for every safety rule in the brief.

---

## 4. Component Responsibilities

| Component | Owner | Responsibility |
|---|---|---|
| Dashboard modal + polling client (`js/revamp-agent.js`) | Claude Code | UI, pairing/token storage, job creation, progress polling, cache-busting `tutorials.json` reload on completion |
| Local bridge HTTP API | Claude Code | Auth, validation, routing, job lifecycle, filesystem/process safety |
| Prompt construction | Claude Code | Deterministically assembles the Antigravity prompt from repo files; **no LLM call happens here** |
| Antigravity CLI | Antigravity (external) | Given the constructed prompt, writes the Markdown draft |
| Structural/safety validation | Claude Code | Confirms required sections exist, scans for leaked secrets, checks the file matches `AGENTS.md` structure |
| QA review | ChatGPT/OpenAI (future); no-op stub (V1) | Given Markdown + audit + metadata + hardware instructions, return `{decision, issues}` |
| Revision loop | Claude Code (orchestration) + Antigravity (rewrite) | Re-invoke Antigravity with QA issues appended, capped at `MAX_AUTO_REVISIONS = 2` |
| Hardware verification, media, final approval, git commit/push | Human user | Entirely manual in V1, unchanged from today |

---

## 5. Local Bridge Design

**Runtime**: Node.js, loopback-only HTTP server (`127.0.0.1`, never `0.0.0.0`).

**Framework choice**: use Node's built-in `http` module with a tiny hand-written router (5–6 routes doesn't justify a dependency), matching the repo's existing "zero dependency" style (`scripts/validate-data.js` uses only `fs`/`path`). If routing/middleware ergonomics become painful, a single well-known dependency (Express) is an acceptable fallback — but start dependency-free.

**Process model**: single Node process, single worker — **one revamp job runs at a time system-wide**. A second `start` request while a job is active is queued (simple in-memory FIFO) rather than run concurrently. This sidesteps concurrent-write races on `tutorials.json` and keeps resource usage (Antigravity CLI processes) predictable. Revisit concurrency only if usage patterns demand it.

**Location in repo**: a new `service/` directory, isolated from the static site so GitHub Pages never touches it and its `node_modules`/logs never ship to production:

```
service/
  server.js
  config.js
  routes/
    health.js
    revamp.js
  lib/
    auth.js              # pairing-token issuance/verification
    pathSafety.js         # slug validation + path-containment guard
    tutorialRepo.js        # read-only access to data/tutorials.json, audits/, original URL fetch
    promptBuilder.js       # assembles the Antigravity prompt
    antigravityRunner.js    # safe child_process invocation
    validator.js           # structural + secret-leak checks (wraps/extends scripts/validate-data.js)
    qaProvider.js           # QAProvider interface + NoopQAProvider
    jobStore.js             # job persistence + state machine
    tutorialWriter.js        # the only writer of tutorials.json / revamped-tutorials/*.md
    logger.js
  package.json
  README.md               # "npm install && npm start", explains the printed pairing token
```

---

## 6. Dashboard Integration Design

- **Button placement**: add a "Revamp Tutorial" button to `tutorial.html`'s `.tutorial-actions` header, alongside the existing "Open Original Tutorial" / "View Final Output" buttons (`js/tutorial.js` already conditionally injects buttons there — same pattern).
- **Modal**: new markup in `tutorial.html` (no modal CSS exists yet in `css/style.css` — this is new), plus a new `js/revamp-agent.js` module mirroring the existing page-module style (`TutorialDetail`, `RevampQueue`, …: an object with `init()`/`render()`).
- **Pairing (first run)**: the bridge prints a one-time pairing token to its console on startup. The modal's first use prompts the user to paste `http://127.0.0.1:<port>` + the token; both are stored in `localStorage` (scoped to the dashboard's own origin, so this is per-browser-profile, not shared). Subsequent opens auto-fill and show a live connection dot from polling `GET /health`.
- **Flow**: click "Revamp Tutorial" → modal shows optional instructions textarea → "Start Revamp" → `POST /api/revamp/start` with `{tutorialId, instructions}` and the pairing token header → modal switches to a progress view that polls `GET /api/revamp/:jobId` every ~2s, showing current state, a trimmed log tail, and a "Cancel" button (`POST /api/revamp/:jobId/cancel`).
- **On completion**: `Utils.loadData()` caches `tutorials.json` in a module-level variable for the page's lifetime, so after the bridge patches the file, the dashboard must force a re-fetch (a small `Utils.reloadData()` addition, or simply reset the cached variable) before re-rendering, so the "View Final Output" button and updated `revampStatus` appear without a full page reload.
- **Final Output tab is untouched** — it already renders anything with a valid `revampedOutputFile`, so a successful job "just shows up" there once `tutorials.json` is patched.

---

## 7. Antigravity Integration Design

**Prompt construction (deterministic, no LLM involved) — `promptBuilder.js`:**

1. Load `AGENTS.md` verbatim (it is already the authoritative workflow spec: source hierarchy, draft structure, safety rules, required trailing sections).
2. Load the matching `data/tutorials.json` record (validity, decision, priority, `hardwareUsed`, `makerEsp32`, dates).
3. Load the matching `audits/[slug].md`.
4. Fetch/attach the original tutorial content (`tutorial.url`) — see §18 for the open question on how this is retrieved server-side.
5. Attach the Maker ESP32 AI Coding Pack files relevant to the target hardware (`pin-map.md`, `board-features.md`, `product-context.md`, `electrical-and-safety-rules.md`, applicable `sample-code/*.ino`) when the instructions or dashboard record indicate Maker ESP32 is the target — mirrors the "Required source hierarchy" step 3 in `AGENTS.md` exactly.
6. Attach the Cytron Tutorial Template content. Since PDFs are expensive/unreliable to re-parse per job, **cache a one-time text/Markdown extraction** (the existing `tmp/pdf-template-review/` and `tmp/maker-esp32-datasheet/` directories suggest this was already done manually — reuse or formalize that extraction rather than re-parsing the PDF on every run).
7. Append the user's optional special instructions verbatim, as **inert text only** — length-capped (e.g. 2000 chars) and never interpreted as shell/file-path input.
8. Assemble into a single prompt file (not a shell string) and hand it to `antigravityRunner.js`.

**Safe invocation**: use `child_process.spawn(antigravityExecutable, argv, { shell: false, cwd: repoRoot, timeout })`, never `exec`/`shell: true`, so instruction text can never be interpreted as shell metacharacters. Pass the assembled prompt via a temp file path argument or stdin (whichever Antigravity's CLI supports — unverified, §18), not via a giant command-line argument. Capture stdout/stderr fully into the job log. Enforce a hard wall-clock timeout (kill + mark `Failed` on expiry).

**Output contract**: Antigravity is expected to produce the Markdown body; `tutorialWriter.js` (not Antigravity) is responsible for actually placing it at `revamped-tutorials/<tutorial-id>.md` and updating `tutorials.json` — this keeps "who is allowed to touch the filesystem" limited to Claude-Code-authored code, per the brief's responsibility split.

**Revision loop**: if QA returns `needs_revision`, `promptBuilder.js` re-assembles the same context plus the QA `issues[]` and the previous draft, and re-invokes Antigravity. Counter capped by `MAX_AUTO_REVISIONS = 2` (config constant); exceeding it moves the job to `Failed` with reason `qa_revision_limit_exceeded`, leaving the last draft on disk for human inspection rather than discarding it.

---

## 8. Future ChatGPT QA Integration

Design a `QAProvider` interface now so the state machine and revision loop are exercised in V1 without calling any external AI:

```js
// lib/qaProvider.js
interface QAProvider {
  // draftMarkdown: string, context: { tutorialRecord, auditMarkdown, userInstructions, qaStandardMarkdown }
  review(draftMarkdown, context) => Promise<{
    decision: "pass" | "needs_revision",
    issues: Array<{ severity: "blocker"|"major"|"minor", section: string, description: string }>
  }>
}
```

- **V1 ships `NoopQAProvider`**: always returns `{decision: "pass", issues: []}` immediately. This lets the job state machine actually pass through `QA Review` so the transition logic, logging, and UI are real and tested — the day `OpenAIQAProvider` is added, it's a drop-in swap behind the same interface, with zero changes to `jobStore.js` or the dashboard.
- **`OpenAIQAProvider` (future, not built now)** would receive: the generated Markdown, the audit file, the tutorial's dashboard metadata, the user's approved hardware instructions, and a new `qa/CYTRON_TUTORIAL_QA_STANDARD.md` (referenced by the brief, not created in this step). It returns the same `{decision, issues}` shape.
- Provider selection should be a config switch (`config.qaProvider = 'noop' | 'openai'`), not a code fork, so enabling real QA later is a config + API-key change.

---

## 9. Job State Model

Two layers, deliberately kept separate:

**A. Dashboard-visible status** — stored in `data/tutorials.json`'s existing `revampStatus` field, which `scripts/validate-data.js` currently restricts to: `Not Reviewed | Reviewed | Planned | Revamping | Completed | Archived`. This is git-tracked, human-facing, coarse-grained, and other code already branches on it (`js/revamp.js` excludes `Completed`/`Archived` from the queue).

Recommendation: **extend this enum with one new value, `Ready for Review`**, and update `scripts/validate-data.js`'s `VALID_STATUSES` accordingly (small, explicit, backward-compatible change). The bridge sets `revampStatus = "Revamping"` when a job starts and `revampStatus = "Ready for Review"` when it finishes successfully; it never sets `Completed`/`Archived` — those stay human decisions after hardware verification, consistent with "V1 should not yet include ... automatic production publishing."

**B. Job-internal state** — lives only in the bridge's `jobs/` store (new, gitignored — not part of the tracked dashboard data), one JSON file per job plus a log file. This is where the brief's fine-grained model is implemented in full:

```
Queued
  → Writing              (Antigravity generating/revising the draft)
  → Validating            (structural + safety checks on the output file)
  → QA Review              (QAProvider.review — no-op pass in V1)
      → Revision Required     (QA said needs_revision, revisionCount < MAX_AUTO_REVISIONS) → back to Writing
      → Ready for Review       (QA passed, or revision limit reached and last-known-good is accepted — see below)
Ready for Review            (terminal-success for the automated part; tutorials.json patched here)
Hardware Verification        (informational only in V1 — human sets this manually; not bridge-managed)
Completed                     (human-only, after manual git commit/push)
Failed                          (terminal — from any active state: CLI error, timeout, validation failure, revision-limit exceeded)
Cancelled                        (terminal — user-triggered from any non-terminal state)
```

Why split it this way: the fine-grained states (`Writing`, `Validating`, `QA Review`, `Revision Required`) are operationally useful for the progress UI and logs but would be noisy and short-lived if written into the git-tracked `tutorials.json` on every transition (and would require every existing consumer of `revampStatus` — CSS classes, `revamp.js` filters, the validator's enum — to learn five new values it doesn't otherwise need). Keeping them bridge-side avoids schema churn while still fully implementing the brief's state model.

---

## 10. API Design

All endpoints are loopback-only and (except `/health`) require a `X-Revamp-Token` header matching the pairing token generated at bridge startup. All bodies/responses are JSON.

| Method & Path | Purpose | Notes |
|---|---|---|
| `GET /health` | Liveness + capability check | Returns `{status:"ok", version, antigravityAvailable, activeJobId}`. No token required (read-only, harmless). |
| `POST /api/revamp/start` | Create a job | Body `{tutorialId, instructions?}`. Server validates `tutorialId` against `data/tutorials.json` ids read fresh from disk (never trusts anything else from the client). `instructions` length-capped. Returns `{jobId}` or `409` if a job for that tutorial is already active. |
| `GET /api/revamp/:jobId` | Poll status | Returns `{jobId, tutorialId, state, revisionCount, createdAt, updatedAt, logTail: string[], outputFile?, error?}`. |
| `POST /api/revamp/:jobId/cancel` | Best-effort cancel | Kills the active Antigravity child process if running; marks job `Cancelled`. No-op (200) if already terminal. |
| `GET /api/revamp?tutorialId=` | Job history for a tutorial | Nice-to-have, not required for the walking skeleton (§19). |

Error shape: `{ "error": { "code": "invalid_tutorial_id" | "unauthorized" | "job_not_found" | "job_already_active" | "antigravity_unavailable" | ..., "message": "..." } }`.

---

## 11. File/Folder Structure

```
cytron-tutorial-dashboard/
  service/                    # NEW — the local bridge (not deployed by GitHub Pages)
    server.js, config.js, routes/, lib/, package.json, README.md
  jobs/                       # NEW — gitignored job state + logs (jobs/<jobId>.json, jobs/<jobId>.log)
  qa/                         # FUTURE — CYTRON_TUTORIAL_QA_STANDARD.md (not created in this step)
  data/tutorials.json         # existing — bridge is now the only automated writer of revamp fields
  audits/                     # existing — read-only input to the bridge
  revamped-tutorials/         # existing — bridge writes here (same convention as today)
  references/                 # existing (untracked) — Template + Datasheet PDFs, read-only input
  tmp/                        # existing (untracked) — prior PDF-extraction scratch; formalize as prompt cache if reused
  js/
    revamp-agent.js           # NEW — modal + API client, added script tag to tutorial.html
  css/style.css                # extended with new .modal styles (none exist today)
  tutorial.html                 # add "Revamp Tutorial" button + modal markup
  AGENTS.md, CLAUDE.md           # unchanged; promptBuilder.js reads AGENTS.md verbatim
  scripts/validate-data.js        # extended: add "Ready for Review" to VALID_STATUSES
```

`.gitignore` additions needed: `service/node_modules/`, `jobs/`. `service/package.json` stays separate from (there is no) root `package.json`, so the static site remains dependency-free for GitHub Pages.

---

## 12. Security Model

The dashboard is a **public** GitHub Pages site. The threat model is not "a malicious dashboard" (the user controls its source) but: *anyone who can get a browser to send a cross-origin request to the user's `127.0.0.1:<port>` while the bridge is running* (e.g. a malicious ad/script on an unrelated tab, or a curious visitor of the public dashboard URL who isn't the intended operator). The bridge can execute a CLI and write files, so its blast radius is high; defense in depth is warranted even though CORS alone blocks most casual cross-origin browser abuse.

1. **Bind to `127.0.0.1` only** — never `0.0.0.0`; not reachable from the LAN.
2. **Strict CORS allow-list** to the exact dashboard origin (`https://marketingcytron.github.io`), never `*`. JSON `POST` bodies force a CORS preflight, so a non-allow-listed origin's browser-issued request is blocked before it reaches bridge logic.
3. **Pairing token required on every mutating endpoint** (`X-Revamp-Token`), generated fresh per bridge process start and shown once in the console. This is defense-in-depth beyond CORS: it also stops any local non-browser client (e.g. `curl`, another local app) from hitting the API without the user's explicit one-time pairing step.
4. **Tutorial ID allow-listed against `data/tutorials.json`** read fresh from disk server-side, using the same `^[a-z0-9-]+$` slug rule already enforced by `scripts/validate-data.js` — rejects anything not already a known tutorial ID before it touches any path logic.
5. **Path containment guard** (`pathSafety.js`): every filesystem path the bridge touches is built from the validated slug and `path.resolve()`d, then checked to still start with the repo root before any read/write. No path is ever taken directly from client input.
6. **No shell interpolation, ever.** Antigravity is invoked via `spawn(cmd, argv, {shell:false})`; user "special instructions" are passed only as inert prompt text (temp file or stdin), never concatenated into a command string or a file path.
7. **No blind overwrite**: `tutorialWriter.js` only ever writes to `revamped-tutorials/<validated-id>.md` (a fresh file per job, or an explicit re-run of the *same* tutorial's own file — never another tutorial's) and only patches the matching record in `tutorials.json` (never bulk-rewrites the file).
8. **Manual git only** — the bridge never runs `git commit`/`git push`; this is enforced by simply never invoking git at all, not by a checked flag that could be bypassed.
9. **Single active job** (see §5) avoids concurrent writers racing on `tutorials.json`.
10. **Secret-leak safety net**: `validator.js` scans generated Markdown for suspicious patterns (real-looking Wi-Fi passwords, API keys/tokens) as a backstop — the golden examples already show the writer is expected to sanitize to placeholders (`YOUR_WIFI_SSID`), but this is a machine-checked guard, not just a prompt instruction.
11. **`references/` and `tmp/` are read-only inputs** to the bridge; nothing in this design ever writes into them.

---

## 13. Error Handling

- Every API error returns the structured `{error:{code,message}}` shape (§10); the dashboard modal surfaces `message` directly plus a generic fallback for unmapped codes.
- Child-process (Antigravity) failures — non-zero exit, timeout, or unparsable/empty output — move the job straight to `Failed` with `stderr`/`timeout` captured in the job log; the partial draft (if any) is left on disk (not deleted) for human inspection but `revampedOutputFile` is **not** written to `tutorials.json` unless validation and QA both succeed.
- Validation failures (missing required `AGENTS.md` sections, still-present `[EDITOR PLACEHOLDER]` markers where not expected, detected secret-like strings) also produce `Failed`, listing every failing check, not just the first.
- Revision-limit exceeded (`revisionCount >= MAX_AUTO_REVISIONS`) → `Failed` with `qa_revision_limit_exceeded`, last draft retained.
- Bridge crashes/restarts mid-job: on startup, the bridge scans `jobs/` for any job left `Writing`/`Validating`/`QA Review` from a prior process and marks it `Failed` with `interrupted` rather than silently resuming (safer than guessing child-process state after a restart).
- Cancel requests are best-effort: if the child process has already exited between the check and the kill, the endpoint still returns success and the job settles into whatever terminal state its own completion produced.

---

## 14. Logging

- **Per-job log** (`jobs/<jobId>.log`): structured lines (timestamp, state transition, prompt size, Antigravity stdout/stderr, validation results, QA decision) — this is what the dashboard's "log tail" in the progress view reads from (last N lines on each poll).
- **Service-wide log** (`service/service.log` or `jobs/service.log`): startup, pairing token issuance, auth failures (without ever logging the token itself), CORS rejections, unhandled errors.
- Never log the pairing token, and never log full Wi-Fi/API credentials even if a user accidentally pastes one into "special instructions" — instructions text is logged but should pass through the same secret-pattern redaction as `validator.js` uses on output.
- Logs are plain text/JSON-lines, not committed to git (`jobs/` is gitignored per §11).

---

## 15. Windows Startup/Execution Model

V1 keeps this deliberately simple and manual, matching "git commit/push remain manual" as a philosophy of keeping humans in the loop for anything beyond the core generation loop:

- The user runs `npm install` once inside `service/`, then `npm start` (or a `service/start.ps1` the user can double-click) in a terminal window before opening the dashboard.
- On startup the process prints: the port, the health-check URL, and the one-time pairing token — the user pastes the token into the dashboard modal once.
- The bridge is a **foreground process** the user watches/leaves running; no Windows Service, no scheduled task, no auto-start-on-boot in V1. This keeps failure modes visible (if the terminal is closed, the dashboard's connection dot goes red — obvious feedback) and avoids the added complexity of a background-service story before the core pipeline is proven. Revisit only if the manual step becomes a real friction point.

---

## 16. Testing Strategy

No test framework exists in the repo today; use Node's built-in `node:test` + `node:assert` for the service (zero new dependency, consistent with the repo's existing dependency-free style).

- **Unit**: `pathSafety` (accepts valid slugs, rejects `../`, absolute paths, null bytes), `promptBuilder` (given fixture tutorial record + audit + instructions, produces the expected assembled prompt structure), `jobStore` (legal vs. illegal state transitions, revision-count capping), `qaProvider` (`NoopQAProvider` always passes).
- **Integration**: start the server on an ephemeral port with a **fake `antigravityRunner`** (a stub that just writes a canned Markdown string instead of spawning the real CLI) to exercise the full `/api/revamp/start` → poll → `Ready for Review` pipeline without depending on Antigravity actually being installed — this also happens to be exactly Milestone 1 (§19).
- **Manual dashboard test**: serve the static site with `npx serve .` (not `file://`, per §2.4) and drive the modal by hand against the running bridge, verifying the connection dot, the progress log tail, cache invalidation of `tutorials.json` after completion, and that the Final Output tab picks up the new file.
- **Validator regression**: run `node scripts/validate-data.js` after any job to confirm the bridge's writes to `tutorials.json` never break the existing schema checks.

---

## 17. V1 Implementation Phases

1. **Bridge skeleton + safety plumbing** — `server.js`, `auth.js`, `pathSafety.js`, `tutorialRepo.js` (read-only), `jobStore.js`, `/health`, `/api/revamp/start` + `/api/revamp/:jobId` backed by a **stub writer** (no Antigravity yet). This is Milestone 1 (§19).
2. **Dashboard integration** — modal, pairing UI, `js/revamp-agent.js`, button on `tutorial.html`, polling, cache invalidation, Final Output tie-in. Fully testable against the stub bridge from Phase 1.
3. **Real prompt construction** — `promptBuilder.js` assembling `AGENTS.md` + tutorial record + audit + original tutorial + Maker ESP32 pack + template, once the answers to §18's open questions (especially original-tutorial fetching and PDF/template caching) are confirmed.
4. **Real Antigravity invocation** — `antigravityRunner.js`, once its CLI contract is confirmed by the user (§18). Swap the stub from Phase 1 for the real thing behind the same interface.
5. **Structural/safety validation** — `validator.js` (required sections, placeholder scan, secret-pattern scan), wired into the `Validating` state.
6. **QA interface + no-op provider + revision loop** — `qaProvider.js`, `MAX_AUTO_REVISIONS`, exercised end-to-end even though QA always passes in V1.
7. **`tutorials.json` schema extension** — add `Ready for Review` to `VALID_STATUSES` in `scripts/validate-data.js` and `CLAUDE.md`, plus any CSS status-badge class needed for it.
8. **Hardening pass** — timeouts, crash-recovery job-scan on startup, logging polish, README for `service/`.

---

## 18. Risks / Unknowns Requiring Verification

These block or materially change Phases 3–4 and should be resolved with the user before writing that code:

1. **Antigravity CLI contract is unverified** — not found in `PATH` on this machine. Need: exact executable name/install location, non-interactive/headless invocation flags, how a large prompt is supplied (stdin vs. file vs. arg — argv has length limits), auth/login requirements, context-window/size limits (the assembled prompt could be large: `AGENTS.md` + JSON record + audit + original tutorial + several Maker ESP32 reference docs + template), and exit-code/output conventions.
2. **Browser cross-origin behavior to `localhost` from a public HTTPS page** needs live testing in the actual browser the user will use — Private Network Access preflight requirements (§2.5) are evolving in Chromium and may require an extra permission step or a locally-trusted HTTPS cert for the bridge rather than plain `http://localhost`.
3. **How is the original tutorial URL retrieved server-side?** `tutorial.url` points at `my.cytron.io`. Need to confirm the pages are plainly fetchable/scrapable (no auth/paywall), what HTML-to-text extraction is acceptable, and whether repeated fetches during development risk rate-limiting Cytron's own site.
4. **PDF reference caching** — `references/*.pdf` are large (the Maker ESP32 datasheet is ~1.9MB); re-parsing per job is wasteful and fragile. The existing `tmp/pdf-template-review/` and `tmp/maker-esp32-datasheet/` suggest a one-time extraction was already done manually — confirm whether those can be formalized into a cached prompt fragment or need regenerating.
5. **Single global job concurrency** (§5) is assumed acceptable for V1 — confirm this matches how the user actually intends to use it (e.g., never queuing two tutorials back-to-back while waiting on the first).
6. **Extending `tutorials.json`'s `revampStatus` enum** with `Ready for Review` (§9) touches a schema the user/team may have downstream expectations about (e.g. anything reading the CSV export, `tutorial_validation_export.csv`) — confirm no other consumer assumes the current fixed enum.
7. **Is the GitHub repo/Pages site actually public, or restricted?** Confirms how seriously to weight the "public page, local high-privilege service" threat model in §12.

---

## 19. Recommended First Coding Milestone

**A walking skeleton with the real Antigravity call replaced by a stub, to de-risk the plumbing before the unverified external dependency (§18.1).**

Build: `service/server.js` with `GET /health`, `POST /api/revamp/start`, `GET /api/revamp/:jobId`, backed by real `auth.js`/`pathSafety.js`/`tutorialRepo.js`/`jobStore.js`, but with `antigravityRunner.js` swapped for a fake that just writes a small canned Markdown file after a short delay. This proves, end-to-end, before touching Antigravity at all:

- Pairing token + CORS + PNA headers actually work from the real dashboard origin against a real loopback server (resolves §18.2 empirically).
- Tutorial-ID validation and path containment reject bad input correctly.
- The job state machine transitions `Queued → Writing → Validating → Ready for Review` and persists to `jobs/`.
- `tutorials.json` gets patched safely and `scripts/validate-data.js` still passes afterward.
- The dashboard modal, polling, cache invalidation, and Final Output tab pick-up all work.

Only after this skeleton is solid should Phase 3/4 (real prompt assembly, real Antigravity invocation) begin — by then the Antigravity CLI contract questions (§18.1) should also be answered, so that work isn't blocked on guesswork.
