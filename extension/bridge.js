(() => {
  "use strict";
  // shortcut: YouTube's page player data is not a stable public API; fail visibly if it changes.
  const KEY = "__YTDS_BRIDGE_V1__", CHANNEL = "YTDS_V1";
  window[KEY]?.dispose();
  let disposed = false;
  const controllers = new Set();
  const nativeRestores = new Set();
  function currentId() { return location.pathname === "/watch" ? new URL(location.href).searchParams.get("v") || "" : ""; }
  let observedVideo = currentId();
  const observedRequests = [];
  let signalSequence = 0;
  function collectPlayerRequests(entries) {
    const id = currentId();
    if (id !== observedVideo) { observedVideo = id; observedRequests.length = 0; }
    for (const entry of entries) {
      if (!(entry.decodedBodySize > 0) || typeof entry.responseStatus==='number' && entry.responseStatus!==0 && entry.responseStatus!==200) continue;
      let u; try { u = new URL(entry.name); } catch { continue; }
      if (u.origin !== "https://www.youtube.com" || u.pathname !== "/api/timedtext" || u.searchParams.get("v") !== id) continue;
      if (!observedRequests.some(item => item.name === entry.name)) {
        observedRequests.push({ name: entry.name, decodedBodySize: entry.decodedBodySize, startTime: entry.startTime });
        if (!disposed) window.postMessage({channel:CHANNEL,direction:"player-ready",id,sequence:++signalSequence,lang:u.searchParams.get("lang")||"",kind:u.searchParams.get("kind")||"",tlang:u.searchParams.get("tlang")||""},location.origin);
      }
    }
    if (observedRequests.length > 200) observedRequests.splice(0, observedRequests.length - 200);
  }
  collectPlayerRequests(performance.getEntriesByType("resource"));
  const resourceObserver = new PerformanceObserver(list => collectPlayerRequests(list.getEntries()));
  resourceObserver.observe({ type: "resource", buffered: true });
  function responseFor(id) {
    const player = document.getElementById("movie_player");
    let response;
    try { response = player?.getPlayerResponse?.(); } catch { /* Page API unavailable. */ }
    if (response?.videoDetails?.videoId !== id) response = window.ytInitialPlayerResponse;
    if (response?.videoDetails?.videoId !== id) throw new Error("播放器字幕数据尚未就绪，请稍后重试。");
    if (response.playabilityStatus?.status && response.playabilityStatus.status !== "OK") throw new Error("此视频当前不可访问；请使用 YouTube 正常播放。");
    if (response.videoDetails?.isLiveContent || player?.getVideoData?.()?.isLive) throw new Error("MVP 暂不支持直播字幕，请使用原生字幕。");
    return response;
  }
  function renderer(id) { return responseFor(id).captions?.playerCaptionsTracklistRenderer || {}; }
  function metadata(id) {
    const r = renderer(id), tracks = r.captionTracks || [];
    const audio = r.audioTracks?.[r.defaultAudioTrackIndex || 0];
    const index = audio?.defaultCaptionTrackIndex;
    return {
      id,
      defaultIndex: Number.isInteger(index) && tracks[index] ? index : Math.max(0, tracks.findIndex(t => t.kind !== "asr")),
      tracks: tracks.slice(0, 100).map(t => ({ languageCode: t.languageCode, kind: t.kind || "", isTranslatable: t.isTranslatable === true, name: (t.name?.simpleText || t.name?.runs?.map(x => x.text).join("") || t.languageCode || "字幕").slice(0, 200) })),
      languages: (r.translationLanguages || []).slice(0, 300).map(t => ({ languageCode: t.languageCode, name: (t.languageName?.simpleText || t.languageName?.runs?.map(x => x.text).join("") || t.languageCode || "").slice(0,200) }))
    };
  }
  async function captions(id, index, translate) {
    const r = renderer(id);
    if (!Number.isInteger(index) || index < 0 || index >= Math.min(r.captionTracks?.length || 0, 100)) throw new Error("字幕轨不可用。");
    const track = r.captionTracks[index];
    if (translate && (!track.isTranslatable || !r.translationLanguages?.some(t => t.languageCode === translate))) throw new Error("YouTube 未提供此字幕轨的目标语言翻译。");
    let url;
    try { url = new URL(track.baseUrl); } catch { throw new Error("字幕地址不受支持，未发送请求。"); }
    if (url.origin !== "https://www.youtube.com" || url.pathname !== "/api/timedtext" || url.username || url.password) throw new Error("字幕地址不受支持，未发送请求。");
    if (url.searchParams.has("v") && url.searchParams.get("v") !== id) throw new Error("字幕轨与当前视频不一致。");
    url.searchParams.set("fmt", "json3");
    url.searchParams.delete("tlang");
    if (translate) url.searchParams.set("tlang", translate);
    collectPlayerRequests(performance.getEntriesByType("resource"));
    let observed = globalThis.YTDSRequestURL?.nativeURL(track,id,translate,observedRequests);
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 12000);
    let restore;
    try {
      if(!observed){
        const player=document.getElementById("movie_player");
        const target=translate?r.translationLanguages.find(t=>t.languageCode===translate):null;
        restore=globalThis.YTDSNativeLoader?.select(player,track,target,()=>currentId()===id && document.getElementById("movie_player")===player);
        if(restore){
          nativeRestores.add(restore);
          // Wait for the player's own successful request, including on an unseen
          // autoplay video. Do not reuse another video's or another track's token.
          const deadline=Date.now()+9000;
          while(!observed && Date.now()<deadline){
            if(controller.signal.aborted || currentId()!==id)throw new DOMException("Aborted","AbortError");
            collectPlayerRequests(performance.getEntriesByType("resource"));
            observed=globalThis.YTDSRequestURL?.nativeURL(track,id,translate,observedRequests);
            if(!observed)await new Promise(resolve=>setTimeout(resolve,100));
          }
        }
      }
      // Fetch only metadata's URL or the complete exact first-party request.
      const requestURL=observed || url.href;
      const response = await fetch(requestURL, { signal: controller.signal, credentials: "same-origin", redirect: "error" });
      if (!response.ok) throw new Error(`字幕获取失败（HTTP ${response.status}）。请使用原生字幕。`);
      if (Number(response.headers.get("content-length")) > 8 * 1024 * 1024) throw new Error("字幕数据过大，MVP 暂不支持。");
      // Bound decoded data while streaming rather than trusting a response header.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("字幕响应不可读取。");
      const decoder = new TextDecoder();
      let size = 0, text = "";
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.byteLength;
        if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error("字幕数据过大，MVP 暂不支持。"); }
        text += decoder.decode(item.value, { stream: true });
      }
      text += decoder.decode();
      if (!text.trim()) throw new Error(translate ? "YouTube 未返回翻译字幕。" : "YouTube 未返回字幕内容。");
      return text;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("字幕请求超时或已取消，请重试。");
      if (error instanceof TypeError) throw new Error("字幕获取被网络或页面策略阻止，请使用原生字幕。");
      throw error;
    } finally { clearTimeout(timeout); controllers.delete(controller);if(restore){restore();nativeRestores.delete(restore);} }
  }
  async function onMessage(event) {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.channel !== CHANNEL || m.direction !== "request" || typeof m.requestId !== "string") return;
    if (m.op === "dispose") { dispose(); return; }
    if (m.op === "cancel") { controllers.forEach(c => c.abort());nativeRestores.forEach(f=>f());nativeRestores.clear();return; }
    if (!["metadata", "captions"].includes(m.op) || !currentId() || m.id !== currentId()) return;
    try {
      const result = m.op === "metadata" ? metadata(m.id) : await captions(m.id, m.index, typeof m.translate === "string" ? m.translate : "");
      if (!disposed && m.id === currentId()) window.postMessage({ channel: CHANNEL, direction: "response", requestId: m.requestId, id: m.id, result }, location.origin);
    } catch (error) {
      if (!disposed) window.postMessage({ channel: CHANNEL, direction: "response", requestId: m.requestId, id: m.id, error: String(error.message).slice(0, 300) }, location.origin);
    }
  }
  function dispose() {
    disposed = true;
    window.removeEventListener("message", onMessage);
    controllers.forEach(c => c.abort());
    controllers.clear();
    nativeRestores.forEach(f=>f());nativeRestores.clear();
    resourceObserver.disconnect();
    observedRequests.length = 0;
    if (window[KEY]?.dispose === dispose) delete window[KEY];
  }
  window[KEY] = { dispose };
  window.addEventListener("message", onMessage);
})();
