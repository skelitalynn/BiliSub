// BiliSub Content Script — execution engine
// Handles messages from popup: { action: 'extract' | 'list', ... }

(function () {
  'use strict';

  // Guard: prevent double-injection from chrome.scripting.executeScript
  if (window.__BILISUB_LOADED__) return;
  window.__BILISUB_LOADED__ = true;

  // ═══ WBI Signing ═══
  const MIXIN = [
    46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,37,12,52,56,7,
    0,16,38,11,44,13,54,41,55,25,61,30,39,36,34,17,24,57,22,20,6,48,26,1,21,40,60,51,59,4,62
  ];
  function getMixinKey(o) { let r=''; for(const i of MIXIN) if(i<o.length) r+=o[i]; return r.substring(0,16); }

  let _keys=null,_keysT=0;
  async function getWbiKeys() {
    if(_keys && Date.now()-_keysT<600000) return _keys;
    const d=await (await fetch('https://api.bilibili.com/x/web-interface/nav',{credentials:'include'})).json();
    _keys={img_key:d.data.wbi_img.img_url.split('/').pop().split('.')[0], sub_key:d.data.wbi_img.sub_url.split('/').pop().split('.')[0]};
    _keysT=Date.now(); return _keys;
  }

  // MD5 (same as Python hashlib.md5)
  function md5(s){function r(n,c){return(n<<c)|(n>>>32-c)}function q(n,c){var b=(n&0xFFFF)+(c&0xFFFF),d=(n>>16)+(c>>16)+(b>>16);return(d<<16)|(b&0xFFFF)}
  var B=s.length,C=[B];for(var i=0;i<B;i+=1)C[i>>2]|=(s.charCodeAt(i)&0xFF)<<((i%4)<<3);
  C[B>>2]|=0x80<<((B%4)<<3);C.push(B>>>29);C.push((B<<3)&0xFFFFFFFF);
  var a=0x67452301,b=0xefcdab89,c=0x98badcfe,d=0x10325476;
  function F(x,y,z){return(x&y)|(~x&z)}function G(x,y,z){return(x&z)|(y&~z)}function H(x,y,z){return x^y^z}function I(x,y,z){return y^(x|~z)}
  function FF(a,b,c,d,x,s,ac){a=q(a,q(q(F(b,c,d),x),ac));return q(r(a,s),b)}
  function GG(a,b,c,d,x,s,ac){a=q(a,q(q(G(b,c,d),x),ac));return q(r(a,s),b)}
  function HH(a,b,c,d,x,s,ac){a=q(a,q(q(H(b,c,d),x),ac));return q(r(a,s),b)}
  function II(a,b,c,d,x,s,ac){a=q(a,q(q(I(b,c,d),x),ac));return q(r(a,s),b)}
  for(var j=0;j<C.length;j+=16){
    var aa=a,bb=b,cc=c,dd=d;
    a=FF(a,b,c,d,C[j+0],7,0xd76aa478);d=FF(d,a,b,c,C[j+1],12,0xe8c7b756);c=FF(c,d,a,b,C[j+2],17,0x242070db);b=FF(b,c,d,a,C[j+3],22,0xc1bdceee);
    a=FF(a,b,c,d,C[j+4],7,0xf57c0faf);d=FF(d,a,b,c,C[j+5],12,0x4787c62a);c=FF(c,d,a,b,C[j+6],17,0xa8304613);b=FF(b,c,d,a,C[j+7],22,0xfd469501);
    a=FF(a,b,c,d,C[j+8],7,0x698098d8);d=FF(d,a,b,c,C[j+9],12,0x8b44f7af);c=FF(c,d,a,b,C[j+10],17,0xffff5bb1);b=FF(b,c,d,a,C[j+11],22,0x895cd7be);
    a=FF(a,b,c,d,C[j+12],7,0x6b901122);d=FF(d,a,b,c,C[j+13],12,0xfd987193);c=FF(c,d,a,b,C[j+14],17,0xa679438e);b=FF(b,c,d,a,C[j+15],22,0x49b40821);
    a=GG(a,b,c,d,C[j+1],5,0xf61e2562);d=GG(d,a,b,c,C[j+6],9,0xc040b340);c=GG(c,d,a,b,C[j+11],14,0x265e5a51);b=GG(b,c,d,a,C[j+0],20,0xe9b6c7aa);
    a=GG(a,b,c,d,C[j+5],5,0xd62f105d);d=GG(d,a,b,c,C[j+10],9,0x2441453);c=GG(c,d,a,b,C[j+15],14,0xd8a1e681);b=GG(b,c,d,a,C[j+4],20,0xe7d3fbc8);
    a=GG(a,b,c,d,C[j+9],5,0x21e1cde6);d=GG(d,a,b,c,C[j+14],9,0xc33707d6);c=GG(c,d,a,b,C[j+3],14,0xf4d50d87);b=GG(b,c,d,a,C[j+8],20,0x455a14ed);
    a=GG(a,b,c,d,C[j+13],5,0xa9e3e905);d=GG(d,a,b,c,C[j+2],9,0xfcefa3f8);c=GG(c,d,a,b,C[j+7],14,0x676f02d9);b=GG(b,c,d,a,C[j+12],20,0x8d2a4c8a);
    a=HH(a,b,c,d,C[j+5],4,0xfffa3942);d=HH(d,a,b,c,C[j+8],11,0x8771f681);c=HH(c,d,a,b,C[j+11],16,0x6d9d6122);b=HH(b,c,d,a,C[j+14],23,0xfde5380c);
    a=HH(a,b,c,d,C[j+1],4,0xa4beea44);d=HH(d,a,b,c,C[j+4],11,0x4bdecfa9);c=HH(c,d,a,b,C[j+7],16,0xf6bb4b60);b=HH(b,c,d,a,C[j+10],23,0xbebfbc70);
    a=HH(a,b,c,d,C[j+13],4,0x289b7ec6);d=HH(d,a,b,c,C[j+0],11,0xeaa127fa);c=HH(c,d,a,b,C[j+3],16,0xd4ef3085);b=HH(b,c,d,a,C[j+6],23,0x4881d05);
    a=HH(a,b,c,d,C[j+9],4,0xd9d4d039);d=HH(d,a,b,c,C[j+12],11,0xe6db99e5);c=HH(c,d,a,b,C[j+15],16,0x1fa27cf8);b=HH(b,c,d,a,C[j+2],23,0xc4ac5665);
    a=II(a,b,c,d,C[j+0],6,0xf4292244);d=II(d,a,b,c,C[j+7],10,0x432aff97);c=II(c,d,a,b,C[j+14],15,0xab9423a7);b=II(b,c,d,a,C[j+5],21,0xfc93a039);
    a=II(a,b,c,d,C[j+12],6,0x655b59c3);d=II(d,a,b,c,C[j+3],10,0x8f0ccc92);c=II(c,d,a,b,C[j+10],15,0xffeff47d);b=II(b,c,d,a,C[j+1],21,0x85845dd1);
    a=II(a,b,c,d,C[j+8],6,0x6fa87e4f);d=II(d,a,b,c,C[j+15],10,0xfe2ce6e0);c=II(c,d,a,b,C[j+6],15,0xa3014314);b=II(b,c,d,a,C[j+13],21,0x4e0811a1);
    a=II(a,b,c,d,C[j+4],6,0xf7537e82);d=II(d,a,b,c,C[j+11],10,0xbd3af235);c=II(c,d,a,b,C[j+2],15,0x2ad7d2bb);b=II(b,c,d,a,C[j+9],21,0xeb86d391);
    a=q(a,aa);b=q(b,bb);c=q(c,cc);d=q(d,dd);
  }
  function h(n){var o='';for(var p=0;p<=3;p++){var t=(n>>>(p*8))&255;o+=('0'+t.toString(16)).slice(-2)}return o}
  return(h(a)+h(b)+h(c)+h(d)).toLowerCase();}

  async function signWbi(params) {
    const keys = await getWbiKeys();
    const mixin = getMixinKey(keys.img_key + keys.sub_key);
    const sorted = Object.keys(params).sort().reduce((a,k)=>{a[k]=params[k];return a},{});
    sorted.wts = Math.floor(Date.now()/1000);
    sorted.w_rid = md5(new URLSearchParams(sorted).toString() + mixin);
    return sorted;
  }

  // ═══ Utils ═══
  function sanitizeFilename(title) {
    return title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 80);
  }

  // ═══ Core: Extract subtitle for a single BV ═══
  async function extractSubtitle(bvid, cidOverride) {
    const view = await (await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, { credentials: 'include' })).json();
    if (view.code !== 0) throw new Error(`View: ${view.message}`);

    const title = view.data.title;
    let cid = cidOverride || view.data.cid;
    let aid = view.data.aid;

    const wbi = await signWbi({ aid, cid });
    const player = await (await fetch(`https://api.bilibili.com/x/player/wbi/v2?${new URLSearchParams(wbi)}`, { credentials: 'include' })).json();
    if (player.code !== 0) throw new Error(`WBI: ${player.message}`);

    const subs = player.data?.subtitle?.subtitles || [];
    if (!subs.length) throw new Error('无字幕');

    let url = null;
    for (const s of subs) if (s.lan === 'ai-zh') { url = s.subtitle_url; break; }
    if (!url) url = subs[0].subtitle_url;
    if (!url) throw new Error('无字幕URL');
    if (url.startsWith('//')) url = 'https:' + url;

    const sub = await (await fetch(url)).json();
    if (!sub.body?.length) throw new Error('空字幕');

    const body = sub.body || [];
    const txt = body.map(i=>(i.content||'').trim()).filter(Boolean).join('\n');
    return {
      json: JSON.stringify(sub, null, 2),
      txt,
      count: body.length,
      title,
      filename: sanitizeFilename(title)
    };
  }

  // ═══ List: Collection ═══
  async function listCollection(listId) {
    const m = location.href.match(/space\.bilibili\.com\/(\d+)/);
    const mid = m ? m[1] : null;
    if (!mid) throw new Error('无法解析mid');
    const all = [];
    for (let p = 1; p <= 10; p++) {
      const d = await (await fetch(
        `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${mid}&season_id=${listId}&page_num=${p}&page_size=50`,
        { credentials: 'include' }
      )).json();
      if (d.code !== 0) break;
      for (const a of d.data?.archives || []) all.push({ bvid: a.bvid, title: a.title });
      if (all.length >= (d.data?.page?.total || 0) || !d.data?.archives?.length) break;
    }
    return all;
  }

  // ═══ List: Favorites ═══
  async function listFavorites(fid) {
    const all = [];
    for (let p = 1; p <= 10; p++) {
      const d = await (await fetch(
        `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${fid}&pn=${p}&ps=20&platform=web`,
        { credentials: 'include' }
      )).json();
      if (d.code !== 0) break;
      const medias = d.data?.medias || [];
      for (const m of medias) all.push({ bvid: m.bvid, title: m.title });
      if (!d.data?.has_more || !medias.length) break;
    }
    return all;
  }

  // ═══ Device fingerprint params (anti-bot, required since 2024) ═══
  // Ported from yt-dlp: https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/bilibili.py
  function getFpParams() {
    const rndB64 = (min, max) => {
      const len = min + Math.floor(Math.random() * (max - min + 1));
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return btoa(s).replace(/=+$/, ''); // strip base64 padding
    };
    const wh = () => {
      const w = screen?.width || 1920, h = screen?.height || 1080;
      const r = Math.floor(Math.random() * 114);
      return [2 * w + 2 * h + 3 * r, 4 * w - h + r, r];
    };
    const of = () => {
      const r = Math.floor(Math.random() * 514);
      return [30 + 20 + r, 40 - 40 + 2 * r, r];
    };
    return {
      dm_img_list: '[]',
      dm_img_str: rndB64(16, 64),
      dm_cover_img_str: rndB64(32, 128),
      dm_img_inter: JSON.stringify({ ds: [], wh: wh(), of: of() }),
    };
  }

  // ═══ List: Space page ═══
  async function listSpace(mid, limit = 50) {
    const all = [];
    const fp = getFpParams();
    for (let p = 1; p <= Math.ceil(limit / 50); p++) {
      const rawParams = { mid, ps: '50', pn: String(p), order: 'pubdate', tid: '0', keyword: '', platform: 'web', web_location: '1550101', ...fp };
      const params = await signWbi(rawParams);
      const d = await (await fetch(
        `https://api.bilibili.com/x/space/wbi/arc/search?${new URLSearchParams(params)}`,
        {
          credentials: 'include',
          headers: { 'Origin': 'https://space.bilibili.com' }
        }
      )).json();
      if (d.code !== 0) throw new Error(`Space API: ${d.message} (code=${d.code})`);
      const vlist = d.data?.list?.vlist || [];
      for (const v of vlist) all.push({ bvid: v.bvid, title: v.title });
      if (all.length >= limit || vlist.length < 50) break;
    }
    return all.slice(0, limit);
  }

  // ═══ List: DOM scraping fallback for upload page ═══
  async function listSpaceFromDom() {
    // Extract unique BV IDs from all video links on the page
    const links = document.querySelectorAll('a[href*="/video/BV"]');
    if (!links.length) return [];
    const seen = new Set();
    const bvids = [];
    for (const a of links) {
      const m = a.href.match(/\/video\/(BV[a-zA-Z0-9]+)/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      bvids.push(m[1]);
    }

    // Use view API to get real titles (batch of 5 concurrent to avoid rate limit)
    const videos = [];
    for (let i = 0; i < bvids.length; i += 5) {
      const batch = bvids.slice(i, i + 5);
      const results = await Promise.all(batch.map(async (bvid) => {
        try {
          const v = await (await fetch(
            `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
            { credentials: 'include' }
          )).json();
          if (v.code === 0) return { bvid, title: v.data.title };
        } catch (e) { /* skip */ }
        return { bvid, title: bvid };
      }));
      videos.push(...results);
    }
    return videos;
  }

  // ═══ Message handler ═══
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      try {
        switch (msg.action) {
          case 'extract': {
            if (msg.allPages) {
              const view = await (await fetch(
                `https://api.bilibili.com/x/web-interface/view?bvid=${msg.bvid}`,
                { credentials: 'include' }
              )).json();
              if (view.code !== 0) { sendResponse({ error: view.message }); return; }
              const pages = view.data.pages || [view.data];
              const results = [];
              for (const p of pages) {
                try {
                  const r = await extractSubtitle(msg.bvid, p.cid);
                  results.push({ page: p.page, part: p.part, ...r });
                } catch (e) {
                  results.push({ page: p.page, part: p.part, error: e.message });
                }
              }
              sendResponse({ pages: results });
            } else {
              const r = await extractSubtitle(msg.bvid, msg.cid);
              sendResponse(r);
            }
            break;
          }
          case 'extractBatch': {
            const { bvids } = msg;
            const zip = new JSZip();
            let ok = 0, fail = 0;
            const errors = [];

            for (let i = 0; i < bvids.length; i++) {
              try {
                const r = await extractSubtitle(bvids[i]);
                if (r.txt) zip.file(`${r.filename}.txt`, r.txt);
                ok++;
              } catch (e) {
                fail++;
                errors.push({ bvid: bvids[i], error: e.message });
              }
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BiliSub_${bvids.length}videos.zip`;
            a.click();
            URL.revokeObjectURL(url);

            sendResponse({ ok, fail, total: bvids.length, errors });
            break;
          }
          case 'list': {
            let videos;
            if (msg.type === 'collection') videos = await listCollection(msg.listId);
            else if (msg.type === 'fav') videos = await listFavorites(msg.fid);
            else if (msg.type === 'space') videos = await listSpace(msg.mid, msg.limit || 50);
            else { sendResponse({ error: 'Unknown type' }); return; }
            sendResponse({ videos });
            break;
          }
          case 'togglePanel':
            togglePanel();
            sendResponse({ ok: true });
            break;
          default:
            sendResponse({ error: 'Unknown action' });
        }
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true; // keep channel open for async
  });

  // ═══ Floating Panel UI ═══
  let panelVisible = false, panelEl = null, panelLog = null, panelBtn = null, panelVideoList = [];

  function detectPageType() {
    const url = location.href;
    if (/\/video\/(BV[a-zA-Z0-9]+)/.test(url)) {
      const bv = RegExp.$1, p = url.match(/[?&]p=(\d+)/);
      return { type: 'video', label: p ? '选集 · P' + p[1] : '视频页', bvid: bv, allPages: !!p };
    }
    if (/\/lists?\/(\d+)/.test(url)) return { type: 'collection', label: '合集页', listId: RegExp.$1 };
    if (/[?&]fid=(\d+)/.test(url) && url.includes('favlist')) return { type: 'fav', label: '收藏夹', fid: RegExp.$1 };
    if (/space\.bilibili\.com\/(\d+)/.test(url) && !url.includes('/lists/') && !url.includes('favlist'))
      return { type: 'space', label: url.includes('/upload') ? '投稿页' : '个人主页', mid: RegExp.$1 };
    return { type: 'unknown', label: '不支持' };
  }

  function plog(msg, cls) {
    if (!panelLog) return;
    const el = document.createElement('div');
    el.style.cssText = `color:${cls==='ok'?'#2e7d32':cls==='fail'?'#c62828':'#666'};font-size:11px;line-height:1.8`;
    el.textContent = msg;
    panelLog.appendChild(el);
    panelLog.scrollTop = panelLog.scrollHeight;
  }

  async function panelDownloadSingle(bvid, allPages) {
    panelBtn.disabled = true; panelBtn.innerHTML = '<span class="bilisub-spin"></span> 提取中...'; panelLog.innerHTML = '';
    try {
      if (allPages) {
        const v = await (await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, { credentials: 'include' })).json();
        if (v.code !== 0) { plog(v.message, 'fail'); return; }
        const pages = v.data.pages || [v.data];
        plog(`共 ${pages.length} 个选集`, 'ok');
        for (const p of pages) {
          try {
            const r = await extractSubtitle(bvid, p.cid);
            const n = (p.part || 'P' + p.page).replace(/[\\/:*?"<>|]/g, '_').trim().substring(0, 80);
            const a = document.createElement('a'); a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(r.txt); a.download = n + '.txt'; a.click();
            plog(`✓ P${p.page} · ${r.count}条`, 'ok');
          } catch (e) { plog(`✗ P${p.page} ${e.message}`, 'fail'); }
        }
      } else {
        const r = await extractSubtitle(bvid);
        const a = document.createElement('a'); a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(r.txt); a.download = r.filename + '.txt'; a.click();
        plog(`✓ ${r.title.substring(0,30)} · ${r.count}条`, 'ok');
      }
    } catch (e) { plog(e.message, 'fail'); }
    panelBtn.disabled = false; panelBtn.innerHTML = '⬇ 下载 AI 字幕';
  }

  async function panelDownloadBatch(videos) {
    panelBtn.disabled = true; panelLog.innerHTML = '';
    try {
      const total = videos.length;
      plog(`共 ${total} 个视频，打包 ZIP...`, 'ok');
      panelBtn.innerHTML = `<span class="bilisub-spin"></span> ${total}个...`;

      const zip = new JSZip();
      let ok = 0;
      for (const v of videos) {
        try {
          const r = await extractSubtitle(v.bvid);
          if (r.txt) zip.file(r.filename + '.txt', r.txt);
          ok++;
        } catch (e) { plog(`✗ ${v.bvid} ${e.message}`, 'fail'); }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `BiliSub_${total}videos.zip`; a.click();
      URL.revokeObjectURL(url);
      plog(`✓ ZIP · ${ok}/${total}`, 'ok');
    } catch (e) { plog(e.message, 'fail'); }
    panelBtn.disabled = false;
    updateDownloadBtnState();
  }

  function updateDownloadBtnState() {
    if (!panelBtn) return;
    const count = panelVideoList.length;
    panelBtn.innerHTML = `⬇ 批量下载字幕 (${count}个 ZIP)`;
    panelBtn.disabled = count === 0;
  }

  function removeFromQueue(index) {
    panelVideoList.splice(index, 1);
    renderVideoList();
    updateDownloadBtnState();
  }

  function renderVideoList() {
    const listEl = panelEl.querySelector('.bilisub-panel-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (panelVideoList.length === 0) {
      listEl.innerHTML = '<div style="color:#999;font-size:12px;text-align:center;padding:20px">列表为空</div>';
      return;
    }

    for (let i = 0; i < panelVideoList.length; i++) {
      const v = panelVideoList[i];
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #eee;font-size:12px';
      item.innerHTML = `
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#333" title="${v.title.replace(/"/g,'&quot;')}">${v.title}</span>
        <button class="bilisub-remove-btn" style="background:none;border:none;color:#e53935;cursor:pointer;font-size:14px;padding:2px 6px;flex-shrink:0" title="移出队列">✕</button>
      `;
      item.querySelector('.bilisub-remove-btn').onclick = () => removeFromQueue(i);
      listEl.appendChild(item);
    }
  }

  async function fetchAndShowVideoList(info) {
    const btns = panelEl.querySelector('.bilisub-panel-btns');
    const listContainer = panelEl.querySelector('.bilisub-panel-list-wrap');
    btns.innerHTML = '<div class="bilisub-spin" style="margin:10px auto"></div>';
    listContainer.style.display = 'none';

    panelLog.innerHTML = '';
    plog('加载视频列表中...', '');

    try {
      let videos;
      if (info.type === 'collection') videos = await listCollection(info.listId);
      else if (info.type === 'fav') videos = await listFavorites(info.fid);
      else if (info.type === 'space') {
        try {
          videos = await listSpace(info.mid, 50);
        } catch (apiErr) {
          if (String(apiErr.message).includes('403') || String(apiErr.message).includes('412')) {
            plog(`API 不可用 (${apiErr.message})，尝试从页面提取...`, '');
            videos = await listSpaceFromDom();
            if (videos?.length) {
              plog(`⚠️ 从当前页面提取到 ${videos.length} 个视频（仅本页可见部分）`, '');
              plog('💡 如果视频不全，可在个人主页而非投稿管理页使用', '');
            }
          } else {
            throw apiErr;
          }
        }
      }
      else { plog('不支持', 'fail'); return; }

      if (!videos?.length) { plog('未找到视频', 'fail'); btns.innerHTML = ''; return; }

      panelVideoList = videos;
      plog(`共 ${videos.length} 个视频，可移除不需要的`, 'ok');
      listContainer.style.display = 'block';

      // Build download button
      btns.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'bilisub-panel-btn bilisub-panel-batch';
      b.onclick = () => panelDownloadBatch(panelVideoList);
      btns.appendChild(b);
      panelBtn = b;
      updateDownloadBtnState();

      renderVideoList();
    } catch (e) {
      plog(e.message, 'fail');
      btns.innerHTML = '';
    }
  }

  function buildPanelButtons(info) {
    const btns = panelEl.querySelector('.bilisub-panel-btns');
    const listWrap = panelEl.querySelector('.bilisub-panel-list-wrap');
    btns.innerHTML = '';
    if (listWrap) listWrap.style.display = 'none';
    panelVideoList = [];

    const mkBtn = (text, cls, fn) => {
      const b = document.createElement('button'); b.className = 'bilisub-panel-btn ' + cls; b.textContent = text; b.onclick = fn; btns.appendChild(b); return b;
    };
    if (info.type === 'video') {
      panelBtn = mkBtn('⬇ 下载当前视频字幕', 'bilisub-panel-primary', () => panelDownloadSingle(info.bvid, false));
      mkBtn('⬇ 下载全部选集字幕', 'bilisub-panel-batch', () => panelDownloadSingle(info.bvid, true));
    } else if (['collection', 'fav', 'space'].includes(info.type)) {
      fetchAndShowVideoList(info);
    } else {
      btns.innerHTML = '<div style="color:#999;font-size:12px;padding:8px;text-align:center">请在视频/合集/收藏夹/主页使用</div>';
    }
  }

  function createPanel() {
    if (panelEl) return;
    const style = document.createElement('style');
    style.textContent = `
      .bilisub-panel{position:fixed;top:80px;right:16px;z-index:99999;width:320px;min-width:280px;max-width:600px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.15);font-family:system-ui,sans-serif;animation:bilisub-fadeIn .25s ease;border:1px solid #e0e0e0;overflow:hidden}
      .bilisub-panel-body{max-height:80vh;overflow-y:auto}
      .bilisub-panel-resize-left{position:absolute;left:0;top:0;bottom:0;width:6px;cursor:ew-resize;z-index:2;transition:background .15s}
      .bilisub-panel-resize-left:hover,.bilisub-panel-resize-left:active{background:rgba(0,161,214,.2)}
      .bilisub-panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;position:sticky;top:0;background:#fff;z-index:1}
      .bilisub-panel-logo{font-size:16px;font-weight:700;color:#00a1d6}.bilisub-panel-logo span{color:#ff6699}
      .bilisub-panel-close{background:none;border:none;color:#999;font-size:18px;cursor:pointer;padding:0 4px;line-height:1}.bilisub-panel-close:hover{color:#333}
      .bilisub-panel-tag{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;margin:0 14px 4px}
      .bilisub-panel-list-wrap{display:none;margin:0 14px}
      .bilisub-panel-list{max-height:260px;overflow-y:auto;border:1px solid #e8e8e8;border-radius:6px}
      .bilisub-panel-btns{padding:8px 14px;display:flex;flex-direction:column;gap:6px}
      .bilisub-panel-btn{display:flex;align-items:center;justify-content:center;width:100%;padding:9px;border:none;border-radius:7px;font-size:12px;cursor:pointer;transition:all .2s;font-weight:500}
      .bilisub-panel-primary{background:#00a1d6;color:#fff}.bilisub-panel-primary:hover{background:#00b5e5}
      .bilisub-panel-batch{background:#ff6699;color:#fff}.bilisub-panel-batch:hover{background:#ff7aa8}
      .bilisub-panel-btn:disabled{opacity:.4;cursor:not-allowed}
      .bilisub-panel-log{max-height:180px;overflow-y:auto;padding:4px 14px 10px}
      .bilisub-spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(0,0,0,.15);border-top-color:#00a1d6;border-radius:50%;animation:bilisub-s .8s linear infinite}
      @keyframes bilisub-s{to{transform:rotate(360deg)}}
      @keyframes bilisub-fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(style);

    const info = detectPageType();
    const colors = { video: '#2e7d32', collection: '#e65100', fav: '#c62828', space: '#1565c0', unknown: '#666' };
    const bgs = { video: '#e8f5e9', collection: '#fff3e0', fav: '#fce4ec', space: '#e3f2fd', unknown: '#f5f5f5' };

    panelEl = document.createElement('div');
    panelEl.className = 'bilisub-panel';
    panelEl.innerHTML = `<div class="bilisub-panel-resize-left"></div><div class="bilisub-panel-body"><div class="bilisub-panel-header"><div class="bilisub-panel-logo">Bili<span>Sub</span></div><button class="bilisub-panel-close" title="关闭">✕</button></div><div class="bilisub-panel-tag" style="background:${bgs[info.type]};color:${colors[info.type]}">${info.label}</div><div class="bilisub-panel-list-wrap"><div class="bilisub-panel-list"></div></div><div class="bilisub-panel-btns"></div><div class="bilisub-panel-log"></div></div>`;
    document.body.appendChild(panelEl);

    // Left-edge drag resize
    const handle = panelEl.querySelector('.bilisub-panel-resize-left');
    let dragging = false, startX, startW;
    handle.addEventListener('mousedown', (e) => {
      dragging = true; startX = e.clientX; startW = panelEl.offsetWidth;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = startX - e.clientX;
      const newW = Math.min(600, Math.max(280, startW + delta));
      panelEl.style.width = newW + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    panelLog = panelEl.querySelector('.bilisub-panel-log');
    panelEl.querySelector('.bilisub-panel-close').onclick = hidePanel;
    buildPanelButtons(info);
    panelVisible = true;
  }

  function hidePanel() { if (panelEl) { panelEl.remove(); panelEl = null; panelLog = null; panelBtn = null; panelVideoList = []; panelVisible = false; } }
  function togglePanel() { panelVisible ? hidePanel() : createPanel(); }

  // ═══ SPA navigation watcher — auto-refresh panel when URL changes ═══
  function onUrlChange() {
    if (!panelVisible) return;
    const info = detectPageType();
    if (!panelEl) return;
    const tag = panelEl.querySelector('.bilisub-panel-tag');
    if (!tag) return;
    const colors = { video: '#2e7d32', collection: '#e65100', fav: '#c62828', space: '#1565c0', unknown: '#666' };
    const bgs = { video: '#e8f5e9', collection: '#fff3e0', fav: '#fce4ec', space: '#e3f2fd', unknown: '#f5f5f5' };
    tag.textContent = info.label;
    tag.style.background = bgs[info.type];
    tag.style.color = colors[info.type];
    panelVideoList = [];
    buildPanelButtons(info);
  }

  // Monkey-patch history.pushState / replaceState to catch SPA navigations
  const _pushState = history.pushState;
  const _replaceState = history.replaceState;
  history.pushState = function () { _pushState.apply(this, arguments); onUrlChange(); };
  history.replaceState = function () { _replaceState.apply(this, arguments); onUrlChange(); };
  window.addEventListener('popstate', onUrlChange);

  // Fallback polling for URL changes not captured by pushState (e.g., hash-only)
  let _lastUrl = location.href;
  setInterval(() => {
    if (location.href === _lastUrl) return;
    _lastUrl = location.href;
    onUrlChange();
  }, 1500);
})();
