"use strict";
const { test, after } = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.resolve(__dirname, ".."), extension = path.join(root, "extension"), evidence = [];
after(() => {
  fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
  fs.writeFileSync(path.join(root, "evidence/caption-candidate.json"), JSON.stringify({ method: "Node VM plus isolated headless Chromium; synthetic network/player/storage", externalNetworkRequests: 0, installedExtensionAcceptance: false, results: evidence }, null, 2) + "\n");
});

async function bridgeFixture(failure, allFail = false) {
  const listeners = new Set(), posts = [], fetched = [], entries = [];
  let selected = 0, restored = 0;
  const old = "https://www.youtube.com/api/timedtext?v=A&lang=en&fmt=json3&opaque=old-fixture";
  entries.push({ name: old, decodedBodySize: 100, startTime: 1, responseStatus: 200 });
  const track = { languageCode: "en", baseUrl: "https://www.youtube.com/api/timedtext?v=A&lang=en", name: { simpleText: "English" } };
  const player = { getPlayerResponse: () => ({ videoDetails: { videoId: "A" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [track] } } }) };
  const window = { addEventListener: (type, fn) => listeners.add(fn), removeEventListener: (type, fn) => listeners.delete(fn), postMessage: m => posts.push(m) };
  const context = { window, location: { href: "https://www.youtube.com/watch?v=A", pathname: "/watch", origin: "https://www.youtube.com" }, document: { getElementById: () => player }, URL, AbortController, DOMException, TextDecoder, setTimeout, clearTimeout,
    performance: { getEntriesByType: () => entries }, PerformanceObserver: class { observe() {} disconnect() {} },
    YTDSNativeLoader: { select() { selected++; entries.push({ name: old.replace("old-fixture", "new-fixture-" + selected), decodedBodySize: 100, startTime: selected + 1, responseStatus: 200 }); return () => restored++; } },
    fetch: async url => { fetched.push(url); if (url === old || allFail) return failure === "empty" ? new Response("") : new Response("", { status: failure }); return new Response('{"events":[]}'); }
  };
  vm.createContext(context);
  for (const file of ["request-url.js", "bridge.js"]) vm.runInContext(fs.readFileSync(path.join(extension, file), "utf8"), context);
  return { old, fetched, get selected() { return selected; }, get restored() { return restored; }, async request(key) { await [...listeners][0]({ source: window, origin: "https://www.youtube.com", data: { channel: "YTDS_V1", direction: "request", requestId: key, id: "A", op: "captions", index: 0 } }); return posts.find(m => m.requestId === key); }, dispose() { window.__YTDS_BRIDGE_V1__.dispose(); } };
}
for (const failure of [403, 410, "empty"]) test("rejected observed URL " + failure + " refreshes once and stays excluded", async () => {
  const f = await bridgeFixture(failure);
  try {
    assert.equal((await f.request("one")).result, '{"events":[]}');
    assert.equal((await f.request("two")).result, '{"events":[]}');
    assert.equal(f.selected, 1); assert.equal(f.restored, 1);
    assert.deepEqual(f.fetched, [f.old, f.old.replace("old-fixture", "new-fixture-1"), f.old.replace("old-fixture", "new-fixture-1")]);
    evidence.push({ name: "reject-" + failure, status: "PASS", nativeReloads: f.selected, rejectedUrlFetchCount: f.fetched.filter(url => url === f.old).length });
  } finally { f.dispose(); }
});
test("native refresh is bounded when the new exact URL also fails", async () => {
  const f = await bridgeFixture(403, true);
  try { assert.match((await f.request("one")).error, /HTTP 403/); assert.equal(f.selected, 1); assert.equal(f.fetched.length, 2); evidence.push({ name: "bounded-native-refresh", status: "PASS" }); }
  finally { f.dispose(); }
});
test("either failed track may trigger recovery; imported tracks are excluded", () => {
  const source = fs.readFileSync(path.join(extension, "content.js"), "utf8"), begin = source.indexOf("function neededSignal("), end = source.indexOf("function scheduleNativeRecovery()", begin);
  const context = { meta: { tracks: [{ languageCode: "en", kind: "" }, { languageCode: "zh-CN", kind: "" }] }, currentChoice: { source: 0, translation: 1, mode: "track" }, failedTracks: new Set(["source", "translation"]), imports: { source: null, translation: null }, prefs: { targetLanguage: "zh-CN" } };
  vm.createContext(context); vm.runInContext(source.slice(begin, end), context);
  assert.equal(context.neededSignal({ lang: "en", kind: "", tlang: "" }), true);
  assert.equal(context.neededSignal({ lang: "zh-CN", kind: "", tlang: "" }), true);
  context.imports.translation = { cues: [] }; assert.equal(context.neededSignal({ lang: "zh-CN", kind: "", tlang: "" }), false);
  evidence.push({ name: "independent-recovery-signals", status: "PASS" });
});

test("isolated caption integration regressions", { timeout: 90000 }, async t => {
  let playwright; try { playwright = require("playwright-core"); } catch { playwright = require(process.env.PLAYWRIGHT_CORE_PATH || "playwright-core"); }
  const browser = await playwright.chromium.launch({ headless: true, executablePath: process.env.TEST_BROWSER_PATH || undefined });
  const contexts = [], errors = [];
  async function fixture(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.push(context);
    await context.route("**/*", route => route.fulfill({ contentType: "text/html", body: fs.readFileSync(path.join(__dirname, "fixture.html"), "utf8") }));
    const page = await context.newPage(); page.setDefaultTimeout(6000); page.on("pageerror", error => errors.push(error.message));
    await page.goto("https://www.youtube.com/watch?v=A");
    await page.evaluate(options => {
      const F = window.fixture = { saved: { preferences: { uiLanguage: "zh-CN" } }, listeners: new Set(), requests: [], aborted: 0, time: 1, paused: true, ...options };
      window.chrome = { runtime: { id: "fixture", onMessage: { addListener: fn => F.listeners.add(fn), removeListener: fn => F.listeners.delete(fn) } }, storage: { local: { get: async () => structuredClone(F.saved), set: async value => Object.assign(F.saved, structuredClone(value)) } }, i18n: { getUILanguage: () => "zh-CN" } };
      F.metadata = id => ({ videoDetails: { videoId: id }, playabilityStatus: { status: "OK" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [
        { languageCode: "en", name: { simpleText: "English" }, isTranslatable: true, baseUrl: `https://www.youtube.com/api/timedtext?v=${id}&lang=en` },
        { languageCode: "zh-Hans", name: { simpleText: "简体中文" }, baseUrl: `https://www.youtube.com/api/timedtext?v=${id}&lang=zh-Hans` }
      ], translationLanguages: [{ languageCode: "zh-Hans" }], audioTracks: [{ defaultCaptionTrackIndex: 0 }] } } });
      F.switch = id => { history.pushState({}, "", "/watch?v=" + id); window.ytInitialPlayerResponse = F.metadata(id); document.dispatchEvent(new Event("yt-navigate-finish")); };
      window.ytInitialPlayerResponse = F.metadata("A");
      const video = document.querySelector("video"); Object.defineProperty(video, "currentTime", { get: () => F.time, set: value => F.time = value }); Object.defineProperty(video, "paused", { get: () => F.paused });
      video.play = async () => { F.paused = false; video.dispatchEvent(new Event("playing")); }; video.pause = () => { F.paused = true; video.dispatchEvent(new Event("pause")); };
      window.fetch = async (url, options = {}) => {
        const u = new URL(url); F.requests.push(u.href);
        if (u.hostname.endsWith(".wiktionary.org")) return new Response(JSON.stringify({ parse: { title: u.searchParams.get("page"), wikitext: u.hostname.startsWith("en.") ? "==English==\n===Adjective===\n# Existing at the beginning." : "==英語==\n===形容詞===\n# [[原始的]]" } }));
        const translated = u.searchParams.get("lang") === "zh-Hans" || u.searchParams.has("tlang"), delay = translated ? F.delayTranslation : F.delaySource;
        if (delay) await new Promise((resolve, reject) => { const timer = setTimeout(resolve, delay); options.signal.addEventListener("abort", () => { clearTimeout(timer); F.aborted++; reject(new DOMException("Aborted", "AbortError")); }, { once: true }); });
        if (options.signal.aborted) throw new DOMException("Aborted", "AbortError");
        if (translated ? F.failTranslation : F.failSource) return new Response("", { status: 500 });
        const id = u.searchParams.get("v"), first = translated ? "译文 " + id : "Original " + id;
        return new Response(JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 4000, segs: [{ utf8: F.long ? first + " long-caption".repeat(300) : first }] }, { tStartMs: 6000, dDurationMs: 3000, segs: [{ utf8: translated ? "第二句" : "Second original" }] }] }));
      };
    }, options);
    for (const file of ["request-url.js", "native-loader.js", "bridge.js", "core.js", "playback.js", "dictionary.js", "vocabulary-store.js", "i18n.js", "learning.js"]) if (fs.existsSync(path.join(extension, file))) await page.addScriptTag({ path: path.join(extension, file) });
    await page.evaluate(() => { const repository = YTDSVocabularyStore.createRepository(chrome.storage.local); chrome.runtime.sendMessage = request => request?.type === "YTDS_VOCABULARY" ? repository.handle(request) : Promise.reject(new Error("Unexpected fixture message")); });
    await page.evaluate(() => { const original = YTDSLearning; window.YTDSLearning = function (...args) { const learning = original(...args), render = learning.render; learning.render = function (element, text, interactive, range) { if (range) element.dataset.testLanguage = range.language; return render.call(this, element, text, interactive, range); }; return learning; }; });
    await page.addScriptTag({ path: path.join(extension, "content.js") });
    return page;
  }
  const shadow = "#ytds-overlay ";
  async function ready(page, id = "A") { await page.waitForFunction(id => { const s = document.querySelector("#ytds-overlay")?.shadowRoot; return s?.querySelector("#bottom").textContent === "Original " + id && s?.querySelector("#top").textContent === "译文 " + id; }, id); }
  async function study(page) { await page.locator(shadow + "#settings").click(); await page.locator(shadow + "#study summary").click(); }
  async function number(page, id, value) { const el = page.locator(shadow + "#" + id); await el.fill(String(value)); await el.dispatchEvent("change"); }
  async function importFile(page, id, text) { await page.locator(shadow + "#" + id).setInputFiles({ name: "fixture.srt", mimeType: "application/x-subrip", buffer: Buffer.from("1\n00:00:00,000 --> 00:00:20,000\n" + text) }); }
  async function run(name, fn) { await t.test(name, async () => { try { await fn(); evidence.push({ name, status: "PASS" }); } catch (error) { evidence.push({ name, status: "FAIL", error: error.message }); throw error; } }); }
  try {
    await run("layout-only reset preserves language, offsets and pause", async () => {
      const page = await fixture(); await ready(page); await study(page); await page.locator(shadow + "#target").selectOption("en");
      await page.waitForFunction(() => document.querySelector("#ytds-overlay").shadowRoot.querySelector("#status").textContent.includes("无需翻译"));
      await number(page, "sourceOffset", 2); await number(page, "translationOffset", -1); await page.locator(shadow + "#pauseAtEnd").check(); await page.locator(shadow + "#top-size").fill("40");
      await page.waitForFunction(() => fixture.saved.layout?.top.size === 40 && fixture.saved.preferences?.pauseAtEnd);
      const before = await page.evaluate(() => fixture.saved.preferences); await page.locator(shadow + "#reset").click();
      await page.waitForFunction(() => fixture.saved.layout?.top.size === 26); assert.deepEqual(await page.evaluate(() => fixture.saved.preferences), before);
      await page.context().close();
    });
    await run("import translation while source loads; retry preserves import; clear and navigation restore native tracks", async () => {
      const page = await fixture({ delaySource: 600 }); await page.waitForFunction(() => fixture.requests.length === 1); await study(page); await importFile(page, "importTranslation", "Imported translation");
      await page.waitForFunction(() => { const s = document.querySelector("#ytds-overlay").shadowRoot; return s.querySelector("#bottom").textContent === "Original A" && s.querySelector("#top").textContent === "Imported translation"; });
      assert.equal(await page.evaluate(() => fixture.aborted), 0); await page.evaluate(() => fixture.delaySource = 0); await page.locator(shadow + "#retry").click();
      await page.waitForFunction(() => document.querySelector("#ytds-overlay").shadowRoot.querySelector("#bottom").textContent === "Original A"); assert.equal(await page.locator(shadow + "#top").textContent(), "Imported translation");
      await page.locator(shadow + "#clear-imports").click(); await ready(page); await importFile(page, "importSource", "Imported original");
      await page.waitForFunction(() => document.querySelector("#ytds-overlay").shadowRoot.querySelector("#bottom").textContent === "Imported original"); await page.evaluate(() => fixture.switch("B")); await ready(page, "B"); assert.equal(await page.locator(shadow + "#clear-imports").isVisible(), false);
      await page.context().close();
    });
    await run("late native translation cannot overwrite imported translation; close cancels outstanding original", async () => {
      const page = await fixture({ delayTranslation: 600 }); await page.waitForFunction(() => fixture.requests.some(url => new URL(url).searchParams.get("lang") === "zh-Hans")); await study(page); await importFile(page, "importTranslation", "User translation");
      await page.waitForTimeout(700); assert.equal(await page.locator(shadow + "#top").textContent(), "User translation");
      await page.evaluate(() => { fixture.delaySource = 2000; fixture.switch("C"); }); await page.waitForFunction(() => fixture.requests.some(url => new URL(url).searchParams.get("v") === "C"));
      await page.locator(shadow + "#close").click(); await page.waitForFunction(() => !document.querySelector("#ytds-overlay") && !window.__YTDS_BRIDGE_V1__ && fixture.aborted > 0); await page.context().close();
    });
    await run("both failed tracks recover translation independently after a matching native signal", async () => {
      const page = await fixture({ failSource: true, failTranslation: true });
      await page.waitForFunction(() => document.querySelector("#ytds-overlay")?.shadowRoot.querySelector("#status").textContent.includes("译文获取失败"));
      await page.evaluate(() => { fixture.failTranslation = false; window.postMessage({ channel: "YTDS_V1", direction: "player-ready", id: "A", sequence: 100, lang: "zh-Hans", kind: "", tlang: "" }, location.origin); });
      await page.waitForFunction(() => document.querySelector("#ytds-overlay").shadowRoot.querySelector("#top").textContent === "译文 A"); assert.equal(await page.locator(shadow + "#bottom").textContent(), ""); await page.context().close();
    });
    await run("automatic recovery preserves the successful track when the opposite request now fails", async () => {
      for (const failedTrack of ["translation", "source"]) {
        const page = await fixture({ failSource: failedTrack === "source", failTranslation: failedTrack === "translation" });
        await page.waitForFunction(failedTrack => document.querySelector("#ytds-overlay")?.shadowRoot.querySelector("#status").textContent.includes(failedTrack === "source" ? "原文获取失败" : "译文获取失败"), failedTrack);
        const preserved = failedTrack === "source" ? "#top" : "#bottom", expected = failedTrack === "source" ? "译文 A" : "Original A";
        await page.waitForFunction(({ preserved, expected }) => document.querySelector("#ytds-overlay").shadowRoot.querySelector(preserved).textContent === expected, { preserved, expected });
        await page.evaluate(({ failedTrack, preserved, expected }) => {
          const caption = document.querySelector("#ytds-overlay").shadowRoot.querySelector(preserved);
          fixture.preservedTrackChanged = false;
          fixture.trackObserver = new MutationObserver(() => { if (caption.textContent !== expected) fixture.preservedTrackChanged = true; });
          fixture.trackObserver.observe(caption, { subtree: true, childList: true, characterData: true });
          fixture.failSource = failedTrack !== "source"; fixture.failTranslation = failedTrack !== "translation";
          fixture.delaySource = fixture.delayTranslation = 150;
          window.postMessage({ channel: "YTDS_V1", direction: "player-ready", id: "A", sequence: 100, lang: failedTrack === "source" ? "en" : "zh-Hans", kind: "", tlang: "" }, location.origin);
        }, { failedTrack, preserved, expected });
        await ready(page);
        const result = await page.evaluate(() => {
          fixture.trackObserver.disconnect();
          return { changed: fixture.preservedTrackChanged, sourceRequests: fixture.requests.filter(url => new URL(url).searchParams.get("lang") === "en").length, translationRequests: fixture.requests.filter(url => new URL(url).searchParams.get("lang") === "zh-Hans").length };
        });
        assert.equal(result.changed, false, failedTrack + " recovery cleared the successful caption");
        assert.equal(result.sourceRequests, failedTrack === "source" ? 2 : 1);
        assert.equal(result.translationRequests, failedTrack === "translation" ? 2 : 1);
        await page.context().close();
      }
    });
    await run("offset navigation and word timestamps survive; each caption supplies its own language", async () => {
      const page = await fixture(); await ready(page); assert.equal(await page.locator(shadow + "#top").getAttribute("data-test-language"), "zh-Hans"); assert.equal(await page.locator(shadow + "#bottom").getAttribute("data-test-language"), "en");
      await study(page); await number(page, "sourceOffset", 2); await number(page, "translationOffset", -1); await page.evaluate(() => fixture.time = 3.5);
      await page.waitForFunction(() => { const s = document.querySelector("#ytds-overlay").shadowRoot; return s.querySelector("#top").textContent === "" && s.querySelector("#bottom").textContent === "Original A"; });
      await page.locator(shadow + "#next").click(); assert.equal(await page.evaluate(() => fixture.time), 8); await page.locator(shadow + "#previous").click(); assert.equal(await page.evaluate(() => fixture.time), 2);
      await page.locator(shadow + "#settings").click(); await page.evaluate(() => fixture.time = 5.5); await page.locator(shadow + "#bottom .word").filter({ hasText: /^Original$/ }).click(); await page.locator(shadow + "#word-save").click();
      await page.waitForFunction(() => fixture.saved.words?.length === 1); assert.equal(await page.evaluate(() => fixture.saved.words[0].at), 5.5); assert.equal(await page.evaluate(() => fixture.saved.words[0].context), "Original A");
      await page.locator(shadow + "#word-close").click(); await page.locator(shadow + "#settings").click(); await number(page, "sourceOffset", -2); await page.evaluate(() => fixture.time = 1.5); await page.locator(shadow + "#next").click(); assert.equal(await page.evaluate(() => fixture.time), 4); await page.locator(shadow + "#previous").click(); assert.equal(await page.evaluate(() => fixture.time), 0); await page.context().close();
    });
    await run("long subtitles expose full text and cards remain selectable with one visible panel", async () => {
      const page = await fixture({ long: true }); await page.waitForFunction(() => document.querySelector("#ytds-overlay")?.shadowRoot.querySelector("#bottom").textContent.length > 1000);
      await page.locator(shadow + "#caption-full").click(); assert.ok((await page.locator(shadow + "#full-caption-text").textContent()).length > 6000); await page.locator(shadow + "#full-caption-close").click();
      await page.locator(shadow + "#settings").click(); await page.locator(shadow + "#words").click(); assert.equal(await page.locator(shadow + "#panel").isVisible(), true); assert.equal(await page.locator(shadow + "#word-panel").isVisible(), true);
      await page.evaluate(() => document.querySelector("#movie_player").style.width = "500px"); await page.waitForFunction(() => document.querySelector("#ytds-overlay").shadowRoot.querySelector("#panel").hidden);
      assert.equal(await page.locator(shadow + "#word-context").evaluate(el => getComputedStyle(el).userSelect), "text"); await page.locator(shadow + "#settings").click(); assert.equal(await page.locator(shadow + "#word-panel").isVisible(), false); await page.context().close();
    });
    assert.deepEqual(errors, []);
  } finally { for (const context of contexts) await context.close().catch(() => {}); await browser.close(); }
});
