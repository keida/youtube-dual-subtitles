# Development

The extension is plain JavaScript with no build or runtime dependency. Node.js 22+ runs the non-browser tests:

```sh
npm test
```

For isolated browser fixtures, install the development dependency and a separate test browser:

```sh
npm install --ignore-scripts
npx playwright-core install chromium
npm run test:ui
npm run test:candidate
```

`PLAYWRIGHT_CORE_PATH` can select an already installed playwright-core module; `TEST_BROWSER_PATH` can select a test browser executable. Do not use a personal browser profile. Fixtures use synthetic page, player, storage and network behavior. They do not load the user's installed extension or establish live YouTube acceptance. Final counts and NOT RUN items belong in [VALIDATION.md](VALIDATION.md).

The optional `node tests/dictionary-language-live.cjs` command makes anonymous public single-word dictionary queries. Run it deliberately and report network failures honestly; it is separate from installed-extension testing.

## Architecture

An action click injects request-url/native-loader/bridge into MAIN, followed by core/playback/dictionary/i18n/learning/content into the isolated world. No automatic content script or persistent host permission is added.

The service worker owns the vocabulary repository. Its runtime-message endpoint accepts requests from this extension on ordinary YouTube watch pages. The repository serializes read-modify-write operations and rereads storage for each operation; clients send field patches instead of stale whole-book snapshots. Read/write failures return errors. Deleting a record prevents a late dictionary update from recreating it.

Captions remain in bounded session memory. Track failures and imports are independent; navigation cancels pending work. Only complete observed native request URLs are reused, for their exact video/track/target. Do not synthesize or move authorization fields.

UI language affects interface labels, not user notes, captions or retrieved definitions. Dictionary requests use the clicked layer's source language. Cache keys include the word and complete source/target languages. Per-language timeouts retain partial success; explicit cancellation still cancels the query.

JSON restore validates and previews the file before a confirmed additive merge. Existing duplicate records remain unchanged; ID conflicts and malformed entries reject the batch. File size is capped at 16 MiB, while new normalized storage is capped at 4 MiB / 5000 entries. Legacy valid larger books can be read/exported and shrunk.

## Local packaging

After validation:

```sh
npm run build:candidate
```

The candidate builder copies allowlisted source and extension files, including locale catalogs, into separate staging trees and produces file checksums. ZIP only those trees. Do not package the entire workspace, browser profiles, user vocabulary, private QA, personal paths or credentials. Do not publish or replace an installation as a packaging side effect.

The 0.5.0 experimental pre-release uses the validated candidate code. Publication is a separate operation from local packaging. No CI run or Linux/installed Chrome/Edge verification is implied; keep the recorded test results and NOT RUN boundaries unchanged when preparing release documentation.
