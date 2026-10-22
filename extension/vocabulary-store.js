(function (root) {
  "use strict";
  const D = typeof module !== "undefined" && module.exports ? require("./dictionary.js") : root.YTDSDictionary;
  const MAX_WORDS = 5000, MAX_BYTES = 4 * 1024 * 1024;
  const messages = {
    INVALID_REQUEST: "收藏请求无效，未修改本地数据。",
    INVALID_ENTRY: "收藏或备份包含无效条目，未修改本地数据。",
    INVALID_DICTIONARY: "词典来源或释义格式无效，未修改本地数据。",
    ID_CONFLICT: "收藏标识与已有条目不一致，未修改本地数据。",
    NOT_FOUND: "此收藏已不存在，请刷新词本后重试。",
    LIMIT_COUNT: "本地收藏最多 5000 条，请先导出备份并删除不需要的条目。",
    LIMIT_BYTES: "收藏超过 4 MiB 容量上限，未修改本地数据。",
    READ_FAILED: "读取本地收藏失败，请重试；未保存任何更改。",
    WRITE_FAILED: "保存收藏失败，尚未确认更改已写入本地存储。请重试。",
    CORRUPT_STORAGE: "本地收藏数据格式异常，已停止写入以保护原有数据。"
  };
  class StoreError extends Error {
    constructor(code) { super(messages[code]); this.code = code; }
  }
  const fail = code => { throw new StoreError(code); };
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const idPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
  const languagePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,2}$/i;
  function sizeOf(value) {
    try { return new TextEncoder().encode(JSON.stringify(value)).length; }
    catch { fail("INVALID_ENTRY"); }
  }
  function capacity(words, { previousBytes = 0, allowShrink = false } = {}) {
    if (words.length > MAX_WORDS) fail("LIMIT_COUNT");
    const bytes = sizeOf(words);
    if (bytes > MAX_BYTES && !(allowShrink && bytes < previousBytes)) fail("LIMIT_BYTES");
  }
  function text(value, max, { empty = true } = {}) {
    if (typeof value !== "string" || value.length > max || (!empty && !value.trim())) fail("INVALID_ENTRY");
    return value;
  }
  function mediaTime(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1e9) fail("INVALID_ENTRY");
    return value;
  }
  function identity(entry) {
    return JSON.stringify([entry.word.trim().toLowerCase(), entry.videoId, entry.language, entry.cueStart !== undefined ? ["cue", entry.cueStart] : ["at", entry.at]]);
  }
  // Deterministic identifiers for pre-ID local records. These are identity keys,
  // not authentication tokens; collisions are checked against the record itself.
  function stableId(entry) {
    const input = identity(entry);
    let a = 2166136261, b = 2246822519, c = 3266489917, d = 668265263;
    for (let i = 0; i < input.length; i++) {
      const n = input.charCodeAt(i);
      a = Math.imul(a ^ n, 16777619); b = Math.imul(b ^ n, 3266489917);
      c = Math.imul(c ^ n, 668265263); d = Math.imul(d ^ n, 374761393);
    }
    return "word-" + [a, b, c, d].map(n => (n >>> 0).toString(16).padStart(8, "0")).join("");
  }
  function dictionaryEntry(entry) {
    if (!entry) return null;
    const result = {
      language: entry.language,
      meanings: entry.meanings.map(value => value),
      article: entry.article,
      provider: "维基词典贡献者",
      license: "CC BY-SA 4.0",
      licenseURL: D.licenseURL
    };
    for (const key of ["modified", "fetchedAt"]) if (typeof entry[key] === "string") result[key] = entry[key].slice(0, 300);
    if (Array.isArray(entry.partsOfSpeech)) result.partsOfSpeech = entry.partsOfSpeech.filter(value => typeof value === "string" && value.length <= 40).slice(0, 16);
    return result;
  }
  function normalizeDictionary(value) {
    if (value == null) return null;
    if (!object(value) || !D || sizeOf(value) > 64 * 1024) fail("INVALID_DICTIONARY");
    if (own(value, "version") && ![1, 2, 3].includes(value.version)) fail("INVALID_DICTIONARY");
    const paired = value.version === 2 || value.version === 3;
    for (const entry of paired ? [value.zh, value.en] : [value]) {
      if (entry == null) continue;
      if (!object(entry) || !Array.isArray(entry.meanings) || !entry.meanings.length || entry.meanings.length > 4 || entry.meanings.some(meaning => typeof meaning !== "string" || !meaning.trim() || meaning.length > 400)) fail("INVALID_DICTIONARY");
    }
    let normalized;
    try { normalized = D.storedFor(value); } catch { fail("INVALID_DICTIONARY"); }
    if (!normalized) fail("INVALID_DICTIONARY");
    if (paired) {
      for (const key of ["zh", "en"]) if (value[key] != null && (!object(value[key]) || !normalized[key])) fail("INVALID_DICTIONARY");
    } else if (!normalized[value.language]) fail("INVALID_DICTIONARY");
    const result = {
      version: 3,
      word: typeof normalized.word === "string" ? normalized.word.slice(0, 200) : "",
      zh: dictionaryEntry(normalized.zh),
      en: dictionaryEntry(normalized.en),
      issues: { zh: String(normalized.issues?.zh || "").slice(0, 300), en: String(normalized.issues?.en || "").slice(0, 300) }
    };
    for (const key of ["targetLanguage", "sourceLanguage"]) {
      if (typeof normalized[key] !== "string" || !languagePattern.test(normalized[key])) fail("INVALID_DICTIONARY");
      result[key] = normalized[key];
    }
    // Recompute display policy and licence fields, then return only known data.
    const policy = D.selection(result);
    for (const key of ["primaryLanguage", "explanationLanguage", "targetIssue", "sourceIssue"]) result[key] = policy[key];
    result.alignment = String(normalized.alignment || "").slice(0, 1000);
    return result;
  }
  function normalizeEntry(value) {
    if (!object(value)) fail("INVALID_ENTRY");
    const word = text(value.word, 200, { empty: false });
    if (/[\u0000-\u001f\u007f]/.test(word)) fail("INVALID_ENTRY");
    const videoId = text(value.videoId, 200, { empty: false });
    if (!/^[A-Za-z0-9_-]+$/.test(videoId)) fail("INVALID_ENTRY");
    const language = value.language === undefined ? "und" : text(value.language, 32, { empty: false });
    if (!languagePattern.test(language)) fail("INVALID_ENTRY");
    const entry = {
      word, context: text(value.context, 8000), videoId, at: mediaTime(value.at), language,
      definition: value.definition === undefined ? "" : text(value.definition, 4000),
      mastered: value.mastered === undefined ? false : value.mastered,
      dictionary: normalizeDictionary(value.dictionary)
    };
    if (typeof entry.mastered !== "boolean") fail("INVALID_ENTRY");
    if (value.createdAt !== undefined) {
      entry.createdAt = text(value.createdAt, 64, { empty: false });
      if (!Number.isFinite(Date.parse(entry.createdAt))) fail("INVALID_ENTRY");
    }
    for (const key of ["cueStart", "cueEnd"]) if (value[key] !== undefined) entry[key] = mediaTime(value[key]);
    if (entry.cueEnd !== undefined && entry.cueStart !== undefined && entry.cueEnd <= entry.cueStart) fail("INVALID_ENTRY");
    if (value.id !== undefined && (typeof value.id !== "string" || !idPattern.test(value.id))) fail("INVALID_ENTRY");
    entry.id = value.id || stableId(entry);
    return entry;
  }
  function normalizeWords(raw, { enforceCapacity = true } = {}) {
    if (!Array.isArray(raw)) fail("INVALID_ENTRY");
    if (raw.length > MAX_WORDS) fail("LIMIT_COUNT");
    if (sizeOf(raw) > MAX_BYTES * (enforceCapacity ? 2 : 4)) fail("LIMIT_BYTES");
    const ids = new Map();
    const words = raw.map(value => {
      const entry = normalizeEntry(value), base = entry.id;
      if (ids.has(base)) {
        // Preserve genuinely duplicated pre-ID records instead of silently deleting
        // them during migration. Explicit conflicting IDs are never accepted.
        if (own(value, "id")) fail("ID_CONFLICT");
        let suffix = 2;
        while (ids.has(entry.id)) entry.id = base + "-" + suffix++;
      }
      ids.set(entry.id, true);
      return entry;
    });
    if (enforceCapacity) capacity(words);
    return words;
  }
  function sameRecord(a, b) {
    if (a.word.trim().toLowerCase() !== b.word.trim().toLowerCase() || a.videoId !== b.videoId || a.language !== b.language) return false;
    if (a.cueStart !== undefined && b.cueStart !== undefined) return a.cueStart === b.cueStart;
    return Math.abs(a.at - b.at) < 1;
  }
  function validateChanges(changes) {
    if (!object(changes) || !Object.keys(changes).length || Object.keys(changes).some(key => !["definition", "mastered", "dictionary"].includes(key))) fail("INVALID_REQUEST");
    const result = {};
    if (own(changes, "definition")) result.definition = text(changes.definition, 4000);
    if (own(changes, "mastered")) {
      if (typeof changes.mastered !== "boolean") fail("INVALID_ENTRY");
      result.mastered = changes.mastered;
    }
    if (own(changes, "dictionary")) result.dictionary = normalizeDictionary(changes.dictionary);
    return result;
  }
  function previewImport(existing, incoming) {
    const words = normalizeWords(existing, { enforceCapacity: false }), additions = normalizeWords(incoming);
    let imported = 0, skipped = 0;
    for (const entry of additions) {
      const byId = words.find(item => item.id === entry.id);
      if (byId && identity(byId) !== identity(entry)) fail("ID_CONFLICT");
      if (byId || words.some(item => sameRecord(item, entry))) { skipped++; continue; }
      words.push(entry); imported++;
    }
    if (imported) capacity(words);
    return { words, imported, skipped };
  }
  function createRepository(storageArea) {
    let queue = Promise.resolve();
    async function execute(request) {
      if (!object(request) || !["list", "upsert", "delete", "import"].includes(request.operation)) fail("INVALID_REQUEST");
      let saved;
      try { saved = await storageArea.get(["words", "wordsRevision"]); }
      catch { fail("READ_FAILED"); }
      let words, revision;
      try {
        if (!object(saved)) fail("CORRUPT_STORAGE");
        words = normalizeWords(own(saved, "words") ? saved.words : [], { enforceCapacity: false });
        revision = saved.wordsRevision === undefined ? 0 : saved.wordsRevision;
        if (!Number.isSafeInteger(revision) || revision < 0 || revision >= Number.MAX_SAFE_INTEGER) fail("CORRUPT_STORAGE");
      } catch { fail("CORRUPT_STORAGE"); }
      const previousBytes = sizeOf(words);
      let changed = false, entryId, imported, skipped, deduplicated;
      if (request.operation === "upsert") {
        let entry, index;
        if (request.id !== undefined) {
          if (typeof request.id !== "string" || !idPattern.test(request.id)) fail("INVALID_REQUEST");
          index = words.findIndex(item => item.id === request.id);
          if (index < 0) fail("NOT_FOUND");
        } else {
          entry = normalizeEntry(request.entry);
          index = words.findIndex(item => item.id === entry.id);
          if (index >= 0 && identity(words[index]) !== identity(entry)) fail("ID_CONFLICT");
          if (index < 0) index = words.findIndex(item => sameRecord(item, entry));
        }
        if (index >= 0) {
          entryId = words[index].id;
          deduplicated = request.id === undefined;
          if (request.changes !== undefined) {
            const next = { ...words[index], ...validateChanges(request.changes) };
            changed = JSON.stringify(next) !== JSON.stringify(words[index]);
            words[index] = next;
          } else if (request.id !== undefined) fail("INVALID_REQUEST");
        } else {
          if (request.changes !== undefined) entry = { ...entry, ...validateChanges(request.changes) };
          words.push(entry); entryId = entry.id; changed = true;
        }
      } else if (request.operation === "delete") {
        if (typeof request.id !== "string" || !idPattern.test(request.id)) fail("INVALID_REQUEST");
        const index = words.findIndex(item => item.id === request.id);
        if (index < 0) fail("NOT_FOUND");
        words.splice(index, 1); changed = true;
      } else if (request.operation === "import") {
        const merged = previewImport(words, request.entries);
        words = merged.words; imported = merged.imported; skipped = merged.skipped; changed = imported > 0;
      }
      if (changed) {
        // A previously valid larger vocabulary remains readable/exportable and
        // can be reduced. The new quota must not trap existing user data.
        capacity(words, { previousBytes, allowShrink: true });
        try { await storageArea.set({ words, wordsRevision: revision + 1 }); }
        catch { fail("WRITE_FAILED"); }
        revision++;
      }
      return { ok: true, words, revision, ...(entryId ? { entryId } : {}), ...(deduplicated ? { deduplicated: true } : {}), ...(imported !== undefined ? { imported, skipped } : {}) };
    }
    function handle(request) {
      // Clone at enqueue time so one caller cannot mutate a later queued operation.
      let snapshot;
      try { snapshot = structuredClone(request); }
      catch { return Promise.resolve({ ok: false, code: "INVALID_REQUEST", error: messages.INVALID_REQUEST }); }
      const operation = queue.then(() => execute(snapshot)).catch(error => {
        const code = error instanceof StoreError ? error.code : "INVALID_REQUEST";
        return { ok: false, code, error: messages[code] };
      });
      queue = operation.then(() => undefined);
      return operation;
    }
    return { handle };
  }
  const api = { createRepository, normalizeEntry, normalizeWords, normalizeDictionary, previewImport, stableId, sameRecord, MAX_WORDS, MAX_BYTES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.YTDSVocabularyStore = api;
})(globalThis);
