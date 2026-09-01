# Tutorial Revamp Agent — Milestone 3A: Antigravity Integration Harness

Status: **Implemented and verified with one real, successful headless Antigravity call.** A GUI-based approach was attempted first, thoroughly tested, and abandoned — that history is documented below because it directly shaped the final design and rules out re-attempting it in Milestone 3.

No Cytron tutorial content, OpenAI/QA integration, `data/tutorials.json`, `revamped-tutorials/`, `audits/`, or `references/` are touched by this milestone. The Milestone 2 "Revamp Tutorial" flow (StubWriter) is unchanged.

---

## 1. Purpose

Prove the full chain **Dashboard DEV control → authenticated local bridge → persisted job → real Antigravity invocation → bridge-verified result → Ready for Review**, using a harmless, fixed, non-file-writing test prompt — before Milestone 3 wires this same mechanism to a real tutorial-writing prompt.

## 2. Two Architectures Attempted

### 2a. GUI approach (attempted, abandoned)

The initial design launched `antigravity-ide.exe chat --mode agent` (the desktop IDE's CLI shim), instructed the agent via prompt to write two files (`antigravity-output.txt` + a nonce-bearing `completion.json`) into a bridge-owned workspace, and polled for their appearance. This was implemented in full (`antigravityRunner.js`, `outputWatcher.js`, `antigravityHarness.js` — all since deleted) and tested extensively:

- Fixed two real invocation bugs along the way: (1) `spawn(cliPath, args, {shell:true})` doesn't quote the executable path itself, so the space in "Antigravity IDE" made `cmd.exe` split the command; (2) Node flags `shell:true` array-argument escaping as unsafe (`DEP0190`), so the whole command line was built as one bridge-controlled string instead.
- Even after both fixes, and after bypassing the `.cmd` shim entirely to invoke `Antigravity IDE.exe` + `cli.js` directly with `shell:false` and a clean argument array (exactly replicating what the shim itself does, including `ELECTRON_RUN_AS_NODE=1`), **the launched window opened only to the normal welcome screen** — confirmed by direct human inspection of the actual window, not just automated inference. No chat session, no injected prompt, no agent activity, no approval dialog.
- A manual side-by-side comparison was run: the previously-proven working invocation (`& "...\antigravity-ide.cmd" chat --mode agent --new-window "<prompt>"` via PowerShell's `&` operator) against the "equivalent" direct-exe invocation, run manually once. The direct-exe version launched a new window/process set (confirmed via process count) but produced no observable output within the test window, and no visual confirmation of a working chat session was obtained from that manual run either.
- Piping the prompt via `chat ... -` (stdin) was tested and does **not** work: the CLI's generic top-level "read stdin" behavior opens the piped content as a new untitled editor buffer, unrelated to the `chat` subcommand's own prompt handling.
- **Conclusion**: `antigravity-ide.exe chat` is not a reliable, scriptable invocation surface for this bridge, regardless of exact spawn mechanics. **This path is abandoned.** All of its code was deleted, not just deprecated.

### 2b. Official headless `agy` CLI (adopted)

Discovery: the official Antigravity CLI, `agy.exe` (v1.1.22), is already installed at `C:\Users\user\AppData\Local\agy\bin\agy.exe` and on `PATH`. Unlike the IDE's `chat` subcommand, it exposes a genuine non-interactive mode:

```
agy.exe -p "Reply with exactly: AGY_HEADLESS_OK" --output-format text --print-timeout 60s
```

Verified real result: stdout `AGY_HEADLESS_OK` (exact match), stderr empty, exit code `0`, ~8.3s, **zero** new Antigravity GUI processes, no authentication prompt, no filesystem side effects. This is a true request/response CLI — **this is the adopted design.**

## 3. Antigravity Invocation (final)

`service/agyRunner.js`:

```js
spawn(
  'C:\\Users\\user\\AppData\\Local\\agy\\bin\\agy.exe',
  ['-p', prompt, '--output-format', 'text', '--print-timeout', '60s'],
  { cwd: <bridge-generated workspace dir>, shell: false }
)
```

`shell: false`, a plain executable, a clean argument array — no `cmd.exe`, no PowerShell, no raw command-line string, no batch-file quoting concerns of any kind. `prompt` is always `config.agy.harnessPrompt`, a fixed constant (`"Reply with exactly: AGY_HARNESS_OK"`) — no browser input reaches this function. `--dangerously-skip-permissions`, `--add-dir`, `--mode accept-edits`, `--continue`, `--conversation`, `--project`, `--new-project` are deliberately not used for this harness.

## 4. stdin Prompt Delivery

Not used for `agy` (the prompt is passed via `-p` as a normal argument, which is simple and already proven reliable). The stdin finding from the abandoned GUI approach (§2a) stands as documented history but doesn't apply here.

## 5. Job Workspace

```
service/jobs/<jobId>/
  job.json
  attempts/<attempt>/
    workspace/            (agy's cwd; agy is not asked to write anything here in this milestone)
    agy-stdout.txt        (bridge-owned; redirected from the child process's stdout as it runs)
    agy-stderr.txt        (bridge-owned; redirected from the child process's stderr as it runs)
```

`workspace/` still exists and is still `agy`'s working directory, but in this design **Antigravity does not write repository or workspace files at all** — it is never asked to. The bridge is the only writer of anything on disk (the two `agy-*.txt` capture files). `attempts/<attempt>/` and every path under it is derived purely from the server-generated `jobId` and `attempt` number — never from client input.

## 6. Output Contract

Success requires, in order: (1) the process launched, (2) it exited, (3) exit code `0`, (4) stdout is readable, (5) stdout — after stripping at most one trailing newline — is exactly `AGY_HARNESS_OK`. Any explanatory text before/after the exact string, or any other deviation, fails validation (`AGY_INVALID_OUTPUT`) — verified with a mocked wrong-output case (see §18).

## 7–9. Completion Marker / Nonce / File-Stability Heuristic — Retired

All three belonged to the abandoned GUI/file-watch design and no longer exist. There is no `completion.json`, no nonce, and no polling-for-file-stability loop — completion is now the real subprocess's own `exit` event, which is unambiguous and immediate.

## 10. Persistent Job Store

Unchanged core mechanism from the original Milestone 3A work: atomic `job.json` writes (write-temp-then-rename) inside each job's own directory; the in-memory `jobs` Map is fully rebuilt from disk at bridge startup (`jobStore.loadJobsFromDisk()`). Harness job fields now persisted: `jobId, type, state, createdAt, updatedAt, writer ("agy"), attempt, launchStartedAt, processId, deadlineAt, exitCode, error`. No secrets are persisted (there is nothing secret to persist in this design — no nonce, no token). `processId` is persisted for observability/local debugging only — never exposed via `toSafeJson`/the API.

## 11. Restart Recovery (reassessed for the new architecture)

**Explicitly not pretending stdout can be recovered from memory.** `agyRunner.js` redirects the child's stdout/stderr to bridge-owned files *from the moment the process starts*, so a bridge crash never loses output that had already reached disk.

On startup, `jobStore.loadJobsFromDisk()` finds any non-terminal `antigravity-harness` job and hands it to `agyHarness.reconcileAfterRestart()`, which:

- **If `exitCode` was already persisted** (the agy process had genuinely finished before the crash, in the narrow window before the bridge recorded and reacted to that): re-reads `agy-stdout.txt` from disk and finalizes the job (`Ready for Review` or `Failed`) purely from that file — a real, trustworthy recovery.
- **If `exitCode` is still `null`** (the process's true outcome at crash time is unknown): the job is marked `Failed` with an explicit message — *"Job state could not be safely recovered after a bridge restart (the agy process outcome could not be determined)."* **This is a documented limitation, not a solved problem**: a bridge restart cannot regain a live handle to the original child process, and checking the OS process list by the persisted PID was deliberately not implemented, because PIDs are reused by Windows over time and a restart is likely to happen well after the original process (which typically finishes in single-digit seconds) has already exited — a PID-based liveness check would risk misidentifying an unrelated process. **Never relaunches `agy`** in either case.

Tested via crafted `job.json`/`agy-stdout.txt` fixtures (SIMULATED — see §18, tests 10a/10b), not a real timed bridge-crash-mid-flight (which would be unreliable to orchestrate given `agy` calls finish in seconds).

## 12. Timeout Handling

`agy`'s own `--print-timeout 60s` bounds the model call itself. Independently, `agyHarness.js` races the process's completion against a bridge-side watchdog (`config.agy.watchdogTimeoutMs`, 80s — deliberately longer than `agy`'s own timeout) so a genuinely hung/misbehaving child can never hang the bridge forever. If the watchdog fires first, the bridge kills that specific child process and fails the job with `AGY_TIMEOUT`. Verified with a mock whose `donePromise` never resolves (§18, test 3) — the watchdog correctly fired and failed the job in ~500ms in that test (watchdog shortened for the test; production value is 80s).

## 13. Cancellation

Unlike the shared-Electron-process GUI approach, `agy` is a dedicated, bridge-spawned child process per job, so **the bridge tracks the exact `ChildProcess` object for the active job and calls `.kill()` on it directly** (`agyHarness.cancelChildProcess()`, wired into the existing generic `POST /api/revamp/:jobId/cancel` route for harness-type jobs). This is precise, per-job termination — no kill-by-name, no `taskkill`, no global process termination, and no risk to any other `agy`/Antigravity process. Verified (§18, test 7): cancelling mid-flight both (a) actually invokes `.kill()` on that job's own mock child object, and (b) a "late" successful result arriving afterward is confirmed ignored — the job stays `Cancelled`, never flips to `Ready for Review`.

## 14. Security Controls

- `127.0.0.1:47821` only, exact-match CORS to `https://marketingcytron.github.io`, `Authorization: Bearer <pairing token>` required on every `/api/revamp/*` and `/api/dev/*` route — unchanged from Milestones 1–2.
- `config.agy.exePath` is a fixed constant; the browser cannot influence the executable path, any CLI flag, the prompt, or `cwd` — the harness endpoint (`POST /api/dev/antigravity-harness/start`) accepts and reads no request body at all.
- `shell: false` with a plain argument array — no shell string is ever built from any input, bridge-generated or otherwise.
- No `--dangerously-skip-permissions` — not needed, since `agy -p` in this design never requests file/tool access in the first place (the harness prompt asks for nothing but a fixed reply).
- Job/attempt directory paths are always derived from the server-generated `jobId` (`crypto.randomUUID()`) — never from client input.
- No filesystem path, process ID, or executable path is ever returned to the browser (`jobStore.toSafeJson` is an explicit allow-list: `jobId, type, state, createdAt, updatedAt, revisionCount, error, writer, attempt, launchStartedAt, launchReturnedAt, deadlineAt, exitCode`).
- Pairing token and `Authorization` header values are never logged (`service/logger.js` only ever receives explicitly-chosen safe fields).

## 15. API

Unchanged surface from the original Milestone 3A plan:

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `POST /api/dev/antigravity-harness/start` | POST | required | Starts (or returns the existing) harness job. No request body is used. |
| `GET /api/revamp/:jobId` | GET | required | Reused as-is — works for both `revamp` and `antigravity-harness` job types. |
| `POST /api/revamp/:jobId/cancel` | POST | required | Reused as-is; now also kills the specific `agy` child process for harness jobs. |

The endpoint name was kept as `antigravity-harness` (per the brief's own suggestion) even though the implementation is `agy`-based — renaming would have broken nothing user-visible but added churn for no benefit.

## 16. DEV Dashboard Flow

Unchanged from the original Milestone 3A implementation — the "Bridge Debug (advanced)" collapsed panel's **Run Antigravity Harness** button (clearly labeled `DEV / TEST ONLY`) starts the job and polls `GET /api/revamp/:jobId` the same way; the success message is unchanged: *"Antigravity harness completed successfully. Verified output: ANTIGRAVITY_HARNESS_OK. No tutorial files were modified."* No dashboard code needed to change for this backend swap, because the API contract (job states, safe JSON shape) was kept compatible.

## 17. Real Antigravity Test (REAL, not simulated)

One real end-to-end run via the actual bridge API:

```
POST /api/dev/antigravity-harness/start → 200 {"jobId":"f7f242a8-...","state":"Writing"}
```

Observed via polling and `service/jobs/service.log`:

```
Queued → Preparing Context → Writing → Validating → Ready for Review
```

in **~7.6 seconds** (`launchStartedAt` 07:13:38.834 → `launchReturnedAt` 07:13:46.398), `exitCode: 0`. `agy-stdout.txt` content verified byte-for-byte:

```
AGY_HARNESS_OK
```

`agy-stderr.txt` was empty. `Get-Process` for `*Antigravity*` was checked immediately before and after: **11 → 11**, confirming no GUI window opened for this run. This is the REAL test — not mocked, not simulated.

## 18. Simulated Tests

All run in-process against `jobStore.js`/`agyHarness.js` directly, with `agyRunner.launch` monkey-patched per-test to avoid spending real `agy`/LLM calls on failure-path coverage:

| # | Case | Result |
|---|---|---|
| 1 | agy executable missing | `Failed`, `AGY_NOT_FOUND` |
| 2 | Launch failure (spawn throws) | `Failed`, `AGY_LAUNCH_FAILED` |
| 3 | Bridge watchdog timeout (mock never resolves) | `Failed`, `AGY_TIMEOUT` (shortened watchdog for the test) |
| 4 | Non-zero exit code | `Failed`, `AGY_NONZERO_EXIT` |
| 5 | Wrong stdout content | `Failed`, `AGY_INVALID_OUTPUT` |
| 6 | Trailing newline in otherwise-correct stdout | `Ready for Review` (normalization allowed) |
| 7 | Cancellation mid-flight | Specific mock child's `.kill()` called; job stays `Cancelled` even after a "late" correct result arrives |
| 8 | Duplicate active harness start | Second call returns the existing job (`conflict: true`), no second job created |
| 9 | Persisted completed job reload | Terminal job remains queryable with its original state after a simulated disk reload; not re-queued for reconciliation |
| 10a | Active-job restart, recoverable (`exitCode` known + valid stdout on disk) | Correctly finalized to `Ready for Review` from disk alone |
| 10b | Active-job restart, unrecoverable (`exitCode` unknown) | Honestly marked `Failed` with the documented-limitation message — no guessing |
| 11 | Unknown job ID (`GET`) | `404 job_not_found` |
| 12 | Missing pairing token | `401 unauthorized` |
| 13 | Wrong pairing token | `401 unauthorized` |

All 13 passed. Full script output available on request; not committed (scratch file).

## 19. Existing Data Safety

After all testing (mocked + one real run): `git status --short` for `data/tutorials.json`, `revamped-tutorials/`, `audits/` — empty (untouched). `references/` remains untracked/untouched (pre-existing). `node scripts/validate-data.js` → 30 tutorials, 0 errors, 0 warnings. The Milestone 2 StubWriter path was re-tested end-to-end (`esp32-motion-detector-alert`) and still reaches `Ready for Review` correctly, unaffected by this refactor. `service/jobs/` confirmed still fully gitignored (`git check-ignore -v` matches every file under it, including the new `agy-stdout.txt`/`agy-stderr.txt`).

## 20. Known Limitations

- **Restart recovery is honest, not complete**: an active harness job whose `agy` process outcome is unknown at the moment of a bridge restart is marked `Failed` rather than resumed — see §11. Given `agy` calls finish in single-digit seconds in testing, this window is narrow in practice.
- **Windows `child.kill()`** terminates the immediate child process; if `agy.exe` ever spawns its own sub-children, a cancellation might not clean those up. Not observed in testing (no evidence `agy -p` spawns sub-children for a plain text response), but not exhaustively verified either.
- **No real tutorial content, prompt-size, or `--add-file`/context-attachment testing** happened here by design — this harness's prompt is a fixed one-liner. Milestone 3's real prompt (potentially large: `AGENTS.md` + tutorial record + audit + references) is untested against `agy`'s actual argument-length and context-window behavior.
- **Authentication**: `agy` required no interactive login for this test, on this already-configured machine. Behavior on a machine where `agy` is not yet authenticated is unverified.
- Only one real `agy` call was made for this milestone's timing/behavior data — that's a single data point, not a distribution; real-world latency/variance is unconfirmed.

## 21. What Milestone 3 Will Change

- Replace the fixed harness prompt with a real, `promptBuilder.js`-assembled tutorial-writing prompt (`AGENTS.md` + tutorial record + audit + original tutorial + Maker ESP32 references + template + user instructions), passed to the same `agyRunner.launch()` via `-p` — first needs the still-open question from §20 (prompt size / argument-length limits) resolved.
- Replace `--output-format text` exact-string validation with real structural/content validation of a full Markdown tutorial draft.
- Only then does `tutorialWriter.js` (still to be built) promote a validated result into `revamped-tutorials/<tutorial-id>.md` and patch `data/tutorials.json` — nothing in Milestone 3A writes to either location, by design.
- QA Review / Revision Required / Revising states get spliced into the state sequence once a QA provider (starting with a no-op, later OpenAI) exists — not present yet.
- StubWriter gets replaced for the real "Revamp Tutorial" flow only once the above is proven — Milestone 3A intentionally leaves it wired to StubWriter throughout.
