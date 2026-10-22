const { test } = require('node:test');
const assert = require('node:assert/strict');
const V = require('../extension/vocabulary-store.js');
const word = (name = 'alpha', overrides = {}) => ({ word: name, context: `A sentence about ${name}.`, videoId: 'video_A', at: 5, language: 'en', definition: 'my note', dictionary: null, mastered: false, createdAt: '2026-01-01T00:00:00.000Z', ...overrides });
const dictionary = () => ({ version: 3, word: 'alpha', targetLanguage: 'zh-Hans', sourceLanguage: 'en', zh: { language: 'zh', meanings: ['阿尔法'], article: 'https://zh.wiktionary.org/wiki/alpha', licenseURL: 'https://evil.example/license' }, en: { language: 'en', meanings: ['The first letter.'], article: 'https://en.wiktionary.org/wiki/alpha' }, issues: { zh: '', en: '' } });
function memory(initial = {}) {
  const state = { value: structuredClone(initial), reads: 0, writes: 0, failRead: false, failWrite: false, delay: 0 };
  const area = {
    async get() { state.reads++; if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay)); if (state.failRead) throw Error('private-read-detail'); return structuredClone(state.value); },
    async set(value) { state.writes++; if (state.failWrite) throw Error('private-write-detail'); state.value = { ...state.value, ...structuredClone(value) }; }
  };
  return { state, area, repository: V.createRepository(area) };
}

test('legacy list preserves records, generates stable IDs without silently writing', async () => {
  const legacy = word('alpha', { dictionary: { language: 'en', meanings: ['First letter.'], article: 'https://en.wiktionary.org/wiki/alpha' } });
  const m = memory({ words: [legacy], layout: { top: { size: 40 } } });
  const a = await m.repository.handle({ operation: 'list' });
  const b = await V.createRepository(m.area).handle({ operation: 'list' });
  assert.equal(a.ok, true); assert.equal(a.revision, 0); assert.equal(a.words[0].id, b.words[0].id);
  assert.equal(a.words[0].definition, legacy.definition); assert.equal(a.words[0].dictionary.en.meanings[0], 'First letter.');
  assert.equal(m.state.writes, 0); assert.equal(m.state.value.words[0].id, undefined);
  const saved = await m.repository.handle({ operation: 'upsert', id: a.words[0].id, changes: { definition: 'new note' } });
  assert.equal(saved.ok, true); assert.equal(saved.entryId, a.words[0].id); assert.equal(saved.revision, 1);
  assert.equal(m.state.value.words[0].id, a.words[0].id); assert.equal(m.state.value.layout.top.size, 40);
});

test('pre-ID duplicate legacy records remain present with distinct stable IDs', async () => {
  const m = memory({ words: [word(), word()] });
  const a = await m.repository.handle({ operation: 'list' }), b = await m.repository.handle({ operation: 'list' });
  assert.equal(a.ok, true); assert.equal(a.words.length, 2); assert.notEqual(a.words[0].id, a.words[1].id);
  assert.deepEqual(a.words.map(x => x.id), b.words.map(x => x.id)); assert.equal(m.state.writes, 0);
});

test('concurrent tab additions serialize against latest stored vocabulary', async () => {
  const m = memory({ words: [], preferences: { targetLanguage: 'en' } }); m.state.delay = 2;
  const replies = await Promise.all(['alpha', 'beta', 'gamma'].map(name => m.repository.handle({ operation: 'upsert', entry: word(name) })));
  assert.ok(replies.every(reply => reply.ok)); assert.deepEqual(m.state.value.words.map(x => x.word), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(replies.map(reply => reply.revision), [1, 2, 3]); assert.equal(m.state.value.preferences.targetLanguage, 'en');
});

test('queued note, dictionary and mastery patches do not overwrite unrelated fields', async () => {
  const m = memory({ words: [word()] }); const id = (await m.repository.handle({ operation: 'list' })).words[0].id;
  const replies = await Promise.all([
    m.repository.handle({ operation: 'upsert', id, changes: { definition: 'edited in tab A' } }),
    m.repository.handle({ operation: 'upsert', id, changes: { dictionary: dictionary() } }),
    m.repository.handle({ operation: 'upsert', id, changes: { mastered: true } })
  ]);
  assert.ok(replies.every(reply => reply.ok)); const saved = m.state.value.words[0];
  assert.equal(saved.definition, 'edited in tab A'); assert.equal(saved.mastered, true); assert.equal(saved.dictionary.zh.meanings[0], '阿尔法');
  assert.equal(saved.dictionary.zh.licenseURL, 'https://creativecommons.org/licenses/by-sa/4.0/');
});

test('clearing a note is an intentional valid field update', async () => {
  const m = memory({ words: [word()] }); const id = (await m.repository.handle({ operation: 'list' })).words[0].id;
  const response = await m.repository.handle({ operation: 'upsert', id, changes: { definition: '' } });
  assert.equal(response.ok, true); assert.equal(response.words[0].definition, '');
});

test('read failure blocks writes and retry retains existing vocabulary', async () => {
  const m = memory({ words: [word('already-saved')] }); m.state.failRead = true;
  const failed = await m.repository.handle({ operation: 'upsert', entry: word('new-word') });
  assert.equal(failed.code, 'READ_FAILED'); assert.equal(m.state.writes, 0); assert.ok(!failed.error.includes('private-read-detail'));
  m.state.failRead = false; const saved = await m.repository.handle({ operation: 'upsert', entry: word('new-word') });
  assert.equal(saved.ok, true); assert.deepEqual(saved.words.map(x => x.word), ['already-saved', 'new-word']);
});

test('corrupt stored vocabulary blocks mutation instead of dropping bad records', async () => {
  for (const words of [null, {}, [word(), { word: 'bad' }]]) {
    const m = memory({ words }); const before = structuredClone(m.state.value);
    const reply = await m.repository.handle({ operation: 'upsert', entry: word('new') });
    assert.equal(reply.code, 'CORRUPT_STORAGE'); assert.equal(m.state.writes, 0); assert.deepEqual(m.state.value, before);
  }
});

test('write failure returns no success snapshot; retry rereads external changes', async () => {
  const m = memory({ words: [word('alpha')], wordsRevision: 9 }); m.state.failWrite = true;
  const failed = await m.repository.handle({ operation: 'upsert', entry: word('beta') });
  assert.equal(failed.code, 'WRITE_FAILED'); assert.equal(failed.words, undefined); assert.equal(m.state.value.wordsRevision, 9);
  assert.ok(!failed.error.includes('private-write-detail'));
  m.state.value.words.push(word('gamma')); m.state.value.wordsRevision = 10; m.state.failWrite = false;
  const saved = await m.repository.handle({ operation: 'upsert', entry: word('beta') });
  assert.equal(saved.revision, 11); assert.deepEqual(saved.words.map(x => x.word), ['alpha', 'gamma', 'beta']);
});

test('import is additive, keeps notes/mastery and skips duplicate identities', async () => {
  const m = memory({ words: [word('alpha', { mastered: true, definition: 'keep this note' })] });
  const reply = await m.repository.handle({ operation: 'import', entries: [word('alpha', { definition: 'older backup', mastered: false }), word('beta')] });
  assert.equal(reply.ok, true); assert.equal(reply.imported, 1); assert.equal(reply.skipped, 1);
  assert.equal(reply.words[0].definition, 'keep this note'); assert.equal(reply.words[0].mastered, true);
  const noop = await m.repository.handle({ operation: 'import', entries: [word('alpha'), word('beta')] });
  assert.equal(noop.revision, reply.revision); assert.equal(noop.imported, 0); assert.equal(m.state.writes, 1);
});

test('import rejects an entire malformed batch and unsafe dictionary links', async () => {
  const invalid = [word('bad', { at: -1 }), word('bad', { language: '<script>' }), word('bad', { videoId: '../other' }), word('bad', { definition: 123 })];
  const dangerous = dictionary(); dangerous.zh.article = 'javascript:alert(1)'; invalid.push(word('bad', { dictionary: dangerous }));
  for (const entry of invalid) {
    const m = memory({ words: [word()] }), before = structuredClone(m.state.value);
    const reply = await m.repository.handle({ operation: 'import', entries: [word('otherwise-valid'), entry] });
    assert.equal(reply.ok, false); assert.equal(m.state.writes, 0); assert.deepEqual(m.state.value, before);
  }
});

test('dictionary normalization accepts partial results but strips untrusted extras', () => {
  const input = dictionary(); input.zh.arbitrary = { deeply: 'nested' }; input.en = null; input.issues.en = 'Timed out';
  const result = V.normalizeDictionary(input);
  assert.equal(result.zh.arbitrary, undefined); assert.equal(result.en, null); assert.equal(result.issues.en, 'Timed out');
  assert.equal(result.zh.provider, '维基词典贡献者');
});

test('backup import rejects reused IDs with changed identity', async () => {
  const m = memory({ words: [word()] }); const first = (await m.repository.handle({ operation: 'list' })).words[0];
  const reply = await m.repository.handle({ operation: 'import', entries: [{ ...word('different'), id: first.id }] });
  assert.equal(reply.code, 'ID_CONFLICT'); assert.equal(m.state.writes, 0);
});

test('word-count overflow and byte overflow leave existing vocabulary unchanged', async () => {
  const m = memory({ words: [word()] });
  const tooMany = Array.from({ length: 5001 }, (_, i) => word('w' + i, { at: i }));
  assert.equal((await m.repository.handle({ operation: 'import', entries: tooMany })).code, 'LIMIT_COUNT');
  const tooBig = Array.from({ length: 1060 }, (_, i) => word('w' + i, { at: i, definition: 'x'.repeat(4000) }));
  assert.equal((await m.repository.handle({ operation: 'import', entries: tooBig })).code, 'LIMIT_BYTES');
  assert.equal(m.state.writes, 0); assert.equal(m.state.value.words.length, 1);
});

test('combined existing and incoming record counts are checked before writing', async () => {
  const seed = Array.from({ length: 4999 }, (_, i) => word('seed' + i, { at: i }));
  const m = memory({ words: seed });
  const reply = await m.repository.handle({ operation: 'import', entries: [word('new-one'), word('new-two')] });
  assert.equal(reply.code, 'LIMIT_COUNT'); assert.equal(m.state.writes, 0); assert.equal(m.state.value.words.length, 4999);
});

test('a larger legacy vocabulary remains readable and shrinkable under the new quota', async () => {
  const old = Array.from({ length: 1060 }, (_, i) => word('old' + i, { at: i, definition: 'x'.repeat(4000) }));
  const m = memory({ words: old });
  const list = await m.repository.handle({ operation: 'list' });
  assert.equal(list.ok, true); assert.equal(list.words.length, old.length); assert.equal(m.state.writes, 0);
  const growth = await m.repository.handle({ operation: 'upsert', entry: word('more') });
  assert.equal(growth.code, 'LIMIT_BYTES'); assert.equal(m.state.writes, 0);
  const reduced = await m.repository.handle({ operation: 'delete', id: list.words[0].id });
  assert.equal(reduced.ok, true); assert.equal(reduced.words.length, old.length - 1);
  assert.equal((await m.repository.handle({ operation: 'list' })).words.length, old.length - 1);
});

test('same sentence and word deduplicates without changing original replay time', async () => {
  const m = memory();
  const a = await m.repository.handle({ operation: 'upsert', entry: word('alpha', { at: 5.5, cueStart: 4, cueEnd: 9 }) });
  const b = await m.repository.handle({ operation: 'upsert', entry: word('alpha', { at: 8, cueStart: 4, cueEnd: 9, definition: 'stale note' }) });
  assert.equal(b.words.length, 1); assert.equal(b.entryId, a.entryId); assert.equal(b.deduplicated, true); assert.equal(b.words[0].at, 5.5); assert.equal(b.words[0].definition, 'my note');
  const french = await m.repository.handle({ operation: 'upsert', entry: word('alpha', { at: 8, cueStart: 4, cueEnd: 9, language: 'fr' }) });
  assert.equal(french.words.length, 2);
});

test('cue-less legacy near-time matching remains compatible without mixing languages', async () => {
  const m = memory({ words: [word('alpha', { at: 5 })] });
  const a = await m.repository.handle({ operation: 'upsert', entry: word('alpha', { at: 5.3, cueStart: 4, cueEnd: 9 }) });
  assert.equal(a.words.length, 1); assert.equal(a.words[0].at, 5);
  const b = await m.repository.handle({ operation: 'upsert', entry: word('alpha', { at: 5.3, language: 'fr' }) });
  assert.equal(b.words.length, 2);
});

test('delete followed by stale dictionary completion cannot resurrect a word', async () => {
  const m = memory({ words: [word()] }); const id = (await m.repository.handle({ operation: 'list' })).words[0].id;
  const deleted = await m.repository.handle({ operation: 'delete', id });
  const stale = await m.repository.handle({ operation: 'upsert', id, changes: { dictionary: dictionary() } });
  assert.equal(deleted.ok, true); assert.equal(stale.code, 'NOT_FOUND'); assert.deepEqual(m.state.value.words, []);
});

test('invalid patches cannot change identity or inject fields', async () => {
  const m = memory({ words: [word()] }); const id = (await m.repository.handle({ operation: 'list' })).words[0].id;
  for (const changes of [{ at: 99 }, { word: 'new' }, {}, { definition: 'ok', extra: 'no' }]) {
    const result = await m.repository.handle({ operation: 'upsert', id, changes }); assert.equal(result.ok, false);
  }
  assert.equal(m.state.writes, 0);
});

test('requests are copied at enqueue time and response edits are not persisted', async () => {
  const m = memory(); m.state.delay = 2;
  const request = { operation: 'upsert', entry: word('alpha') }; const pending = m.repository.handle(request); request.entry.word = 'tampered';
  const reply = await pending; reply.words[0].definition = 'mutated response';
  assert.equal(m.state.value.words[0].word, 'alpha'); assert.equal(m.state.value.words[0].definition, 'my note');
});
