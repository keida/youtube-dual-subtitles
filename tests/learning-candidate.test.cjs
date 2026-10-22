'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
let playwright;
try { playwright = require('playwright-core'); }
catch { playwright = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core'); }
const root = path.resolve(__dirname, '..');
const Store = require('../extension/vocabulary-store.js');
const state = { saved: { words: [], wordsRevision: 0 }, failRead: false, messages: [] };
const repository = Store.createRepository({
  async get() { if (state.failRead) throw Error('Synthetic read failure'); return structuredClone(state.saved); },
  async set(next) { if (state.writeGate) { state.writeBlocked = true; await state.writeGate; } await Promise.resolve(); state.saved = { ...state.saved, ...structuredClone(next) }; }
});
const report = {
  scope: 'Real candidate learning/dictionary/core and shared vocabulary-store repository; two isolated Chromium pages, mocked dictionary/clipboard/storage transport; no network, installed extension, user profile or existing data.',
  cases: [], errors: []
};
async function run(name, action) { await action(); report.cases.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
async function init(browser, name) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.route('**/*', route => route.abort());
  await page.exposeFunction('vocabularyRpc', async request => {
    state.messages.push({ page: name, request: structuredClone(request) });
    return repository.handle(request);
  });
  await page.setContent('<style>body{font-family:sans-serif}button{margin:4px}textarea{display:block;width:400px}section{max-width:700px}</style><div id="host"></div>');
  await page.evaluate(name => {
    window.fixture = { context: { id: name, at: 2, text: 'An original source sentence.', language: 'en', targetLanguage: 'zh-Hans' }, calls: [], downloads: [], copied: [], rpc: [], changes: new Set(), pauses: 0, jumps: [], opened: 0, clipboardFailure: false };
    window.chrome = {
      runtime: { sendMessage: async request => { const result = await vocabularyRpc(request); fixture.rpc.push({ request, result }); return result; } },
      storage: { onChanged: { addListener: callback => fixture.changes.add(callback), removeListener: callback => fixture.changes.delete(callback) } }
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (fixture.clipboardFailure) throw Error('Synthetic clipboard failure'); fixture.copied.push(text); } } });
    window.fetch = async (url, options) => {
      const parsed = new URL(url); fixture.calls.push({ host: parsed.hostname, word: parsed.searchParams.get('page') });
      if (!['zh.wiktionary.org', 'en.wiktionary.org'].includes(parsed.hostname)) throw Error('Unexpected network target');
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (fixture.stallEnglish && parsed.hostname === 'en.wiktionary.org') return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
      const word = parsed.searchParams.get('page');
      return new Response(JSON.stringify({ parse: { title: word, wikitext: parsed.hostname.startsWith('zh.') ? '==English==\n===Noun===\n# 测试中文释义' : '==English==\n===Noun===\n# A synthetic English definition.' } }));
    };
  }, name);
  for (const file of ['core.js', 'dictionary.js', 'learning.js']) await page.addScriptTag({ path: path.join(root, 'extension', file) });
  await page.evaluate(() => {
    const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
    window.learning = YTDSLearning(shadow, {
      context: () => fixture.context,
      pause: () => fixture.pauses++, jump: entry => fixture.jumps.push(entry.at),
      download: (text, name, type) => fixture.downloads.push({ text, name, type }),
      onOpen: () => fixture.opened++
    });
    window.caption = document.createElement('div'); caption.id = 'caption'; shadow.append(caption);
  });
  await page.evaluate(() => learning.show());
  return page;
}
async function clickWord(page, word, language = 'en', context = word, at = 2) {
  await page.evaluate(({ word, language, context, at }) => {
    fixture.context.at = at;
    learning.render(caption, word, true, { id: fixture.context.id, start: 0, end: 5, language, context });
  }, { word, language, context, at });
  await page.locator('#caption .word').first().click();
  await page.waitForFunction(word => document.querySelector('#host').shadowRoot.querySelector('#word-title').textContent === word, word);
  if (language === 'en') await page.waitForFunction(() => !!document.querySelector('#host').shadowRoot.querySelector('#dictionary-copy-en'));
}
async function waitMutation(page, prior) {
  await page.waitForFunction(prior => fixture.rpc.filter(item => item.request.operation !== 'list').length > prior, prior);
  await page.waitForFunction(() => !document.querySelector('#host').shadowRoot.querySelector('#word-save').disabled);
}
async function mutationCount(page) { return page.evaluate(() => fixture.rpc.filter(item => item.request.operation !== 'list').length); }
async function save(page, note) {
  await page.locator('#definition').fill(note);
  const prior = await mutationCount(page); await page.locator('#word-save').click(); await waitMutation(page, prior);
}
async function openSaved(page, id) {
  await page.evaluate(() => learning.show());
  await page.locator('#vocabulary-details').evaluate(element => { element.open = true; });
  await page.locator('#vocabulary-search').fill('');
  await page.locator(`[data-entry-id="${id}"]`).click();
}
async function upload(page, payload, name = 'backup.json') {
  await page.locator('#vocabulary-import').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload)) });
}
function entry(word, overrides = {}) {
  return { word, context: 'Original context for ' + word, videoId: 'fixture-video', at: 5, language: 'en', definition: 'Note for ' + word, mastered: false, dictionary: null, ...overrides };
}

(async () => {
  const browser = await playwright.chromium.launch({ headless: true, executablePath: process.env.TEST_BROWSER_PATH || undefined });
  report.browser = browser.version();
  try {
    const a = await init(browser, 'video-A'), b = await init(browser, 'video-B');
    await run('Two pages save distinct words through the real serialized repository without replacement', async () => {
      await Promise.all([clickWord(a, 'alpha'), clickWord(b, 'beta')]);
      await Promise.all([save(a, 'Note A'), save(b, 'Note B')]);
      assert.deepEqual(state.saved.words.map(item => item.word).sort(), ['alpha', 'beta']);
      assert.equal(new Set(state.saved.words.map(item => item.id)).size, 2);
    });
    const alpha = state.saved.words.find(item => item.word === 'alpha').id;
    await run('Concurrent note/mastered updates send only changed fields; dictionary updates preserve another page note', async () => {
      await Promise.all([openSaved(a, alpha), openSaved(b, alpha)]);
      await a.locator('#definition').fill('Changed in A');
      const aPrior = await mutationCount(a), bPrior = await mutationCount(b), start = state.messages.length;
      await Promise.all([a.locator('#word-save').click(), b.locator('#mastered').click()]);
      await Promise.all([waitMutation(a, aPrior), waitMutation(b, bPrior)]);
      assert.equal(state.saved.words.find(item => item.id === alpha).definition, 'Changed in A');
      assert.equal(state.saved.words.find(item => item.id === alpha).mastered, true);
      const updates = state.messages.slice(start).filter(item => item.request.operation === 'upsert');
      assert.ok(updates.some(item => JSON.stringify(Object.keys(item.request.changes)) === '["definition"]'));
      assert.ok(updates.some(item => JSON.stringify(Object.keys(item.request.changes)) === '["mastered"]'));
      const before = await mutationCount(b); await b.locator('#dictionary-query').click(); await waitMutation(b, before);
      assert.equal(state.saved.words.find(item => item.id === alpha).definition, 'Changed in A');
      assert.deepEqual(Object.keys(state.messages.filter(item => item.request.operation === 'upsert').at(-1).request.changes), ['dictionary']);
    });
    await run('Revealed review note can be cleared, while an unrevealed note survives mastered marking', async () => {
      await b.locator('#review').click(); await b.locator('#reveal').click(); assert.equal(await b.locator('#definition').inputValue(), 'Note B');
      await save(b, ''); assert.equal(state.saved.words.find(item => item.word === 'beta').definition, '');
      await save(b, 'Keep hidden note');
      await b.locator('#review').click(); assert.equal(await b.locator('#definition').inputValue(), '');
      const before = await mutationCount(b); await b.locator('#mastered').click(); await waitMutation(b, before);
      assert.equal(state.saved.words.find(item => item.word === 'beta').definition, 'Keep hidden note');
      assert.equal(state.saved.words.find(item => item.word === 'beta').mastered, true);
    });
    await run('Clipboard includes definitions, source and licence; failure is visible', async () => {
      await openSaved(a, alpha);
      await a.locator('#dictionary-copy-zh').click(); await a.locator('#dictionary-copy-en').click();
      const copies = await a.evaluate(() => fixture.copied);
      assert.ok(copies[0].includes('测试中文释义') && copies[0].includes('https://zh.wiktionary.org/wiki/alpha') && copies[0].includes('CC BY-SA 4.0'));
      assert.ok(copies[1].includes('A synthetic English definition.') && copies[1].includes('https://en.wiktionary.org/wiki/alpha') && copies[1].includes('https://creativecommons.org/licenses/by-sa/4.0/'));
      await a.evaluate(() => fixture.clipboardFailure = true); await a.locator('#dictionary-copy-en').click();
      assert.ok((await a.locator('#dictionary-state').textContent()).includes('复制失败'));
      await a.evaluate(() => fixture.clipboardFailure = false);
    });
    await run('Actual candidate CSS allows real mouse selection under a user-select:none ancestor', async () => {
      await a.locator('#dictionary-copy-zh').click();
      await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#dictionary-state').textContent.includes('已复制'));
      const source = fs.readFileSync(path.join(root, 'extension', 'content.js'), 'utf8');
      const css = source.match(/<style>([\s\S]*?)<\/style>/)[1];
      await a.evaluate(css => {
        document.body.style.cssText = 'background:#0c1219;user-select:none;-webkit-user-select:none;';
        const host = document.querySelector('#host'); host.style.cssText = 'display:block;position:relative;width:800px;height:850px;user-select:none;';
        window.selectionStyle = document.createElement('style'); selectionStyle.textContent = css; host.shadowRoot.prepend(selectionStyle);
      }, css);
      const paragraph = a.locator('#meanings-zh p[data-user-content]').first();
      await paragraph.scrollIntoViewIfNeeded();
      const rect = await paragraph.evaluate(element => {
        const range = document.createRange(); range.selectNodeContents(element); const bounds = range.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, selection: getComputedStyle(element).userSelect };
      });
      assert.equal(rect.selection, 'text');
      await a.mouse.move(rect.x + 1, rect.y + rect.height / 2); await a.mouse.down();
      await a.mouse.move(rect.x + rect.width - 1, rect.y + rect.height / 2, { steps: 15 }); await a.mouse.up();
      const selected = await a.evaluate(() => window.getSelection().toString());
      assert.ok(selected.includes('中文释义'));
      fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
      await a.locator('#word-panel').screenshot({ path: path.join(root, 'evidence', 'learning-candidate-selected.png') });
      report.selection = { method: 'actual mouse drag', text: selected, ancestorUserSelect: 'none', paragraphUserSelect: rect.selection, screenshot: 'learning-candidate-selected.png' };
      await a.evaluate(() => { selectionStyle.remove(); document.body.removeAttribute('style'); document.querySelector('#host').removeAttribute('style'); window.getSelection().removeAllRanges(); });
    });
    await run('Layer-specific language/context prevents a French translated word from being queried as English', async () => {
      const calls = await a.evaluate(() => fixture.calls.length);
      await clickWord(a, 'chat', 'fr', 'Le chat dort.'); await save(a, 'French translation');
      assert.equal(await a.evaluate(() => fixture.calls.length), calls);
      const saved = state.saved.words.find(item => item.word === 'chat');
      assert.equal(saved.language, 'fr'); assert.equal(saved.context, 'Le chat dort.');
      const count = state.saved.words.length;
      await clickWord(a, 'chat', 'fr', 'Le chat dort.', 4); await save(a, 'Updated French note');
      assert.equal(state.saved.words.length, count);
      assert.equal(state.saved.words.find(item => item.id === saved.id).at, 2);
    });
    await run('A fresh word retains successful Chinese meanings when the English request reaches its real per-language timeout', async () => {
      await a.evaluate(() => {
        fixture.stallEnglish = true;
        learning.render(caption, 'partial', true, { id: fixture.context.id, start: 6, end: 10, language: 'en', context: 'A partial dictionary result.' });
      });
      await a.locator('#caption .word').click();
      await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#meanings-en')?.textContent.includes('超时'), null, { timeout: 10000 });
      assert.ok((await a.locator('#meanings-zh').textContent()).includes('测试中文释义'));
      assert.equal(await a.locator('#dictionary-copy-zh').count(), 1);
      await save(a, 'Partial response preserved');
      const saved = state.saved.words.find(item => item.word === 'partial');
      assert.ok(saved.dictionary.zh); assert.equal(saved.dictionary.en, null); assert.ok(saved.dictionary.issues.en.includes('超时'));
      await a.evaluate(() => fixture.stallEnglish = false);
    });
    await run('Read failure blocks saving and requires a successful retry; existing words remain', async () => {
      state.failRead = true;
      const c = await init(browser, 'video-C'); await clickWord(c, 'gamma'); await c.locator('#definition').fill('Note C');
      assert.equal(await c.locator('#word-save').isDisabled(), true);
      const before = JSON.stringify(state.saved), start = state.messages.length;
      await c.locator('#word-save').evaluate(element => element.dispatchEvent(new Event('click')));
      await c.evaluate(() => Promise.resolve()); assert.equal(JSON.stringify(state.saved), before);
      assert.equal(state.messages.slice(start).some(item => item.request.operation === 'upsert'), false);
      state.failRead = false; await c.locator('#vocabulary-retry').click();
      await c.waitForFunction(() => !document.querySelector('#host').shadowRoot.querySelector('#word-save').disabled);
      const previous = await mutationCount(c); await c.locator('#word-save').click(); await waitMutation(c, previous);
      assert.ok(state.saved.words.some(item => item.word === 'alpha')); assert.ok(state.saved.words.some(item => item.word === 'gamma'));
      await c.close();
    });
    await run('Search and pagination reach old saved entries; refresh preserves unsaved draft text', async () => {
      const seed = Array.from({ length: 105 }, (_, index) => entry('entry-' + String(index).padStart(3, '0'), { at: index + 10 }));
      assert.equal((await repository.handle({ operation: 'import', entries: seed })).ok, true);
      await a.evaluate(() => learning.show()); await a.locator('#vocabulary-details').evaluate(element => element.open = true);
      assert.equal(await a.locator('#vocabulary button').count(), 50);
      await a.locator('#vocabulary-next').click(); assert.equal(await a.locator('#vocabulary button').count(), 50);
      await a.locator('#vocabulary-next').click(); assert.ok(await a.locator('#vocabulary button').count() > 0);
      await a.locator('#vocabulary-search').fill('entry-000'); assert.equal(await a.locator('#vocabulary button').count(), 1);
      await a.locator('#vocabulary button').click(); await a.locator('#definition').fill('Unsaved local draft');
      await a.locator('#vocabulary-refresh').click();
      await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#vocabulary-refresh-status').textContent.includes('词本已刷新'));
      assert.equal(await a.locator('#definition').inputValue(), 'Unsaved local draft');
    });
    await run('Import versions 1–5 are previewed without writes; explicit merge retains existing notes and provenance', async () => {
      const backupSection = a.locator('#vocabulary-import').locator('xpath=..'); await backupSection.evaluate(element => element.open = true);
      const original = structuredClone(state.saved.words.find(item => item.id === alpha));
      const recovered = entry('recovered', { definition: 'Recovered note', dictionary: original.dictionary });
      const before = JSON.stringify(state.saved);
      for (const version of [1, 2, 3, 4, 5]) {
        await upload(a, { version, words: [{ ...original, definition: 'Must not replace' }, recovered] });
        await a.waitForFunction(() => !document.querySelector('#host').shadowRoot.querySelector('#vocabulary-import-preview').hidden);
        assert.equal(JSON.stringify(state.saved), before);
      }
      await a.locator('#vocabulary-import-confirm').click();
      await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#vocabulary-import-status').textContent.includes('合并恢复完成'));
      assert.equal(state.saved.words.find(item => item.id === alpha).definition, original.definition);
      const saved = state.saved.words.find(item => item.word === 'recovered');
      assert.equal(saved.definition, 'Recovered note'); assert.equal(saved.context, recovered.context); assert.equal(saved.at, 5);
      assert.equal(saved.dictionary.zh.article, original.dictionary.zh.article); assert.equal(saved.dictionary.en.license, 'CC BY-SA 4.0');
    });
    await run('Invalid version, unsafe source, invalid entry, oversized file and too many entries cannot write', async () => {
      const before = JSON.stringify(state.saved), start = state.messages.length;
      const invalid = [
        { version: 99, words: [] }, { version: 5, words: [entry('invalid', { at: -1 })] },
        { version: 5, words: [entry('invalid', { definition: 'x'.repeat(4001) })] },
        { version: 5, words: [entry('invalid', { dictionary: { language: 'zh', meanings: ['释义'], article: 'javascript:alert(1)' } })] },
        { version: 5, words: Array.from({ length: 5001 }, () => entry('many')) }, Buffer.alloc(16 * 1024 * 1024 + 1, 32)
      ];
      for (const value of invalid) {
        await upload(a, value);
        await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#vocabulary-import-preview').hidden);
        assert.equal(await a.locator('#vocabulary-import-confirm').isDisabled(), true);
      }
      assert.equal(JSON.stringify(state.saved), before);
      assert.equal(state.messages.slice(start).some(item => item.request.operation === 'import'), false);
    });
    await run('In-flight merge locks cancel and file changes; forced events cannot suppress the completion result', async () => {
      await upload(a, { version: 5, words: [entry('delayed-merge')] });
      await a.waitForFunction(() => !document.querySelector('#host').shadowRoot.querySelector('#vocabulary-import-preview').hidden);
      state.writeBlocked = false;
      state.writeGate = new Promise(resolve => { state.releaseWrite = resolve; });
      try {
        await a.locator('#vocabulary-import-confirm').click();
        assert.equal(await a.locator('#vocabulary-import').isDisabled(), true);
        assert.equal(await a.locator('#vocabulary-import-cancel').isDisabled(), true);
        await a.locator('#vocabulary-import-cancel').evaluate(element => element.dispatchEvent(new Event('click')));
        await a.locator('#vocabulary-import').evaluate(element => element.dispatchEvent(new Event('change')));
        assert.ok((await a.locator('#vocabulary-import-status').textContent()).includes('正在合并恢复'));
      } finally { state.releaseWrite(); state.writeGate = null; }
      await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#vocabulary-import-status').textContent.includes('合并恢复完成'));
      assert.ok(state.saved.words.some(item => item.word === 'delayed-merge'));
      assert.equal(await a.locator('#vocabulary-import').isDisabled(), false);
    });
    await run('Single-item deletion requires the named confirmation, and cancellation preserves the record', async () => {
      await a.locator('#vocabulary-search').fill('recovered'); await a.locator('#vocabulary button').click();
      const saved = state.saved.words.find(item => item.word === 'recovered'), before = state.saved.words.length;
      await a.locator('#word-delete').click(); assert.ok((await a.locator('#delete-description').textContent()).includes('recovered'));
      await a.addScriptTag({ path: path.join(root, 'extension', 'i18n.js') });
      await a.evaluate(() => { YTDSI18n.setPreference('zh-CN'); window.stopLearningI18n = YTDSI18n.observe(document.querySelector('#host').shadowRoot); YTDSI18n.setPreference('en'); learning.languageChanged(); });
      await a.waitForFunction(() => !/[\u3400-\u9fff]/.test(document.querySelector('#host').shadowRoot.querySelector('#delete-description').textContent));
      assert.equal(await a.locator('#delete-word').textContent(), 'recovered');
      assert.equal(await a.locator('#delete-time').textContent(), '00:00:05.000');
      await a.evaluate(() => YTDSI18n.setPreference('zh-CN'));
      await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#delete-description').textContent.includes('确认删除收藏：'));
      assert.equal(state.saved.words.length, before); await a.locator('#word-delete-cancel').click(); assert.equal(state.saved.words.length, before);
      await a.locator('#word-delete').click(); await a.locator('#word-delete-confirm').click();
      await a.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#word-state').textContent.includes('已删除所选收藏'));
      assert.equal(state.saved.words.length, before - 1); assert.equal(state.saved.words.some(item => item.id === saved.id), false);
    });
    await run('JSON version 5 and CSV export preserve notes, context, timestamp, definitions and source/licence; replay remains intact', async () => {
      await a.locator('#vocabulary-search').fill('alpha'); await a.locator('#vocabulary button').click();
      await a.locator('#word-jump').click(); assert.equal(await a.evaluate(() => fixture.jumps.at(-1)), 2);
      await a.locator('#word-json').click(); await a.waitForFunction(() => fixture.downloads.some(item => item.name.endsWith('.json')));
      const data = JSON.parse(await a.evaluate(() => fixture.downloads.find(item => item.name.endsWith('.json')).text));
      assert.equal(data.version, 5); const exported = data.words.find(item => item.id === alpha);
      assert.equal(exported.definition, 'Changed in A'); assert.equal(exported.at, 2); assert.equal(exported.mastered, true);
      assert.ok(exported.dictionary.zh.article && exported.dictionary.en.article && exported.url.includes('t=2s'));
      await a.locator('#word-csv').click(); await a.waitForFunction(() => fixture.downloads.some(item => item.name.endsWith('.csv')));
      const csv = await a.evaluate(() => fixture.downloads.find(item => item.name.endsWith('.csv')).text);
      assert.ok(csv.includes('Changed in A') && csv.includes('CC BY-SA 4.0') && csv.includes(alpha));
      assert.ok(await a.evaluate(() => fixture.opened > 0 && fixture.pauses > 0));
    });
    await run('A legal 5000-entry vocabulary exports a >4 MiB JSON backup that restores into empty fixture storage', async () => {
      const previous = structuredClone(state.saved);
      let largePage;
      try {
        state.saved = { words: [], wordsRevision: 0 };
        const bulk = Array.from({ length: 5000 }, (_, index) => entry('bulk-' + index, { at: index, definition: 'n'.repeat(500) }));
        const imported = await repository.handle({ operation: 'import', entries: bulk });
        assert.equal(imported.ok, true); assert.equal(imported.words.length, 5000);
        assert.ok(Buffer.byteLength(JSON.stringify(state.saved.words)) <= 4 * 1024 * 1024);
        largePage = await init(browser, 'large-book');
        await largePage.locator('#word-json').click();
        await largePage.waitForFunction(() => fixture.downloads.some(item => item.name.endsWith('.json')));
        const backup = await largePage.evaluate(() => fixture.downloads.find(item => item.name.endsWith('.json')).text);
        const bytes = Buffer.byteLength(backup);
        assert.ok(bytes > 4 * 1024 * 1024 && bytes <= 16 * 1024 * 1024);
        await largePage.close(); largePage = null;
        state.saved = { words: [], wordsRevision: 0 };
        largePage = await init(browser, 'restore-large-book');
        assert.equal(state.saved.words.length, 0);
        await largePage.locator('#vocabulary-import').locator('xpath=..').evaluate(element => element.open = true);
        await upload(largePage, Buffer.from(backup));
        await largePage.waitForFunction(() => !document.querySelector('#host').shadowRoot.querySelector('#vocabulary-import-preview').hidden);
        await largePage.locator('#vocabulary-import-confirm').click();
        await largePage.waitForFunction(() => document.querySelector('#host').shadowRoot.querySelector('#vocabulary-import-status').textContent.includes('合并恢复完成'));
        assert.equal(state.saved.words.length, 5000);
        assert.equal(state.saved.wordsRevision, 1);
        assert.ok(state.saved.words.every(item => item.definition === 'n'.repeat(500)));
        report.backupBoundary = { entries: 5000, storedBytes: Buffer.byteLength(JSON.stringify(state.saved.words)), exportedBytes: bytes, restoredIntoEmptyFixture: true, resultingRevision: state.saved.wordsRevision };
      } finally { if (largePage) await largePage.close(); state.saved = previous; }
    });
    assert.deepEqual(report.errors, []);
    report.pass = true;
  } catch (error) {
    report.pass = false; report.failure = String(error.stack); throw error;
  } finally {
    report.generatedAt = new Date().toISOString();
    report.sourceSha256 = Object.fromEntries(['learning.js', 'vocabulary-store.js', 'dictionary.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'extension', file))).digest('hex')]));
    fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evidence', 'learning-candidate.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
