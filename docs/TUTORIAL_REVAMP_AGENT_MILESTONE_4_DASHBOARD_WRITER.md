# Tutorial Revamp Agent — Milestone 4: Dashboard-Integrated Real Writer

Status: **Implemented and covered by 19/19 automated local API tests (no `agy` call, no real tutorial generation performed during implementation).** A human dashboard click-through test — the first real generation triggered from the "Revamp Tutorial" button — is the deliberate next step, not part of this milestone's own work.

This milestone makes the proven Milestone 3 real writer (`tutorialContext.js` + `promptBuilder.js` + `agyRunner.js` + `draftValidator.js`, orchestrated by `tutorialWriterPilot.js`) the **normal** "Revamp Tutorial" flow — replacing the Milestone 2 StubWriter for real dashboard usage. No OpenAI/QA integration, no automatic revision loop, no second model: the human using the dashboard is the QA reviewer.

---

## 1. Purpose

Milestones 1–3 proved, in isolation, that a real Antigravity-backed writer pipeline works: secure bridge connectivity, a job lifecycle, and three supervised real generations for `esp32-smoke-detection-alarm`. All of that lived behind manual pilot scripts (`tutorialWriterPilot.runWriterPilot()`), reachable only from a terminal. Milestone 4's purpose is narrow: **wire that already-proven pipeline into the existing dashboard UI** so a human can trigger it, watch it, and review its output entirely by clicking through the site — without ever touching `service/jobs/`, a terminal, or a script.

## 2. Final User Workflow

```
Dashboard (tutorial.html)
  → "Revamp Tutorial" button
  → optional human instructions (existing textarea, unchanged)
  → real writer: current-source retrieval → trusted context → real prompt → agy (headless) → deterministic validation
  → Ready for Review | Needs Human Review | Failed | Cancelled
  → "View Final Tutorial" → final-output.html (draft mode)
  → human reviews the full rendered draft, including Internal Editor Notes, inside the dashboard
```

Nothing is published automatically at the end of this flow — see §11.

## 3. Dashboard → Real Writer Integration

- `service/server.js`'s `POST /api/revamp/start` now calls `tutorialWriterPilot.runWriterForJob(job)` instead of `stubWriter.runStub(job.jobId)`. The job itself is still created with the existing `jobStore.createJob()` (type `revamp`, one active job per `tutorialId`) — nothing about job creation, the request/response shape, or the singleton-per-tutorial conflict behavior (`409 job_already_active`) changed.
- **`tutorialWriterPilot.js` was refactored into one shared writer engine** rather than duplicating writer logic between "pilot" and "production": `runWriterForJob(job)` is job-type-agnostic (works for both `revamp` and `writer-pilot` jobs) and contains the entire pipeline; `runWriterPilot()` is now a thin wrapper that only creates a `writer-pilot` job and hands it to `runWriterForJob()`. There is exactly one implementation of the writer pipeline in the codebase.
- **A real, confirmed bug was found and fixed during this integration**: `runPreflightChecks()` previously hard-required (a) non-empty user instructions and (b) literal "educational" + "not certified/life-safety" wording in those instructions, and (c) that the tutorial target Maker ESP32. These were correct preconditions for the one safety-sensitive Smoke Alarm pilot, but an isolated test against a normal, non-safety tutorial with empty instructions confirmed they would block preflight — and therefore block `agy` from ever being called — for essentially every other tutorial. All three are removed as hard preconditions; the credential-leak check and required-source checks remain.

## 4. Job Lifecycle

States: `Queued → Preparing Context → Writing → Validating → { Ready for Review | Needs Human Review }`, or `Failed` / `Cancelled` at any point. `Needs Human Review` (added in Milestone 3, now reachable from the dashboard) means `agy` succeeded but `draftValidator.js` found a genuinely BLOCKING unresolved hardware/electrical item — this is not treated as a failure. The dashboard polls `GET /api/revamp/:jobId` every 1.5s (unchanged cadence) and renders whichever real state comes back — there is no simulated/timed progress anywhere in this milestone.

Cancellation now targets a real subprocess: `tutorialWriterPilot.js` gained its own `activeChildren` tracking (mirroring `agyHarness.js`'s existing pattern) and a `cancelChildProcess(jobId)` export; `server.js`'s cancel handler routes to it for both `revamp` and `writer-pilot` jobs. `runWriterForJob()` checks for cancellation before every state transition (before context prep, after the source fetch, before `agy` launch, and immediately after launch) so a cancel issued before `agy` starts reliably prevents it from ever starting — verified by an automated test that starts a job, cancels it immediately, and then asserts no `agy-stdout.txt` file and no `launchStartedAt` were ever written for that job.

## 5. Output Retrieval

Two new authenticated endpoints, both resolving strictly through `jobStore`:

- `GET /api/revamp/:jobId/output` — returns `{ jobId, tutorialId, state, markdown, validationSummary }` by reading `candidate-tutorial.md` from `jobStore.jobDir(jobId)`. 404s as `output_not_ready` if the file doesn't exist yet (job still running, or failed before producing a draft), 404s as `job_not_found` if the jobId itself doesn't resolve, 400s as `no_output_for_job_type` for a job type that never produces one (e.g. the Antigravity harness).
- `GET /api/revamp/latest/:tutorialId` — returns the most recently created `revamp` job for that tutorial (any state), via a new `jobStore.getLatestJobForTutorial()` — a plain linear scan over the already-loaded in-memory `jobs` Map (simplest correct option at this job count; no new index to keep in sync). Used for browser-refresh recovery (§7).

`jobId` is constrained by the route regex (`[A-Za-z0-9-]+`) before either handler runs, and the candidate path is built only from `jobStore.jobDir(jobId)` — never a browser-supplied path fragment. Verified with percent-encoded and literal `..` traversal attempts (both correctly fall through to `404 not_found`/route-mismatch, never reach the filesystem read).

## 6. Final Output Rendering

`final-output.html`/`js/final-output.js` gained a second mode, selected by the presence of `?jobId=`:

- **Static mode (unchanged)**: `?id=<tutorialId>` only — loads the committed `revampedOutputFile` from the static site, exactly as before Milestone 4.
- **Draft mode (new)**: `?id=<tutorialId>&jobId=<jobId>` — fetches the job and its candidate Markdown from the authenticated bridge and renders it with the dashboard's **existing** `Utils.renderMarkdown()` (already escapes all text content and code blocks — no new rendering framework introduced). A "Local Review Draft — Not Published" banner is always shown in this mode, along with the compact validation summary and, for `Needs Human Review`, the specific blocking reasons.
- **Internal Editor Notes are never hidden.** The draft is split at the `# INTERNAL EDITOR NOTES` marker purely for a distinct visual treatment (a dashed-border block with a label) — both halves are rendered in full. A reviewer sees Admin & SEO, the public tutorial (including code blocks and tables), and the Revamp Change Log / Outstanding Verification / Media Replacement Plan, all in one page.

## 7. Refresh / Recovery

`js/revamp-agent.js`'s `openModal()` no longer depends solely on `sessionStorage`: if no jobId is cached for this tab, it queries `GET /api/revamp/latest/:tutorialId` and resumes into the progress/result view if a job is still active or has a reviewable result (`Ready for Review` / `Needs Human Review`); a `Failed`/`Cancelled` prior attempt goes to the normal fresh-start form instead. A "Start New Revamp" button was added to the terminal-state view specifically so a completed/failed job is never a dead end that traps the user into re-clearing `sessionStorage` manually to try again.

## 8. Validation Summary

`draftValidator.js`'s `summary` (`{pass, warning, fail, blocked}`) and, when applicable, `blockingReasons` are now persisted onto the job record itself (`jobStore.js`'s `toSafeJson()` exposes them for `revamp`/`writer-pilot` jobs) so the dashboard can show them without a second round trip. The progress view renders a one-line summary ("Validation: 28 passed, 0 warning(s), 0 failed, 0 blocking") and, for `Needs Human Review`, an explicit bulleted list of the specific blocking items. No internal process IDs, file paths, or PIDs are ever included in any job JSON exposed to the browser (unchanged from Milestone 1–3's security posture).

## 9. Security

All Milestone 1 guarantees are unchanged and were re-verified against the new endpoints specifically: bridge binds `127.0.0.1` only; exact-match GitHub Pages origin; pairing-token `Authorization: Bearer` required on every new endpoint (verified: unauthenticated calls to `start`, `output`, and `latest` all return 401); token lives only in `sessionStorage` on the frontend; request size limits and slug/job-ID regex validation are unchanged; no shell interpretation of any browser-supplied value (instructions remain opaque editorial text, never executed); no arbitrary filesystem path or URL is ever accepted from the browser — `jobId`/`tutorialId` are the only inputs, and every file access resolves exclusively through `jobStore`.

## 10. Cancellation

Extended, not replaced: the existing `agyHarness.js` cancellation pattern (kill only the exact tracked `ChildProcess` for that job, never a name-based or global `taskkill`) was mirrored into `tutorialWriterPilot.js` for the real writer's `agy` subprocess. `server.js`'s cancel handler now dispatches to whichever module owns that job type's child process.

## 11. Local-Review-Only Behavior

Nothing in this milestone writes to `revamped-tutorials/`, `data/tutorials.json`, `audits/`, or `references/`. A generated draft lives only under its own `service/jobs/<jobId>/` (gitignored) until a human explicitly promotes it — there is no code path in this milestone that can set `revampedOutputFile`, change `revampStatus`, or perform any git operation. Confirmed via `git status` showing no changes to any of those paths after full implementation and testing.

## 12. What Is Intentionally NOT Automated

- No OpenAI/QA reviewer, no second model, no automatic revision loop — the human using the dashboard is the QA step.
- No automatic promotion of a `Ready for Review` draft into `revamped-tutorials/` or `data/tutorials.json`.
- No exitCode-based restart recovery for the real writer's `agy` subprocess (a bridge restart mid-generation marks the job `Failed` with a message asking the user to start again — the same conservative policy already used for `writer-pilot` jobs and, previously, StubWriter jobs). This is a known, deliberate limitation, not an oversight.
- StubWriter (`service/stubWriter.js`) was **not deleted** — it remains in source for isolated/automated tests that don't want a real `agy` dependency — but `server.js` no longer requires or calls it anywhere in the normal flow.

## 13. Future Promotion/Publish Workflow

Out of scope for this milestone, but the shape is already visible from what exists: a human reviews a `Ready for Review` (or resolves a `Needs Human Review`) draft via the Final Output draft view, and a future, explicitly-separate step would copy the reviewed Markdown into `revamped-tutorials/<id>.md`, update `data/tutorials.json` (`revampedOutputFile`, `revampStatus`), and only then involve `git add`/`commit`/`push`. No part of that step is implemented, wired, or auto-triggered by anything in this milestone.
