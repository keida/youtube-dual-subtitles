# Privacy

Permissions: activeTab, scripting, storage. No persistent host_permissions or automatic content script. An action click enables the current YouTube watch page. No telemetry, remote executable code, paid API, account system or cloud vocabulary sync.

Caption requests stay on the current video's same-origin YouTube timedtext endpoint. Complete native successful requests are reused only for that exact video/track/target; opaque authorization values are not generated, transplanted, logged or persisted. No access restriction, login or DRM bypass. Full captions are session-only. Deliberately imported SRT/VTT files stay local and clear on navigation.

Only clicking a supported English word or explicitly requesting an update sends that word to https://zh.wiktionary.org/w/api.php and/or https://en.wiktionary.org/w/api.php. Chinese target uses both; English or unsupported target uses only the supported English source explanation. Unsupported source languages make no dictionary request. Opening vocabulary, reviewing and changing targets make no automatic dictionary request.

GET fields: action=parse, page=the single clicked lowercase word (maximum 64 ASCII letters/apostrophe/hyphen), prop=wikitext, format=json, formatversion=2, redirects=1, origin=*. Requests use credentials=omit, referrerPolicy=no-referrer, redirect=error. No caption sentence, video ID/title, timestamp, note, browsing history or vocabulary book is sent. Providers can see IP and standard network metadata.

Only the English language section is parsed. Headword redirects to another word are refused. Meanings are not machine-translated or guaranteed to align one-to-one. Interface links and exports retain attribution, CC BY-SA 4.0 and modification notices. Failed updates preserve existing definitions and label the failure.

Saved layout, preferences and deliberate vocabulary remain in this browser's local storage. Vocabulary includes chosen word, original sentence, video/time bookmark, notes, definitions and mastered state; maximum 5000 entries. Export JSON/CSV is user initiated. Removing the extension may delete its storage. Public releases exclude user browser data, private QA and screenshots.

Official references: [anonymous CORS](https://www.mediawiki.org/wiki/API:Cross-site_requests), [Parse API](https://www.mediawiki.org/wiki/API:Parsing_wikitext), [Wikimedia terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use).
