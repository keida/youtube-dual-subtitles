(function (root) {
  "use strict";
  root.YTDSLearning = function (shadow, api) {
    const panel = document.createElement("section");
    panel.id = "word-panel"; panel.hidden = true; panel.setAttribute("aria-label", "本地单词学习");
    panel.innerHTML = `
      <div class="actions"><button id="word-close">关闭</button><button id="review">复习下一个未掌握词</button></div>
      <h2 id="word-title" data-i18n-ui>本地生词本</h2><p id="word-context" data-user-content></p>
      <p>点英文词时仅向维基词典查询该词，不发送字幕、视频或生词本。</p>
      <div id="meanings" aria-label="词典释义"></div><p id="dictionary-state" role="status"></p>
      <p id="word-origin">我的笔记为手动内容，词典释义单独显示。</p>
      <button id="dictionary-query">查询 / 更新词典释义</button>
      <textarea id="definition" data-user-content aria-label="我的释义或笔记" placeholder="填写你自己的释义或笔记"></textarea>
      <div class="actions"><button id="word-save">收藏 / 保存笔记</button><button id="mastered">标记已掌握</button><button id="reveal">显示释义与笔记</button></div>
      <p id="word-state" role="status"></p><button id="vocabulary-retry" hidden>重试读取词本</button>
      <div class="actions"><button id="word-jump">在当前视频重听</button><a id="word-link" target="_blank" rel="noopener noreferrer" hidden>打开原视频时间点</a><button id="word-delete" disabled>删除此收藏</button></div>
      <div id="delete-confirmation" hidden><p id="delete-description"><span data-i18n-ui>确认删除收藏：</span><strong id="delete-word" data-user-content></strong><br><span data-i18n-ui>视频时间点：</span><span id="delete-time" data-user-content></span><br><span data-i18n-ui>此操作将删除该条收藏及笔记。</span></p><button id="word-delete-confirm">确认删除此条</button><button id="word-delete-cancel">取消删除</button></div>
      <details id="vocabulary-details"><summary>全部收藏</summary>
        <label for="vocabulary-search">搜索单词、原句或笔记</label><input id="vocabulary-search" type="search" maxlength="200" autocomplete="off">
        <button id="vocabulary-refresh">刷新词本</button><p id="vocabulary-refresh-status" role="status"></p>
        <div id="vocabulary" data-user-content></div><p id="vocabulary-page" role="status"></p>
        <div class="actions"><button id="vocabulary-previous">上一页</button><button id="vocabulary-next">下一页</button></div>
      </details>
      <div class="actions"><button id="word-json">导出 JSON 备份</button><button id="word-csv">导出 CSV</button></div>
      <details><summary>从 JSON 备份恢复</summary>
        <p>请先导出当前备份。恢复只合并新收藏，不替换词本，不覆盖已有重复条目。JSON 文件最多 16 MiB、5000 条；合并后的词本容量上限为 4 MiB。</p>
        <button id="vocabulary-backup">先导出当前备份</button>
        <label for="vocabulary-import">选择 JSON 备份</label><input id="vocabulary-import" type="file" accept=".json,application/json">
        <p id="vocabulary-import-status" role="status"></p>
        <div id="vocabulary-import-preview" hidden><p id="vocabulary-import-count"></p><button id="vocabulary-import-confirm">合并恢复</button><button id="vocabulary-import-cancel">取消恢复</button></div>
      </details>`;
    shadow.append(panel);
    const $ = selector => panel.querySelector(selector);
    const D = root.YTDSDictionary, dictCache = new Map();
    const PAGE_SIZE = 50, MAX_WORDS = 5000, MAX_IMPORT_BYTES = 16 * 1024 * 1024;
    let words = [], revision = -1, draft = null, active = true, loadedOk = false;
    let reviewMode = false, noteRevealed = true, noteDirty = false, dictionaryDirty = false;
    let editSequence = 0, reviewIndex = -1, pageIndex = 0, busy = 0;
    let queryAbort = null, querySequence = 0, readPromise = null, writes = Promise.resolve();
    let deleteId = null, importEntries = null, importSequence = 0, importing = false;

    function validEntry(item) {
      return item && typeof item === "object" && !Array.isArray(item) &&
        typeof item.word === "string" && item.word.trim() && item.word.length <= 200 && !/[\u0000-\u001f\u007f]/.test(item.word) &&
        typeof item.context === "string" && item.context.length <= 8000 &&
        typeof item.videoId === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(item.videoId) &&
        Number.isFinite(item.at) && item.at >= 0 && item.at <= 1e9 &&
        (item.definition === undefined || typeof item.definition === "string" && item.definition.length <= 4000) &&
        (item.mastered === undefined || typeof item.mastered === "boolean") &&
        (item.language === undefined || typeof item.language === "string" && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(item.language)) &&
        (item.id === undefined || typeof item.id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(item.id)) &&
        (item.createdAt === undefined || typeof item.createdAt === "string" && item.createdAt.length <= 64 && Number.isFinite(Date.parse(item.createdAt))) &&
        (item.cueStart === undefined || Number.isFinite(item.cueStart) && item.cueStart >= 0 && item.cueStart <= 1e9) &&
        (item.cueEnd === undefined || Number.isFinite(item.cueEnd) && item.cueEnd >= 0 && item.cueEnd <= 1e9 && (item.cueStart === undefined || item.cueEnd > item.cueStart));
    }
    function normalizeEntry(item) {
      if (!validEntry(item)) throw new Error("备份中有格式无效或过长的收藏，未导入任何条目。");
      let dictionary = null;
      if (item.dictionary != null) {
        const value = item.dictionary, paired = value?.version === 2 || value?.version === 3;
        if (typeof value !== "object" || Array.isArray(value) || (value.version !== undefined && ![1, 2, 3].includes(value.version)) || new TextEncoder().encode(JSON.stringify(value)).length > 64 * 1024)
          throw new Error("备份中有无效的词典来源，未导入任何条目。");
        for (const meaning of paired ? [value.zh, value.en] : [value]) {
          if (meaning == null) continue;
          if (!Array.isArray(meaning.meanings) || !meaning.meanings.length || meaning.meanings.length > 4 || meaning.meanings.some(text => typeof text !== "string" || !text.trim() || text.length > 400))
            throw new Error("备份中有无效的词典释义，未导入任何条目。");
        }
        dictionary = D.storedFor(item.dictionary);
        if (!dictionary || (item.dictionary.zh && !dictionary.zh) || (item.dictionary.en && !dictionary.en))
          throw new Error("备份中有无效的词典来源，未导入任何条目。");
      }
      const result = { word: item.word, context: item.context, videoId: item.videoId, at: item.at,
        language: item.language || "und", definition: item.definition || "", mastered: item.mastered === true, dictionary };
      for (const key of ["id", "createdAt", "cueStart", "cueEnd"]) if (item[key] !== undefined) result[key] = item[key];
      return result;
    }
    function url(entry) {
      const value = new URL("https://www.youtube.com/watch"); value.searchParams.set("v", entry.videoId);
      value.searchParams.set("t", String(Math.floor(entry.at)) + "s"); return value.href;
    }
    function same(a, b) {
      if (a.id && b.id) return a.id === b.id;
      if (a.word.toLowerCase() !== b.word.toLowerCase() || a.videoId !== b.videoId || (a.language || "und") !== (b.language || "und")) return false;
      if (Number.isFinite(a.cueStart) && Number.isFinite(b.cueStart)) return a.cueStart === b.cueStart;
      return Math.abs(a.at - b.at) < 1;
    }
    function controls() {
      const blocked = !loadedOk || busy > 0;
      for (const selector of ["#word-save", "#mastered"]) $(selector).disabled = blocked || !draft;
      $("#word-delete").disabled = blocked || !draft?.id;
      $("#word-delete-confirm").disabled = blocked || !deleteId;
      $("#vocabulary-import-confirm").disabled = blocked || !importEntries || importing;
      $("#vocabulary-import").disabled = importing;
      $("#vocabulary-import-cancel").disabled = importing;
      $("#vocabulary-retry").hidden = loadedOk;
    }
    function accept(result) {
      if (!result || result.ok !== true) {
        const error = new Error(result?.error || "无法连接词本服务，请重试。"); error.code = result?.code || "UNAVAILABLE"; throw error;
      }
      if (!Array.isArray(result.words) || result.words.length > MAX_WORDS || !Number.isInteger(result.revision) || result.revision < 0 || !result.words.every(item => validEntry(item) && typeof item.id === "string"))
        throw new Error("词本服务返回了无效数据，请重试读取。");
      if (result.revision >= revision) {
        words = result.words.map(item => ({ ...item, dictionary: D.storedFor(item.dictionary) })); revision = result.revision; renderList();
      }
      return result;
    }
    async function request(operation, payload = {}) {
      return accept(await chrome.runtime.sendMessage({ type: "YTDS_VOCABULARY", operation, ...payload }));
    }
    async function refresh({ announce = false } = {}) {
      if (readPromise) return readPromise;
      readPromise = (async () => {
        try {
          await request("list"); if (!active) return false;
          loadedOk = true; $("#vocabulary-refresh-status").textContent = "词本已刷新。未保存的笔记保持不变。";
          if (announce) $("#word-state").textContent = `${words.length} 条本地收藏。`;
          return true;
        } catch (error) {
          if (active) { loadedOk = false; $("#word-state").textContent = "读取本地收藏失败。请重试读取，成功前不能保存或恢复。"; $("#vocabulary-refresh-status").textContent = error.message; }
          return false;
        } finally { readPromise = null; if (active) controls(); }
      })();
      return readPromise;
    }
    function mutate(operation, payload) {
      if (!active || !loadedOk) return Promise.resolve(null);
      busy++; controls();
      const work = writes.catch(() => {}).then(async () => {
        try {
          if (!active || !loadedOk) return null;
          const result = await request(operation, payload);
          if (active) $("#word-state").textContent = `已保存到本浏览器 · ${words.length} 条收藏`;
          return result;
        } catch (error) {
          if (active) { if (/READ|UNAVAILABLE|LOAD/i.test(error.code || "")) loadedOk = false; $("#word-state").textContent = "保存收藏失败：" + error.message; }
          return null;
        } finally { busy--; if (active) controls(); }
      });
      writes = work; return work;
    }
    function savedEntry(result, entry) {
      return words.find(item => item.id === (result?.entryId || entry.id)) || words.find(item => same(item, entry));
    }
    function renderList() {
      const term = $("#vocabulary-search").value.trim().toLocaleLowerCase();
      const filtered = words.filter(item => !term || [item.word, item.context, item.definition].some(text => String(text || "").toLocaleLowerCase().includes(term))).slice().reverse();
      const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); pageIndex = Math.max(0, Math.min(pageIndex, pages - 1));
      $("#vocabulary").replaceChildren();
      for (const item of filtered.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)) {
        const button = document.createElement("button"); button.dataset.entryId = item.id; button.setAttribute("data-user-content", ""); button.textContent = item.word + (item.mastered ? " ✓" : "");
        button.addEventListener("click", () => open({ ...item })); $("#vocabulary").append(button);
      }
      $("#vocabulary-page").textContent = `共 ${filtered.length} 条 · 第 ${pageIndex + 1} / ${pages} 页 · 每页 ${PAGE_SIZE} 条`;
      $("#vocabulary-previous").disabled = pageIndex === 0; $("#vocabulary-next").disabled = pageIndex >= pages - 1;
    }
    function open(entry, review = false) {
      cancelQuery(); api.onOpen?.(); draft = entry; reviewMode = review; noteRevealed = !review; noteDirty = false; dictionaryDirty = false; editSequence++;
      panel.hidden = false; deleteId = null; $("#delete-confirmation").hidden = true;
      $("#word-title").removeAttribute("data-i18n-ui"); $("#word-title").setAttribute("data-user-content", ""); $("#word-title").textContent = entry.word;
      $("#word-context").textContent = entry.context || ""; $("#definition").value = review ? "" : entry.definition || "";
      $("#definition").placeholder = review ? "先回忆，再点击“显示释义与笔记”" : "填写你自己的释义或笔记";
      $("#mastered").textContent = entry.mastered ? "标记未掌握" : "标记已掌握";
      $("#word-state").textContent = loadedOk ? `原视频时间点：${root.YTDSCore.formatTime(entry.at, true)} · ${words.length} 条收藏` : "读取本地收藏失败。请先重试读取。";
      $("#word-link").href = url(entry); $("#word-link").hidden = false; paintDictionary(review); renderList(); controls();
    }
    async function copyDefinition(entry, label) {
      const text = [draft?.word || "", label, ...entry.meanings, "来源：" + entry.article, "贡献者：" + entry.provider,
        "许可：" + entry.license + " " + entry.licenseURL, entry.modified || "仅清理维基标记，未机器翻译"].join("\n");
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(text); if (active) $("#dictionary-state").textContent = "已复制释义、来源和许可。";
      } catch { if (active) $("#dictionary-state").textContent = "复制失败。请手动选择释义、来源和许可后复制。"; }
    }
    function paintDictionary(hide = false) {
      $("#meanings").replaceChildren();
      if (hide) { $("#dictionary-state").textContent = "先回忆，再揭示释义与笔记。"; return; }
      const policy = D.selection({ targetLanguage: api.context().targetLanguage || "zh-Hans", sourceLanguage: draft?.language || "und" });
      const data = D.storedFor(draft?.dictionary, policy), rows = [];
      if (policy.primaryLanguage) rows.push([policy.primaryLanguage, policy.primaryLanguage === "zh" ? "中文释义" : "英文释义", true]);
      else rows.push(["target", "目标语言释义（" + D.languageName(policy.targetLanguage) + "）", true]);
      if (policy.explanationLanguage && !rows.some(row => row[0] === policy.explanationLanguage)) rows.push([policy.explanationLanguage, "英文解释（原文）", false]);
      if (!policy.explanationLanguage) rows.push(["source", "原文解释（" + D.languageName(policy.sourceLanguage) + "）", false]);
      for (const [language, label, isTarget] of rows) {
        const section = document.createElement("section"); section.id = "meanings-" + language; section.setAttribute("aria-label", label);
        const heading = document.createElement("h3"); heading.setAttribute("data-i18n-ui", ""); heading.textContent = label; section.append(heading);
        const entry = policy.explanationLanguage ? data?.[language] : null;
        if (entry) {
          for (const meaning of entry.meanings) { const p = document.createElement("p"); p.setAttribute("data-user-content", ""); p.textContent = meaning; section.append(p); }
          const source = document.createElement("a"); source.id = "dictionary-source-" + language; source.textContent = "维基词典条目 / 贡献者"; source.href = entry.article; source.target = "_blank"; source.rel = "noopener noreferrer";
          const licence = document.createElement("a"); licence.id = "dictionary-license-" + language; licence.textContent = "CC BY-SA 4.0"; licence.href = entry.licenseURL; licence.target = "_blank"; licence.rel = "noopener noreferrer";
          const copy = document.createElement("button"); copy.id = "dictionary-copy-" + language; copy.textContent = language === "zh" ? "复制中文释义" : "复制英文解释";
          copy.addEventListener("click", () => copyDefinition(entry, label)); section.append(source, document.createTextNode(" · "), licence, copy);
          if (data.issues?.[language]) { const warning = document.createElement("p"); warning.setAttribute("data-i18n-ui", ""); warning.textContent = data.issues[language]; section.append(warning); }
        } else {
          const p = document.createElement("p"); p.dataset.missing = language; p.setAttribute("data-i18n-ui", "");
          p.textContent = policy.sourceIssue || (isTarget ? policy.targetIssue : "") || data?.issues?.[language] || "尚无" + label + "，请主动查询。"; section.append(p);
        }
        $("#meanings").append(section);
      }
      $("#dictionary-state").textContent = "字幕目标：" + D.languageName(policy.targetLanguage) + " · 释义主语言：" + (policy.primaryLanguage ? D.languageName(policy.primaryLanguage) : "暂不支持") + "。 " + (data?.alignment || "查词仅发送单词；不会自动查询词本。");
    }
    function cancelQuery() { querySequence++; queryAbort?.abort(); queryAbort = null; }
    async function query({ force = false } = {}) {
      if (!active || !draft) return;
      cancelQuery(); const sequence = querySequence, entry = draft;
      try {
        const policy = D.selection({ targetLanguage: api.context().targetLanguage || "zh-Hans", sourceLanguage: entry.language || "und" });
        if (!policy.explanationLanguage) { paintDictionary(); return; }
        const word = D.term(entry.word), key = D.cacheKey(word, policy); if (force) dictCache.delete(key);
        let data = dictCache.get(key);
        if (!data) { queryAbort = new AbortController(); $("#dictionary-state").textContent = "正在查询词典释义…"; data = await D.lookupFor(word, { ...policy, signal: queryAbort.signal }); }
        if (!active || sequence !== querySequence || entry !== draft) return;
        queryAbort = null;
        if (data[policy.explanationLanguage] && (!policy.primaryLanguage || data[policy.primaryLanguage])) dictCache.set(key, data);
        const previous = D.storedFor(entry.dictionary);
        for (const language of ["zh", "en"]) if (!data[language] && previous?.[language]) data = { ...data, [language]: previous[language], issues: { ...data.issues, [language]: "本次未取到新释义，保留此前收藏：" + (data.issues?.[language] || "") } };
        entry.dictionary = data; dictionaryDirty = true; while (dictCache.size > 100) dictCache.delete(dictCache.keys().next().value); paintDictionary();
        if (entry.id && loadedOk) {
          const result = await mutate("upsert", { id: entry.id, changes: { dictionary: data } });
          if (result && draft === entry && sequence === querySequence) dictionaryDirty = false;
        }
      } catch (error) { if (active && sequence === querySequence) $("#dictionary-state").textContent = error.name === "AbortError" ? "词典查询已取消。" : error.message; }
      finally { if (sequence === querySequence) queryAbort = null; }
    }
    async function save() {
      await initialLoad; if (!active || !draft || !loadedOk) return;
      const entry = draft, capturedEdit = editSequence, definition = noteDirty ? $("#definition").value.slice(0, 4000) : entry.definition || "";
      const changes = {}; if (noteDirty) changes.definition = definition; if (dictionaryDirty) changes.dictionary = entry.dictionary;
      if (entry.id && !Object.keys(changes).length) { $("#word-state").textContent = "没有需要保存的更改。"; return; }
      const result = await mutate("upsert", entry.id ? { id: entry.id, changes } : { entry: { ...entry, definition }, ...(Object.keys(changes).length ? { changes } : {}) });
      if (!result || draft !== entry) return;
      const saved = savedEntry(result, entry); if (saved) entry.id = saved.id;
      if (capturedEdit === editSequence) { entry.definition = saved?.definition ?? definition; noteDirty = false; if (noteRevealed) $("#definition").value = entry.definition; }
      if (changes.dictionary === entry.dictionary) dictionaryDirty = false; controls();
    }
    async function markMastered() {
      await initialLoad; if (!active || !draft || !loadedOk) return;
      const entry = draft, mastered = !entry.mastered;
      const result = await mutate("upsert", entry.id ? { id: entry.id, changes: { mastered } } : { entry: { ...entry, mastered, definition: noteDirty ? $("#definition").value.slice(0, 4000) : entry.definition || "" }, changes: { mastered } });
      if (result && draft === entry) { const saved = savedEntry(result, entry); if (saved) entry.id = saved.id; entry.mastered = mastered; $("#mastered").textContent = mastered ? "标记未掌握" : "标记已掌握"; controls(); }
    }
    async function exportJson() {
      if (!await refresh()) return;
      api.download(JSON.stringify({ version: 5, definitionSource: "手动笔记与维基词典释义分别保存；词典内容依所附 CC BY-SA 4.0 许可", words: words.map(entry => ({ ...entry, url: url(entry) })) }, null, 2), "YouTube-local-vocabulary.json", "application/json");
    }
    async function exportCsv() {
      if (!await refresh()) return;
      const cell = value => '"' + String(value).replace(/^[\t\r\n ]*[=+@-]/, "'$&").replace(/"/g, '""') + '"';
      const rows = [["单词", "我的笔记", "中文释义", "英文解释", "中文来源", "英文来源", "中文许可", "英文许可", "中文许可链接", "英文许可链接", "中文缺失说明", "英文缺失说明", "原句", "视频链接", "秒", "已掌握", "释义目标代码", "原文语言代码", "目标词典支持状态", "原文词典支持状态", "收藏 ID"], ...words.map(entry => {
        const data = D.storedFor(entry.dictionary);
        return [entry.word, entry.definition, data?.zh?.meanings.join("；") || "", data?.en?.meanings.join("; ") || "", data?.zh?.article || "", data?.en?.article || "", data?.zh?.license || "", data?.en?.license || "", data?.zh?.licenseURL || "", data?.en?.licenseURL || "", data?.issues.zh || "", data?.issues.en || "", entry.context, url(entry), entry.at, entry.mastered ? "是" : "否", data?.targetLanguage || "", entry.language || "", data?.targetIssue || "", data?.sourceIssue || "", entry.id];
      })];
      api.download("\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n"), "YouTube-local-vocabulary.csv", "text/csv;charset=utf-8");
    }
    function resetImport() { importEntries = null; $("#vocabulary-import-preview").hidden = true; controls(); }
    async function previewImport() {
      if (importing) return;
      const sequence = ++importSequence, file = $("#vocabulary-import").files[0]; resetImport(); if (!file) return;
      try {
        if (file.size > MAX_IMPORT_BYTES || !/\.json$/i.test(file.name)) throw new Error("请选择不超过 16 MiB 的 JSON 备份。");
        const raw = await file.text(); if (sequence !== importSequence || !active) return;
        const data = JSON.parse(raw);
        if (!data || !Number.isInteger(data.version) || data.version < 1 || data.version > 5 || !Array.isArray(data.words) || data.words.length > MAX_WORDS) throw new Error("仅支持版本 1–5、最多 5000 条收藏的备份。");
        const entries = data.words.map(normalizeEntry); importEntries = entries;
        $("#vocabulary-import-count").textContent = `已校验 ${entries.length} 条收藏。已有重复条目会保留原内容。点击“合并恢复”后才写入。`;
        $("#vocabulary-import-status").textContent = "预览已就绪。恢复前可先导出当前备份。"; $("#vocabulary-import-preview").hidden = false; controls();
      } catch (error) { if (sequence === importSequence && active) $("#vocabulary-import-status").textContent = error instanceof SyntaxError ? "JSON 格式无效，未导入任何条目。" : error.message; }
    }
    $("#definition").addEventListener("input", () => { noteDirty = true; editSequence++; });
    $("#word-save").addEventListener("click", save); $("#mastered").addEventListener("click", markMastered);
    $("#word-close").addEventListener("click", () => { cancelQuery(); panel.hidden = true; });
    $("#dictionary-query").addEventListener("click", () => query({ force: true }));
    $("#reveal").addEventListener("click", () => { if (!draft) return; if (!noteDirty) $("#definition").value = draft.definition || ""; noteRevealed = true; paintDictionary(); });
    $("#word-jump").addEventListener("click", () => { if (!draft) return; if (api.context().id === draft.videoId) api.jump(draft); else $("#word-state").textContent = "此词来自另一个视频，请点击“打开原视频时间点”。"; });
    $("#review").addEventListener("click", async () => {
      if (!await refresh() || !active) return;
      const remaining = words.filter(entry => !entry.mastered); if (!remaining.length) { $("#word-state").textContent = "暂无未掌握收藏。"; return; }
      reviewIndex = (reviewIndex + 1) % remaining.length; open({ ...remaining[reviewIndex] }, true);
    });
    $("#vocabulary-search").addEventListener("input", () => { pageIndex = 0; renderList(); });
    $("#vocabulary-previous").addEventListener("click", () => { pageIndex--; renderList(); });
    $("#vocabulary-next").addEventListener("click", () => { pageIndex++; renderList(); });
    for (const selector of ["#vocabulary-refresh", "#vocabulary-retry"]) $(selector).addEventListener("click", () => refresh({ announce: true }));
    $("#vocabulary-details").addEventListener("toggle", () => { if ($("#vocabulary-details").open) refresh(); });
    $("#word-delete").addEventListener("click", () => {
      if (!draft?.id || !loadedOk) return;
      deleteId = draft.id; $("#delete-word").textContent = draft.word; $("#delete-time").textContent = root.YTDSCore.formatTime(draft.at, true);
      $("#delete-confirmation").hidden = false; controls();
    });
    $("#word-delete-cancel").addEventListener("click", () => { deleteId = null; $("#delete-confirmation").hidden = true; controls(); });
    $("#word-delete-confirm").addEventListener("click", async () => {
      if (!deleteId) return;
      const id = deleteId, result = await mutate("delete", { id }); if (!result || !active) return;
      deleteId = null; $("#delete-confirmation").hidden = true;
      if (draft?.id === id) {
        cancelQuery(); draft = null; noteDirty = false; $("#definition").value = ""; $("#word-context").textContent = ""; $("#meanings").replaceChildren(); $("#word-link").hidden = true;
        $("#word-title").removeAttribute("data-user-content"); $("#word-title").setAttribute("data-i18n-ui", ""); $("#word-title").textContent = "本地生词本";
      }
      $("#word-state").textContent = "已删除所选收藏。"; controls();
    });
    $("#word-json").addEventListener("click", exportJson); $("#vocabulary-backup").addEventListener("click", exportJson); $("#word-csv").addEventListener("click", exportCsv);
    $("#vocabulary-import").addEventListener("change", previewImport);
    $("#vocabulary-import-cancel").addEventListener("click", () => { if (importing) return; importSequence++; resetImport(); $("#vocabulary-import-status").textContent = "已取消恢复，词本未改变。"; });
    $("#vocabulary-import-confirm").addEventListener("click", async () => {
      if (!importEntries || !loadedOk || importing) return;
      const entries = importEntries; importing = true; controls();
      $("#vocabulary-import-status").textContent = "正在合并恢复，请等待结果。";
      try {
        const result = await mutate("import", { entries });
        if (!active) return;
        if (!result) { $("#vocabulary-import-status").textContent = "恢复未确认完成。请刷新词本查看状态后重试。"; return; }
        resetImport(); $("#vocabulary-import-status").textContent = `合并恢复完成 · 现有 ${words.length} 条收藏；已有重复条目保持原内容。`;
      } finally { importing = false; if (active) controls(); }
    });
    function storageChanged(changes, area) {
      if (!active || area !== "local" || !Object.keys(changes).some(key => /word|vocab/i.test(key))) return;
      $("#vocabulary-refresh-status").textContent = "词本可能已在其他页面更新。点击刷新词本；未保存笔记不会被替换。";
    }
    chrome.storage?.onChanged?.addListener(storageChanged);
    const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "word" }) : null;
    function render(element, text, interactive, range = null) {
      const contextKey = range ? JSON.stringify([range.id, range.start, range.end, range.language, range.context]) : "";
      if (element.textContent === text && element.dataset.interactive === String(interactive) && element.dataset.contextKey === contextKey) return;
      element.dataset.interactive = String(interactive); element.dataset.contextKey = contextKey; element.replaceChildren();
      if (!interactive) { element.textContent = text; return; }
      const segments = segmenter ? [...segmenter.segment(text)].map(item => ({ text: item.segment, word: item.isWordLike })) : text.split(/(\p{L}[\p{L}\p{N}'’-]*)/gu).map(item => ({ text: item, word: /\p{L}/u.test(item) }));
      for (const part of segments) {
        if (!part.word) { element.append(document.createTextNode(part.text)); continue; }
        const button = document.createElement("button"); button.className = "word"; button.textContent = part.text; button.title = "收藏单词及原句";
        button.addEventListener("click", async event => {
          event.stopPropagation(); const context = api.context(); api.pause?.();
          const bounded = range && Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start;
          const at = bounded ? Math.min(range.end - 0.001, Math.max(range.start, context.at)) : context.at;
          const entry = { word: part.text.slice(0, 200), context: String(range?.context ?? (range ? text : context.text || text)).slice(0, 8000), videoId: range?.id || context.id,
            at: Math.max(0, at), language: range?.language || context.language || "und", definition: "", dictionary: null, mastered: false, createdAt: new Date().toISOString() };
          if (bounded) { entry.cueStart = Math.max(0, range.start); entry.cueEnd = range.end; }
          await initialLoad; if (!active) return;
          const found = words.find(item => same(item, entry)); open(found ? { ...found } : entry); query();
        });
        element.append(button);
      }
    }
    controls(); renderList();
    const initialLoad = refresh();
    return {
      render,
      languageChanged: () => { cancelQuery(); if (draft && !panel.hidden) paintDictionary(reviewMode && !noteRevealed); },
      show: async () => { api.onOpen?.(); panel.hidden = false; await refresh({ announce: true }); },
      hide: () => { cancelQuery(); panel.hidden = true; },
      dispose: () => { active = false; cancelQuery(); importSequence++; chrome.storage?.onChanged?.removeListener(storageChanged); panel.remove(); words = []; draft = null; dictCache.clear(); }
    };
  };
})(globalThis);
