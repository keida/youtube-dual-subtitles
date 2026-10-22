# YouTube Dual Subtitles

<!-- download-counts:start -->
[![All Release asset file downloads](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/total?label=Release%20asset%20downloads)](https://github.com/keida/youtube-dual-subtitles/releases) [![v0.4.0 plugin ZIP downloads](https://img.shields.io/github/downloads/keida/youtube-dual-subtitles/v0.4.0/YouTube-Dual-Subtitles-Extension-0.4.0.zip?label=Plugin%20ZIP%20downloads&displayAssetName=false)](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.4.0)

Counts are file download events, not unique people or installations. The total includes uploaded Release assets (extension ZIP, packaged source ZIP and checksums); the plugin badge counts the v0.4.0 plugin ZIP separately. GitHub-generated Source code ZIP/tar.gz archives are outside these asset counts. Badge caching can delay updates.
<!-- download-counts:end -->

[简体中文](README.zh-CN.md) · [Downloads](https://github.com/keida/youtube-dual-subtitles/releases) · [Changelog](CHANGELOG.md)

Experimental Chrome / Edge Manifest V3 extension, version 0.4.0. Original captions appear at the bottom and translated captions at the top. Each layer has independent position, font size, background, visibility and timing offset.

**Pre-release: installed YouTube validation remains incomplete.** Passing simulated browser tests does not prove automatic caption retrieval on the real website. First unseen videos, natural autoplay, YouTube fullscreen, pause precision and persistence across a browser restart still need testing.

## Install

Download the extension ZIP from Releases, extract it, and manually load its extension folder through your browser's extension management page. No build is required. Updates should preserve the existing extension identity and data: replace its files, reload the extension, refresh YouTube, and click the toolbar icon. See [installation](docs/INSTALL.md).

## Documentation

[Usage and language guide](docs/GUIDE.md) · [Installation](docs/INSTALL.md) · [Privacy](docs/PRIVACY.md) · [Licensing](docs/LICENSING.md) · [Validation](docs/VALIDATION.md) · [Development](docs/DEVELOPMENT.md)

## Language selection

**The interface is fixed Simplified Chinese. There is no interface language selector or automatic switch based on computer/browser language.** The initial subtitle target is Simplified Chinese (zh-Hans), with saved local preferences taking precedence. See the [guide](docs/GUIDE.md) for defaults and saved preferences.

Choose the source caption track and translated-caption target in Settings. Subtitle languages depend on the tracks and translations that YouTube supplies for the current accessible video.

The dictionary's primary language follows that subtitle target. For English source words:

| Subtitle target | Dictionary card |
| --- | --- |
| Chinese | Chinese meaning plus English source explanation |
| English | English meaning/source explanation in one section |
| Another language | Explicit unsupported-target message plus English source explanation |

Only English source words and Chinese/English dictionary entries are supported. Non-English source languages receive an explicit unsupported message rather than an English homograph definition. Chinese entries retain the provider's original script; no simplified/traditional conversion is promised. The interface remains Simplified Chinese. Interface, subtitle and dictionary languages are separate concepts.

Changing a target cancels pending dictionary work and switches the displayed language without querying the saved vocabulary automatically. Cache keys include the word, complete source language and target language. Old notes and 0.3.1 vocabulary remain compatible.

## Learning tools

Sentence navigation and replay, pause at sentence end, clickable lists, independent offsets, local SRT/VTT import/export, word notes, original sentence/time bookmarks, review, mastered status and JSON/CSV export. Dictionary sources and licence links are retained separately from handwritten notes.

## Privacy and limitations

Captions and available translations come only from YouTube. No paid translation API, caption upload, analytics, remote code, login/DRM bypass or persistent host permission. Caption retrieval may temporarily select a normal native CC track and restores the prior state. When automatic selection fails on a video without a successful native request, normal manual CC selection may still be necessary.

Clicking a word or explicitly updating its definition sends only that English word and fixed API parameters to public Wiktionary endpoints. No sentence, video ID, timestamp, note, history or vocabulary book is transmitted. The provider can see ordinary network information, such as IP. Details: [privacy](docs/PRIVACY.md), [licensing](docs/LICENSING.md), [validation](docs/VALIDATION.md).

Code: MIT. Retrieved dictionary text: its original Wiktionary terms, including CC BY-SA 4.0 attribution and share-alike requirements. No association with YouTube or Language Reactor is claimed.

## Development

Node.js 22+; the extension has no runtime dependency or build step. Run npm test for unit tests. Browser tests use a separate headless Chromium and synthetic YouTube responses, not a user profile or installed extension. See [development](docs/DEVELOPMENT.md). Source ZIP and extension ZIP are separate Release assets.
