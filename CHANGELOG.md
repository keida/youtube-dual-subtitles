# Changelog

Earlier versions were local deliveries. Their release dates were not formally recorded; capabilities and test counts below come from preserved ZIP manifests and evidence. No retroactive Git tags, public releases or installed-browser passes are implied.

## 0.4.0 — experimental pre-release

- Dictionary primary language follows the selected subtitle target; English source explanation retained. English target is deduplicated; unsupported target/source languages are explicit.
- Source/target-aware cache keys, cancellation on target changes and protection against stale dictionary responses.
- Version-3 dictionary metadata, JSON export version 4, compatibility with old single-language and 0.3.1 bilingual entries; preserve notes and old definitions on failed updates.
- English/Chinese installation, development, privacy, licensing, changelog and release notes; clean source and extension packages.
- D-AI routing invoked before implementation; CLI blocked-at-implementation handoff consumed by the Codex agent. No binding/runtime modification.
- Local 54 unit tests and 24 browser fixture groups pass. Live dictionary policy checked separately. Installed YouTube acceptance remains outstanding.

## 0.3.1 — local delivery

- Same card Chinese meanings and English explanations, separately preserved in vocabulary/review/exports.
- English-section/headword/part-of-speech checks; missing language and failed updates are honest; old notes preserved.
- 47 unit tests, 22 browser fixture groups; anonymous real bilingual Wiktionary query passed. Installed extension not verified after reload.

## 0.3.0 — local delivery

- Normal page-player CC loading adapter and native state restoration, bounded session cache and readiness recovery.
- Original failure no longer prevents an independent translated-track attempt.
- Independent media-time pause/replay controller, real single-word Chinese-first dictionary and complete local learning flow.
- 37 unit tests, 20 browser fixture groups; anonymous Chinese dictionary query passed. Real first-video/autoplay and pause precision remained unverified.

## 0.2.1 — local fix

- Reuse complete successful native timedtext requests for the exact video/track/target; no authorization synthesis or transfer.
- 18 unit tests, 16 browser fixture groups.
- Later real QA showed dual captions after manual native-track priming; unseen autoplay videos still failed, pause was about 0.88 s late, native fullscreen was not entered. This was not a complete real-world pass.

## 0.2.0 — local learning MVP

- Target selection, layer swapping/visibility, offsets, sentence navigation/replay/pause, SRT/VTT import/export, manual vocabulary notes/review/relisten/export and shortcuts.
- 14 unit tests, 15 browser fixture groups. Metadata-only caption retrieval returned empty content on a real page; automatic bilingual display was not validated.
