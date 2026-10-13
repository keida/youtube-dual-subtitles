# Development

The extension folder is plain JavaScript with no build or runtime dependency. Node.js 22+ runs all unit tests:

    npm test

For browser fixtures, install the declared development dependency and a separate test browser:

    npm install --ignore-scripts
    npx playwright-core install chromium
    npm run test:ui

Optional PLAYWRIGHT_CORE_PATH selects an already installed playwright-core module; TEST_BROWSER_PATH selects a test browser executable. Never use a personal browser profile for tests. Browser tests use synthetic page/player/network fixtures and write internal screenshots that are excluded from packaging.

    node tests/dictionary-language-live.cjs

The optional live dictionary test performs anonymous, single-word public Wiktionary queries. It is not installed-extension or live YouTube testing. Network failures are recorded honestly.

Architecture: service-worker injects MAIN request-url/native-loader/bridge and isolated core/playback/dictionary/learning/content after an action click. Captions remain in bounded session memory; deliberate vocabulary uses local storage. Dictionary cache keys include requested source and target languages. Test fixtures never ship inside extension.

Run the packaging script after validation:

    node scripts/build-release.cjs

It copies allowlisted files, rejects personal paths / credential-like values, produces source and extension staging trees and checksums. Use ZIP tooling on those trees, never the entire working directory. Original routing records, user QA, screenshots, profiles, secrets and helper metadata stay private.

No GitHub Actions matrix has been configured or run. Verification on Linux, installed Chrome/Edge and a real extension's isolated world remains separate from local Windows fixture evidence. See VALIDATION.md and ROUTING.md.
