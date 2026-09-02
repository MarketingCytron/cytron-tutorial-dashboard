# Tutorial Revamp Agent — Milestone 3C-A: Original Tutorial Retrieval Proof

Status: **Implemented and run for real against `esp32-digital-clock`.** No tutorial was generated, `agy` was never invoked, and `revamped-tutorials/`, `data/tutorials.json`, `audits/`, and `references/` remain untouched.

This closes one of Milestone 3B's two blockers. The other (Cytron Tutorial Template PDF) is explicitly **not** addressed here, per instruction — it will be handled separately, after this one was proven.

---

## Original Tutorial: REQUIRED

| | |
|---|---|
| **Source** | The tutorial record's own `url` field in `data/tutorials.json` — never a browser-supplied value |
| **Acquisition** | Deterministic bridge fetch (`originalTutorialSource.js`), with a strict, per-hop-revalidated URL policy (`urlPolicy.js`) |
| **Extraction** | Deterministic HTML parsing (`htmlExtractor.js`, using `cheerio` — no LLM, no OCR, no browser automation) |
| **Persistence** | Job-local, immutable snapshot under `service/jobs/<jobId>/sources/` — one fetch per job, never refetched mid-job |
| **Browser control** | None — the browser never provides a URL, a hostname, a selector, or an output path |

## Source URL Resolution

`tutorialId` → (re-validated against `^[a-z0-9-]+$`) → `tutorialRepo.findTutorialRecord(tutorialId)` → `tutorial.url`. The URL is **never** hardcoded and **never** browser-supplied — confirmed for the test case: `esp32-digital-clock`'s `url` resolves to `https://my.cytron.io/tutorial/esp32-digital-clock` purely by reading `data/tutorials.json`.

## Fetch Implementation

`originalTutorialSource.fetchWithPolicy()`:
- Manual redirect handling (`redirect: 'manual'`) — **every** hop, including the first request, is independently re-validated against the full URL policy before being fetched. Nothing about a redirect target is trusted more than the original URL.
- 20-second timeout via `AbortController`.
- 5 MB response-size cap, enforced by reading the stream chunk-by-chunk and aborting as soon as the running total exceeds the limit — never buffers an oversized body first.
- Requires `Content-Type` to include `text/html`.
- Fixed `User-Agent: CytronTutorialRevampBridge/0.1 (local development tool)` and `Accept: text/html`.
- Every failure mode returns a distinct `{ok:false, code, message}` — `invalid_url`, `non_https`, `credentials_in_url`, `localhost_rejected`, `hostname_not_approved`, `port_not_allowed`, `dns_failure`, `private_ip_target`, `timeout`, `network_error`, `redirect_missing_location`, `redirect_malformed_location`, `http_4xx`, `http_5xx`, `unexpected_content_type`, `empty_body`, `response_too_large`, `too_many_redirects` — nothing fails silently or falls through to "continue anyway."

## Domain / SSRF Controls

`urlPolicy.js`, applied to the initial URL **and every redirect hop**:

1. **HTTPS only.**
2. **No embedded credentials** (`user:pass@host`).
3. **`localhost` rejected** explicitly, by name.
4. **Hostname allow-list**: `APPROVED_HOSTNAMES = ['my.cytron.io']` — a **fixed code constant**, deliberately derived once by inspecting every `tutorial.url` in the current dataset (all 30 use exactly this host), and deliberately **never read from `data/tutorials.json` at runtime** — a compromised or malformed data entry can never expand what hosts this bridge is willing to fetch.
5. **Default port only** (no `:8443`-style overrides).
6. **DNS-rebinding defense**: the hostname is resolved via `dns.lookup(..., {all:true})` and every returned address is checked against a private/loopback/link-local IP range table (RFC1918, `127.0.0.0/8`, `169.254.0.0/16`, IPv6 `::1`/`fe80::`/`fc00::/7`, including IPv4-mapped IPv6) — rejected if any resolved address is private, even though the hostname itself is on the approved list.
7. **Max 3 redirects**, and a redirect to a host outside the approved list is rejected at the next hop's validation — never silently followed.

This is intentionally **not** a generic URL fetcher: there is no code path anywhere that accepts an arbitrary URL, hostname, or selector from an external caller — `retrieveOriginalTutorial(jobId, tutorialId)` is the only public entry point, and `tutorialId` is the only variable input.

## Article Extraction

Inspected the real HTML for `esp32-digital-clock` directly before writing any extraction code. Finding: the page (an OpenCart "Extended Blog" module) puts the entire article body inside `<div id="blog-description">`, itself inside `<div class="post_content">`; that div's only siblings are an `<hr>` and a "Was this helpful? Yes/No" widget — confirmed to be excluded automatically since extraction only descends into the container's own children, never its siblings.

`htmlExtractor.js` selector priority: `#blog-description`, then `.post_content` as a fallback for pages that might lack the inner id. If neither exists, extraction fails explicitly rather than falling back to `<body>` (which would pull in navigation/footer/recommended-products chrome).

The DOM is walked recursively into Markdown: headings (`h1`–`h6` → `#`–`######`), paragraphs, ordered/unordered lists (including nesting), `<pre><code>` → fenced code blocks (language guessed from a `language-*` class if present), tables → Markdown tables, images → `![alt](resolved-absolute-src)`, links → `[text](resolved-absolute-href)` (relative URLs resolved against the page's own URL), `<strong>`/`<em>`/inline `<code>`, and `<script>`/`<style>`/`<noscript>`/`<iframe>` skipped entirely. This is a fixed, inspectable algorithm (`service/htmlExtractor.js`) — not positional regex, not an LLM, not OCR.

## Files Created

- `service/tutorialRepo.js` — shared tutorial-record lookup (factored out of `tutorialContext.js` to avoid a circular require with this milestone's new module)
- `service/urlPolicy.js` — SSRF/domain/redirect policy
- `service/htmlExtractor.js` — cheerio-based deterministic extraction
- `service/originalTutorialSource.js` — fetch + extract + snapshot orchestrator
- `service/package.json` — declares the one new dependency (`cheerio ^1.2.0`); `service/package-lock.json` generated by `npm install`
- `docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3C-A.md` (this file)

## Files Modified

- `service/tutorialContext.js` — now takes an optional `jobId`, and (only if a snapshot already exists for that exact job) includes the retrieved original-tutorial Markdown instead of the "missing" placeholder; uses the shared `tutorialRepo.js` instead of its own inline copy of the lookup/slug-pattern logic
- `service/promptBuilder.js` — accepts and forwards `jobId`; the `ORIGINAL TUTORIAL CONTENT` section now renders real content when available *(renamed to `CURRENT TUTORIAL SOURCE SNAPSHOT` in Milestone 3C-B, precisely because of the discovery below — that heading name no longer exists in the codebase)*
- `.gitignore` — added `service/node_modules/` (dependency install output; `package.json`/`package-lock.json` are meant to be committed once staged)
- `docs/TUTORIAL_REVAMP_AGENT_V1_ARCHITECTURE.md` — §18 item 3 updated to record this as resolved (see that file)

## Real esp32-digital-clock Retrieval

```
GET https://my.cytron.io/tutorial/esp32-digital-clock
httpStatus: 200
contentType: text/html; charset=utf-8
rawBytes: 58,255
extractedCharacters: 6,701
usedSelector: #blog-description
headingCount: 19
sha256: 8dd017bf981aa1ff59ffa7ecbc160af86bcb7e98e62f52c06dc1c48e8af6bb2c
duration: ~890ms
```

**Important, honest observation, not asked for but discovered during this work**: the live page's content is **not** the "pre-revamp original" the audit (dated 2026-08-12) describes. The audit's own change-log context (and the approved golden `revamped-tutorials/esp32-digital-clock.md`) indicate the original used a 16x2 LCD and NodeMCU/Robo ESP32; the live page fetched today contains **21 mentions of "Maker ESP32" and 34 of "OLED"/8 of "SSD1306", and zero mentions of NodeMCU, Robo ESP32, rgb_lcd, 16x2, or LiquidCrystal** — i.e., the live site currently already reads like the *revamped* version, not the original one. This doesn't indicate a bug in retrieval (the fetch and extraction are working exactly as designed, faithfully reproducing whatever is actually live) — it's a fact about the current state of the live site that matters for Milestone 3 planning: "the original tutorial body," for this specific test case, no longer represents what the audit was written against. Flagged here rather than silently treated as unremarkable.

## Extraction Quality

- **Headings** (19, all preserved in order): Introduction, Prerequisites, Objective, List of Components, System Diagram & Wiring, Software Setup, Install Adafruit SSD1306 Library, WiFi Configuration, Timezone Configuration, Sample Code, How the Code Works, Testing & Validation, Expected Result, Troubleshooting & Extra Tips, and 5 troubleshooting sub-headings.
- **Approximate extracted character count**: 6,701.
- **Code blocks preserved**: yes — 2 fenced code blocks (Wi-Fi credential placeholders, timezone offset constants), verbatim.
- **Lists preserved**: yes — numbered component list (with product links intact) and multiple bulleted troubleshooting/step lists, including one nested case.
- **Links preserved**: yes — all 6 in-article links resolved to absolute `https://my.cytron.io/...` URLs.
- **Table preserved**: yes — the OLED-to-Maker-ESP32 wiring table converted to a correct Markdown table.
- **Obvious content missing**: none identified — the extraction covers the full article from the "Introduction" heading through "Your project is ready!," matching what a human reading the live page would see.
- **Obvious website noise included**: none — no navigation, footer, "Was this helpful?" widget, comments, or related-products content leaked in.
- **Imperfections found, reported honestly rather than hidden**:
  1. One list item renders as `[STEMMA QT / Qwiic JST-SH 4-Pin Cable with Female Sockets 150mm](...)) x1` with a stray extra `)`. Traced directly to the live page's own raw HTML (`...>Sockets 150mm</a>) x1</p>`) — the source page itself has an orphaned closing parenthesis (missing its opening `(or ` text). This is faithful extraction of an existing minor authoring quirk on the live site, not an extractor defect.
  2. The source HTML uses `<em>`/`<i>` tags (rendered here as `*italic*`) for several inline code-like references (function names, variable names) rather than `<code>` — faithfully reflects the source's own markup choice; readable but not semantically ideal.
  3. A few inline emphasis spans carry a stray leading/trailing space from the source HTML (e.g. `*ssid *and *password*`), because whitespace inside an inline tag isn't trimmed before the `*...*` wrapper is added. Minor, cosmetic, does not obscure meaning.
  4. Two images (a decorative clock graphic and a Telegram community banner) appear as bare `![]()` lines with no `alt` text, because the source `<img>` tags have empty `alt` attributes — extraction correctly reports what's there.

None of these affect meaning or completeness; they are noted so the extractor is not overstated as flawless.

## Snapshot Metadata

`service/jobs/<jobId>/sources/original-tutorial-meta.json` (safe fields only, no filesystem paths, no cookies, no auth headers):

```json
{
  "tutorialId": "esp32-digital-clock",
  "sourceUrl": "https://my.cytron.io/tutorial/esp32-digital-clock",
  "resolvedUrl": "https://my.cytron.io/tutorial/esp32-digital-clock",
  "fetchedAt": "2026-09-01T16:13:53.014Z",
  "httpStatus": 200,
  "contentType": "text/html; charset=utf-8",
  "rawBytes": 58255,
  "extractedCharacters": 6701,
  "sha256": "8dd017bf981aa1ff59ffa7ecbc160af86bcb7e98e62f52c06dc1c48e8af6bb2c",
  "extractorVersion": "3C-A.1",
  "usedSelector": "#blog-description",
  "headingCount": 19
}
```

`service/jobs/<jobId>/sources/original-tutorial.html` (the raw fetched HTML) and `original-tutorial.md` (the normalized Markdown `promptBuilder.js` consumes) sit alongside it. All three are gitignored (`service/jobs/`).

## PromptBuilder Integration

`tutorialContext.resolveContext(tutorialId, userInstructions, jobId)` now checks `originalTutorialSource.readSnapshot(jobId)` — **read-only, no fetch** — before falling back to the "missing" placeholder. Re-ran the same `esp32-digital-clock` + `LCD -> OLED / NodeMCU ESP32 -> Maker ESP32 / Do not use Robo ESP32` dry run from Milestone 3B, this time with a real retrieved snapshot:

```
manifest.status: Blocked
manifest.missingRequired: ["Cytron Tutorial Template (raw PDF content)"]
promptCharacters: 53362  (was 47099 before this milestone)
promptUtf8Bytes: 53526
```

**Exactly one** missing required source remains — the Template PDF, which this milestone was explicitly told not to solve. This is the correct, expected result.

## Tests

All run against mocks/local fixtures except the one real retrieval (documented above), per instructions — no repeated live requests to `my.cytron.io`:

| # | Case | Result |
|---|---|---|
| 3 | Traversal `tutorialId` (`../../etc/passwd`) | Rejected before any fetch attempt; mock fetch never called |
| 4 | Nonexistent tutorial ID | `tutorial_not_found` |
| 5 | Tutorial record missing `url` (fixture) | `source_url_missing`, before any fetch |
| 6 | Non-HTTPS URL | `non_https` |
| 7 | Non-approved hostname | `hostname_not_approved` |
| 7b | Credentials in URL | `credentials_in_url` |
| 7c | `localhost` | `localhost_rejected` |
| 7d | Non-default port | `port_not_allowed` |
| 7e | Private/loopback IP classification (direct) | 127.0.0.1, 10.x, 192.168.x, 172.16-31.x, 169.254.x, `::1` → private; 8.8.8.8 → not private |
| 8 | Redirect to a non-approved host | Rejected at the second hop's revalidation; the malicious target is never actually fetched (call count verified = 1) |
| 9 | Timeout (mocked `AbortError`) | `timeout` |
| 10 | HTTP 404 / 500 | `http_4xx` / `http_5xx` respectively |
| 11 | Unexpected content type (`application/json`) | `unexpected_content_type` |
| 12 | Oversized response (6 MB fed in 1 MB chunks) | `response_too_large`, aborted mid-stream rather than fully buffered |
| 13 | Snapshot path containment | Snapshot directory confirmed to always resolve under `config.jobsDir` and include the exact `jobId` |
| 14 | `promptBuilder` reuses an existing snapshot | A pre-written fake snapshot was picked up with **zero** fetch calls made |

**17 of 17 passed.**

## Existing Data Safety

`git status --short` for `data/tutorials.json`, `revamped-tutorials/`, `audits/` — empty (untouched) after the real retrieval and all 17 tests. `references/` remains untracked/untouched. `node scripts/validate-data.js` → **30 tutorials, 0 errors, 0 warnings**.

## Cache Policy

Snapshots live only inside `service/jobs/<jobId>/sources/` and are fully gitignored — **no repository-wide permanent tutorial archive was created**, per instructions.

Whether a permanent, cross-job source archive would be useful later: **plausibly yes**, for two reasons — (1) avoiding a redundant re-fetch if the same tutorial is revamped again later, and (2) preserving today's snapshot as evidence of what the live site said at audit/revamp time (useful given the discrepancy noted above, where the live page has apparently already changed since the audit was written). Not implemented now, since "one job → one snapshot" was the explicit scope and a shared archive raises its own questions (staleness policy, invalidation, whether a stale cached copy could ever be preferred over a fresh fetch) that weren't asked to be solved here.

## Known Limitations / Risks

1. **Extraction is tuned to one page's real structure** (`#blog-description` / `.post_content`), verified against exactly one tutorial page. Other `my.cytron.io` tutorial pages were not inspected — the selector priority list and the "fail explicitly if neither matches" behavior should make a structurally-different page fail loudly rather than silently mis-extract, but this hasn't been tested against a second real page.
2. **The live-vs-audit content mismatch noted above** is a real-world data-consistency question outside this milestone's scope to resolve — flagged for whoever plans Milestone 3's real generation, not fixed here.
3. `cheerio` is now a real dependency (`service/package.json` + `node_modules/`, gitignored). This is the first non-zero-dependency code in this project's `service/` — a deliberate, reviewed addition per this milestone's explicit instruction, not an ambient one.
4. DNS-rebinding defense checks the resolved IP at request time; a sufficiently well-timed rebinding attack (change DNS between the check and the actual TCP connection) is a known, generally-accepted residual risk of this mitigation style and wasn't specifically hardened further (e.g., pinning the resolved IP into the request) — noted for completeness, not treated as urgent given the fixed, tiny hostname allow-list.
