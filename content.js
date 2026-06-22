// BiliSub - mirrors /root/projects/txt/main.py logic
// WBI signing → player/wbi/v2 → subtitle download → JSON/TXT

(function () {
  'use strict';

  // ── WBI signing (same logic as main.py encrypt_wbi) ──
  const MIXIN = [
    46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,37,12,52,56,7,
    0,16,38,11,44,13,54,41,55,25,61,30,39,36,34,17,24,57,22,20,6,48,26,1,21,40,60,51,59,4,62
  ];
  function getMixinKey(orig) {
    let r = ''; for (const i of MIXIN) if (i < orig.length) r += orig[i];
    return r.substring(0, 16);
  }

  let _wbiKeys = null, _wbiKeysTime = 0;
  async function getWbiKeys() {
    if (_wbiKeys && Date.now() - _wbiKeysTime < 600000) return _wbiKeys;
    const d = await (await fetch('https://api.bilibili.com/x/web-interface/nav', { credentials: 'include' })).json();
    _wbiKeys = {
      img_key: d.data.wbi_img.img_url.split('/').pop().split('.')[0],
      sub_key: d.data.wbi_img.sub_url.split('/').pop().split('.')[0],
    };
    _wbiKeysTime = Date.now();
    return _wbiKeys;
  }

  // MD5 via crypto-js concept — use SubtleCrypto for speed
  // Actually Bilibili WBI needs true MD5; use a minimal implementation
  function md5(str) {
    // Using open-source MD5 (public domain, ~200 lines)
    function r(n,c){return(n<<c)|(n>>>(32-c))}
    function q(n,c){var b=(n&0xFFFF)+(c&0xFFFF);var d=(n>>16)+(c>>16)+(b>>16);return(d<<16)|(b&0xFFFF)}
    function t(n,c){return n^c}
    function u(n,c){return n&c}
    function v(n,c){return n|c}
    function w(n,c){return n^~c}
    function x(n,c,b,d,a,e,f){return q(r(q(q(c,n),q(d,f)),a),e)}
    function y(n,c,b,d,a,e,f){return q(r(q(q(c,n),q(d,f)),a),e)}
    function z(n,c,b,d,a,e,f){return q(r(q(q(t(c,n),d),f),a),e)}
    function A(n,c,b,d,a,e,f){return q(r(q(q(w(c,n),d),f),a),e)}
    var B=str.length;var C=[B];for(var i=0;i<B;i+=1)C[i>>2]|=(str.charCodeAt(i)&0xFF)<<((i%4)<<3);
    C[B>>2]|=0x80<<((B%4)<<3);C.push(B>>>29);C.push((B<<3)&0xFFFFFFFF);
    var a=0x67452301,b=0xefcdab89,c=0x98badcfe,d=0x10325476;
    for(var j=0;j<C.length;j+=16){
      var aa=a,bb=b,cc=c,dd=d;
      a=x(a,b,c,d,C[j+0],7,0xd76aa478);d=x(d,a,b,c,C[j+1],12,0xe8c7b756);c=x(c,d,a,b,C[j+2],17,0x242070db);b=x(b,c,d,a,C[j+3],22,0xc1bdceee);
      a=x(a,b,c,d,C[j+4],7,0xf57c0faf);d=x(d,a,b,c,C[j+5],12,0x4787c62a);c=x(c,d,a,b,C[j+6],17,0xa8304613);b=x(b,c,d,a,C[j+7],22,0xfd469501);
      a=x(a,b,c,d,C[j+8],7,0x698098d8);d=x(d,a,b,c,C[j+9],12,0x8b44f7af);c=x(c,d,a,b,C[j+10],17,0xffff5bb1);b=x(b,c,d,a,C[j+11],22,0x895cd7be);
      a=x(a,b,c,d,C[j+12],7,0x6b901122);d=x(d,a,b,c,C[j+13],12,0xfd987193);c=x(c,d,a,b,C[j+14],17,0xa679438e);b=x(b,c,d,a,C[j+15],22,0x49b40821);
      a=y(a,b,c,d,C[j+1],5,0xf61e2562);d=y(d,a,b,c,C[j+6],9,0xc040b340);c=y(c,d,a,b,C[j+11],14,0x265e5a51);b=y(b,c,d,a,C[j+0],20,0xe9b6c7aa);
      a=y(a,b,c,d,C[j+5],5,0xd62f105d);d=y(d,a,b,c,C[j+10],9,0x2441453);c=y(c,d,a,b,C[j+15],14,0xd8a1e681);b=y(b,c,d,a,C[j+4],20,0xe7d3fbc8);
      a=y(a,b,c,d,C[j+9],5,0x21e1cde6);d=y(d,a,b,c,C[j+14],9,0xc33707d6);c=y(c,d,a,b,C[j+3],14,0xf4d50d87);b=y(b,c,d,a,C[j+8],20,0x455a14ed);
      a=y(a,b,c,d,C[j+13],5,0xa9e3e905);d=y(d,a,b,c,C[j+2],9,0xfcefa3f8);c=y(c,d,a,b,C[j+7],14,0x676f02d9);b=y(b,c,d,a,C[j+12],20,0x8d2a4c8a);
      a=z(a,b,c,d,C[j+5],4,0xfffa3942);d=z(d,a,b,c,C[j+8],11,0x8771f681);c=z(c,d,a,b,C[j+11],16,0x6d9d6122);b=z(b,c,d,a,C[j+14],23,0xfde5380c);
      a=z(a,b,c,d,C[j+1],4,0xa4beea44);d=z(d,a,b,c,C[j+4],11,0x4bdecfa9);c=z(c,d,a,b,C[j+7],16,0xf6bb4b60);b=z(b,c,d,a,C[j+10],23,0xbebfbc70);
      a=z(a,b,c,d,C[j+13],4,0x289b7ec6);d=z(d,a,b,c,C[j+0],11,0xeaa127fa);c=z(c,d,a,b,C[j+3],16,0xd4ef3085);b=z(b,c,d,a,C[j+6],23,0x4881d05);
      a=z(a,b,c,d,C[j+9],4,0xd9d4d039);d=z(d,a,b,c,C[j+12],11,0xe6db99e5);c=z(c,d,a,b,C[j+15],16,0x1fa27cf8);b=z(b,c,d,a,C[j+2],23,0xc4ac5665);
      a=A(a,b,c,d,C[j+0],6,0xf4292244);d=A(d,a,b,c,C[j+7],10,0x432aff97);c=A(c,d,a,b,C[j+14],15,0xab9423a7);b=A(b,c,d,a,C[j+5],21,0xfc93a039);
      a=A(a,b,c,d,C[j+12],6,0x655b59c3);d=A(d,a,b,c,C[j+3],10,0x8f0ccc92);c=A(c,d,a,b,C[j+10],15,0xffeff47d);b=A(b,c,d,a,C[j+1],21,0x85845dd1);
      a=A(a,b,c,d,C[j+8],6,0x6fa87e4f);d=A(d,a,b,c,C[j+15],10,0xfe2ce6e0);c=A(c,d,a,b,C[j+6],15,0xa3014314);b=A(b,c,d,a,C[j+13],21,0x4e0811a1);
      a=A(a,b,c,d,C[j+4],6,0xf7537e82);d=A(d,a,b,c,C[j+11],10,0xbd3af235);c=A(c,d,a,b,C[j+2],15,0x2ad7d2bb);b=A(b,c,d,a,C[j+9],21,0xeb86d391);
      a=q(a,aa);b=q(b,bb);c=q(c,cc);d=q(d,dd);
    }
    var h=function(n){for(var o='',p=0;p<=3;p++){var s=(n>>>(p*8))&255;o+=('0'+s.toString(16)).slice(-2)}return o};
    return (h(a)+h(b)+h(c)+h(d)).toLowerCase();
  }

  async function signWbi(params) {
    const keys = await getWbiKeys();
    const mixin = getMixinKey(keys.img_key + keys.sub_key);
    const sorted = Object.keys(params).sort().reduce((a,k) => {a[k]=params[k];return a},{});
    sorted.wts = Math.floor(Date.now()/1000);
    sorted.w_rid = md5(new URLSearchParams(sorted).toString() + mixin);
    return sorted;
  }

  // ── Core: extract subtitle (mirrors main.py try_api_mode) ──
  async function extractSubtitle(bvid) {
    const view = await (await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
      { credentials: 'include' }
    )).json();
    if (view.code !== 0) throw new Error(view.message);
    const { aid, cid } = view.data;

    // WBI signed (main path — same as main.py fix)
    const wbiParams = await signWbi({ aid, cid });
    const player = await (await fetch(
      `https://api.bilibili.com/x/player/wbi/v2?${new URLSearchParams(wbiParams)}`,
      { credentials: 'include' }
    )).json();
    if (player.code !== 0) throw new Error(player.message);

    const subs = player.data?.subtitle?.subtitles || [];
    if (!subs.length) throw new Error('无字幕');

    let url = null;
    for (const s of subs) if (s.lan === 'ai-zh') { url = s.subtitle_url; break; }
    if (!url) url = subs[0].subtitle_url;
    if (!url) throw new Error('无字幕 URL');
    if (url.startsWith('//')) url = 'https:' + url;

    const sub = await (await fetch(url)).json();
    if (!sub.body?.length) throw new Error('空格字幕');
    return { data: sub, title: view.data.title };
  }

  // ── Download trigger ──
  function download(content, filename) {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    a.download = filename;
    a.click();
  }

  function save(bvid, data) {
    const body = data.body || [];
    download(JSON.stringify(data, null, 2), `BiliSub_${bvid}.json`);
    const txt = body.map(i => (i.content || '').trim()).filter(Boolean).join('\n');
    if (txt) download(txt, `BiliSub_${bvid}.txt`);
  }

  // ── Toast ──
  function toast(msg, err) {
    const el = Object.assign(document.createElement('div'), {
      className: 'bilisub-toast',
      textContent: msg,
    });
    el.style.cssText = `position:fixed;bottom:80px;right:20px;z-index:99999;background:${err?'#ff4444':'#00a1d6'};color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.3);max-width:360px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ── Collection parser (mirrors batch_extract_v2.py) ──
  async function getCollectionVideos() {
    const m1 = location.href.match(/space\.bilibili\.com\/(\d+)/);
    const m2 = location.href.match(/\/lists?\/(\d+)/);
    if (!m1 || !m2) throw new Error('无法解析合集 URL');
    const all = [];
    for (let p = 1; p <= 5; p++) {
      const d = await (await fetch(
        `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${m1[1]}&season_id=${m2[1]}&page_num=${p}&page_size=50`,
        { credentials: 'include' }
      )).json();
      if (d.code !== 0) break;
      for (const a of d.data?.archives || []) all.push({ bvid: a.bvid, title: a.title });
      if (all.length >= (d.data?.page?.total || 0)) break;
    }
    return all;
  }

  // ── Button injection ──
  function inject() {
    const style = document.createElement('style');
    style.textContent = `
      .bilisub-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-family:system-ui,sans-serif;transition:all .2s}
      .bilisub-dl{background:#00a1d6;color:#fff}.bilisub-dl:hover{background:#00b5e5}
      .bilisub-batch{background:#ff6699;color:#fff}.bilisub-batch:hover{background:#ff7aa8}
      .bilisub-spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:bilisub-s .8s linear infinite}
      @keyframes bilisub-s{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);

    // ── Video page button ──
    if (location.pathname.includes('/video/')) {
      const wait = setInterval(() => {
        const bar = document.querySelector('.bpx-player-control-bottom-right');
        if (!bar || document.querySelector('.bilisub-video')) return;
        clearInterval(wait);
        const btn = document.createElement('button');
        btn.className = 'bilisub-btn bilisub-dl bilisub-video';
        btn.innerHTML = '⬇ AI字幕';
        btn.onclick = async function () {
          const bv = location.pathname.split('/video/')[1]?.split(/[?/]/)[0];
          if (!bv) return toast('未检测到 BV', true);
          btn.disabled = true;
          btn.innerHTML = '<span class="bilisub-spin"></span>';
          try {
            const r = await extractSubtitle(bv);
            save(bv, r.data);
            toast(`✓ ${r.title.substring(0,30)} · ${r.data.body.length}条`);
          } catch (e) { toast('✗ ' + e.message, true); }
          btn.disabled = false;
          btn.innerHTML = '⬇ AI字幕';
        };
        bar.insertBefore(btn, bar.firstChild);
      }, 800);
    }

    // ── Collection page button ──
    if (location.pathname.includes('/lists/')) {
      const wait = setInterval(() => {
        const h = document.querySelector('h1,h2,.season-header,[class*=title]');
        if (!h || document.querySelector('.bilisub-collection')) return;
        clearInterval(wait);
        const btn = document.createElement('button');
        btn.className = 'bilisub-btn bilisub-batch bilisub-collection';
        btn.style.marginLeft = '10px';
        btn.innerHTML = '⬇ 批量下载字幕';
        btn.onclick = async function () {
          btn.disabled = true;
          try {
            toast('读取合集中...');
            const vids = await getCollectionVideos();
            if (!vids.length) return toast('无视频', true);
            let ok = 0, fail = 0;
            for (let i = 0; i < vids.length; i++) {
              btn.innerHTML = `<span class="bilisub-spin"></span> ${i+1}/${vids.length}`;
              try {
                const r = await extractSubtitle(vids[i].bvid);
                save(vids[i].bvid, r.data);
                ok++;
                toast(`[${i+1}/${vids.length}] ✓ ${vids[i].title.substring(0,25)}`);
              } catch (e) { fail++; toast(`[${i+1}/${vids.length}] ✗ ${vids[i].bvid}`, true); }
              await new Promise(r => setTimeout(r, 100));
            }
            toast(`完成 ${ok}/${vids.length}${fail?' (失败'+fail+')':''}`);
          } catch (e) { toast('✗ ' + e.message, true); }
          btn.disabled = false;
          btn.innerHTML = '⬇ 批量下载字幕';
        };
        h.parentNode.insertBefore(btn, h.nextSibling);
      }, 800);
    }
  }

  // ── Init + SPA navigation watch ──
  let lastUrl = location.href;
  inject();
  setInterval(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; inject(); }
  }, 1000);
})();
