// ==UserScript==
// @name         Quietgram — Stories + DM Only
// @namespace    https://kuchipatchi09.github.io/instagram/
// @version      0.3.0
// @description  Keeps Instagram Web Stories and DMs while reducing feed, Reels and Explore. Login stays on instagram.com.
// @downloadURL  https://raw.githubusercontent.com/kuchipatchi09/instagram/main/Quietgram.user.js
// @updateURL    https://raw.githubusercontent.com/kuchipatchi09/instagram/main/Quietgram.user.js
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
 * Quietgram 0.3 • personal browser UI modification
 * No API calls, no password handling, no content uploading.
 * Instagram's interface changes frequently: story discovery is best effort.
 */
(() => {
  'use strict';
  if (window.top !== window.self || window.__QUIETGRAM_INITIALIZED__) return;
  window.__QUIETGRAM_INITIALIZED__ = true;

  const HOME = 'https://www.instagram.com/';
  const DM = 'https://www.instagram.com/direct/inbox/';
  const BLOCKED = /^\/(?:reels?|p|explore|search)(?:\/|$)/i;
  const SKIP = /^\/(?:accounts\/(?:login|signup|onetap|password|suspended)|challenge|oauth|about|legal)(?:\/|$)/i;
  const originalTitle = document.title;
  let currentPath = '';
  let missingSince = 0;
  let refreshTimer = 0;
  let observer;
  let ui;

  const path = () => location.pathname.replace(/\/{2,}/g, '/');
  const isDM = p => /^\/direct(?:\/|$)/.test(p);
  const isStory = p => /^\/stories(?:\/|$)/.test(p);
  const isHome = p => p === '/' || p === '';
  const go = address => { location.assign(address); };

  // Restrict navigation to web routes, not the actual native Instagram iOS app.
  document.addEventListener('click', event => {
    if (!event.isTrusted) return;
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (!['www.instagram.com', 'instagram.com'].includes(url.hostname)) return;
    if (!BLOCKED.test(url.pathname)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showNotice('게시물 · 릴스 · 탐색은 차단했어요');
  }, true);

  const css = document.createElement('style');
  css.id = 'qg-page-css';
  css.textContent = `
    html.qg-home, html.qg-dm { color-scheme: dark; }
    html.qg-home body, html.qg-dm body { background: #000 !important; }
    /* Never show the feed, even for a moment while Stories are being located. */
    html.qg-home:not(.qg-ready) main, html.qg-home:not(.qg-ready) [role="main"] { visibility: hidden !important; }
    html.qg-home [data-qg-hide="1"], html.qg-home main article,
    html.qg-home main aside, html.qg-home [data-qg-sidebar="1"],
    html.qg-dm [data-qg-sidebar="1"] { display: none !important; }
    html.qg-home main, html.qg-home [role="main"] { margin: 0 auto !important; max-width: 1100px !important;
      padding-top: 145px !important; padding-bottom: 110px !important; }
    html.qg-home [data-qg-story-tray="1"] { display: flex !important;
      overflow-x: auto !important; max-width: 100% !important; touch-action: pan-x !important; }
    html.qg-dm main { padding-bottom: 86px !important; }
    html.qg-home a[href^="/reel/"], html.qg-dm a[href^="/reel/"],
    html.qg-home a[href^="/p/"], html.qg-dm a[href^="/p/"] { display: none !important; }
  `;
  document.documentElement.appendChild(css);

  function icon(type) {
    const common = 'viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    if (type === 'instagram') return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg>`;
    if (type === 'story') return `<svg ${common}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg>`;
    if (type === 'dm') return `<svg ${common}><path d="M21 11.4a8.7 8.7 0 0 1-9 8.5 9.8 9.8 0 0 1-4.1-.9L3 20l1.3-4A8.4 8.4 0 0 1 3 11.4a9 9 0 0 1 18 0Z"/></svg>`;
    return '';
  }

  function createUI() {
    const host = document.createElement('div');
    host.id = 'qg-shell';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483600;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;';
    const shadow = host.attachShadow({mode: 'open'});
    shadow.innerHTML = `
      <style>
        * {box-sizing:border-box;} button {font:inherit;}
        .top {pointer-events:auto;position:absolute;left:0;right:0;top:0;height:78px;padding:18px clamp(18px,4vw,54px);
          background:#000;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #161616;color:#fff;}
        .brand {display:flex;gap:13px;align-items:center;font-size:clamp(19px,3vw,25px);font-weight:750;letter-spacing:-.75px;}
        .tag {color:#979797;font-size:12px;letter-spacing:.06em;text-transform:uppercase;}
        .story-heading {position:absolute;top:91px;left:clamp(18px,4vw,54px);pointer-events:none;
          font-weight:700;color:#bbb;font-size:13px;letter-spacing:.08em;}
        .bottom {pointer-events:auto;position:absolute;bottom:0;left:0;right:0;display:flex;align-items:stretch;
          padding-bottom:env(safe-area-inset-bottom);background:#050505;border-top:1px solid #222;height:calc(78px + env(safe-area-inset-bottom));}
        .tab {flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
          background:transparent;color:#a5a5a5;border:0;font-size:12px;cursor:pointer;}
        .tab.active {color:#fff;} .tab.active:after {content:"";position:absolute;bottom:env(safe-area-inset-bottom);width:24px;height:2px;background:#de5a89;}
        .notice {position:absolute;bottom:calc(97px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);
          border:1px solid #323232;background:#181818;color:#fff;padding:12px 18px;border-radius:12px;max-width:90%;
          font-size:13px;opacity:0;transition:opacity .22s;pointer-events:none;white-space:nowrap;}
        .notice.visible {opacity:1;}
        .empty {pointer-events:auto;display:none;position:absolute;top:150px;left:50%;transform:translateX(-50%);
          width:min(90%,520px);padding:27px 24px;background:#202020;border-radius:17px;color:#eee;text-align:center;}
        .empty b {font-size:16px;} .empty p {font-size:13px;color:#aaa;line-height:1.7;}
        .empty button {background:#333;color:#fff;border:1px solid #555;border-radius:10px;padding:11px 16px;cursor:pointer;}
        .empty.visible {display:block;}
      </style>
      <header class="top"><div class="brand">${icon('instagram')}<span>Quietgram</span></div><div class="tag">STORIES + DM</div></header>
      <div class="story-heading">STORIES</div>
      <div class="empty" role="status"><b>스토리 목록을 찾지 못했어요</b><p>인스타그램 웹에서 스토리 영역을 제공하지 않거나 웹페이지 구조가 변경되었을 수 있어요. 실제 로그인된 인스타그램에서 확인해야 해요.</p><button type="button" id="original">이번 탭에서 원본 웹 보기</button></div>
      <footer class="bottom" aria-label="Quietgram navigation">
        <button type="button" class="tab" data-tab="story">${icon('story')}<span>스토리</span></button>
        <button type="button" class="tab" data-tab="dm">${icon('dm')}<span>DM</span></button>
      </footer>
      <div class="notice" role="status" aria-live="polite"></div>`;
    shadow.querySelector('[data-tab="story"]').addEventListener('click', () => go(HOME));
    shadow.querySelector('[data-tab="dm"]').addEventListener('click', () => go(DM));
    shadow.querySelector('#original').addEventListener('click', () => {
      sessionStorage.setItem('qg-original', '1');
      location.reload();
    });
    document.documentElement.appendChild(host);
    return {
      host,
      heading: shadow.querySelector('.story-heading'),
      empty: shadow.querySelector('.empty'),
      notice: shadow.querySelector('.notice'),
      tabs: [...shadow.querySelectorAll('[data-tab]')]
    };
  }

  function showNotice(message) {
    if (!ui) return;
    ui.notice.textContent = message;
    ui.notice.classList.add('visible');
    clearTimeout(showNotice.timeout);
    showNotice.timeout = setTimeout(() => ui.notice.classList.remove('visible'), 2200);
  }

  function sidebar() {
    // Find nav using its *own* links, not a broad global nav selector.
    const reelLink = [...document.querySelectorAll('a[href]')].find(a => {
      try { return new URL(a.href).pathname === '/reels/'; } catch { return false; }
    });
    if (!reelLink) return;
    let node = reelLink.parentElement;
    for (let i = 0; i < 7 && node && node !== document.body; i++, node = node.parentElement) {
      const urls = [...node.querySelectorAll('a[href]')].map(a => {
        try { return new URL(a.href).pathname; } catch { return ''; }
      });
      if (urls.some(p => p === '/' || p === '/direct/inbox/') && urls.some(p => /^\/reels?\//.test(p))) {
        node.setAttribute('data-qg-sidebar', '1');
        break;
      }
    }
  }

  function findStoryTray() {
    const links = [...document.querySelectorAll('main a[href], [role="main"] a[href]')].filter(a => {
      try { return /^\/stories\/[^/]+/.test(new URL(a.href, location.href).pathname); }
      catch { return false; }
    });
    if (!links.length) return null;
    if (links.length === 1) return links[0].parentElement || links[0];
    let node = links[0].parentElement;
    for (let steps = 0; steps < 12 && node; steps++, node = node.parentElement) {
      const linkCount = links.filter(link => node.contains(link)).length;
      if (linkCount >= Math.min(3, links.length)) return node;
      if (node.matches('main,[role="main"]')) break;
    }
    return links[0].parentElement;
  }

  function isolateStories(tray) {
    document.querySelectorAll('[data-qg-hide], [data-qg-story-tray]').forEach(el => {
      el.removeAttribute('data-qg-hide');
      el.removeAttribute('data-qg-story-tray');
    });
    if (!tray) return false;
    tray.setAttribute('data-qg-story-tray', '1');
    let node = tray;
    let steps = 0;
    while (node.parentElement && steps++ < 14) {
      const parent = node.parentElement;
      if (parent === document.body || parent === document.documentElement) break;
      // Do not touch any portal roots outside the Instagram main content area.
      for (const sibling of parent.children) {
        if (sibling !== node && sibling instanceof HTMLElement &&
            !sibling.contains(ui.host)) sibling.setAttribute('data-qg-hide', '1');
      }
      if (parent.matches('main,[role="main"]')) break;
      node = parent;
    }
    return true;
  }

  function update(force = false) {
    const p = path();
    // Users may disable this script for one Safari tab using the fallback button.
    if (sessionStorage.getItem('qg-original') === '1') {
      document.documentElement.classList.remove('qg-home', 'qg-dm', 'qg-ready');
      if (ui) ui.host.style.display = 'none';
      return;
    }
    if (BLOCKED.test(p)) {
      history.replaceState({}, '', isDM(currentPath) ? '/direct/inbox/' : '/');
      location.reload();
      return;
    }
    if (SKIP.test(p) || document.querySelector('input[name="username"]') && document.querySelector('input[name="password"]')) {
      document.documentElement.classList.remove('qg-home', 'qg-dm', 'qg-ready');
      if (ui) ui.host.style.display = 'none';
      return;
    }
    const home = isHome(p), dm = isDM(p), story = isStory(p);
    document.documentElement.classList.toggle('qg-home', home);
    document.documentElement.classList.toggle('qg-dm', dm);
    if (!ui) ui = createUI();
    ui.host.style.display = home || dm ? 'block' : 'none';
    ui.heading.style.display = home ? 'block' : 'none';
    ui.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === (dm ? 'dm' : 'story')));
    if (home || dm) sidebar();
    if (home) {
      if (force || p !== currentPath) missingSince = Date.now();
      const success = isolateStories(findStoryTray());
      document.documentElement.classList.toggle('qg-ready', success);
      ui.empty.classList.toggle('visible', !success && Date.now() - missingSince > 5000);
    } else {
      document.documentElement.classList.remove('qg-ready');
      ui.empty.classList.remove('visible');
    }
    currentPath = p;
    if (story) document.documentElement.classList.remove('qg-home', 'qg-dm');
  }

  function schedule() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => update(), 450);
  }
  // Instagram is an SPA; watch URL changes and DOM updates.
  update(true);
  observer = new MutationObserver(changes => {
    if (changes.every(c => ui && ui.host.contains(c.target))) return;
    schedule();
  });
  observer.observe(document.body || document.documentElement, {childList:true,subtree:true});
  window.addEventListener('popstate', () => update(true));
  window.addEventListener('pageshow', () => update(true));
  let lastURL = location.href;
  setInterval(() => {
    if (location.href !== lastURL) {
      lastURL = location.href;
      update(true);
    } else if (isHome(path()) && ui && !document.querySelector('[data-qg-story-tray]')) {
      update();
    }
  }, 900);
})();
