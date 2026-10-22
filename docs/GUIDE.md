# Usage and language guide

For **0.4.0 experimental pre-release**. [Home](../README.md) · [简体中文](GUIDE.zh-CN.md)

## Language capabilities

| Setting | Current behavior | User choice |
| --- | --- | --- |
| Interface: menus, buttons, messages | Fixed Simplified Chinese | No interface language selector or computer/browser language detection |
| Source subtitles | Available YouTube tracks for the current video | Choose a source track in Settings |
| Translated subtitles | Prefer an existing target-language track; otherwise try a translation offered by YouTube | Choose a target from the video's available languages |
| Dictionary definitions | Primary language follows the subtitle target | No separate selector; only English source words with Chinese/English definitions |

Choosing English subtitles does not translate the interface. Changing the operating system or browser language does not switch this version's interface. Automatic caption translation is a separate capability from automatic interface language selection.

## Defaults and storage

The initial subtitle target is Simplified Chinese (zh-Hans), not a language inferred from the computer. A saved local target takes precedence. If the saved target is absent from the current video's metadata, it remains selected and is labelled as unavailable for that video; the extension does not silently switch languages. A target appearing in the selector does not guarantee that content is available. Source selection first uses the user's current choice or a briefly remembered track for the same video, then YouTube's metadata default; without a valid default, it prefers a non-ASR track, then the first available track.

Target preferences and layout are written to browser-local storage. Cross-browser sync is not implemented. Real browser-restart persistence remains unverified.

## Using language settings

1. On a normal YouTube watch page, click the extension icon, open Settings and check version 0.4.0 at the bottom.
2. Choose “原文字幕轨” (source track) and “译文语言” (translation target). The default layout is source below, translation above; “原译上下互换” swaps them.
3. Keep the desired layers visible. Drag mode displays position examples; turn it off to inspect actual captions.
4. Click an English word to look it up and explicitly save notes or vocabulary as needed.

| Subtitle target | Dictionary card |
| --- | --- |
| Chinese | Chinese definition plus English source explanation; original Chinese script is retained |
| English | One combined English definition/source explanation section |
| Another language | Unsupported-target notice plus any available English source explanation |

Entries may be missing or requests may fail. Non-English source words receive an unsupported-source message. Target changes cancel pending lookup and switch the display; opening vocabulary or review does not automatically query the provider.

## Features

| Feature | Scope |
| --- | --- |
| Two caption layers | Independent position, font size, background color/opacity, visibility and timing offsets |
| Listening practice | Previous/next sentence, sentence replay, pause at sentence end and clickable sentence navigation |
| Local subtitle files | SRT/VTT import/export for the current video; no upload or automatic translation of imports |
| Vocabulary | Word, original sentence, video timestamp and handwritten notes; review, mastered status, replay and JSON/CSV export |
| Providers | YouTube captions/translations and public Wiktionary definitions |
| Pages | Desktop watch pages; no Shorts, livestreams, embedded or mobile pages |

## Missing translations

Check layer visibility, selected languages and the Settings status message. Some videos have no suitable track or translation.

If the extension reports that YouTube returned no caption content, follow the notice to select the corresponding native CC track normally, then click “重新获取” (retry). This may restore captions; it does not establish reliable automatic retrieval on unseen videos or autoplay.

After a full page refresh, click the extension icon again. See [installation and updates](INSTALL.md) for preserving an existing extension identity and vocabulary.

## Validation and documentation

Published evidence records **54 unit tests and 24 isolated UI groups**. These were not rerun for this documentation update. Installed Chrome/Edge acceptance for 0.4.0 remains incomplete, including first unseen videos, natural autoplay, native fullscreen, pause precision and browser-restart persistence.

| Topic | Documentation |
| --- | --- |
| Download, installation and updates | [Installation](INSTALL.md) · [Release](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.4.0) |
| Local data and network requests | [Privacy](PRIVACY.md) |
| Code and dictionary text licences | [Licensing](LICENSING.md) |
| Evidence and outstanding checks | [Validation](VALIDATION.md) |
| Tests and packaging | [Development](DEVELOPMENT.md) |
| Version changes | [Changelog](../CHANGELOG.md) |

This guide updates the repository documentation. Published v0.4.0 ZIP files remain the original release snapshots.
