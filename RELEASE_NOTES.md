# 0.5.0 — experimental pre-release

This experimental pre-release packages the locally validated 0.5.0 candidate. It does not automatically replace an existing 0.4.0 installation or change browser vocabulary/settings. Package version and browser-loaded version must be reported separately.

## Changes to review

- Serialize vocabulary writes in the background and patch individual fields; block writes after a failed read. Preserve original notes, replay times and unrelated fields during concurrent updates.
- Allow selecting dictionary text and copying definitions with attribution/licence. A separate timeout for each language retains successful or previously saved definitions.
- Recover caption tracks independently; discard failed native URLs and bound the ordinary CC reload attempt. Imported translation keeps pending source loading; later network results do not replace imported captions.
- Save intentionally empty notes, display overlapping active captions, and limit Reset layout to appearance.
- Keep settings and vocabulary panels separate below 680 px player width, and offer a full-text view for clipped captions.
- Add Follow browser / Simplified Chinese / English interface choices.
- Add vocabulary search, 50-entry pages, confirmed deletion and JSON backup preview/merge restore. Duplicate existing entries remain unchanged. Backup files: version 1–5, at most 16 MiB / 5000 entries; resulting normalized vocabulary: 4 MiB / 5000 entries.

Sentence offsets, previous/next, replay and saved context/time behavior remain part of the regression scope. No new permission, dictionary provider, cloud sync or paid API has been added.

## Validation and use

[Validation](docs/VALIDATION.md) records actual results. Node tests and isolated Chromium fixtures use synthetic storage/player/network behavior; they do not prove an installed extension works on live YouTube. Real YouTube retrieval, native fullscreen, natural autoplay and browser-restart persistence are NOT RUN in this delivery.

The [v0.5.0 pre-release page](https://github.com/keida/youtube-dual-subtitles/releases/tag/v0.5.0) is the download location for `YouTube-Dual-Subtitles-0.5.0-candidate-extension.zip`, `YouTube-Dual-Subtitles-0.5.0-candidate-source.zip`, `VALIDATION.zh-CN.md` and `SHA256SUMS.txt`. Screenshots are excluded. The candidate filename reflects incomplete installed-browser acceptance.

Export current vocabulary before an installation change or restore. Keep the working version until you choose to update, and refresh every YouTube tab still running old code after the update; see [installation](docs/INSTALL.md). Code: MIT. Dictionary text retains article attribution and CC BY-SA 4.0 terms.
