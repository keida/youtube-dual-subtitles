# Validation boundaries

Local environment: Windows, Node.js 26.7.0, headless Chromium 156.0.8078.4 with an independently installed test runner. The extension itself was not installed by these tests.

54 unit tests and 24 isolated UI groups pass. The fixtures cover layer separation/styles/dragging/storage, real DOM Fullscreen API, ten video switches, player replacement, cancellation and cleanup, imported/exported files, keyboard protections, pause/replay, automatic native-request priming, independent translated-track attempt after source failure, dictionary migration/review/export, target-language projections, unsupported targets, cache separation and slow-query cancellation. Mock storage restored into a fresh document does not prove real browser restart persistence.

The optional live dictionary test runs on an anonymous synthetic YouTube-origin page, sends a test word to public Wiktionary, and records actual results plus Cookie/Referer presence. It does not contact a real YouTube video or use a user profile.

Known real baseline: 0.2.1 displayed two layers only after manual native priming; unseen autoplay still failed; observed sentence-end pause was approximately 0.88 s late. Native YouTube fullscreen was not entered. Later 0.3.x and 0.4.0 installed versions have not completed acceptance.

Still required: installed Chrome/Edge isolated-world/service-worker execution; unseen first video and natural autoplay; native fullscreen; long playback and background/rate-change pause precision; storage after refresh/re-enable and browser restart; original CC on/off restoration. Browser timing corrections cannot undo audio already heard while execution was stalled. No Linux/CI pass is claimed.

Published evidence includes only fixture results, anonymous dictionary test data and redacted routing summary. User QA sentences, browser images, profiles, paths and authorization data are excluded.
