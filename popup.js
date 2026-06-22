// BiliSub popup — detect current page type
(async () => {
  const status = document.getElementById('status');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';
    if (url.includes('bilibili.com/video/')) {
      status.className = 'status status-ok';
      status.textContent = '✓ 视频页 — 可使用 AI 字幕下载';
    } else if (url.includes('bilibili.com') && url.includes('/lists/')) {
      status.className = 'status status-ok';
      status.textContent = '✓ 合集页 — 可批量下载字幕';
    } else if (url.includes('bilibili.com')) {
      status.className = 'status status-tip';
      status.textContent = '提示：请打开视频页或合集页使用';
    } else {
      status.className = 'status status-tip';
      status.textContent = '请在 Bilibili 视频/合集页使用';
    }
  } catch (e) {
    status.className = 'status status-tip';
    status.textContent = '请在 Bilibili 视频/合集页使用';
  }
})();
