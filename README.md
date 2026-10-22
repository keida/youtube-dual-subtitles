# YouTube Dual Subtitles

<!-- download-counts:start -->
[![All Release asset file downloads](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/total?label=Release%20asset%20downloads)](https://github.com/keida/youtube-dual-subtitles/releases) [![v0.5.0 plugin ZIP downloads](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/v0.5.0/YouTube-Dual-Subtitles-0.5.0-candidate-extension.zip?label=v0.5.0%20plugin%20downloads&displayAssetName=false)](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) [![v0.4.0 plugin ZIP downloads](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/v0.4.0/YouTube-Dual-Subtitles-Extension-0.4.0.zip?label=v0.4.0%20plugin%20downloads&displayAssetName=false)](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.4.0)

Counts are file download events, not unique people or installations. The total includes uploaded Release assets (extension ZIP, packaged source ZIP, validation reports and checksums); each plugin badge counts its named version's extension ZIP separately. GitHub-generated Source code ZIP/tar.gz archives are outside these asset counts. Badge caching can delay updates.
<!-- download-counts:end -->

[简体中文](README.zh-CN.md) · [v0.5.0 pre-release](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) · [Release notes](RELEASE_NOTES.md) · [Changelog](CHANGELOG.md)

**0.5.0 is an experimental pre-release.** It contains the locally validated candidate code. Downloading it does not update an existing 0.4.0 installation or overwrite browser data. The version in this source package does not establish which version a browser is running.

A Chrome / Edge Manifest V3 extension for ordinary YouTube watch pages. Source captions default to the bottom and translations to the top. Each layer has its own position, size, background, visibility and timing offset. Captions and translations depend on what YouTube provides for the current accessible video.

## Documentation

[Usage and language guide](docs/GUIDE.md) · [Installation](docs/INSTALL.md) · [Privacy](docs/PRIVACY.md) · [Licensing](docs/LICENSING.md) · [Validation](docs/VALIDATION.md) · [Development](docs/DEVELOPMENT.md)

## What changed

- Vocabulary writes now run through a serial background queue and update individual fields, addressing competing writes from multiple tabs. Read failures block saving until a successful retry.
- Dictionary text can be selected. Copy buttons include the definition, source and licence. Each dictionary language has its own timeout, so a failed language does not discard another language's result.
- Caption tracks recover independently. Expired or empty native requests receive one bounded normal CC reload attempt; imported translation does not cancel source loading.
- Clearing a note saves the empty value. Overlapping captions keep still-active text visible. Reset layout changes appearance only.
- Narrow players show one settings/word panel at a time; clipped captions have a full-text view.
- Vocabulary adds search, 50-entry pages, confirmed single-entry deletion and previewed JSON merge restore.

These changes have local regression coverage. See [validation](docs/VALIDATION.md) for the completed checks and NOT RUN items. Real YouTube, native fullscreen, natural autoplay and persistence across an actual browser restart are not established by isolated browser tests.

## Three separate language choices

**Interface:** Settings → Interface language offers Follow browser, Simplified Chinese and English. Follow browser reads the browser's UI language: Chinese locales use Simplified Chinese; other locales use English. It does not read the operating-system language directly. A browser may itself follow the system setting. Manual selection overrides the browser choice. Caption text, dictionary definitions and your notes are not translated by this setting.

**Subtitles:** choose a source track and translation target in Settings. Available choices come from YouTube.

**Dictionary:** the primary definition language follows the subtitle target. Only English source words are supported.

| Subtitle target for an English word | Dictionary card |
| --- | --- |
| Chinese | Chinese meanings plus English source explanation |
| English | One English meanings/explanation section |
| Another language | Unsupported-target notice plus English source explanation |

Other source languages show an unsupported notice. Chinese dictionary entries preserve the provider's script. Definitions are retrieved, not machine-translated, and separate providers' senses are not assumed to align one-to-one. Changing the target cancels pending lookup without automatically querying saved vocabulary.

## Vocabulary and backup

Search words, original sentences or notes; move between pages of 50 entries. Saved entries retain the original sentence, video/time bookmark, note, definitions and mastered state. Existing notes can be cleared deliberately.

Export JSON before trying a candidate or restoring a backup. Restore accepts version 1–5 JSON backups up to 16 MiB and 5000 entries, validates the whole file, then asks you to select **Merge restore**. It adds new entries and preserves existing duplicate entries, including their notes and mastered state. It does not replace the vocabulary. The resulting normalized vocabulary has a 4 MiB / 5000-entry limit; a merge exceeding it is rejected as a whole. Older valid oversized local books remain readable/exportable and can be reduced.

CSV is for reading or analysis; JSON is the restore format. Exported files contain your selected words, sentences, notes and video bookmarks, so keep them private as needed.

## Downloads and installation

The [v0.5.0 pre-release](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) is the download location for these assets:

- `YouTube-Dual-Subtitles-0.5.0-candidate-extension.zip`: extension files and user documentation.
- `YouTube-Dual-Subtitles-0.5.0-candidate-source.zip`: source, tests and documentation.
- `VALIDATION.zh-CN.md`: the recorded Chinese validation report.
- `SHA256SUMS.txt`: asset checksums.

The ZIP names retain “candidate” because real installed-browser acceptance remains incomplete. Extract into a separate folder and review the notes and validation report. Keep the working installation until you choose to update. Export vocabulary first, preserve the extension identity, and refresh every YouTube tab still running the old version after the approved update; see [installation and update](docs/INSTALL.md). No automatic upgrade is configured.

## Privacy and development

Permissions remain activeTab, scripting and storage. There is no persistent host permission, telemetry, remote executable code, cloud vocabulary sync or paid translation API. Caption requests reuse complete successful native URLs for the exact video/track/target, without generating authorization parameters. A manual native CC selection may still be needed when no usable request is available.

Clicking a supported English word or explicitly updating its definition sends that word to public Wiktionary endpoints. It sends no sentence, video ID, timestamp, note or vocabulary book. See [privacy](docs/PRIVACY.md) and [licensing](docs/LICENSING.md).

The extension has no runtime dependency or build step. Node.js 22+ runs `npm test`; isolated browser tests and local packaging are described in [development](docs/DEVELOPMENT.md). Code is MIT; dictionary text retains its original attribution and CC BY-SA 4.0 terms. No association with YouTube or Language Reactor is claimed.
