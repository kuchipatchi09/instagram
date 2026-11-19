/* Quietgram web-only bookmarklet.
   Runs locally on an already authenticated instagram.com page.
   No passwords, cookies, message contents, API calls, or remote network requests. */
(() => {
  'use strict';
  if (!/^(?:www\.)?instagram\.com$/i.test(location.hostname)) {
    alert('먼저 instagram.com에서 공식 로그인한 뒤 이 북마크를 실행해 주세요.');
    return;
  }
  if (window.__QUIETGRAM_BM__) {
    alert('Quietgram이 이미 실행 중이에요. 하단 스토리·DM 탭을 이용해 주세요.');
    return;
  }
  window.__QUIETGRAM_BM__ = true;
  const HOME = 'https://www.instagram.com/';
  const DM = 'https://www.instagram.com/direct/inbox/';
  const BLOCKED = /^\/(?:reels?|p|explore|search)(?:\/|$)/i;
  const path = () => location.pathname.replace(/\/{2,}/g, '/');
  const home = p => p === '/' || p === '';
  const inbox = p => /^\/direct(?:\/|$)/i.test(p);
  const story = p => /^\/stories(?:\/|$)/i.test(p);
  let ui, timer, started = Date.now(), lastPath = '', stopped = false;

  const style = document.createElement('style');
  style.id = 'qg-bookmarklet-style';
  style.textContent = [
    'html.qg-bm-home body,html.qg-bm-dm body{background:#070708!important}',
    'html.qg-bm-home:not(.qg-bm-ready) main,html.qg-bm-home:not(.qg-bm-ready) [role=main]{visibility:hidden!important}',
    'html.qg-bm-home main article,html.qg-bm-home main aside,html.qg-bm-home [data-qg-bm-hide]{display:none!important}',
    'html.qg-bm-home main,html.qg-bm-home [role=main]{max-width:1100px!important;margin:0 auto!important;padding-top:120px!important;padding-bottom:94px!important}',
    'html.qg-bm-home [data-qg-bm-tray]{display:flex!important;overflow-x:auto!important;max-width:100%!important;visibility:visible!important}',
    'html.qg-bm-home a[href^="/p/"],html.qg-bm-dm a[href^="/p/"],html.qg-bm-home a[href^="/reel/"],html.qg-bm-dm a[href^="/reel/"]{display:none!important}',
    'html.qg-bm-dm main{padding-bottom:86px!important}'
  ].join('');
  document.documentElement.appendChild(style);

  const root = document.createElement('div');
  root.id = 'qg-bookmarklet-root';
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483600;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif';
  const shadow = root.attachShadow({ mode: 'open' });
  shadow.innerHTML = [
    '<style>',
    '*{box-sizing:border-box}button{font:inherit;cursor:pointer}',
    '.top{pointer-events:auto;position:absolute;top:0;left:0;right:0;background:#050505;color:#f5f4f6;height:76px;padding:0 23px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222}',
    '.brand{font-size:22px;font-weight:800;letter-spacing:-.6px}.sub{font-size:11px;letter-spacing:.1em;color:#aa9aa1}',
    '.bottom{pointer-events:auto;position:absolute;bottom:0;left:0;right:0;display:flex;height:calc(76px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:#050505;color:white;border-top:1px solid #252326}',
    '.tab{flex:1;background:transparent;border:0;color:#aaa;font-size:13px;display:flex;gap:5px;align-items:center;justify-content:center;flex-direction:column}.tab.active{color:#f7f2f5}.tab svg{width:23px;height:23px}',
    '.empty{pointer-events:auto;display:none;position:absolute;top:132px;left:50%;transform:translateX(-50%);width:min(92%,470px);padding:24px;border:1px solid #343035;border-radius:19px;background:#1d1a1e;text-align:center;color:white;line-height:1.7}',
    '.empty.visible{display:block}.empty p{font-size:13px;color:#b4aeb6}.empty button{padding:10px 14px;border-radius:10px;background:#342e34;color:white;border:1px solid #51474e}',
    '.note{pointer-events:none;position:absolute;bottom:calc(91px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:10px 15px;border-radius:11px;background:#29232a;color:white;font-size:12px;display:none;white-space:nowrap;max-width:90%}.note.visible{display:block}',
    '</style>',
    '<header class="top"><div class="brand">Quietgram</div><div class="sub">STORIES + DM</div></header>',
    '<div class="empty"><b>스토리 목록을 찾지 못했어요</b><p>현재 Instagram 웹에서 스토리 목록이 보이지 않거나 레이아웃이 변경됐을 수 있어요. 원본 웹에서 스토리가 제공되는지 확인해 주세요.</p><button type="button" id="original">Quietgram 종료 · 원본 보기</button></div>',
    '<footer class="bottom"><button class="tab" data-tab="stories" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg>스토리</button><button class="tab" data-tab="dm" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11a9 9 0 0 1-9 9 9 9 0 0 1-4-.9L3 20l1.3-4A9 9 0 1 1 21 11Z"/></svg>DM</button></footer>',
    '<div class="note" role="status"></div>'
  ].join('');
  document.documentElement.appendChild(root);
  ui = {
    root, empty: shadow.querySelector('.empty'), note: shadow.querySelector('.note'),
    tabs: Array.from(shadow.querySelectorAll('.tab'))
  };

  function notice(message) {
    ui.note.textContent = message;
    ui.note.classList.add('visible');
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => ui.note.classList.remove('visible'), 2400);
  }

  function nav(url) {
    const wanted = new URL(url).pathname;
    const native = Array.from(document.querySelectorAll('a[href]')).find(a => {
      try { return new URL(a.href, location.href).pathname === wanted; } catch (_) { return false; }
    });
    if (native) native.click();
    else location.assign(url);
  }

  function findTray() {
    const links = Array.from(document.querySelectorAll('main a[href], [role="main"] a[href]')).filter(a => {
      try { return /^\/stories\/[^/]+/.test(new URL(a.href, location.href).pathname); } catch (_) { return false; }
    });
    if (!links.length) return null;
    if (links.length === 1) return links[0].parentElement;
    let element = links[0].parentElement;
    for (let count = 0; count < 11 && element; count++, element = element.parentElement) {
      if (element.matches('main,[role="main"]')) break;
      if (links.filter(a => element.contains(a)).length >= Math.min(3, links.length)) return element;
    }
    return links[0].parentElement;
  }

  function isolate() {
    document.querySelectorAll('[data-qg-bm-hide],[data-qg-bm-tray]').forEach(el => {
      el.removeAttribute('data-qg-bm-hide');
      el.removeAttribute('data-qg-bm-tray');
    });
    const tray = findTray();
    if (!tray) return false;
    tray.setAttribute('data-qg-bm-tray', '1');
    let node = tray;
    for (let depth = 0; depth < 14 && node.parentElement; depth++) {
      const parent = node.parentElement;
      if (parent === document.body || parent === document.documentElement) break;
      Array.from(parent.children).forEach(sibling => {
        if (sibling !== node && !sibling.contains(root) && sibling instanceof HTMLElement) {
          sibling.setAttribute('data-qg-bm-hide', '');
        }
      });
      if (parent.matches('main,[role="main"]')) break;
      node = parent;
    }
    return true;
  }

  function update() {
    if (stopped) return;
    const p = path();
    if (BLOCKED.test(p)) {
      notice('게시물과 릴스는 Quietgram에서 차단돼요');
      location.replace(inbox(lastPath) ? DM : HOME);
      return;
    }
    const login = /^\/(?:accounts\/|challenge\/|oauth\/)/.test(p) ||
      (document.querySelector('input[name="username"]') && document.querySelector('input[name="password"]'));
    const isHome = home(p) && !login;
    const isDM = inbox(p) && !login;
    document.documentElement.classList.toggle('qg-bm-home', isHome);
    document.documentElement.classList.toggle('qg-bm-dm', isDM);
    root.style.display = isHome || isDM ? 'block' : 'none';
    ui.tabs.forEach(button => button.classList.toggle('active', button.dataset.tab === (isDM ? 'dm' : 'stories')));
    if (isHome) {
      if (lastPath !== p) started = Date.now();
      const available = isolate();
      document.documentElement.classList.toggle('qg-bm-ready', available);
      ui.empty.classList.toggle('visible', !available && Date.now() - started >= 4300);
    } else {
      document.documentElement.classList.remove('qg-bm-ready');
      ui.empty.classList.remove('visible');
    }
    lastPath = p;
  }

  function onClick(event) {
    const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!target) return;
    let url;
    try { url = new URL(target.href, location.href); } catch (_) { return; }
    if (!/^(?:www\.)?instagram\.com$/.test(url.hostname) || !BLOCKED.test(url.pathname)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    notice('피드 · 릴스 · 탐색은 차단했어요');
  }

  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(update, 350);
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  const interval = setInterval(update, 1100);
  document.addEventListener('click', onClick, true);
  ui.tabs.find(t => t.dataset.tab === 'stories').addEventListener('click', () => nav(HOME));
  ui.tabs.find(t => t.dataset.tab === 'dm').addEventListener('click', () => nav(DM));
  shadow.querySelector('#original').addEventListener('click', () => {
    stopped = true;
    clearInterval(interval);
    clearTimeout(timer);
    observer.disconnect();
    document.removeEventListener('click', onClick, true);
    document.documentElement.classList.remove('qg-bm-home', 'qg-bm-dm', 'qg-bm-ready');
    document.querySelectorAll('[data-qg-bm-hide],[data-qg-bm-tray]').forEach(el => {
      el.removeAttribute('data-qg-bm-hide');
      el.removeAttribute('data-qg-bm-tray');
    });
    style.remove();
    root.remove();
    window.__QUIETGRAM_BM__ = false;
  });
  update();
})();