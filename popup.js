// BiliSub Popup — toggle floating panel on current page
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url?.includes('bilibili.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
  }
  window.close();
})();
