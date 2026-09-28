# Tutorial Technical Validation

## Tutorial Information

**Title:** Program Telegram Bot on ESP32 Board

**URL:** https://my.cytron.io/tutorial/interface-water-flow-sensor-using-esp32-board-2

**Audit Date:** 2026-09-28

**Target Level:** Beginner (as stated on the page)

**Category:** IoT / Messaging (page section: Wireless & IoT, tag: Telegram Bot)

**Author / Dates (from page):** Idris Zainal Abidin. Published 20 Jun 2019, last modified 28 Aug 2025.

> ⚠️ **URL/title mismatch:** The slug says `interface-water-flow-sensor-using-esp32-board-2`, but the page is **"Program Telegram Bot on ESP32 Board"**. It has nothing to do with water flow sensors.
>
> **Audit history:** The previous audit (2026-08-13) was written from the URL slug. It described a YF-S201 water-flow tutorial ("likely YF-S201", "may show direct wiring") that doesn't exist on this page. **All of its findings are withdrawn.** This audit replaces it and is based on a saved copy of the live page (see Evidence). The old version is kept in git history.

---

## Tutorial Objective

The page says it shows how to "program Telegram Bot using ESP32 board" on a **NodeMCU ESP32**. It follows earlier Cytron Telegram Bot tutorials for Raspberry Pi and Maker UNO.

All of the instructional content is in an embedded **YouTube video** (`5hyflMni6HM`). The video title marks it as Bahasa Malaysia ("[BM]").

---

## What the Page Actually Contains

Taken from the saved page (2026-09-28). This is the entire article body:

| Section | Content |
|---|---|
| Introduction | Two sentences, plus two "read first" links: *Data Logging Using Favoriot IoT Platform and ESP32* and *Controlling SmartDrive40 Using ESP32* |
| Video | "This video will show you how to program Telegram Bot using ESP32 board." plus the embedded YouTube video |
| Hardware Preparation | NodeMCU ESP32 (product link) |
| Thank You | Reference: Instructables *Automation With Telegram and ESP32*, and a link to the Cytron Technical Forum |

**Not on the page:**

- Sample code or a Gist
- Library names
- @BotFather or Chat ID steps
- Board or Arduino IDE setup
- Wiring or GPIO pins
- Bot commands
- Testing steps or troubleshooting

---

## Overall Validity

**Grade:** E

**Decision:** Replace

**Priority:** P1

**Revamp Scope:** Small (retire and redirect). A full rewrite at this URL would be Large and isn't recommended.

**Main Recommendation:** Retire this page and redirect readers to the Maker ESP32 revamp of *Control ESP32 Outputs with Telegram*. It already covers the same goal with complete, current instructions.

**Why grade E (impractical), not "technically wrong":** No incorrect technical claim was found, because the page makes almost none. As a written tutorial it can't be followed: every step lives in a 2019 video that was not reviewed. The video's content (library, code, certificate handling) is **NEEDS VERIFICATION**, so this grade covers the written page only.

---

## Score

| Metric | Score |
| ------ | ----- |
| Technical Accuracy | 5/10 (no errors found; almost nothing to verify) |
| Current Validity | 3/10 |
| ESP32 Compatibility | 5/10 (NodeMCU ESP32; the Telegram approach doesn't depend on the board) |
| Code Quality | 1/10 (no code on the page) |
| Completeness | 1/10 |
| Beginner Friendliness | 2/10 |
| Reproducibility | 1/10 |

---

## Top 5 Issues

1. **[P1] No written instructions or code.** The page has no code, libraries, @BotFather or Chat ID steps, or testing. A reader can't build the project from the page.
2. **[P1] Wrong URL slug.** The URL says "interface water flow sensor ... board-2" but the page is about a Telegram bot. This misleads readers and search engines, and caused the earlier wrong audit and schedule mapping.
3. **[P2] Only content is a 2019 video in Bahasa Malaysia.** The English page depends entirely on a BM-language video from 2019. The video wasn't reviewed.
4. **[P2] Duplicates a newer, complete tutorial.** *Control ESP32 Outputs with Telegram* (already revamped for Maker ESP32) and *How to Create a Telegram Bot, Get the API Key and Chat ID* cover the same ground properly.
5. **[P3] Unrelated prerequisites and old hardware.** The "read first" links (Favoriot data logging, SmartDrive40 motor driver) aren't needed for a Telegram bot. The hardware is NodeMCU ESP32 rather than Maker ESP32.

---

## Technical Validation

### Telegram Bot setup (current official process)

- Bots are still created through **@BotFather** with `/newbot`, which returns a bot token. The token must be kept secret and can be revoked through @BotFather ([Telegram Bot tutorial](https://core.telegram.org/bots/tutorial)).
- The page itself doesn't describe any of this.

### ESP32 Telegram library

- The page names no library. The reference (Instructables) and the video may use one, but this is unverified.
- The library Cytron uses elsewhere, **UniversalTelegramBot** (Brian Lough), is still available. Its latest release is **V1.3.0 (8 Nov 2020)** and it has ESP32 examples ([GitHub](https://github.com/witnessmenow/Universal-Arduino-Telegram-Bot)). It depends on **ArduinoJson**.
- The revamped *Control ESP32 Outputs with Telegram* already documents the current setup for Maker ESP32. That includes `WiFiClientSecure` with `TELEGRAM_CERTIFICATE_ROOT`, filtering by authorised `CHAT_ID`, and non-blocking polling.

### Hardware

- **NodeMCU ESP32** only. No external parts or GPIOs are mentioned on the page.
- A Telegram bot works on Maker ESP32 without hardware changes. The onboard GPIO LEDs (e.g. GPIO2) give visible output without any wiring (Maker ESP32 AI Coding Pack, Datasheet Rev 1.1).

### Installation

- Not covered on the page: no Arduino IDE, board package or library installation steps.

### External Links

| Link | Status | Notes |
|---|---|---|
| YouTube video `5hyflMni6HM` | Working (shows in search results as "Program Telegram Bot on ESP32 Board [BM]") | Content not reviewed |
| NodeMCU ESP32 product page | Unknown | cytron.io blocks automated checks. Check manually. |
| Data Logging Using Favoriot IoT Platform and ESP32 | Unknown | Not relevant to a Telegram bot |
| Controlling SmartDrive40 Using ESP32 | Unknown | Not relevant to a Telegram bot |
| Instructables: Automation With Telegram and ESP32 | Working (page loads; body not machine-readable) | Third-party reference |
| Cytron Technical Forum | Unknown | Check manually |

### Page metadata (CMS)

- The `article:author` meta tag holds the tutorial URL instead of the author. This is a minor CMS data error.

### Beginner Usability

- It's labelled Beginner, but a beginner gets no written steps, and the only guidance is a video in Bahasa Malaysia.

### Security

- Can't be assessed: the page shows no code, so there's no way to see how the bot token or Wi-Fi credentials are handled.
- Any replacement must use placeholders and chat-ID filtering. The revamped Telegram tutorial already does both.

---

## Priority Issues

| Priority | Tutorial Section | Problem | Severity | Recommended Change |
| -------- | ---------------- | ------- | -------- | ------------------ |
| P1 | Whole page | No written steps or code | High | Retire and redirect to *Control ESP32 Outputs with Telegram* |
| P1 | URL | Slug says water flow sensor | High | Redirect. If the page is kept, give it a correct slug. |
| P2 | Video | Only content; 2019; Bahasa Malaysia | Medium | Don't rely on it as the only instructions |
| P2 | Overlap | Duplicates revamped Telegram tutorial | Medium | Consolidate into the revamped tutorial |
| P3 | Introduction | Unrelated prerequisite links | Low | Remove if the page is kept |
| P3 | Hardware | NodeMCU ESP32 | Low | Maker ESP32 in any replacement |

---

## KEEP

- **Objective:** a beginner Telegram bot on ESP32 is still a valid, popular project. It's already covered by *Control ESP32 Outputs with Telegram*.
- **Video:** can be kept as an optional Bahasa Malaysia resource once someone has watched it and confirmed it still works.

---

## UPDATE

- **URL/redirect:** point this URL to *Control ESP32 Outputs with Telegram* (https://my.cytron.io/tutorial/control-esp32-outputs-with-telegram).
- **Dashboard:** the record title is now corrected to "Program Telegram Bot on ESP32 Board" (done in this audit).

---

## REMOVE / REPLACE

- **This page:** retire it and replace it with *Control ESP32 Outputs with Telegram* (Maker ESP32 revamp, already Complete).
- **Prerequisite links** (Favoriot, SmartDrive40): remove them if the page is kept.

---

## Evidence

| Claim | Current Tutorial | Finding | Official Source | Recommended Change |
| ----- | ---------------- | ------- | --------------- | ------------------ |
| Page topic matches URL | URL slug says water flow sensor, part 2 | Page title, og:title and tag are "Program Telegram Bot on ESP32 Board" / "Telegram Bot" | Saved page `tmp/Program Telegram Bot on ESP32 Board.html` (2026-09-28); [cytron.io listing](https://www.cytron.io/tutorial/interface-water-flow-sensor-using-esp32-board-2) | Redirect or give it a correct slug |
| Tutorial can be followed from the page | Intro, video, hardware, references only | No code, libraries, BotFather steps or tests on the page | Saved page (htmlExtractor output) | Replace |
| Bot creation process | Not described | @BotFather `/newbot` issues the token; keep the token secret | [Telegram Bot tutorial](https://core.telegram.org/bots/tutorial) | Covered by *How to Create a Telegram Bot...* |
| ESP32 Telegram library status | Not named | UniversalTelegramBot V1.3.0 (Nov 2020), ESP32 examples, needs ArduinoJson | [Universal-Arduino-Telegram-Bot](https://github.com/witnessmenow/Universal-Arduino-Telegram-Bot) | Use in any replacement (already used by the revamped tutorial) |
| Video language | Video only | YouTube title shows "[BM]" | [YouTube](https://www.youtube.com/watch?v=5hyflMni6HM) | Don't use as the only English instructions |
| Newer equivalent exists | n/a | *Control ESP32 Outputs with Telegram* is Complete in this dashboard, with a Maker ESP32 Final Output | `data/tutorials.json`, `revamped-tutorials/control-esp32-outputs-with-telegram.md` | Redirect |

---

## Recommended Action Flow

1. Confirm with the web/CMS team that the page can be retired.
2. Set up a 301 redirect from this URL to *Control ESP32 Outputs with Telegram*.
3. Optionally, link the BM video from the revamped tutorial as a "Bahasa Malaysia video" resource, after someone has watched it and confirmed it still works.
4. Fix the CMS `article:author` metadata if the page stays live.

---

## Outstanding Verification

- Watch the video (`5hyflMni6HM`) to confirm which library and code it uses, and whether it still works with the current Telegram API and ESP32 core.
- Check the NodeMCU ESP32 product link, the prerequisite links and the forum link by hand (cytron.io blocks automated checks).
- Human decision needed on schedule and dates. The record keeps its old `preparationDate` (2026-09-01), `makerEsp32PublishDate` (2026-09-20) and `publishDate` (2026-09-22), which were set when it was believed to be a water-flow tutorial. `service/publishSchedule.js` currently leaves "Program Telegram Bot on ESP32 Board" unscheduled, because it was thought not to match this record. It now does match.

---

## FINAL RECOMMENDATION

**Decision:** Replace

**Overall Validity:** E - Invalid (impractical as a written tutorial; no technical errors found)

**Top 5 Issues:**

1. No written instructions or code on the page
2. URL slug says water flow sensor, but the page is about a Telegram bot
3. Only content is a 2019 video in Bahasa Malaysia
4. Duplicates the revamped *Control ESP32 Outputs with Telegram*
5. Unrelated prerequisites and NodeMCU ESP32 hardware

**Estimated Revamp Scope:** Small (retire and redirect)

**Most Important Action:** Retire the page and redirect it to *Control ESP32 Outputs with Telegram*.

---

*Audit completed by Claude on 2026-09-28 from a saved copy of the live page. Supersedes the 2026-08-13 audit, which was based only on the URL slug.*
