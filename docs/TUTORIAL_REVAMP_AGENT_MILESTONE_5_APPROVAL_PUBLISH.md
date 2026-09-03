# Tutorial Revamp Agent — Milestone 5: Human Approval & Final Output Publishing

Status: **Implemented and covered by 48/48 automated tests against an isolated temp git repo + local bare "origin" remote (no `agy` call, no real tutorial generation, no real publication performed during implementation), plus 20/20 headless frontend tests and a 4/4 regression check confirming Milestone 4's static Final Output mode is unaffected.**

Milestone 4 made the real writer usable from the dashboard, ending at a human-reviewable draft (`Ready for Review` / `Needs Human Review`) with **no automatic promotion** — §13 of that milestone's doc explicitly deferred the publish step. This milestone builds that step: a human who has reviewed a draft can click **Approve & Publish to Final Output** and have the bridge create the permanent file, update the dataset, validate, commit, and push — without the user needing Claude or a terminal for each approved tutorial.

---

## 1. Final User Workflow

```
Revamp Tutorial → Antigravity generation → Deterministic validation
  → View Final Tutorial (final-output.html, draft mode)
  → Human reviews the full draft, including Internal Editor Notes
  → Approve & Publish to Final Output (confirmation modal)
  → Permanent file created → dataset updated → validated → committed → pushed to origin/main
  → View Published Final Output (final-output.html, static mode, no jobId)
```

## 2. Human Is Final QA

There is still no OpenAI/QA integration and no automatic revision loop. A non-blocking validator failure (e.g. the two expected `fail` checks on a buzzer-less LED tutorial) never prevents approval — the human's judgment overrides it, exactly as it did for the two manual promotions performed before this milestone existed (`esp32-led-pattern-generator`, `esp32-smoke-detection-alarm`). A job in `Needs Human Review` (or carrying non-empty `blockingReasons`) *can* still be published, but only behind a visibly stronger confirmation step (§4) — publishing is never silently allowed to bypass that warning.

## 3. Where the Action Lives

**Approve & Publish to Final Output** is a primary action on `final-output.html?id=<tutorialId>&jobId=<jobId>` (draft mode) — deliberately *not* on the initial "Revamp Tutorial" modal, so the human has actually opened and read the full draft first. The page keeps showing "Local Review Draft — Not Published" until a publish attempt actually succeeds.

Three states, computed client-side from data already loaded (`this.tutorial.revampedOutputFile` from `data/tutorials.json`, `job.state` from the bridge):

| Condition | UI |
|---|---|
| `tutorial.revampedOutputFile` already set | "Already in Final Output" badge + "View Published Final Output" link — no publish button offered at all |
| `job.state` in `{Ready for Review, Needs Human Review}` and not yet published | "Approve & Publish to Final Output" button |
| `job.state` in `{Queued, Preparing Context, Writing, Validating, Failed, Cancelled}` | no publish action shown |

This client-side check is a UX convenience only — the bridge independently re-checks both conditions (§6) and refuses regardless of what the browser believes.

## 4. Confirmation Modal

Clicking the button opens a modal (reusing the existing `.revamp-modal-overlay`/`.revamp-modal` component from the Revamp Tutorial flow) summarizing: tutorial title, tutorial ID, job ID, and the validation counts (pass/warning/fail/blocking). It states plainly: *"This will create the permanent Final Output, update the tutorial dataset, commit the approved files, and push them to origin/main."*

When the job is blocking (`state === 'Needs Human Review'` or a non-empty `blockingReasons` array — checked with an OR, not just the state, so either signal alone is enough), the modal additionally renders a red warning block listing the specific outstanding items and disables **Approve & Publish** until the human checks an explicit acknowledgment box ("I acknowledge this draft has blocking verification items and still want to publish"). This is a UI-level gate; the bridge enforces the same rule independently via a separate `confirmedBlocking` flag in the request body (§6) — a scripted/replayed request without ever seeing the modal still cannot silently bypass it.

## 5. Backend Endpoint

`POST /api/revamp/:jobId/publish` (authenticated, same pairing-token/CORS/loopback rules as every other endpoint). Request body: `{ confirmed: true, confirmedBlocking?: true }` — booleans only. Every filesystem path, the git remote/branch, and the commit message are fixed or derived entirely server-side inside `service/tutorialPublisher.js`; the browser never supplies a tutorialId directly (it's read from the persisted job), a file path, or any git argument.

## 6. `service/tutorialPublisher.js` — Order of Operations

One entry point, `publish(jobId, { confirmed, confirmedBlocking })`:

1. **Resolve the job** via `jobStore.getJob(jobId)` — 404 `job_not_found` if missing; 400 `no_output_for_job_type` for a job type that never produces a tutorial (e.g. the Antigravity harness).
2. **Idempotency short-circuit** (see §10) — a prior successful publication for this exact job returns the cached result immediately; a prior "committed but push failed" record routes to a push-only retry (§9), never re-promoting or re-committing.
3. **Eligibility** — `job.state` must be `Ready for Review` or `Needs Human Review`; anything else (`Queued`, `Preparing Context`, `Writing`, `Validating`, `Failed`, `Cancelled`) is refused with `job_not_eligible`.
4. **Tutorial + already-published check** — the dataset is re-read fresh from disk (never a cached copy); if `tutorial.revampedOutputFile` is already set, **or** `revamped-tutorials/<tutorialId>.md` already exists on disk even without a dataset pointer, publication is refused with `already_published`. There is no code path in this milestone that overwrites an existing Final Output — replacing one is explicitly deferred to "a separate explicit update workflow."
5. **Candidate check** — `service/jobs/<jobId>/candidate-tutorial.md` must exist and be non-empty (`candidate_missing` otherwise). The path is built exclusively from `jobStore.jobDir(jobId)`, so a candidate can never be read from any job other than the one being published.
6. **Confirmation** — `confirmed !== true` → `confirmation_required`. If blocking (§4's OR check) and `confirmedBlocking !== true` → `blocking_confirmation_required` (with the specific `blockingReasons` echoed back).
7. **Repository preflight** — `git rev-parse --abbrev-ref HEAD` must be `main` (`wrong_branch` otherwise); `git status --porcelain` must show **no tracked modification or staged file** anywhere in the repo (`repo_not_clean`, with the offending paths listed). Untracked entries — `references/`, `tmp/`, or anything else — never block: a targeted `git add <these two files>` later can never sweep an unrelated untracked file into the commit regardless of what it is, so this is the real safety boundary, not merely those two known directories.
8. **Promote** — `service/tutorialsJsonRecordEditor.js` performs targeted line-level surgery on `data/tutorials.json` (locates the record by its `"id": "<tutorialId>",` line, edits only `revampStatus` in place and inserts a new `revampedOutputFile` line) rather than a full `JSON.parse`/`stringify`/write — the latter would rewrite every line of a ~2700-line file, normalize its CRLF line endings, and produce an unreviewable diff touching every other tutorial. The target `revampStatus` value is *detected*, not invented: `detectEstablishedRevampStatus()` scans the existing dataset for the value already used by every other Final Output record (currently `"Revamping"`, used by all four) and reuses it; if no precedent existed yet, the field is left untouched rather than guessing. The candidate is written byte-for-byte to `revamped-tutorials/<tutorialId>.md` via a write-temp-then-rename (atomic on the same filesystem, mirroring `jobStore.js`'s existing persistence pattern).
9. **Validation gate** — before any git command runs: (a) the just-written Final Output file is re-read and compared byte-for-byte against the candidate; (b) the updated `data/tutorials.json` is re-parsed and run through `scripts/validate-data.js`'s `validateTutorialsData()` — the *exact same* function `node scripts/validate-data.js` uses, reused as a library rather than reimplemented; (c) the dataset record is confirmed to point at the right file; (d) the tutorial is confirmed to now satisfy the Final Output tab's own filter (`t => t.revampedOutputFile`). **Any** failure here rolls both file writes back to their exact pre-promotion bytes and stops — no `git add`, no commit, no push, ever.
10. **Git** — stage exactly `data/tutorials.json` and `revamped-tutorials/<tutorialId>.md` (`git add --`, explicit paths, never `-A`/`.`); re-read `git diff --cached --name-only` and abort (unstage + roll back files) if it is not *exactly* those two paths; commit with a server-generated message (`Publish <Tutorial Title> final output` — title comes from the trusted job record, newlines stripped, never accepted from the request body); push `origin main`. A commit failure (hook rejection, `git commit` exiting non-zero) unstages and rolls back the same way as a validation failure — nothing is left half-done.
11. **Push outcome**: if push fails, the **commit is kept** (never destroyed or amended) and a local publication record is written with `status: 'commit_succeeded_push_failed'`; the response tells the frontend to show "Published locally, GitHub push failed" with a Retry Push action. If push succeeds, the record is written as `status: 'published'`.

## 7. Never Trusts Browser Input For Paths

Everything path-shaped is either a fixed string (`data/tutorials.json`, the git remote `origin`, the branch `main`) or derived from a value already validated elsewhere: `jobId` is constrained by the route regex (`[A-Za-z0-9-]+`) before the handler runs and resolved only through `jobStore.getJob()`/`jobStore.jobDir()`; `tutorialId` comes from the persisted job record, not the request, and is re-validated against the same `TUTORIAL_ID_PATTERN` used everywhere else in the bridge before it is ever used to build a path (`invalid_tutorial_id` otherwise — verified with a deliberately path-traversal-shaped tutorialId in testing, refused before touching the filesystem).

## 8. `service/gitRunner.js`

A narrow wrapper used only by `tutorialPublisher.js`: every call is `child_process.spawn('git', [...fixedArgv], { cwd, shell: false })` — no string concatenation, no shell interpretation, no way for any value to be interpreted as a second command. The only caller-supplied dynamic values are the two repo-relative file paths tutorialPublisher.js itself builds (never from request input) and the server-generated commit message, each passed as separate argv entries.

## 9. Retry Push — Same Endpoint, No Re-Promotion

There is no separate "retry" endpoint. Calling `POST /api/revamp/:jobId/publish` again for a job whose local publication record says `commit_succeeded_push_failed` runs a completely different, much shorter code path (`retryPushOnly()`) that does exactly one thing — `git push origin main` — and never touches the working tree, never re-stages, never re-commits. This was verified by breaking the `origin` remote URL, publishing (commit succeeds, push fails), fixing the remote, and republishing: the second call returns the *same* `commitHash` as the first, and the local repo gains zero new commits — only the bare "origin" gains the one it was missing.

## 10. Idempotency / Double-Click Safety

An in-memory `Map<jobId, Promise>` inside `tutorialPublisher.js` serializes concurrent calls for the same `jobId`: two simultaneous `publish()` calls (simulated with `Promise.all` in testing) both resolve to the identical result and exactly one commit is created — the second caller never re-runs the flow, it just awaits the first caller's in-flight promise. Once that promise resolves, a **local, gitignored** publication record (`service/publications/<jobId>.json` — jobId, tutorialId, candidate hash, final path, commit hash, timestamp, push status; never committed, never containing secrets) makes every *subsequent* call (a page refresh, a stray repeated POST) return the cached success immediately rather than re-publishing.

## 11. Traceability

`service/jobs/<jobId>/` (candidate, validation report, context manifest, NDJSON events, logs) is never modified by a publish — publication bookkeeping lives entirely in the separate `service/publications/` directory. Both are gitignored local runtime state; only `revamped-tutorials/<id>.md` and the `data/tutorials.json` record are ever committed.

## 12. Security

All prior-milestone guarantees are unchanged and were re-verified for the new endpoint specifically: loopback-only bridge, exact-match GitHub Pages origin, pairing-token `Authorization: Bearer` required, request-size limits, `jobId`/slug regex validation before any filesystem access. New for this milestone: the browser can never send a file path, a git command, a commit message, a branch name, or a remote name — every one of those is fixed or server-derived (§6–§8). `git commit`/`push` are never invoked with `--no-verify` or any hook-skipping flag.

## 13. Testing

**Backend** (`service/tutorialPublisher.js`, `gitRunner.js`, `tutorialsJsonRecordEditor.js`): 48 automated assertions against a throwaway temp git repository with its own local bare `origin` remote (created and destroyed entirely under the session's scratchpad — the real `E:\cytron-tutorial-dashboard` repo, its history, and its real GitHub remote were never touched). The real `service/config.js` singleton was monkey-patched at test time to point at the temp repo so the *actual* production modules ran, not a reimplementation. Covered: every eligible/ineligible job state, both blocking-confirmation shapes (state-driven and reasons-array-driven), already-published refusal (with a real pre-existing file, no overwrite), a path-traversal-shaped tutorialId, an unknown tutorialId, a missing candidate, wrong-branch refusal, unrelated-tracked-change refusal (with `references/`+`tmp/` untracked directories present and confirmed *not* blocking), a genuine post-promotion dataset validation failure with full rollback verification (byte-identical restore, no commit), a `pre-commit` hook-induced commit failure with full rollback, the complete success path (byte-identical output, exactly-two-files-per-commit, push landing on the bare origin, no `jobId` in the resulting static URL), a repeated post-success call (cached, no new commit), concurrent double-click (single commit, identical `commitHash` returned to both callers), and push failure followed by a successful retry (same `commitHash`, exactly one new commit on the remote).

**Frontend** (`js/final-output.js`): 20 headless `vm`-context assertions covering the unpublished/eligible state, the already-published state, the no-action states, the blocking confirmation modal (warning text, disabled-until-acknowledged button), a publish error surfaced inline in the modal, the push-failure-then-successful-retry sequence, and a disconnected-bridge case. A separate 4-assertion regression run confirms Milestone 4's static Final Output mode (`?id=` only, no `jobId`, no bridge dependency) is byte-for-byte unaffected by this milestone's additions.

No `agy` call was made, no new tutorial job was created against the real writer, and no fifth real tutorial was published during this milestone's implementation or testing.

## 14. Version

Bridge version bumped `0.5.0` → `0.6.0` (`service/config.js`) — this milestone adds the first write/publish capability the bridge has ever had.

## 15. What Is Intentionally Not Built

- No bulk/batch publish — one job, one publish call.
- No silent replace of an existing Final Output — deliberately deferred, per explicit instruction, to a future, separate, explicit update workflow.
- No automatic GitHub Pages readiness check — the frontend shows a plain note ("Published to main. GitHub Pages may take a short time to refresh.") rather than polling for deployment.
- No OpenAI/QA integration — unchanged from Milestone 4; the human remains the only reviewer.
