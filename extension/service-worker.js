/* No persistent site access: injection follows an explicit toolbar click. */
const busyTabs = new Set();
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || busyTabs.has(tab.id)) return;
  busyTabs.add(tab.id);
  try {
    const url = new URL(tab.url || "about:blank");
    if (url.origin !== "https://www.youtube.com" || url.pathname !== "/watch") {
      await chrome.action.setBadgeText({ tabId: tab.id, text: "YT" });
      await chrome.action.setTitle({ tabId: tab.id, title: "请先打开 www.youtube.com/watch 视频页面" });
      return;
    }
    let reply;
    try { reply = await chrome.tabs.sendMessage(tab.id, { type: "YTDS_TOGGLE" }); } catch { /* First activation. */ }
    if (reply?.disabled) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: "MAIN", files: ["request-url.js", "native-loader.js", "bridge.js"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["core.js", "playback.js", "dictionary.js", "learning.js", "content.js"] });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
    await chrome.action.setTitle({ tabId: tab.id, title: "关闭上下字幕（也可在播放器内关闭）" });
  } catch {
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" }).catch(() => {});
    await chrome.action.setTitle({ tabId: tab.id, title: "无法启用，请刷新可访问的 YouTube 视频页面后重试" }).catch(() => {});
  } finally { busyTabs.delete(tab.id); }
});
