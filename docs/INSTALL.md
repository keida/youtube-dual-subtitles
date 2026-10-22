# Review, install and update

This folder contains the **0.5.0 experimental pre-release**. Downloading or unpacking it does not install, reload or replace a working extension, and does not overwrite existing vocabulary. There is no automatic upgrade from 0.4.0.

## Review first

1. Use the [v0.5.0 pre-release page](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) for the extension ZIP and checksums. Extract `YouTube-Dual-Subtitles-0.5.0-candidate-extension.zip` to a separate folder. The `extension` subfolder contains `manifest.json`.
2. Read the candidate notes and [validation report](VALIDATION.md). Compare the checksums supplied with the package.
3. Keep the current 0.4.0 installation and its files intact. Open its vocabulary panel and export a current JSON backup before any later change.
4. Decide separately whether to install the candidate. Replacement of the working installation requires user confirmation.

## After an installation decision

Installation and extension-management actions are manual. For a separate test browser profile, use the browser's developer extension loader and select the candidate's `extension` folder. That profile has its own storage; its vocabulary is not automatically copied from the working profile.

For an approved update to the existing installation, retain its extension identity and original files for rollback. Reload that same extension only after the confirmed replacement, then refresh every YouTube tab that had the old version enabled before clicking the toolbar icon again. Old 0.4.0 content scripts must not remain active alongside the new background writer, because they still save whole vocabulary snapshots. Do not uninstall simply to update: uninstalling may remove local data.

On an ordinary accessible `www.youtube.com/watch` page, open the extension's Settings and check its version footer. Seeing 0.5.0 in a downloaded manifest alone does not confirm that the browser loaded it. Another extension, such as Language Reactor, is not evidence that this extension is running.

## Using the candidate

- Set Interface language to Follow browser, Simplified Chinese or English. Follow browser reads browser UI language, not the OS directly.
- Select a source caption track and translation target. Available captions and translations come from YouTube.
- Automatic recovery retries failed tracks while retaining successful data for the same video and track selection. Manual Reload fetches network captions afresh; local imports remain. If automatic retrieval still fails, use normal native CC controls and the visible retry guidance.
- Importing SRT/VTT affects only this video. Retry keeps imports; Clear imported captions removes them. Navigating to another video clears them.
- Click a supported English word to pause and query definitions. Select definition text or use its Copy button; copying includes source/licence. Save notes deliberately.
- Search the vocabulary and use page controls. Deletion requires a second confirmation. Restore accepts JSON, previews it, and writes only after Merge restore. Existing duplicates are kept.
- Reset layout resets layer appearance only; it retains language preferences, timing offsets and other learning preferences.

Closing the overlay removes its listeners/timers and restores temporary native CC changes. A full page reload requires another toolbar click. Ordinary watch pages are the supported surface; Shorts, live streams, embeds, mobile pages and video-element-only fullscreen are outside it. Native YouTube fullscreen still requires real acceptance testing.
