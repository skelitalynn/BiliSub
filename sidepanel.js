// BiliSub Side Panel
const log = (msg, cls) => {
  const el = document.getElementById('log');
  el.innerHTML += `<span class="${cls||''}">${msg}</span><br>`;
  el.scrollTop = el.scrollHeight;
};

const setType = (type, label) => {
  const tag = document.getElementById('typeTag');
  tag.className = `page-type type-${type}`;
  tag.textContent = label;
};

function detect(url) {
  if (!url || !url.includes('bilibili.com')) return { type: 'unknown', label: '非 Bilibili 页面' };
  const vm = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  if (vm) {
    const p = url.match(/[?&]p=(\d+)/);
    return { type: 'video', label: p ? `视频选集 · P${p[1]}` : '视频页', bvid: vm[1] };
  }
  const lm = url.match(/\/lists?\/(\d+)/);
  if (lm) return { type: 'collection', label: '合集页', listId: lm[1] };
  const fm = url.match(/[?&]fid=(\d+)/);
  if (fm && url.includes('favlist')) return { type: 'fav', label: '收藏夹', fid: fm[1] };
  const sm = url.match(/space\.bilibili\.com\/(\d+)/);
  if (sm && !url.includes('/lists/') && !url.includes('favlist'))
    return { type: 'space', label: '个人主页', mid: sm[1] };
  return { type: 'unknown', label: '不支持' };
}

function buildUI(info) {
  const div = document.getElementById('buttons');
  div.innerHTML = '';
  switch (info.type) {
    case 'video':
      div.innerHTML = `<button class="btn btn-primary" id="btn-download">⬇ 下载当前视频 AI 字幕</button><button class="btn btn-batch" id="btn-all-pages">⬇ 下载全部选集字幕</button>`;
      break;
    case 'collection': case 'fav':
      div.innerHTML = `<button class="btn btn-batch" id="btn-download">⬇ 批量下载全部字幕 (ZIP)</button>`;
      break;
    case 'space':
      div.innerHTML = `<button class="btn btn-batch" id="btn-download">⬇ 下载主页全部视频字幕 (ZIP)</button>
        <div style="margin-top:8px"><label style="font-size:12px;color:#888">数量</label>
        <select id="limit" style="margin-left:6px;padding:4px;border-radius:4px;border:1px solid #444;background:#222;color:#fff">
        <option value="50">最近 50 个</option><option value="100">100 个</option><option value="200">200 个</option></select></div>`;
      break;
    default:
      div.innerHTML = `<div style="padding:10px;color:#888;text-align:center">请在 Bilibili 视频/合集/收藏夹/主页使用</div>`;
  }
}

async function send(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return chrome.tabs.sendMessage(tab.id, msg);
}

function downloadFile(content, filename) {
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  a.download = filename;
  a.click();
}

function sanitize(s) {
  return s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 80);
}

async function downloadSingle(bvid, allPages) {
  const btn = document.getElementById(allPages ? 'btn-all-pages' : 'btn-download');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 提取中...';
  document.getElementById('log').innerHTML = '';
  try {
    const resp = await send({ action: 'extract', bvid, allPages });
    if (resp.error) { log(`✗ ${resp.error}`, 'fail'); return; }
    if (allPages && resp.pages) {
      log(`共 ${resp.pages.length} 个选集`, 'ok');
      for (const p of resp.pages) {
        if (p.error) { log(`✗ P${p.page} ${p.error}`, 'fail'); }
        else {
          const name = p.part ? sanitize(p.part) : `P${p.page}`;
          downloadFile(p.txt, `${name}.txt`);
          log(`✓ P${p.page} · ${p.count}条 · ${p.part}`, 'ok');
        }
      }
    } else {
      downloadFile(resp.txt, `${resp.filename || resp.bvid}.txt`);
      log(`✓ ${resp.title?.substring(0,30)} · ${resp.count}条`, 'ok');
    }
  } catch (e) { log(`✗ ${e.message}`, 'fail'); }
  btn.disabled = false;
  btn.innerHTML = allPages ? '⬇ 下载全部选集字幕' : '⬇ 下载当前视频 AI 字幕';
}

async function downloadBatch(info) {
  const btn = document.getElementById('btn-download');
  btn.disabled = true; document.getElementById('log').innerHTML = '';
  try {
    log('获取列表中...', '');
    const opts = {};
    if (info.type === 'space') opts.limit = parseInt(document.getElementById('limit')?.value || '50');
    const resp = await send({ action: 'list', type: info.type, ...info, ...opts });
    if (resp.error) { log(`✗ ${resp.error}`, 'fail'); return; }
    if (!resp.videos?.length) { log('未找到视频', 'fail'); return; }

    const total = resp.videos.length;
    const bvids = resp.videos.map(v => v.bvid);
    log(`共 ${total} 个视频，打包 ZIP...`, 'ok');
    btn.innerHTML = `<span class="spinner"></span> ${total}个...`;

    const result = await send({ action: 'extractBatch', bvids });
    for (const v of resp.videos) {
      const err = result.errors?.find(e => e.bvid === v.bvid);
      if (err) log(`✗ ${v.bvid} ${err.error}`, 'fail');
    }
    log(`✓ ZIP · ${result.ok}/${total}`, result.fail ? 'fail' : 'ok');
  } catch (e) { log(`✗ ${e.message}`, 'fail'); }
  btn.disabled = false;
  btn.innerHTML = '⬇ 批量下载全部字幕 (ZIP)';
}

// Listen for tab switches to refresh panel
chrome.tabs.onActivated.addListener(() => init());
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'complete') init();
});

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const info = detect(tab?.url || '');
  setType(info.type, info.label);
  buildUI(info);

  document.getElementById('btn-download')?.addEventListener('click', () => {
    if (info.type === 'video') downloadSingle(info.bvid, false);
    else downloadBatch(info);
  });
  document.getElementById('btn-all-pages')?.addEventListener('click', () => downloadSingle(info.bvid, true));
}

init();
