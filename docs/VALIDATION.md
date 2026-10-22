# 0.5.0 pre-release validation record

Original validation: 2026-10-22 13:37:10 UTC. Environment: Windows, Node.js 26.7.0, isolated Headless Chromium 156.0.8078.4.

Release preparation reran the same suites in a separate checkout at 2026-10-22 20:02:45 UTC: 80 unit tests, 24 existing UI groups and 20 candidate test nodes passed; all commands exited 0. All 14 extension files still matched the validated candidate hashes. This rerun did not change the installed extension or the NOT RUN scope.

Implementation, local regression and independent review were completed on the date above for the 0.5.0 candidate code used by this experimental pre-release. The installed extension, real vocabulary and settings were not changed. At that validation, the original manifest remained 0.4.0 and all 10 original extension files matched their initial SHA-256 hashes; the candidate manifest was 0.5.0. **The version actually loaded in the user's Chrome was not reconfirmed.** Release documentation and packaging do not add live-browser acceptance.

## Executed

| Check | Result | Scope |
| --- | --- | --- |
| npm test | 80 / 80 PASS | Existing logic, background protocol, 20 vocabulary-store regressions, overlapping cues and per-language timeouts |
| npm run test:ui | 24 / 24 groups PASS | Complete UI, offsets, navigation, replay, saved timestamps, cancellation and import/export |
| Caption candidate tests | 5 VM cases + 7 browser groups PASS | Expired URLs, bounded native recovery, successful-track retention, import races, layout reset, small player and full text |
| Interface language tests | 6 / 6 PASS | Browser default, explicit override, saved preference/reactivation, bilingual switching and user-text protection |
| Learning candidate tests | 15 / 15 groups PASS | Two-page concurrency, persistence protection, note clearing, selection/copy, search, pagination, restore and deletion |

npm run test:candidate runs the final three suites and reports 20 / 20 Node test nodes: caption tests include a parent node and the learning script is one node containing 15 internal scenarios. These counts are not additive independent acceptance counts. Final commands exit 0 with no final failures or skips; browser fixtures report no page errors.

## Specific evidence

- Two isolated pages share the actual vocabulary-store repository. Concurrent additions and note/mastery/dictionary patches preserve unrelated changes. A separate VM test checks message senders. Browser transport and storage APIs are mocked.
- Actual mouse dragging selects Chinese meanings beneath an ancestor with user-select:none, using candidate CSS. Copy success and rejection use a mocked clipboard; the system clipboard is untouched.
- A fresh dictionary card retains Chinese results after the English request reaches its real default five-second timeout. Provider responses are synthetic; live Wiktionary availability was not tested.
- A valid 5000-entry book is 3,556,671 bytes in normalized storage and exports to a 4,315,710-byte JSON file. After preview, it restores into empty fixture storage with revision 0 becoming 1. The input-file limit is 16 MiB; normalized vocabulary is limited to 4 MiB / 5000 entries.
- Submitted restore disables and guards cancel/file replacement, including forced events, while retaining the completion result. Invalid versions, entries, unsafe sources, oversized files and excessive counts cannot write.
- Automatic recovery retains successful data for the same video and track selection. Alternating failures are tested in both directions: the successful track is neither fetched again nor blanked. Manual Reload deliberately refetches network captions and retains local imports.
- Language switching translates controls and status only; captions, meanings, sentences, words, notes and confirmation word/timestamp values remain unchanged.

Independent review found three issues: oversized self-exported backups, cancellation after submitted restore, and loss of successful captions during automatic recovery. All three were fixed and independently rechecked.

## NOT RUN and limits

The validation environment had no supported interface for reading the user's Chrome tabs. Device connectivity and file/process tools did not provide that browser interface. No extension-management page was operated and no repeated installation or permission request was made.

**NOT RUN:** live YouTube caption retrieval/synchronization; real MV3 background/isolated-world integration; multi-tab writes in the installed extension; native YouTube fullscreen; natural next-video autoplay; browser-restart persistence; long/background/multiple-speed playback accuracy; and the system clipboard. Linux, Edge, other browser versions and CI were not run.

Fixture DOM Fullscreen, simulated navigation/autoplay and injecting saved objects into a fresh document validate isolated logic only. They do not establish live acceptance. Tests use no personal profiles, real vocabulary, real caption authorization data or external network traffic.

Replacing the current installation needs separate confirmation, a current JSON backup and refreshing all YouTube tabs still running the old version; see [installation guidance](INSTALL.md).
