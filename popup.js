// BiliSub Popup — toggle floating panel, or show hint on non-Bilibili pages
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.includes('bilibili.com')) {
    // Bilibili page: toggle the floating panel via content script
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
    } catch (e) {
      // content script not ready yet — inject it
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['jszip.min.js', 'content.js'] });
      chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
    }
    window.close();
  } else {
    // Non-Bilibili page: show hint popup
    document.body.innerHTML = `
      <style>
        body{width:240px;padding:16px;font-family:system-ui,sans-serif;font-size:13px;background:#fff;color:#333;text-align:center}
        .logo{font-size:18px;font-weight:700;color:#00a1d6;margin-bottom:12px}
        .logo span{color:#ff6699}
        .hint{color:#999;font-size:12px;line-height:1.6}
      </style>
      <div class="logo">Bili<span>Sub</span></div>
      <div class="hint">请在 Bilibili 视频页、合集页、收藏夹或个人主页使用此插件</div>
    `;
  }
})();
