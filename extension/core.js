(function (root) {
  "use strict";
  const defaults = {
    top: { x: 50, y: 10, size: 26, opacity: 70, color: "#000000" },
    bottom: { x: 50, y: 88, size: 24, opacity: 70, color: "#000000" }
  };
  function clamp(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }
  function settings(input = {}) {
    const result = {};
    for (const key of ["top", "bottom"]) {
      const p = input?.[key] || {}, d = defaults[key];
      result[key] = {
        x: clamp(p.x, 10, 90, d.x),
        y: clamp(p.y, key === "top" ? 2 : 65, key === "top" ? 35 : 96, d.y),
        size: clamp(p.size, 12, 64, d.size),
        opacity: clamp(p.opacity, 0, 100, d.opacity),
        color: typeof p.color === "string" && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : d.color
      };
    }
    return result;
  }
  function videoId(href) {
    try { const u = new URL(href); return u.origin === "https://www.youtube.com" && u.pathname === "/watch" ? u.searchParams.get("v") || "" : ""; }
    catch { return ""; }
  }
  function simplified(code) { return /^(zh-Hans|zh-CN|zh-SG)$/i.test(code || ""); }
  function preferences(input = {}) {
    return { targetLanguage: typeof input.targetLanguage === "string" && /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,2}$/.test(input.targetLanguage) ? input.targetLanguage : "zh-Hans",
      swap: input.swap === true, topVisible: input.topVisible !== false, bottomVisible: input.bottomVisible !== false,
      sourceOffset: clamp(input.sourceOffset, -30, 30, 0), translationOffset: clamp(input.translationOffset, -30, 30, 0), pauseAtEnd: input.pauseAtEnd === true,
      uiLanguage: ['auto','zh-CN','en'].includes(input.uiLanguage) ? input.uiLanguage : 'auto' };
  }
  function chooseTracks(meta, selected, target = "zh-Hans") {
    const tracks = meta.tracks || [];
    const index = Number.isInteger(selected) && tracks[selected] ? selected :
      (tracks[meta.defaultIndex] ? meta.defaultIndex : Math.max(0, tracks.findIndex(t => t.kind !== "asr")));
    const source = tracks[index];
    if (!source) throw new Error("此视频没有可用字幕轨。保留原生字幕。");
    const matches = code => code === target || target === "zh-Hans" && simplified(code);
    if (matches(source.languageCode)) return { source: index, translation: index, mode: "same" };
    const chinese = tracks.findIndex(t => matches(t.languageCode));
    if (chinese >= 0) return { source: index, translation: chinese, mode: "track" };
    const available = meta.languages?.some(t => t.languageCode === target);
    return { source: index, translation: index, mode: source.isTranslatable && available ? "auto" : "unavailable" };
  }
  function jsonCues(data) {
    if (!Array.isArray(data?.events) || data.events.length > 100000) throw new Error("字幕格式不支持或数据过大。");
    const cues = [], windows = new Map();
    for (const event of data.events) {
      if (!Array.isArray(event?.segs)) continue;
      const start = Number(event.tStartMs) / 1000, duration = Number(event.dDurationMs) / 1000;
      let text = event.segs.map(s => typeof s?.utf8 === "string" ? s.utf8 : "").join("");
      if (!Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0 || !text.trim()) continue;
      const previous = windows.get(event.wWinId ?? 0);
      if (event.aAppend && previous && previous.end >= start) text = previous.text + text;
      if (previous && previous.end > start) previous.end = start;
      const cue = { start, end: start + duration, text: text.trim().slice(0, 8000) };
      windows.set(event.wWinId ?? 0, cue);
      cues.push(cue);
    }
    return cues.filter(c => c.end > c.start).sort((a, b) => a.start - b.start);
  }
  function parseCaptions(raw, Parser = root.DOMParser) {
    if (typeof raw !== "string" || raw.length > 8 * 1024 * 1024 || !raw.trim()) throw new Error("字幕为空或数据过大。");
    if (raw.trim().startsWith("{")) {
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error("字幕格式不支持或数据损坏。"); }
      return jsonCues(data);
    }
    if (!Parser || /<!DOCTYPE|<!ENTITY/i.test(raw)) throw new Error("字幕格式不支持。");
    const doc = new Parser().parseFromString(raw, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("字幕格式不支持。");
    const nodes = [...doc.querySelectorAll("transcript > text, timedtext > body > p")];
    if (!nodes.length || nodes.length > 100000) throw new Error("未返回可用字幕。");
    return nodes.map(n => {
      const srv = n.tagName === "p", scale = srv ? 1000 : 1;
      const start = Number(n.getAttribute(srv ? "t" : "start")) / scale;
      const duration = Number(n.getAttribute(srv ? "d" : "dur")) / scale;
      return { start, end: start + duration, text: n.textContent.trim().slice(0, 8000) };
    }).filter(c => Number.isFinite(c.start) && c.start >= 0 && Number.isFinite(c.end) && c.end > c.start && c.text).sort((a, b) => a.start - b.start);
  }
  function cueIndex(cues, time) {
    let lo = 0, hi = cues.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (cues[mid].start <= time) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    return found;
  }
  // Caption arrays are immutable after parsing/import. Prefix maxima let us find
  // overlapping active cues without scanning every prior cue on each frame.
  const cueEnds = new WeakMap();
  function activeCuesAt(cues, time) {
    const found=cueIndex(cues,time);if(found<0)return [];
    let cached=cueEnds.get(cues);
    if(!cached||cached.length!==cues.length){const ends=[];let end=-Infinity;for(const cue of cues){end=Math.max(end,cue.end);ends.push(end);}cached={length:cues.length,ends};cueEnds.set(cues,cached);}
    const active=[];
    for(let i=found;i>=0&&cached.ends[i]>time;i--)if(cues[i].start<=time&&time<cues[i].end)active.push(cues[i]);
    return active.reverse();
  }
  function cueAt(cues, time) { return [...new Set(activeCuesAt(cues,time).map(c=>c.text))].join('\n'); }
  function cueRangeAt(cues,time) { const active=activeCuesAt(cues,time);if(!active.length)return null;return active.reduce((range,cue)=>({start:Math.min(range.start,cue.start),end:Math.max(range.end,cue.end)}),{start:Infinity,end:-Infinity}); }
  function timestamp(value) {
    const match = /^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value);
    if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) throw new Error("字幕时间格式无效。");
    return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  }
  function parseFile(raw, name) {
    if (typeof raw !== "string" || raw.length > 8*1024*1024 || !/\.(srt|vtt)$/i.test(name)) throw new Error("请选择不超过 8 MiB 的 SRT 或 VTT 文件。");
    const isVtt = /\.vtt$/i.test(name), clean = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    if (isVtt && !/^WEBVTT(?:\s|$)/.test(clean)) throw new Error("VTT 文件缺少 WEBVTT 标头。");
    const cues = [];
    for (const block of clean.split(/\n\s*\n/)) {
      if (/^(WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(block)) continue;
      const lines = block.split("\n"), lineIndex = lines.findIndex(line => line.includes("-->"));
      if (lineIndex < 0) continue;
      const match = /^\s*(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[lineIndex]);
      if (!match) throw new Error("字幕时间行无效。");
      const start = timestamp(match[1]), end = timestamp(match[2]);
      if (end <= start) throw new Error("字幕结束时间必须晚于开始时间。");
      const text = lines.slice(lineIndex+1).join("\n").replace(/<[^>]*>/g, "").replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, s => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[s]).trim().slice(0,8000);
      if (text) cues.push({start,end,text});
      if (cues.length > 100000) throw new Error("字幕条数过多。");
    }
    if (!cues.length) throw new Error("文件没有可用字幕句。");
    return cues.sort((a,b)=>a.start-b.start);
  }
  function formatTime(seconds, vtt = false) {
    const ms = Math.round(Math.max(0, seconds)*1000), h = Math.floor(ms/3600000), m = Math.floor(ms/60000)%60, s = Math.floor(ms/1000)%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${vtt?'.':','}${String(ms%1000).padStart(3,'0')}`;
  }
  function exportFile(cues, format, offset = 0) {
    cues = cues.filter(c=>c.end+offset>0);
    if (!cues.length) throw new Error("没有可导出的字幕。");
    const vtt = format === "vtt";
    return (vtt ? "WEBVTT\n\n" : "") + cues.map((cue,i) => `${i+1}\n${formatTime(cue.start+offset,vtt)} --> ${formatTime(cue.end+offset,vtt)}\n${cue.text.replace(/\n\s*\n/g,'\n')}\n`).join("\n");
  }
  function captionCache({maxEntries=3,maxBytes=8*1024*1024,ttlMs=15*60*1000,now=Date.now}={}) {
    const entries=new Map();let bytes=0;
    function remove(key){const item=entries.get(key);if(item){bytes-=item.bytes;entries.delete(key);}}
    function get(key){const item=entries.get(key);if(!item)return null;if(item.expires<=now()){remove(key);return null;}entries.delete(key);entries.set(key,item);return item.value;}
    function set(key,value){
      const size=new TextEncoder().encode(JSON.stringify(value)).length;remove(key);if(size>maxBytes)return false;
      entries.set(key,{value,bytes:size,expires:now()+ttlMs});bytes+=size;
      while(entries.size>maxEntries||bytes>maxBytes)remove(entries.keys().next().value);
      return true;
    }
    return {get,set,delete:remove,clear(){entries.clear();bytes=0;}};
  }
  const api = { defaults, settings, preferences, videoId, simplified, chooseTracks, parseCaptions, jsonCues, cueIndex, cueAt, activeCuesAt, cueRangeAt, parseFile, formatTime, exportFile, captionCache };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.YTDSCore = api;
})(globalThis);
