# Tutorial Revamp Agent — Milestone 6: Human Feedback & Draft Revision

Status: **Implemented and covered by 32/32 automated backend assertions (temp job store + temp publications dir, `agy` and the network fetch both monkey-patched to throw/no-op — never reached) and 16/16 headless frontend assertions against the real `js/final-output.js` in a `vm` sandbox. No `agy` call, no real revision job, and no publication were performed during implementation or testing.**

Milestone 5 ended a draft's life at exactly two outcomes: **Approve & Publish**, or abandon it and start a whole new "Revamp Tutorial" job from scratch. There was no way to say "this is close, but change X" without losing everything else the writer got right. This milestone builds that missing loop: a human can review a draft, request a specific change, get back a new draft that keeps everything else intact, and repeat until satisfied — only then publishing.

---

## 1. Final User Workflow

```
Revamp Tutorial → Draft v1 (Ready for Review / Needs Human Review)
  → Human reviews the full draft
  → Request Changes → types feedback → Generate Revised Draft
  → Draft v2 (new job, parentJobId = v1) — automatically opened
  → Human reviews again
  → Request Changes again (as many times as needed) — or —
  → Approve & Publish to Final Output (publishes whichever draft is currently open)
```

Every "Request Changes" creates a **new** job. Nothing is ever overwritten in place.

## 2. Where the Action Lives

**Request Changes** and **Approve & Publish to Final Output** are the two primary actions on `final-output.html?id=<tutorialId>&jobId=<jobId>` (draft mode), shown together whenever the job is in a reviewable state and the tutorial is not yet published:

| Condition | UI |
|---|---|
| `tutorial.revampedOutputFile` already set | "Already in Final Output" badge + link — **neither** action offered (see §9) |
| `job.state` in `{Ready for Review, Needs Human Review}` and not yet published | **Request Changes** (secondary) + **Approve & Publish to Final Output** (primary) |
| `job.state` in `{Queued, Preparing Context, Writing, Validating, Failed, Cancelled}` | neither action shown |

This mirrors Milestone 5's client-side convenience check exactly — the bridge independently re-checks eligibility (§6) and refuses regardless of what the browser believes.

## 3. Request Changes Modal

Clicking **Request Changes** opens a modal (reusing the same `.revamp-modal-overlay`/`.revamp-modal` component as every other modal in this dashboard) titled "Request Changes", with the prompt "What would you like to change?" and a large multiline textarea (placeholder: *"Change GPIO32 to GPIO33.\nMake the introduction shorter.\nKeep the rest unchanged."*). Two buttons: **Cancel** and **Generate Revised Draft**. Nothing is generated automatically when the modal opens — the request is sent only on that button's click, and only if the textarea is non-empty (client-side check; the bridge enforces the same rule independently — §7).

## 4. Human Review Feedback Is Authoritative

Feedback submitted here is **HUMAN-APPROVED REVIEW FEEDBACK** — not casual commentary. For a revision job, the authority order the writer prompt uses (see `service/promptBuilder.js`'s `evidenceDecisionPriorityText()`) is:

1. **CURRENT HUMAN-APPROVED REVIEW FEEDBACK** — the latest human decision for *this* revision.
2. Existing **HUMAN-APPROVED REVAMP INSTRUCTIONS** — the original job's instructions, still in force except where the feedback above explicitly changes them.
3. **PROJECT-SPECIFIC HARDWARE DECISIONS** (if any exist for this tutorial).
4. **Approved Official / Coding Pack references**.
5. **Previous review draft** — the primary *editorial* baseline (§5).
6. **Current Tutorial Source Snapshot** — historical/original fallback evidence.
7. **Audit recommendations**.

When the current feedback directly conflicts with an earlier human instruction, a project-specific decision, or the previous draft: **the newest explicit human feedback wins**. The prompt explicitly tells the model not to silently merge a contradiction — follow the latest instruction for the public tutorial and, if the conflict is substantive, note it under Outstanding Verification.

## 5. The Previous Draft Is the Editorial Baseline, Not a Fresh Rewrite

A revision is **not** a regeneration from the original tutorial. `service/promptBuilder.js`'s `buildRevisionPrompt()` embeds the parent job's complete `candidate-tutorial.md` verbatim in a section headed exactly:

```
PREVIOUS REVIEW DRAFT — PRIMARY REVISION BASELINE
```

The prompt instructs the writer to *"preserve all content that is not affected by the HUMAN-APPROVED REVIEW FEEDBACK above as closely as possible"* and explicitly: *"This is a targeted revision of this draft, not a fresh rewrite from the original tutorial — do NOT regenerate unrelated sections with different wording merely because you are able to."* The previous draft is explicitly framed as an **editorial** baseline, not a technical authority above the human/project/official tiers above it — a genuine technical error in it can still be corrected by a higher-priority source.

Both **targeted** revisions ("Change GPIO15 to GPIO32", "Shorten the introduction", "Fix only the BOM") and **broader** ones ("Rewrite to use OLED instead of LCD", "Simplify for beginners") go through the exact same endpoint and prompt — the model infers scope from the feedback text itself; there is no separate "mode" flag.

## 6. Immutable Revision History

`service/jobStore.js` adds three fields to a `'revamp'` job record, populated only by the new `createRevisionJob(parentJob, feedback)`:

```
parentJobId      — the job this one revises (null for a root job)
rootJobId        — the very first job in the chain (own jobId for a root job)
revisionNumber   — 1 for a root job, parent's revisionNumber + 1 for a revision
reviewFeedback   — the human's feedback text for this specific revision (root jobs have none)
```

`createRevisionJob` **never** touches the parent job's `job.json`, `candidate-tutorial.md`, or `validation-report.json` — it only reads the parent's `userInstructions`/`title`/`tutorialId` and derives `rootJobId`/`revisionNumber` from it (`deriveRevisionMeta()`). A job created before Milestone 6 has none of these fields; `deriveRevisionMeta()` supplies `revisionNumber=1, rootJobId=<own id>, parentJobId=null` **at read time** — no existing `job.json` on disk is ever migrated or rewritten. `jobStore.listRevisions(job)` walks every in-memory job, filters to the same derived `rootJobId`, and returns them oldest-first as a safe summary (`jobId`, `revisionNumber`, `parentJobId`, `state`, `createdAt`, `validationSummary` — no filesystem paths).

Example chain: Job A (`revisionNumber:1, parentJobId:null, rootJobId:A`) → human requests changes → Job B (`revisionNumber:2, parentJobId:A, rootJobId:A`) → human requests changes again → Job C (`revisionNumber:3, parentJobId:B, rootJobId:A`). All three remain on disk, byte-identical to how the writer left them, forever (until a human manually cleans up `service/jobs/`).

## 7. Backend Endpoints

### `POST /api/revamp/:jobId/revise`

Authenticated (same pairing-token/CORS/loopback rules as every other endpoint). Request body: `{ "feedback": "..." }` — a plain string, nothing else. Explicitly **not** accepted from the body: `tutorialId`, candidate Markdown, file paths, model names, commands, or git arguments — every one of those is resolved server-side from the persisted **parent** job (`service/revisionManager.js`).

`server.js`'s `validateFeedback()` rejects: a non-string value, `feedback.trim().length === 0` (empty/whitespace-only), a length over `config.maxInstructionsLength` (4000 chars, the same cap as the original "Revamp Tutorial" instructions box), and the same disallowed-control-character set `validateInstructions()` already enforces. This is the same request-size/security convention used everywhere else in the bridge (`config.maxBodyBytes` 10 KB cap on the whole JSON body, applied before feedback validation even runs).

`service/revisionManager.js`'s `requestRevision(parentJobId, feedback)` is the one entry point:

1. **Resolve the parent** via `jobStore.getJob()` — `job_not_found` (404) if missing.
2. **Job-type check** — only a `'revamp'` job can be revised; anything else (e.g. the Antigravity harness) is `no_output_for_job_type` (400).
3. **Already-published check** — if `tutorialPublisher.readPublicationRecord(parentJobId)` returns *any* record (published, or committed-but-push-failed), the request is refused with `already_published` (409). Milestone 6 is deliberately scoped to **unpublished** review drafts — there is no silent "update the Final Output" path here (see §9).
4. **Eligibility** — `parent.state` must be `Ready for Review` or `Needs Human Review` (the exact set `tutorialPublisher.ELIGIBLE_STATES` also uses) — any other state is `job_not_eligible` (409).
5. **Candidate check** — the parent's `candidate-tutorial.md` must exist and be non-empty — `candidate_missing` (422), defensive (should already be guaranteed by #4).
6. **Create + kick off** — `jobStore.createRevisionJob()` then a fire-and-forget `tutorialWriterPilot.runWriterForJob(job)`, identical in shape to how `/api/revamp/start` kicks off a root job. The response returns immediately with the new job's id; the browser polls `GET /api/revamp/:jobId` for progress exactly as it already does.

**Concurrency:** an in-memory `Map<"<parentJobId>::<trimmed feedback>", Promise>` serializes a double-click or accidental duplicate submission of the *same* revision request — the second caller awaits the first caller's in-flight promise and gets back the identical new `jobId`, never a second job or a second `agy` call. Two *different* feedback strings against the same parent are **not** deduplicated — they correctly produce two independent revision jobs.

### `GET /api/revamp/:jobId/revisions`

Authenticated. Returns `{ ok: true, revisions: [...] }` — the safe summary from `jobStore.listRevisions()` for whichever root the given `jobId` belongs to, `job_not_found` (404) if the id doesn't resolve.

## 8. Revision Writer — One Pipeline, Two Prompt Shapes

`service/tutorialWriterPilot.js`'s `runWriterForJob(job)` is unchanged in every respect except prompt selection: job creation, the MQ-2 relevance/caution logic, pre-flight checks, the `agy` call itself, NDJSON parsing, candidate persistence, and `draftValidator.validateDraft()` are the exact same code path for a root job and a revision job. The only branch:

```js
if (job.parentJobId) {
  // read the parent's already-written candidate-tutorial.md (never re-fetched, never regenerated)
  ({ promptText, manifest } = promptBuilder.buildRevisionPrompt({ ...,  previousCandidateMarkdown, reviewFeedback: job.reviewFeedback, revisionNumber: job.revisionNumber }));
} else {
  ({ promptText, manifest } = promptBuilder.buildTutorialPrompt({ ... }));
}
```

If the parent's candidate is missing or empty at this point (should not happen — `revisionManager.js` already checked this before the job was even created — but defensive), the job fails immediately with a clear error, *before* any prompt is built and *before* any network/`agy` call — verified directly in testing (§13).

`service/promptBuilder.js` was refactored into a single internal `buildPrompt({ ..., revision })` composer; `buildTutorialPrompt()` calls it with `revision: null` (byte-for-byte the same output as before this milestone — verified in testing), and the new `buildRevisionPrompt()` calls it with `{ previousCandidateMarkdown, reviewFeedback, revisionNumber }`. When `revision` is set, three things change in the composed prompt, and nothing else does:

- A new **`# HUMAN-APPROVED REVIEW FEEDBACK`** section is inserted right after ROLE AND TASK — the literal feedback text, framed as authoritative and stating that the newest feedback wins on conflict.
- **EVIDENCE & DECISION PRIORITY**'s ordered list is replaced with the 7-tier revision order from §4 (a root job keeps the original 5-tier text, unchanged).
- A new **`PREVIOUS REVIEW DRAFT — PRIMARY REVISION BASELINE`** section is inserted after CURRENT TUTORIAL SOURCE SNAPSHOT, containing the parent's full candidate Markdown and the preservation instruction from §5.
- **INTERNAL EDITOR NOTES**'s required template gains a `## Revision History` subsection (see §10) — every other required subsection (`Revamp Change Log`, `Outstanding Verification`, `Media Replacement Plan`) is unchanged.

The **OUTPUT CONTRACT** section is completely unchanged: a revision must still return the *complete* publishable tutorial Markdown beginning with `## Admin & SEO` — never a patch, a diff, a change-list-only response, or commentary. This is what lets the existing `final-output.html` renderer and `draftValidator.js` keep working unmodified for a revision job's output.

## 9. Internal Editor Notes — Revision History Entry

For a revision, the prompt requires exactly this shape under Internal Editor Notes:

```
## Revision History

Revision 2
Human Feedback:
"Make the introduction shorter and keep everything else unchanged."

Changes Applied:
- Shortened Overview / Introduction.
- Other sections preserved.
```

The prompt explicitly forbids chain-of-thought or an internal reasoning transcript here — a concise, reviewer-friendly summary only — and warns the model not to claim "Other sections preserved" if it did not, in fact, preserve them.

## 10. Deterministic Validation — Unchanged

`draftValidator.validateDraft()` runs on every revised candidate exactly as it does on a root candidate — no weakened checks, no revision-specific bypass. The result lands the job in `Ready for Review` or `Needs Human Review` using the exact same `blocking_hardware_verification` logic as before. A non-blocking failure never blocks revision or review, same as Milestone 5.

## 11. Frontend

`final-output.html` gains two elements: `#revisionInfoArea` (revision indicator + compact revision-history list, populated by `js/final-output.js`) and a `#reviseModalOverlay`/`#reviseModalBody` pair (the Request Changes modal, reusing the existing `.revamp-modal` component — zero new modal CSS needed).

- **Revision indicator** — a small badge near the tutorial metadata: `Revision 1` for a root job, `Revision 2 · Based on Revision 1` for a revision. Always shown (root jobs count as Revision 1), never cluttering the page beyond one line.
- **Revision History** — only rendered when the chain has more than one entry (a lone root job shows nothing extra). Each past revision links to its own `final-output.html?id=<tutorialId>&jobId=<jobId>`; the current one is highlighted and not a link. Resolved entirely server-side via `GET /api/revamp/:jobId/revisions` — the browser never scans `service/jobs/` itself.
- **Request Changes button** — secondary action next to **Approve & Publish to Final Output**, shown under the same eligibility rule (§2). Opens the modal (§3); `Generate Revised Draft` POSTs `{feedback}` to `/api/revamp/:jobId/revise` and, on success, **automatically navigates** to `final-output.html?id=<tutorialId>&jobId=<newJobId>` — the human sees the new draft immediately, never having to find it manually. On failure, the error is shown inline in the still-open modal and the buttons re-enable (never a silent failure, never an accidental double-submit).

## 12. Publish Integration — Zero Changes Required

Milestone 5's `POST /api/revamp/:jobId/publish` needed **no code changes at all**. A revision job is `type: 'revamp'` exactly like a root job, so `tutorialPublisher.js` — which already resolves everything (candidate path, eligibility, title) from the supplied `jobId` alone — publishes whichever revision's `jobId` is passed to it, without caring whether that job has a `parentJobId`. Approving Revision 3 publishes Revision 3's candidate, not Revision 1's, simply because the human is looking at (and clicks Approve & Publish from) Revision 3's page.

## 13. Existing Final Output Protection — Unchanged

Milestone 5's rule stands untouched: no silent overwrite of an existing permanent Final Output. Additionally, Milestone 6 refuses to create a revision from a job that has *already* been published (§7, step 3) — there is no "update the live Final Output" workflow in this milestone; that is explicitly left for a future, separate, explicit workflow, exactly as Milestone 5 deferred replacing an existing Final Output.

## 14. Cancellation & Failure Safety

A revision job supports the existing Cancel Job mechanism while active — `tutorialWriterPilot.cancelChildProcess(jobId)` targets that job's own tracked `agy` child process by object reference, the same as any other job; the parent draft is never touched by cancelling its child revision. If revision generation fails outright, the parent draft remains completely intact (verified byte-for-byte in testing, §13) and the new job simply lands in `Failed` with a safe error message — the existing "Job failed" UI in `revamp-agent.js`'s progress view and this milestone's own draft page both already handle a `Failed` job state without any Milestone-6-specific code.

## 15. Security

Every prior-milestone guarantee is unchanged: loopback-only bridge, exact-match GitHub Pages origin, pairing-token `Authorization: Bearer` required, request-size limits, `jobId` regex validation before any filesystem access. New for this milestone: the revise endpoint accepts a plain-text `feedback` field and nothing else — no path, no command, no model override, no git argument. No git operation of any kind happens anywhere in the revision flow; `git add`/`commit`/`push` remain exclusive to `tutorialPublisher.js`'s Approve & Publish path.

## 16. Testing

**Backend** (`service/jobStore.js`, `service/revisionManager.js`, `service/promptBuilder.js`, `service/tutorialWriterPilot.js`): 32 automated assertions run against a temp job store and temp publications directory (the real `service/config.js` singleton monkey-patched at test time, matching Milestone 5's convention) using a synthetic tutorialId that does not exist in the real dataset. `originalTutorialSource.retrieveOriginalTutorial` was monkey-patched to a no-op (no real network fetch) and `agyRunner.launchStreaming` was monkey-patched to **throw** if ever reached — both confirmed never triggered. Covered: revision metadata derivation for legacy jobs, a 3-job revision chain's `parentJobId`/`rootJobId`/`revisionNumber` correctness, parent `job.json`/candidate byte-identity after a revision is created *and* after a revision fails, `listRevisions()` ordering and chain-membership from any node in the chain, `toSafeJson()` field exposure, every eligible/ineligible parent state, unknown job id, wrong job type, missing-candidate defensive refusal, already-published refusal, concurrent identical requests (single job, single writer invocation) vs. concurrent *different* requests (two independent jobs), a full prompt-content diff between a root and a revision prompt (feedback section present/absent, previous-draft section present/absent, priority-order text, "keep everything else unchanged" preservation instruction, Revision History contract), and a real `runWriterForJob()` call proving the actual branch selects `buildRevisionPrompt` for a revision job and `buildTutorialPrompt` for a root job by inspecting the written `prompt-preview.md`/`context-manifest.json` — with the run intentionally failing at pre-flight (missing snapshot, since the network fetch was mocked to a no-op) to prove `agy` was never reached.

**Frontend** (`js/final-output.js`): 16 headless `vm`-context assertions against the real page script with a minimal hand-rolled fake DOM (no `jsdom` dependency available) and a mocked `fetch`. Covered: Request Changes visible in `Ready for Review`/`Needs Human Review`, hidden in every active/terminal state, hidden once published; the modal renders without auto-generating; Cancel closes it; empty feedback is refused client-side without ever calling `fetch`; a real submission posts the exact expected URL/method/body/Authorization header and navigates to the new draft's URL on success; a bridge error is shown inline with the modal still open and buttons re-enabled; revision-history rendering for a single-entry chain (hidden) and a multi-entry chain (rendered, current entry marked and not self-linking, other entries linked).

No `agy` call was made, no real revision job was created against the real writer, and no publication was performed during this milestone's implementation or testing.

## 17. Version

Bridge version bumped `0.6.0` → `0.7.0` (`service/config.js`) — this milestone adds a new generation workflow and two new API endpoints.

## 18. What Is Intentionally Not Built

- No "update an already-published Final Output" workflow — explicitly deferred (§9/§13), same posture as Milestone 5's own deferral of replacing an existing Final Output.
- No bulk/batch revision — one `Request Changes` submission, one new job.
- No diff/comparison UI between revisions — the Revision History list links to each full draft page; a side-by-side diff view is future work.
- No automatic re-validation loop or QA model — the human remains the only reviewer, unchanged from every prior milestone.
