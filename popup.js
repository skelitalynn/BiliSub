// BiliSub Popup — page detection + download trigger
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

// Detect page type from URL
function detect(url) {
  if (!url || !url.includes('bilibili.com')) return { type: 'unknown', label: '非 Bilibili 页面' };

  // 视频页（含选集参数 ?p=N）
  const vm = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  if (vm) {
    const p = url.match(/[?&]p=(\d+)/);
    return { type: 'video', label: p ? `视频选集 · P${p[1]}` : '视频页', bvid: vm[1] };
  }

  // 合集页 /lists/ID 或 /space/MID/lists/ID
  const lm = url.match(/\/lists?\/(\d+)/);
  if (lm) return { type: 'collection', label: '合集页', listId: lm[1] };

  // 收藏夹 /space/MID/favlist?fid=ID 或 /medialist/play/ID
  const fm = url.match(/[?&]fid=(\d+)/);
  if (fm && url.includes('favlist')) return { type: 'fav', label: '收藏夹', fid: fm[1] };

  // 个人主页 /space/MID (非 lists/favlist)
  const sm = url.match(/space\.bilibili\.com\/(\d+)/);
  if (sm && !url.includes('/lists/') && !url.includes('favlist'))
    return { type: 'space', label: '个人主页', mid: sm[1] };

  return { type: 'unknown', label: '不支持的页面类型' };
}

// Build buttons based on page type
function buildUI(info) {
  const div = document.getElementById('buttons');
  const count = document.getElementById('countInfo');
  div.innerHTML = '';
  count.textContent = '';

  switch (info.type) {
    case 'video': {
      div.innerHTML = `
        <button class="btn btn-primary" id="btn-download">
          ⬇ 下载当前视频 AI 字幕
        </button>
        <button class="btn btn-batch" id="btn-all-pages">
          ⬇ 下载全部选集字幕
        </button>`;
      break;
    }
    case 'collection':
    case 'fav': {
      div.innerHTML = `
        <button class="btn btn-batch" id="btn-download">
          ⬇ 批量下载全部字幕
        </button>`;
      break;
    }
    case 'space': {
      div.innerHTML = `
        <button class="btn btn-batch" id="btn-download">
          ⬇ 下载主页全部视频字幕
        </button>
        <div style="margin-top:8px">
          <label style="font-size:12px;color:#888">数量限制</label>
          <select id="limit" style="margin-left:6px;padding:4px;border-radius:4px;border:1px solid #444;background:#222;color:#fff">
            <option value="50">最近 50 个</option>
            <option value="100">最近 100 个</option>
            <option value="200">最近 200 个</option>
          </select>
        </div>`;
      break;
    }
    default: {
      div.innerHTML = `<div style="padding:10px;color:#888;text-align:center">请在 Bilibili 视频/合集/收藏夹/主页打开插件</div>`;
    }
  }
}

// Message content script
async function send(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return chrome.tabs.sendMessage(tab.id, msg);
}

// Download single video
async function downloadVideo(bvid, allPages = false) {
  const btn = document.getElementById(allPages ? 'btn-all-pages' : 'btn-download');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 提取中...';
  document.getElementById('log').innerHTML = '';

  try {
    const resp = await send({ action: 'extract', bvid, allPages });
    if (resp.error) { log(`✗ ${resp.error}`, 'fail'); return; }

    if (allPages && resp.pages) {
      log(`共 ${resp.pages.length} 个选集`, 'ok');
      for (const p of resp.pages) {
        if (p.error) { log(`✗ P${p.page} ${p.error}`, 'fail'); }
        else {
          downloadFile(p.json, `BiliSub_${bvid}_P${p.page}.json`);
          downloadFile(p.txt, `BiliSub_${bvid}_P${p.page}.txt`);
          log(`✓ P${p.page} · ${p.count}条 · ${p.part}`, 'ok');
        }
      }
    } else {
      downloadFile(resp.json, `BiliSub_${bvid}.json`);
      downloadFile(resp.txt, `BiliSub_${bvid}.txt`);
      log(`✓ ${resp.title?.substring(0,30)} · ${resp.count}条`, 'ok');
    }
  } catch (e) {
    log(`✗ ${e.message}`, 'fail');
  } finally {
    btn.disabled = false;
    btn.innerHTML = allPages ? '⬇ 下载全部选集字幕' : '⬇ 下载当前视频 AI 字幕';
  }
}

// Download batch (collection/fav/space)
async function downloadBatch(info) {
  const btn = document.getElementById('btn-download');
  btn.disabled = true;
  document.getElementById('log').innerHTML = '';

  try {
    log('正在获取视频列表...', '');
    const opts = {};
    if (info.type === 'space') opts.limit = parseInt(document.getElementById('limit')?.value || '50');
    const resp = await send({ action: 'list', type: info.type, ...info, ...opts });

    if (resp.error) { log(`✗ ${resp.error}`, 'fail'); btn.disabled = false; return; }
    if (!resp.videos?.length) { log('未找到视频', 'fail'); btn.disabled = false; return; }

    const total = resp.videos.length;
    log(`共 ${total} 个视频，开始提取...`, 'ok');
    let ok = 0, fail = 0;

    for (let i = 0; i < total; i++) {
      const v = resp.videos[i];
      btn.innerHTML = `<span class="spinner"></span> ${i+1}/${total}`;
      try {
        const r = await send({ action: 'extract', bvid: v.bvid });
        if (r.error) { fail++; log(`✗ [${i+1}] ${v.bvid} ${r.error}`, 'fail'); }
        else {
          downloadFile(r.json, `BiliSub_${v.bvid}.json`);
          downloadFile(r.txt, `BiliSub_${v.bvid}.txt`);
          ok++;
          log(`✓ [${i+1}/${total}] ${v.title?.substring(0,20)} · ${r.count}条`, 'ok');
        }
      } catch (e) { fail++; log(`✗ [${i+1}] ${e.message}`, 'fail'); }
      await new Promise(r => setTimeout(r, 50));
    }

    log(`完成 ${ok}/${total}${fail?' (失败'+fail+')':''}`, fail ? 'fail' : 'ok');
  } catch (e) {
    log(`✗ ${e.message}`, 'fail');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⬇ 批量下载全部字幕';
  }
}

function downloadFile(content, filename) {
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  a.download = filename;
  a.click();
}

// Init
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const info = detect(tab?.url || '');
  setType(info.type, info.label);
  buildUI(info);

  // Bind buttons
  document.getElementById('btn-download')?.addEventListener('click', () => {
    if (info.type === 'video') downloadVideo(info.bvid, false);
    else downloadBatch(info);
  });
  document.getElementById('btn-all-pages')?.addEventListener('click', () => {
    downloadVideo(info.bvid, true);
  });
})();
