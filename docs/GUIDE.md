# Usage and language guide

For **0.5.0 experimental pre-release**. [Home](../README.md) · [简体中文](GUIDE.zh-CN.md)

## Language capabilities

| Setting | Current behavior | User choice |
| --- | --- | --- |
| Interface: menus, buttons, messages | Follow browser by default; Chinese browser locales use Simplified Chinese and other locales use English | Follow browser, Simplified Chinese or English in Settings |
| Source subtitles | Available YouTube tracks for the current video | Choose a source track in Settings |
| Translated subtitles | Prefer an existing target-language track; otherwise try a translation offered by YouTube | Choose a target from the video's available languages |
| Dictionary definitions | Primary language follows the subtitle target | No separate selector; only English source words with Chinese/English definitions |

Interface auto-selection reads the browser UI language, not the operating-system language directly. A browser may itself follow the computer setting. A manual interface choice overrides auto-selection. Changing interface language does not translate captions, retrieved definitions or handwritten notes. Automatic caption translation is a separate capability.

## Defaults and storage

The initial subtitle target is Simplified Chinese (zh-Hans), not a language inferred from the computer. A saved local target takes precedence. If the saved target is absent from the current video's metadata, it remains selected and is labelled as unavailable for that video; the extension does not silently switch languages. A target appearing in the selector does not guarantee that content is available. Source selection first uses the user's current choice or a briefly remembered track for the same video, then YouTube's metadata default; without a valid default, it prefers a non-ASR track, then the first available track.

Interface choice, target preferences and layout are written to browser-local storage. Cross-browser sync is not implemented. Real browser-restart persistence remains NOT RUN. Reset layout restores the two layers' appearance; it does not reset language choices, timing offsets, visibility, layer order or sentence-end pause.

## Choosing languages and reading definitions

1. After deliberately installing or updating, open an ordinary YouTube watch page, click this extension's icon and check its Settings footer for version 0.5.0. The downloaded manifest alone does not prove the running version.
2. Choose Interface language: Follow browser, Simplified Chinese or English.
3. Choose Source caption track and Translation language. Source defaults to the bottom and translation to the top; Swap source and translation reverses them.
4. Keep the desired layers visible. Drag mode displays position examples; turn it off to inspect actual captions. If text is clipped, use the full-text entry.
5. Click a word to pause and open its card. Supported English source words can be queried; save notes or vocabulary deliberately.

| Subtitle target for an English source word | Dictionary card |
| --- | --- |
| Chinese | Chinese definition plus English source explanation; original Chinese script is retained |
| English | One combined English definition/source explanation section |
| Another language | Unsupported-target notice plus any available English source explanation |

Clicking the translated layer uses that layer's language instead of assuming it is English. Non-English source words receive an unsupported-source message. Imported source captions have no confirmed source language and are marked unknown for lookup.

Definitions can be selected with the mouse. The card's Copy button includes the displayed definition, source and licence; a clipboard failure prompts manual selection/copy. Each language request has its own five-second timeout. A failed language retains the other language's successful result and, when available, previously saved definitions with a notice. The definitions are retrieved from dictionaries, not machine-translated.

Target changes cancel pending lookup and switch the display; opening vocabulary, reviewing or restoring backups does not automatically query the provider.

## Features

| Feature | Scope |
| --- | --- |
| Two caption layers | Independent position, font size, background color/opacity, visibility and timing offsets; overlapping active caption text remains visible |
| Listening practice | Previous/next sentence, sentence replay, pause at sentence end and clickable sentence navigation |
| Local subtitle files | SRT/VTT import/export for the current video; no upload or automatic translation of imports |
| Vocabulary | Word, original sentence, video timestamp, handwritten notes, review, mastered state and replay |
| Vocabulary management | Search words/sentences/notes, 50-entry pages, confirmed single-entry deletion, JSON/CSV export and previewed JSON merge restore |
| Small players | Settings and word cards are mutually exclusive below 680 px player width; full text has its own view |
| Providers | YouTube captions/translations and public Wiktionary definitions |
| Pages | Desktop watch pages; no Shorts, livestreams, embedded or mobile pages |

A positive caption offset delays display; a negative value advances it. Navigation and replay use source timing. Saved vocabulary retains the original sentence and video-time bookmark.

## Notes and backup restore

A blank note can be saved deliberately, including after revealing a review card. Background writes are serialized and update individual fields, so another tab's unrelated note, mastery or dictionary change is retained. Read failures block saving until a successful retry. This behavior has isolated regression coverage; installed multi-tab MV3 integration remains NOT RUN.

Search the book by word, sentence or note, then use the page controls. Deleting an entry requires a separate confirmation. Export the current JSON before testing an update or restoring a backup.

To restore:

1. Open From JSON backup and optionally use Export current backup.
2. Choose a version 1–5 JSON backup, at most 16 MiB and 5000 entries.
3. Read the validation preview. Invalid entries, unsafe sources and conflicting IDs are rejected; no partial import is committed.
4. Click Merge restore. Only new entries are added; existing duplicate entries, notes and mastered state stay unchanged. This is not a whole-book replacement.
5. Wait for the result. Once submitted, changing the file or cancelling is disabled.

The resulting normalized vocabulary must fit 4 MiB / 5000 entries; an over-limit merge is rejected as a whole. Older valid oversized local books can still be read, exported and reduced. CSV is for reading or analysis, while JSON is the restore format. Exports contain personal notes and video bookmarks.

## Missing translations and imported files

Check layer visibility, selected languages and the Settings status message. Some videos have no suitable track or translation.

The two tracks recover independently. Automatic recovery retains a successful track while retrying the failed one; expired or empty native request URLs receive a bounded normal CC reload attempt. If the extension still reports no caption content, follow the notice to select the corresponding native CC track normally, then use Retry captions. Manual retry deliberately reloads network captions. These recovery paths do not establish reliable real retrieval on unseen videos or autoplay.

Importing translation does not cancel pending source loading. Same-video retry retains local imports; late network results do not replace them. Clear imported captions explicitly removes imports, and navigating to another video clears them.

After a full page refresh, click the extension icon again. Updating does not happen automatically. Before changing the working installation, export JSON and keep the extension identity. After an approved update, refresh **all** YouTube tabs still running old code before enabling the new version; old 0.4.0 pages still save whole-book snapshots. See [installation](INSTALL.md).

## Validation and documentation

The 2026-10-22 validation record reports **80 unit tests, 24 existing isolated UI groups and 20 candidate test nodes** passing. Candidate nodes cover 5 VM cases, 7 caption browser groups, 6 interface-language tests and a learning script with 15 internal groups; these are nested counts, not additive acceptance totals. See [validation](VALIDATION.md) for the exact scope.

Real YouTube retrieval/synchronization, installed MV3 background/isolated-world integration, installed multi-tab writes, native fullscreen, natural autoplay, real browser-restart persistence and actual long/background/multiple-speed playback accuracy remain **NOT RUN**. The system clipboard, Linux, Edge and CI are also NOT RUN. Publishing the same candidate does not add testing evidence.

| Topic | Documentation |
| --- | --- |
| Download, installation and updates | [Installation](INSTALL.md) · [v0.5.0 pre-release](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) |
| Local data and network requests | [Privacy](PRIVACY.md) |
| Code and dictionary text licences | [Licensing](LICENSING.md) |
| Evidence and outstanding checks | [Validation](VALIDATION.md) |
| Tests and packaging | [Development](DEVELOPMENT.md) |
| Version changes | [Changelog](../CHANGELOG.md) |

The v0.4.0 release ZIP files remain historical snapshots. The v0.5.0 ZIP filenames retain “candidate” to reflect incomplete installed-browser acceptance.
