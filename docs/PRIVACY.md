# Privacy

Permissions are activeTab, scripting and storage. There is no persistent host permission, automatic content script, telemetry, remote executable code, paid API, account system or cloud vocabulary sync. An action click enables the current ordinary YouTube watch page.

## Captions

Caption requests stay on the current video's same-origin YouTube timedtext endpoint. Complete successful native requests are reused only for their exact video/track/target. Opaque authorization values are not generated, transplanted, logged or persisted. Retrieval may temporarily select a normal native CC track and restore the prior state; retries are bounded. No login, DRM or other access restriction is bypassed.

Full captions are session-only. Imported SRT/VTT files stay local and clear on navigation. Retrying the same video retains imports until explicitly cleared. Exporting caption files is user initiated.

## Dictionary

Clicking a supported English word or explicitly requesting an update sends that word to public zh.wiktionary.org and/or en.wiktionary.org endpoints. A Chinese target uses both; an English or unsupported target uses the supported English source explanation. Unsupported source languages make no dictionary request. Opening vocabulary, reviewing, restoring backups and changing targets do not automatically query the book.

GET fields are action=parse, page=the single clicked lowercase word (maximum 64 ASCII letters/apostrophe/hyphen), prop=wikitext, format=json, formatversion=2, redirects=1 and origin=*. Requests use credentials=omit, referrerPolicy=no-referrer and redirect=error. No original sentence, video ID/title, timestamp, note, browsing history or vocabulary book is sent. Providers can see IP and ordinary network metadata.

Only the English language section is parsed; headword redirects to a different word are refused. Meanings are not machine-translated or guaranteed to align one-to-one. Sources, CC BY-SA 4.0 and modification notices remain in the card and exports. Definition copy buttons write the selected definition and its attribution/licence to the clipboard only when clicked.

## Local settings and vocabulary

Layout, preferences and deliberately saved vocabulary remain in this browser's local storage. Interface auto-selection reads browser UI language locally; it does not call a language-detection service or directly inspect the OS language. A manual language preference is stored locally.

Vocabulary contains chosen words, sentences, video/time bookmarks, notes, definitions and mastered state. Stable local entry IDs and a storage revision coordinate updates; they are not account or tracking identifiers. New normalized storage is limited to 4 MiB and 5000 entries. Older valid larger books remain readable/exportable and can be reduced. Read failures or corrupt stored data stop writes rather than replacing data with an empty book.

JSON/CSV export and single-entry deletion are user initiated. JSON restore reads a local file, validates the whole batch and requires explicit merge confirmation. Files are limited to 16 MiB / 5000 entries; the resulting normalized book must satisfy storage limits. Existing duplicate records are preserved. No restore upload or automatic dictionary query occurs.

Exported files contain personal learning data; keep or share them deliberately. Removing an extension may delete its storage. Downloading this pre-release does not change the current installation. Packaged deliverables exclude user browser data, vocabulary, private QA and screenshots.

Implementation references: [MediaWiki CORS](https://www.mediawiki.org/wiki/API:Cross-site_requests), [Parse API](https://www.mediawiki.org/wiki/API:Parsing_wikitext), [Wikimedia terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use). Dictionary licensing details are in [LICENSING.md](LICENSING.md).
