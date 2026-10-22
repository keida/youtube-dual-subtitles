(() => {
  "use strict";
  const C = globalThis.YTDSCore, I = globalThis.YTDSI18n;
  const SESSION = "__YTDS_SESSION_V1__", CHANNEL = "YTDS_V1";
  if (globalThis[SESSION]) return;
  let active = true, player, video, id = "", generation = 0, frame = 0, watchTimer = 0, saveTimer = 0;
  let config = C.settings(), prefs = C.preferences(), meta, sourceCues = [], translationCues = [], ready = false, preview = false;
  let replayEnd = null, lastIndex = -1, listPage = 0;
  const cachedCaptions = C.captionCache(), sourceSelections = new Map();
  let currentChoice = null, nativeRetryTimer = 0, nativeRetries = 0, consumedSignal = 0;
  const failedTracks = new Set(), imports = { source: null, translation: null }, importSequence = { source: 0, translation: 0 };
  let stopI18n = null, displayedIndex = -2, checkCaptionOverflow = true, fullCaptionText = "", lastPanel = "settings";
  const nativeSignals = [];
  let drag = null, writes = Promise.resolve();
  const pending = new Map();
  const retryDelays = new Set();
  const host = document.createElement("div");
  host.id = "ytds-overlay";
  host.style.cssText = "position:absolute;inset:0;z-index:60;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {font-family:system-ui,'Microsoft YaHei',sans-serif;color:#fff;color-scheme:dark;}
      * {box-sizing:border-box;} button,input,select {font:inherit;}
      button {border:1px solid #59626e;background:#29313b;color:#fff;border-radius:7px;padding:7px 10px;cursor:pointer;}
      button:focus-visible,input:focus-visible,select:focus-visible {outline:2px solid #73d4c4;outline-offset:2px;}
      .toolbar {position:absolute;right:12px;top:10px;pointer-events:auto;display:flex;gap:5px;}
      .toolbar button {font-size:12px;opacity:.85;}
      #panel {position:absolute;top:48px;right:12px;width:330px;max-width:calc(100% - 24px);max-height:calc(100% - 65px);overflow:auto;pointer-events:auto;background:#151b23;border:1px solid #495462;border-radius:12px;padding:14px;box-shadow:0 6px 25px #0008;font-size:13px;}
      [hidden] {display:none!important;} h2 {margin:0 0 8px;font-size:17px;} p {line-height:1.5;margin:7px 0;color:#bfcad6;}
      #status {white-space:pre-wrap;color:#e2eaf1;} #notice {position:absolute;top:48px;right:12px;max-width:65%;background:#151b23e8;padding:8px 12px;border-radius:8px;font-size:13px;}
      fieldset {border:1px solid #3c4958;border-radius:8px;margin:12px 0;padding:9px;} legend {padding:0 5px;color:#85dacb;}
      label {display:grid;grid-template-columns:100px 1fr;gap:8px;align-items:center;margin:8px 0;}
      label span {font-size:12px;} input[type=range] {width:100%;accent-color:#78d4c3;} input[type=color] {height:27px;width:100%;background:transparent;border:1px solid #59626e;}
      select {width:100%;max-width:100%;background:#26313e;border:1px solid #59626e;border-radius:5px;color:#fff;padding:6px;}
      .actions {display:flex;flex-wrap:wrap;gap:7px;} #save-status {font-size:12px;color:#a2b7c9;}
      .caption {position:absolute;white-space:pre-wrap;overflow:hidden;overflow-wrap:anywhere;text-align:center;line-height:1.3;padding:4px 10px;border-radius:5px;color:white;text-shadow:0 1px 2px #000;user-select:none;}
      .caption:empty {display:none;} .editing {pointer-events:auto;cursor:grab;outline:1px dashed #85dacb;touch-action:none;} .editing:active {cursor:grabbing;}
      input[type=number] {width:100%;background:#26313e;color:white;border:1px solid #59626e;padding:5px;}
      details {margin:12px 0;} summary {cursor:pointer;color:#85dacb;}
      #sentences {max-height:210px;overflow:auto;margin:8px 0;} #sentences button {display:block;width:100%;text-align:left;white-space:pre-wrap;margin:5px 0;font-size:12px;}
      #sentences button.current {border-color:#85dacb;} .caption {pointer-events:auto;}
      .word {background:transparent;border:0;border-radius:0;color:inherit;padding:0;font:inherit;text-shadow:inherit;}
      .word:hover {color:#94f0df;text-decoration:underline;}
      #word-panel {position:absolute;left:12px;top:48px;width:310px;max-width:calc(100% - 24px);max-height:calc(100% - 65px);overflow:auto;pointer-events:auto;background:#151b23;border:1px solid #495462;border-radius:12px;padding:14px;font-size:13px;}
      #word-panel textarea {width:100%;min-height:60px;background:#26313e;color:white;border:1px solid #59626e;padding:7px;font:inherit;} #word-panel a {color:#85dacb;}
      #word-context {white-space:pre-wrap;} #vocabulary button {margin:4px;} #word-title {font-size:22px;}
      #word-panel, #word-panel p, #word-panel h2, #word-panel h3, #word-panel a, #word-panel textarea, #full-caption-text {user-select:text;-webkit-user-select:text;}
      #caption-full {position:absolute;left:12px;bottom:10px;pointer-events:auto;font-size:12px;}
      #full-caption {position:absolute;inset:48px 12px 12px;background:#151b23;border:1px solid #495462;border-radius:12px;padding:14px;overflow:auto;pointer-events:auto;}
      #full-caption-text {white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.6;}
    </style>
    <div class="caption" id="top" aria-label="顶部简体中文字幕"></div>
    <div class="caption" id="bottom" aria-label="底部原文字幕"></div>
    <div class="toolbar"><button id="settings" aria-expanded="false">上下字幕 · 设置</button><button id="close" aria-label="关闭并恢复原生字幕">×</button></div>
    <div id="notice" role="status" hidden></div>
    <button id="caption-full" hidden>查看完整字幕</button>
    <section id="full-caption" aria-label="完整字幕" hidden><button id="full-caption-close">关闭完整字幕</button><div id="full-caption-text"></div></section>
    <section id="panel" aria-label="上下字幕设置" hidden>
      <h2>原文在下，中文在上</h2>
      <p id="status" role="status">正在读取字幕轨…</p>
      <label><span>界面语言</span><select id="uiLanguage" aria-label="界面语言"><option value="auto">跟随浏览器</option><option value="zh-CN">简体中文</option><option value="en">English</option></select></label>
      <label><span>原文字幕轨</span><select id="source" aria-label="原文字幕轨"></select></label>
      <label><span>译文语言</span><select id="target" aria-label="译文语言"><option value="zh-Hans">简体中文</option></select></label>
      <label><span>原译上下互换</span><input id="swap" type="checkbox"></label>
      <label><span>显示顶部字幕</span><input id="topVisible" type="checkbox" checked></label>
      <label><span>显示底部字幕</span><input id="bottomVisible" type="checkbox" checked></label>
      <p>只使用 YouTube 可用字幕或翻译；点击字幕单词可收藏。</p>
      <div id="fields"></div>
      <label><span>拖动字幕位置</span><input id="drag" type="checkbox"></label>
      <p>拖动模式显示位置示例；关闭后恢复实际字幕。上下区域保持分离。</p>
      <details id="study"><summary>逐句学习与字幕文件</summary>
      <label><span>原文偏移（秒）</span><input id="sourceOffset" type="number" min="-30" max="30" step="0.1" value="0"></label>
      <label><span>译文偏移（秒）</span><input id="translationOffset" type="number" min="-30" max="30" step="0.1" value="0"></label>
      <p>正值延后，负值提前。跳句与重播按原文时间定位。</p>
      <label><span>每句结束暂停</span><input id="pauseAtEnd" type="checkbox"></label>
      <div class="actions"><button id="previous">上一句</button><button id="replay">单句重播</button><button id="next">下一句</button></div>
      <div id="sentences" aria-label="可点击原文字幕列表"></div>
      <div class="actions"><button id="listPrevious">上一页</button><button id="listCurrent">定位当前句</button><button id="listNext">下一页</button></div>
      <label><span>导入原文</span><input id="importSource" type="file" accept=".srt,.vtt"></label>
      <label><span>导入译文</span><input id="importTranslation" type="file" accept=".srt,.vtt"></label>
      <p>文件仅用于当前视频，不上传或自动翻译；重新获取保留导入，切换视频会清除。</p>
      <button id="clear-imports" hidden>清除导入字幕</button>
      <label><span>导出对象</span><select id="exportTrack"><option value="source">原文</option><option value="translation">译文</option></select></label>
      <label><span>导出格式</span><select id="exportFormat"><option value="srt">SRT</option><option value="vtt">VTT</option></select></label>
      <button id="export">导出已有字幕（含偏移）</button>
      </details>
      <button id="words">本地生词与复习</button>
      <p>快捷键：Alt+←/→ 跳句，Alt+R 重播，Alt+S 设置，Alt+X 关闭。输入框内不触发。</p>
      <div class="actions"><button id="retry">重新获取</button><button id="reset">恢复默认布局</button><button id="disable">关闭并恢复原生字幕</button></div>
      <p id="save-status">设置仅存本浏览器；只有主动收藏才保存原句。</p>
      <p id="build">版本 0.5.0 · 本地候选版</p>
    </section>`;
  const $ = s => shadow.querySelector(s), top = $("#top"), bottom = $("#bottom"), panel = $("#panel"), status = $("#status"), notice = $("#notice");
  for (const key of ["top", "bottom"]) {
    const fieldset = document.createElement("fieldset"), legend = document.createElement("legend");
    legend.textContent = key === "top" ? "顶部 · 独立样式" : "底部 · 独立样式";
    fieldset.append(legend);
    for (const [prop, label, min, max, suffix] of [
      ["x", "水平位置", 10, 90, "%"], ["y", "垂直位置", key === "top" ? 2 : 65, key === "top" ? 35 : 96, "%"],
      ["size", "字号", 12, 64, "px"], ["opacity", "背景不透明度", 0, 100, "%"], ["color", "背景颜色", 0, 0, ""]
    ]) {
      const row = document.createElement("label"), text = document.createElement("span"), input = document.createElement("input");
      input.id = `${key}-${prop}`; input.type = prop === "color" ? "color" : "range";
      input.min = min; input.max = max; input.step = "1"; input.setAttribute("aria-label", `${key === "top" ? "顶部" : "底部"}${label}`);
      input.addEventListener("input", () => {
        config[key][prop] = prop === "color" ? input.value : Number(input.value);
        config = C.settings(config); syncControls(); applyLayout(); queueSave();
      });
      text.dataset.label = label; text.dataset.suffix = suffix;
      row.append(text, input); fieldset.append(row);
    }
    $("#fields").append(fieldset);
  }
  function setStatus(text, showNotice = false) {
    if (imports.source || imports.translation) text += " 已保留本地导入字幕；可用“清除导入字幕”恢复网络字幕。";
    status.textContent = text; notice.textContent = text; notice.hidden = !showNotice || !panel.hidden;
  }
  function syncControls() {
    syncPreferences();
    for (const key of ["top", "bottom"]) for (const prop of ["x", "y", "size", "opacity", "color"]) {
      const input = $(`#${key}-${prop}`); input.value = config[key][prop];
      const span = input.previousElementSibling;
      span.textContent = span.dataset.label + (prop === "color" ? "" : ` ${Math.round(config[key][prop])}${span.dataset.suffix}`);
    }
  }
  function syncPreferences() {
    $("#uiLanguage").value = prefs.uiLanguage || "auto";
    $("#panel h2").textContent=prefs.swap?"原文在上，译文在下":"原文在下，译文在上";
    top.setAttribute("aria-label",prefs.swap?"顶部原文字幕":"顶部译文字幕");bottom.setAttribute("aria-label",prefs.swap?"底部译文字幕":"底部原文字幕");
    for(const key of ["swap","topVisible","bottomVisible","pauseAtEnd"])$(`#${key}`).checked=prefs[key];
    for(const key of ["sourceOffset","translationOffset"])$(`#${key}`).value=prefs[key];
    top.hidden=!prefs.topVisible;bottom.hidden=!prefs.bottomVisible;
  }
  function applyLayout() {
    checkCaptionOverflow = true;
    syncPreferences();
    const height = player?.clientHeight || 360;
    for (const [key, element] of [["top", top], ["bottom", bottom]]) {
      const s = config[key], rgb = s.color.match(/[0-9a-f]{2}/ig).map(x => parseInt(x, 16)).join(",");
      element.style.cssText = `left:${s.x}%;top:${s.y}%;transform:translate(-50%,${key === "top" ? "0" : "-100%"});max-width:${Math.min(s.x, 100-s.x)*2-4}%;max-height:${key === "top" ? Math.min(22, 45-s.y) : Math.min(22, s.y-55)}%;font-size:${Math.min(s.size, Math.max(12, height*.07))}px;background:rgba(${rgb},${s.opacity/100});`;
      element.classList.toggle("editing", preview);
    }
    enforcePanelWidth();
  }
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 180); }
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    const snapshot = { layout: C.settings(config), preferences: C.preferences(prefs) };
    writes = writes.catch(() => {}).then(() => chrome.storage.local.set(snapshot)).then(() => {
      if (active) $("#save-status").textContent = "布局已保存到此浏览器。";
    }).catch(() => { if (active) $("#save-status").textContent = "设置保存失败；本次调整仍有效。"; });
  }
  function send(op, fields = {}) {
    const requestId = crypto.randomUUID();
    window.postMessage({ channel: CHANNEL, direction: "request", requestId, op, id, ...fields }, location.origin);
    return requestId;
  }
  function request(op, fields = {}) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error("字幕获取超时，请重新获取或使用原生字幕。")); }, 15000);
      pending.set(requestId, { resolve, reject, timeout, id });
      window.postMessage({ channel: CHANNEL, direction: "request", requestId, op, id, ...fields }, location.origin);
    });
  }
  function receive(event) {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.channel !== CHANNEL) return;
    if (m.direction === "player-ready") {
      if (m.id !== id || !Number.isSafeInteger(m.sequence) || m.sequence < 1 || ![m.lang,m.kind,m.tlang].every(x=>typeof x==="string"&&x.length<=64)) return;
      nativeSignals.push({sequence:m.sequence,lang:m.lang,kind:m.kind,tlang:m.tlang});if(nativeSignals.length>64)nativeSignals.shift();
      scheduleNativeRecovery();return;
    }
    if (m.direction !== "response") return;
    const p = pending.get(m.requestId);
    if (!p || p.id !== m.id) return;
    clearTimeout(p.timeout); pending.delete(m.requestId);
    if (typeof m.error === "string") p.reject(new Error(m.error.slice(0, 300))); else p.resolve(m.result);
  }
  function cancelRequests() {
    send("cancel");
    for (const p of pending.values()) { clearTimeout(p.timeout); p.reject(new Error("字幕请求已取消。")); }
    pending.clear();
    for (const delay of retryDelays) { clearTimeout(delay.timer); delay.resolve(); }
    retryDelays.clear();
  }
  function retryPause() {
    return new Promise(resolve => {
      const delay = { resolve, timer: 0 };
      delay.timer = setTimeout(() => { retryDelays.delete(delay); resolve(); }, 500);
      retryDelays.add(delay);
    });
  }
  const nativeStyle = document.createElement("style");
  nativeStyle.id = "ytds-native-style";
  nativeStyle.textContent = '#movie_player[data-ytds-native-hidden="true"] .ytp-caption-window-container {visibility:hidden!important;}';
  document.head.append(nativeStyle);
  function restoreNative() { player?.removeAttribute("data-ytds-native-hidden"); }
  function clearImports() { imports.source = imports.translation = null; importSequence.source++; importSequence.translation++; $("#clear-imports").hidden = true; }
  function clearCues(preserveImports = false, retained = null) { replayEnd = null; pauseController.cancel(); lastIndex = -1; displayedIndex = -2; sourceCues = preserveImports && imports.source ? imports.source.cues : retained?.source || []; translationCues = preserveImports && imports.translation ? imports.translation.cues : retained?.translation || []; ready = !!(sourceCues.length || translationCues.length); if(!retained){top.textContent = ""; bottom.textContent = "";} listPage = 0; renderList(); restoreNative(); }
  function trackKey(track) { return JSON.stringify([track?.languageCode,track?.kind||"",track?.name]); }
  function trackLabel(track) { return track.name+(track.kind==='asr'&&!/auto|自动生成/i.test(track.name)?'（自动生成）':''); }
  function recoveryHint(label) { return `请在原生 CC 选择“${label}”一次；${nativeRetries<3?'正常加载后将自动恢复。':'自动恢复已达本次上限，加载后请点“重新获取”。'}`; }
  function neededSignal(signal) {
    if(!meta||!currentChoice||!failedTracks.size)return false;
    const source=meta.tracks[currentChoice.source],target=meta.tracks[currentChoice.translation];
    if(failedTracks.has("source")&&!imports.source&&signal.lang===source.languageCode&&signal.kind===(source.kind||"")&&!signal.tlang)return true;
    if(!failedTracks.has("translation")||imports.translation)return false;
    if(currentChoice.mode==="auto")return signal.lang===source.languageCode&&signal.kind===(source.kind||"")&&signal.tlang===prefs.targetLanguage;
    return signal.lang===target?.languageCode&&signal.kind===(target?.kind||"")&&!signal.tlang;
  }
  function scheduleNativeRecovery() {
    if(!active||!failedTracks.size||nativeRetryTimer||nativeRetries>=3)return;
    const signal=[...nativeSignals].reverse().find(x=>x.sequence>consumedSignal&&neededSignal(x));if(!signal)return;
    const mine=generation,forId=id,selected=currentChoice.source;
    nativeRetryTimer=setTimeout(()=>{
      nativeRetryTimer=0;if(!active||mine!==generation||forId!==id)return;
      consumedSignal=signal.sequence;nativeRetries++;load(selected,{automatic:true});
    },250);
  }
  function validMeta(value) {
    return value?.id === id && Array.isArray(value.tracks) && value.tracks.length <= 100 && value.tracks.every(t => typeof t.languageCode === "string" && typeof t.name === "string") && Array.isArray(value.languages);
  }
  async function load(selected,{force=false,automatic=false}={}) {
    // Automatic recovery retries failed tracks, retaining successful data only
    // for this video and the same source/translation selection. Manual reloads
    // still fetch afresh (while preserving explicitly imported local tracks).
    const retained=automatic&&meta?.id===id&&currentChoice?{
      sourceKey:trackKey(meta.tracks[currentChoice.source]),translationKey:trackKey(meta.tracks[currentChoice.translation]),
      mode:currentChoice.mode,target:prefs.targetLanguage,
      source:failedTracks.has("source")?[]:sourceCues,translation:failedTracks.has("translation")?[]:translationCues,
      failed:[...failedTracks]
    }:null;
    const mine = ++generation;
    clearTimeout(nativeRetryTimer);nativeRetryTimer=0;failedTracks.clear();if(!retained)currentChoice=null;
    if(!automatic)nativeRetries=0;
    cancelRequests(); clearCues(true,retained);
    if(!retained){meta=null;$("#source").replaceChildren();}
    if (!id || !player || !video) { setStatus("请打开 YouTube 普通视频页面。", true); return; }
    setStatus("正在读取 YouTube 可用字幕…", true);
    try {
      let data;
      for (let attempt = 0; attempt < 5; attempt++) {
        try { data = await request("metadata"); break; }
        catch (error) {
          if (mine !== generation || !active) return;
          if (!error.message.includes("尚未就绪") || attempt === 4) throw error;
          await retryPause();
          if (mine !== generation || !active) return;
        }
      }
      if (!active || mine !== generation) return;
      if (!validMeta(data)) throw new Error("字幕轨数据不受支持。保留原生字幕。");
      meta = data;
      const targetOptions = new Map([["zh-Hans", "简体中文"]]);
      for (const t of [...meta.tracks, ...meta.languages]) if (typeof t.languageCode === "string") targetOptions.set(t.languageCode, t.languageCode === "zh-Hans" ? "简体中文" : t.name || t.languageCode);
      if (!targetOptions.has(prefs.targetLanguage)) targetOptions.set(prefs.targetLanguage, prefs.targetLanguage + "（此视频未提供）");
      $("#target").replaceChildren();
      for (const [code,name] of targetOptions) { const o = document.createElement("option"); o.value=code; o.textContent=name; $("#target").append(o); }
      $("#target").value=prefs.targetLanguage;
      const targetName=targetOptions.get(prefs.targetLanguage);
      const remembered=sourceSelections.get(id);
      if(selected===undefined&&remembered&&Date.now()-remembered.at<15*60*1000){const index=meta.tracks.findIndex(t=>trackKey(t)===remembered.track);if(index>=0)selected=index;}
      const choice = C.chooseTracks(meta, selected, prefs.targetLanguage);currentChoice=choice;
      if(retained){
        const sameSource=retained.sourceKey===trackKey(meta.tracks[choice.source]);
        if(!sameSource)retained.source=[];
        if(!sameSource||retained.target!==prefs.targetLanguage||retained.mode!==choice.mode||retained.translationKey!==trackKey(meta.tracks[choice.translation]))retained.translation=[];
        sourceCues=imports.source?.cues||retained.source;translationCues=imports.translation?.cues||retained.translation;
        ready=!!(sourceCues.length||translationCues.length);
      }
      sourceSelections.delete(id);sourceSelections.set(id,{track:trackKey(meta.tracks[choice.source]),at:Date.now()});while(sourceSelections.size>3)sourceSelections.delete(sourceSelections.keys().next().value);
      $("#source").replaceChildren();
      for (const [i, t] of meta.tracks.entries()) {
        const option = document.createElement("option"); option.value = String(i);
        option.textContent = `${t.name}${t.kind === "asr" ? "（自动生成）" : ""}`; $("#source").append(option);
      }
      $("#source").value = choice.source;
      const cacheKey=JSON.stringify([id,trackKey(meta.tracks[choice.source]),prefs.targetLanguage,choice.mode,trackKey(meta.tracks[choice.translation])]);
      if(force)cachedCaptions.delete(cacheKey);
      const completeStatus=choice.mode==="auto"?"已启用：原文 / YouTube 自动翻译（可能不准确）。":choice.mode==="same"?`原文已是${targetName}；上下显示相同原文，无需翻译。`:`已启用：原文 / 视频已有${targetName}字幕。`;
      const saved=cachedCaptions.get(cacheKey);
      if(saved){sourceCues=imports.source?.cues||saved.source;translationCues=imports.translation?.cues||saved.translation;ready=true;renderList();pauseController.refresh();setStatus(completeStatus+"（本次会话缓存）");return;}
      let sourceError=null;
      try{
        if (!imports.source && !retained?.source.length) {
          const raw=await request("captions",{index:choice.source});
          if(!active||mine!==generation)return;
          sourceCues=imports.source?.cues||C.parseCaptions(raw);
        } else sourceCues=imports.source?.cues||retained.source;
        if(!sourceCues.length)throw new Error("未返回可用原文字幕。");
        ready=true;failedTracks.delete("source");pauseController.refresh();renderList();
      }catch(error){
        if(!active||mine!==generation)return;
        if(imports.source){sourceCues=imports.source.cues;ready=true;failedTracks.delete("source");}
        else {sourceError=error;sourceCues=[];failedTracks.add("source");}
      }
      const sourceFailed=()=>!!sourceError&&!imports.source;
      const sourceFailure=()=>`原文获取失败：${sourceError.message} 原文层保持空白；${recoveryHint(trackLabel(meta.tracks[choice.source]))}`;
      if(imports.translation){
        translationCues=imports.translation.cues;ready=true;failedTracks.delete("translation");renderList();
        setStatus((sourceFailed()?sourceFailure():"原文可用；")+"译文使用本地文件。",sourceFailed());scheduleNativeRecovery();return;
      }
      if(retained?.translation.length){
        translationCues=retained.translation;ready=true;failedTracks.delete("translation");
        if(!sourceFailed()&&!imports.source)cachedCaptions.set(cacheKey,{source:sourceCues,translation:translationCues});
        renderList();setStatus(sourceFailed()?sourceFailure()+" 译文可用；原生字幕仍可见。":completeStatus,sourceFailed());scheduleNativeRecovery();return;
      }
      if(choice.mode==="unavailable"){
        setStatus((sourceFailed()?sourceFailure():"原文可用；")+`YouTube 未提供可用的${targetName}翻译。`,true);scheduleNativeRecovery();return;
      }
      if(choice.mode==="same"){
        if(sourceFailed()){failedTracks.add("translation");setStatus(sourceFailure(),true);scheduleNativeRecovery();return;}
        translationCues=sourceCues;if(!imports.source)cachedCaptions.set(cacheKey,{source:sourceCues,translation:translationCues});renderList();setStatus(completeStatus);return;
      }
      // The two tracks are independent: a failed source must not prevent a
      // translated track supplied by YouTube from being attempted and shown.
      setStatus((sourceFailed()?"原文未获取；":"原文已就绪；")+`正在独立获取${targetName}字幕…`,true);
      try{
        const translated=await request("captions",{index:choice.translation,translate:choice.mode==="auto"?prefs.targetLanguage:""});
        if(!active||mine!==generation)return;
        translationCues=imports.translation?.cues||C.parseCaptions(translated);
        if(!translationCues.length)throw new Error("YouTube 未返回可用译文字幕。");
        ready=true;failedTracks.delete("translation");
        if(!sourceFailed()&&!imports.source&&!imports.translation)cachedCaptions.set(cacheKey,{source:sourceCues,translation:translationCues});
        renderList();setStatus(sourceFailed()?sourceFailure()+" 译文可用；原生字幕仍可见。":completeStatus,sourceFailed());scheduleNativeRecovery();
      }catch(error){
        if(active&&mine===generation){
          if(imports.translation){translationCues=imports.translation.cues;ready=true;failedTracks.delete("translation");renderList();setStatus((sourceFailed()?sourceFailure():"原文可用；")+"译文使用本地文件。",sourceFailed());scheduleNativeRecovery();return;}
          translationCues=[];failedTracks.add("translation");
          const label=choice.mode==="auto"?targetName:trackLabel(meta.tracks[choice.translation]);
          setStatus((sourceFailed()?sourceFailure():"原文可用；")+`译文获取失败：${error.message} 译文层保持空白。${recoveryHint(label)}`,true);scheduleNativeRecovery();
        }
      }
    } catch (error) {
      if (active && mine === generation) { clearCues(true,retained);if(retained)for(const track of retained.failed)failedTracks.add(track);setStatus(error.message,true);scheduleNativeRecovery(); }
    }
  }
  function tick() {
    if (!active) return;
    pauseController.check();
    const ad = player?.classList.contains("ad-showing") || player?.classList.contains("ad-interrupting");
    if (sourceCues.length && ready && !ad) player?.setAttribute("data-ytds-native-hidden", "true"); else restoreNative();
    const now = video?.currentTime || 0, sourceTime = now-prefs.sourceOffset;
    const original = ready && !ad ? C.cueAt(sourceCues, sourceTime) : "", translated = ready && !ad ? C.cueAt(translationCues, now-prefs.translationOffset) : "";
    const rangeAt=(cues,time,offset,language)=>{const cue=C.cueRangeAt?.(cues,time)||cues[C.cueIndex(cues,time)];return cue&&time<cue.end?{id,start:Math.max(0,cue.start+offset),end:cue.end+offset,language}:null;};
    const originalRange=original?rangeAt(sourceCues,sourceTime,prefs.sourceOffset,imports.source?"und":meta?.tracks?.[Number($("#source").value)]?.languageCode||"und"):null;
    const translatedRange=translated?rangeAt(translationCues,now-prefs.translationOffset,prefs.translationOffset,prefs.targetLanguage):null;
    const topText=preview ? (I?.t("顶部 · 字幕位置示例") || "顶部 · 字幕位置示例") : prefs.swap ? original : translated;
    const bottomText=preview ? (I?.t("底部 · 字幕位置示例") || "底部 · 字幕位置示例") : prefs.swap ? translated : original;
    const changed=top.textContent!==topText||bottom.textContent!==bottomText;
    learning.render(top, topText, !preview,preview?null:prefs.swap?originalRange:translatedRange);
    learning.render(bottom, bottomText, !preview,preview?null:prefs.swap?translatedRange:originalRange);
    const nextFull=[original,translated].filter(Boolean).join("\n\n");
    if(fullCaptionText!==nextFull){fullCaptionText=nextFull;$("#full-caption-text").textContent=fullCaptionText;}
    if(changed||checkCaptionOverflow){checkCaptionOverflow=false;$("#caption-full").hidden=preview||![top,bottom].some(element=>!element.hidden&&element.textContent&&(element.scrollHeight>element.clientHeight+1||element.scrollWidth>element.clientWidth+1));}
    lastIndex = C.cueIndex(sourceCues, sourceTime);
    if(displayedIndex!==lastIndex){displayedIndex=lastIndex;for (const row of $("#sentences").children) row.classList.toggle("current", Number(row.dataset.index) === lastIndex);}
    frame = requestAnimationFrame(tick);
  }
  const resize = new ResizeObserver(applyLayout);
  function checkPage() {
    if (!active) return;
    try { if (!chrome.runtime.id) { stop(); return; } } catch { stop(); return; }
    const nextId = C.videoId(location.href), nextPlayer = document.getElementById("movie_player"), nextVideo = nextPlayer?.querySelector("video");
    if (nextId !== id || nextPlayer !== player || nextVideo !== video) {
      restoreNative(); resize.disconnect();
      if(nextId!==id){nativeSignals.length=0;consumedSignal=0;nativeRetries=0;clearImports();$("#full-caption").hidden=true;}
      player = nextPlayer; video = nextVideo; id = nextId;
      pauseController.bind(video);
      if (player && id) { player.append(host); resize.observe(player); applyLayout(); }
      else host.remove();
      load();
    } else if (player && id && !host.isConnected) player.append(host);
  }
  function togglePanel() {
    panel.hidden = !panel.hidden; $("#settings").setAttribute("aria-expanded", String(!panel.hidden));
    if(!panel.hidden){lastPanel="settings";if(player?.clientWidth<680)learning.hide();$("#full-caption").hidden=true;}
    notice.hidden = true;
    if (panel.hidden) { preview = false; $("#drag").checked = false; applyLayout(); }
  }
  $("#settings").addEventListener("click", togglePanel);
  function hideSettings() { if(!panel.hidden)togglePanel();$("#full-caption").hidden=true; }
  function wordOpened() { lastPanel="words";$("#full-caption").hidden=true;if(player?.clientWidth<680&&!panel.hidden)togglePanel(); }
  function enforcePanelWidth() { if(player?.clientWidth<680&&!panel.hidden&&!$("#word-panel")?.hidden){if(lastPanel==="words")hideSettings();else learning.hide();} }
  $("#caption-full").addEventListener("click",()=>{hideSettings();learning.hide();$("#full-caption").hidden=false;});
  $("#full-caption-close").addEventListener("click",()=>$("#full-caption").hidden=true);
  $("#close").addEventListener("click", stop); $("#disable").addEventListener("click", stop);
  $("#retry").addEventListener("click", () => load(Number($("#source").value),{force:true}));
  $("#source").addEventListener("change", () => load(Number($("#source").value)));
  $("#reset").addEventListener("click", () => { config = C.settings();syncControls();applyLayout();queueSave(); });
  $("#uiLanguage").addEventListener("change",()=>{prefs.uiLanguage=$("#uiLanguage").value;I?.setPreference(prefs.uiLanguage);learning.languageChanged?.();queueSave();});
  $("#drag").addEventListener("change", () => { preview = $("#drag").checked; applyLayout(); });
  for (const [key, element] of [["top", top], ["bottom", bottom]]) {
    element.addEventListener("pointerdown", e => {
      if (!preview || e.button !== 0) return;
      e.preventDefault(); e.stopPropagation(); element.setPointerCapture(e.pointerId);
      drag = { key, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: config[key].x, y: config[key].y };
    });
    element.addEventListener("pointermove", e => {
      if (!drag || drag.pointerId !== e.pointerId || drag.key !== key) return;
      const rect = player.getBoundingClientRect();
      config[key].x = drag.x + (e.clientX-drag.startX) / rect.width * 100;
      config[key].y = drag.y + (e.clientY-drag.startY) / rect.height * 100;
      config = C.settings(config); applyLayout(); syncControls();
    });
    const endDrag = e => { if (drag?.pointerId === e.pointerId) { drag = null; queueSave(); } };
    element.addEventListener("pointerup", endDrag); element.addEventListener("pointercancel", endDrag);
    element.addEventListener("lostpointercapture", endDrag);
  }
  function jump(index, single = false) {
    if (!video || !sourceCues[index]) { setStatus("没有可定位的原文句。", true); return; }
    const cue=sourceCues[index];pauseController.seek(cue.start+prefs.sourceOffset);replayEnd=single?cue.end+prefs.sourceOffset:null;
    Promise.resolve(video.play()).then(()=>pauseController.refresh()).catch(()=>setStatus("无法自动播放，请点击播放器播放。",true));
  }
  function navigate(step) { const index=C.cueIndex(sourceCues,(video?.currentTime||0)-prefs.sourceOffset);jump(Math.max(0,Math.min(sourceCues.length-1,index+step))); }
  function renderList() {
    displayedIndex=-2;
    $("#sentences").replaceChildren();listPage=Math.max(0,Math.min(listPage,Math.max(0,Math.ceil(sourceCues.length/80)-1)));
    for(let i=listPage*80;i<Math.min(sourceCues.length,(listPage+1)*80);i++) {
      const cue=sourceCues[i],button=document.createElement("button");button.dataset.index=i;
      const translation=C.cueAt(translationCues,(cue.start+cue.end)/2+prefs.sourceOffset-prefs.translationOffset);
      button.textContent=`${C.formatTime(cue.start+prefs.sourceOffset,true)}  ${cue.text}${translation?"\n"+translation:""}`;
      button.addEventListener("click",()=>jump(i));$("#sentences").append(button);
    }
  }
  for(const key of ["swap","topVisible","bottomVisible","pauseAtEnd","sourceOffset","translationOffset"]) $(`#${key}`).addEventListener("change",()=>{
    const input=$(`#${key}`);prefs[key]=input.type==="checkbox"?input.checked:Number(input.value);prefs=C.preferences(prefs);replayEnd=null;pauseController.refresh();syncControls();renderList();queueSave();
  });
  $("#target").addEventListener("change",()=>{prefs.targetLanguage=$("#target").value;learning.languageChanged();queueSave();load(Number($("#source").value));});
  $("#previous").addEventListener("click",()=>navigate(-1));$("#next").addEventListener("click",()=>navigate(1));
  $("#replay").addEventListener("click",()=>jump(Math.max(0,C.cueIndex(sourceCues,(video?.currentTime||0)-prefs.sourceOffset)),true));
  $("#listPrevious").addEventListener("click",()=>{listPage--;renderList();});$("#listNext").addEventListener("click",()=>{listPage++;renderList();});
  $("#listCurrent").addEventListener("click",()=>{listPage=Math.floor(Math.max(0,C.cueIndex(sourceCues,(video?.currentTime||0)-prefs.sourceOffset))/80);renderList();});
  for(const [control,isSource] of [["importSource",true],["importTranslation",false]]) $(`#${control}`).addEventListener("change",async()=>{
    const track=isSource?"source":"translation",file=$(`#${control}`).files[0],importedId=id,mine=++importSequence[track];
    try {
      if(!file||file.size>8*1024*1024)throw new Error("请选择不超过 8 MiB 的 SRT 或 VTT 文件。");
      const cues=C.parseFile(await file.text(),file.name);if(!active||importedId!==id||mine!==importSequence[track])return;
      imports[track]={cues,name:file.name};failedTracks.delete(track);$("#clear-imports").hidden=false;
      if(isSource)sourceCues=cues;else translationCues=cues;ready=true;replayEnd=null;pauseController.refresh();renderList();
      setStatus(`已导入${isSource?"原文":"译文"}：${file.name}（用户文件，语言和翻译内容未验证）。切换视频会清除导入。`);scheduleNativeRecovery();
    }catch(error){if(active&&importedId===id)setStatus(error.message,true);}finally{$(`#${control}`).value="";}
  });
  $("#clear-imports").addEventListener("click",()=>{clearImports();load(Number($("#source").value),{force:true});});
  const blobUrls=new Set();
  function download(text,name,type) {const url=URL.createObjectURL(new Blob([text],{type}));blobUrls.add(url);const a=document.createElement("a");a.href=url;a.download=name;shadow.append(a);a.click();a.remove();}
  $("#export").addEventListener("click",()=>{
    try {const original=$("#exportTrack").value==="source",format=$("#exportFormat").value;download(C.exportFile(original?sourceCues:translationCues,format,original?prefs.sourceOffset:prefs.translationOffset),`YouTube-${id}-${original?"original":"translation"}.${format}`,"text/plain;charset=utf-8");}
    catch(error){setStatus(error.message,true);}
  });
  const learning=globalThis.YTDSLearning(shadow,{context:()=>({text:C.cueAt(sourceCues,(video?.currentTime||0)-prefs.sourceOffset),id,at:video?.currentTime||0,language:imports.source?"und":meta?.tracks?.[Number($("#source").value)]?.languageCode||"und",targetLanguage:prefs.targetLanguage}),onOpen:wordOpened,pause:()=>video?.pause(),jump:saved=>{if(saved.videoId===id&&video){video.currentTime=saved.at;video.play().catch(()=>setStatus("请点击播放器播放。",true));}},download,status:setStatus});
  const pauseController=globalThis.YTDSPlayback.controller({video:()=>video,cues:()=>sourceCues,offset:()=>prefs.sourceOffset,enabled:()=>prefs.pauseAtEnd,replay:()=>replayEnd,clearReplay:()=>replayEnd=null,blocked:()=>!ready||!!player?.classList.contains("ad-showing")||!!player?.classList.contains("ad-interrupting")});
  $("#words").addEventListener("click",learning.show);
  function escape(e) {
    if(e.key==="Escape"){if(!panel.hidden)togglePanel();learning.hide();$("#full-caption").hidden=true;return;}
    if(!e.altKey||e.ctrlKey||e.metaKey||e.repeat||e.composedPath().some(node=>node instanceof HTMLElement&&(node.matches("input,textarea,select")||node.isContentEditable)))return;
    const key=e.key.toLowerCase();if(!["arrowleft","arrowright","r","s","x"].includes(key))return;e.preventDefault();e.stopPropagation();
    if(key==="arrowleft")navigate(-1);else if(key==="arrowright")navigate(1);else if(key==="r")$("#replay").click();else if(key==="s")togglePanel();else stop();
  }
  function runtimeMessage(message, sender, reply) {
    if (sender.id === chrome.runtime.id && message?.type === "YTDS_TOGGLE") { stop(); reply({ disabled: true }); }
  }
  function stop() {
    if (!active) return;
    active = false; generation++; drag = null;
    cancelAnimationFrame(frame); clearInterval(watchTimer); resize.disconnect();
    clearTimeout(nativeRetryTimer);nativeRetryTimer=0;pauseController.dispose();cachedCaptions.clear();sourceSelections.clear();nativeSignals.length=0;
    cancelRequests(); send("dispose");
    window.removeEventListener("message", receive);
    document.removeEventListener("yt-navigate-finish", checkPage);
    document.removeEventListener("fullscreenchange", applyLayout);
    document.removeEventListener("keydown", escape);
    window.removeEventListener("pagehide", stop);
    try { chrome.runtime.onMessage.removeListener(runtimeMessage); } catch { /* Extension reload must not interrupt DOM cleanup. */ }
    if (saveTimer) save();
    restoreNative(); host.remove(); nativeStyle.remove();
    stopI18n?.();learning.dispose();blobUrls.forEach(url=>URL.revokeObjectURL(url));blobUrls.clear();clearImports();
    sourceCues = []; translationCues = []; meta = null;
    delete globalThis[SESSION];
  }
  globalThis[SESSION] = { stop };
  window.addEventListener("message", receive);
  document.addEventListener("yt-navigate-finish", checkPage);
  document.addEventListener("fullscreenchange", applyLayout);
  document.addEventListener("keydown", escape);
  window.addEventListener("pagehide", stop);
  chrome.runtime.onMessage.addListener(runtimeMessage);
  (async () => {
    try { const saved = await chrome.storage.local.get(["layout","preferences"]); if (active) {config = C.settings(saved.layout);prefs=C.preferences(saved.preferences);} }
    catch { if (active) $("#save-status").textContent = "读取设置失败，使用默认布局。"; }
    if (!active) return;
    I?.setPreference(prefs.uiLanguage||"auto");stopI18n=I?.observe(shadow)||null;
    syncControls();syncPreferences();checkPage();tick();watchTimer = setInterval(checkPage, 300);
  })();
})();
