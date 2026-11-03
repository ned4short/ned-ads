/*!
 * Ned Ads – shared advertiser slideshow
 * https://ads.nedwebservices.com
 *
 * Add to any page, where the slideshow should appear:
 *   <div data-ned-ads></div>
 *   <script async src="https://ads.nedwebservices.com/widget.js"></script>
 *
 * Ads come from ads.json next to this file, so one change updates every site.
 * Each click is recorded in Ned Traffic as a visit to /click/<ad-name>.
 */
(function () {
  'use strict';

  var SECONDS = 5;                 // time each ad stays up
  var WIDE_ENOUGH = 2.4;           // width ÷ height at or above this = banner-shaped, shown as-is
  var TRACK_URL = 'https://nedtraffic.replit.app/api/track';
  var TRACK_SITE = '56feae0c-8998-42ad-844d-ee2ba1a6a26c'; // Ned Traffic site ID for "Ned Ads"
  var ADVERTISE_URL = 'https://ads.nedwebservices.com/advertise.html';

  var script = document.currentScript;
  var BASE = script ? new URL('.', script.src).href : 'https://ads.nedwebservices.com/';
  var COLORS = {
    red: { bg: '#D62839', fg: '#FFFFFF' },
    blue: { bg: '#1F4FBF', fg: '#FFFFFF' },
    yellow: { bg: '#FFC93C', fg: '#14213D' }
  };
  var COLOR_ORDER = ['blue', 'red', 'yellow'];

  var CSS = [
    ':host{all:initial;display:block;font-family:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;color:#14213D;}',
    '*{box-sizing:border-box;}',
    '.wrap{max-width:1200px;margin:24px auto 40px;padding:0 24px;}',
    '.ads{background:#fff;border-top:3px solid #1F4FBF;border-bottom:3px solid #FFC93C;padding:28px 0 36px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;}',
    'h2{margin:0;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5A6275;}',
    '.carousel{width:100%;max-width:900px;padding:0 16px;}',
    '.viewport{width:100%;overflow:hidden;border-radius:16px;border:2px solid #14213D;background:#F1F3F8;}',
    '.track{display:flex;transition:transform .6s ease;}',
    '@media (prefers-reduced-motion: reduce){.track{transition:none;}}',
    '.slide{flex:0 0 100%;display:block;position:relative;aspect-ratio:3/1;overflow:hidden;text-decoration:none;background:var(--bg,#14213D);color:var(--fg,#fff);}',
    '.slide:focus-visible{outline:3px solid #1F4FBF;outline-offset:-3px;}',
    '.cover img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.whole{display:flex;align-items:stretch;}',
    '.whole img{height:100%;width:auto;max-width:62%;object-fit:contain;display:block;flex:0 0 auto;}',
    '.panel{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:8px;padding:0 clamp(12px,4vw,40px);text-align:left;}',
    '.panel .name{font-size:clamp(16px,4vw,40px);font-weight:800;line-height:1.05;letter-spacing:-.02em;}',
    '.panel .visit{font-size:clamp(11px,1.6vw,17px);font-weight:700;opacity:.92;overflow-wrap:anywhere;}',
    '.controls{display:flex;justify-content:center;align-items:center;gap:4px;margin-top:8px;flex-wrap:wrap;}',
    '.dot{width:32px;height:32px;border:none;background:transparent;cursor:pointer;position:relative;padding:0;}',
    '.dot::after{content:"";position:absolute;inset:11px;border-radius:50%;background:#C9CEDB;}',
    '.dot[aria-current="true"]::after{background:#D62839;}',
    '.arrow{width:32px;height:32px;border-radius:50%;border:1.5px solid #C9CEDB;background:#fff;color:#14213D;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;}',
    '.arrow:hover{border-color:#1F4FBF;color:#1F4FBF;}',
    '.arrow.prev{margin-left:8px;}',
    '.pause{height:32px;padding:0 12px;border:1.5px solid #C9CEDB;border-radius:999px;background:#fff;color:#14213D;font:inherit;font-size:13px;font-weight:600;cursor:pointer;}',
    'button:focus-visible,a:focus-visible{outline:3px solid #1F4FBF;outline-offset:2px;}',
    '.cta{display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 32px;margin-top:8px;border-radius:12px;background:#D62839;color:#fff;font-size:17px;font-weight:700;text-decoration:none;box-shadow:5px 5px 0 #FFC93C;}',
    '.cta:hover{background:#B81F2F;}',
    '@media (max-width:520px){.wrap{padding:0 16px;}.carousel{padding:0 12px;}.cta{width:calc(100% - 24px);}}'
  ].join('\n');

  function slug(s) {
    return String(s || 'ad').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ad';
  }

  function sessionId() {
    try {
      var k = '_nedads_sid', v = sessionStorage.getItem(k);
      if (!v) { v = Math.random().toString(36).slice(2); sessionStorage.setItem(k, v); }
      return v;
    } catch (e) { return Math.random().toString(36).slice(2); }
  }

  // Record a click in Ned Traffic as a visit to /click/<ad>; the site it came from is the referrer.
  function trackClick(ad) {
    if (!/^[0-9a-f-]{20,}$/i.test(TRACK_SITE)) return;
    var payload = JSON.stringify({
      siteId: TRACK_SITE,
      type: 'pageview',
      page: '/click/' + slug(ad.name) + '?from=' + encodeURIComponent(location.hostname),
      referrer: location.href,
      userAgent: navigator.userAgent,
      sessionId: sessionId()
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(TRACK_URL, new Blob([payload], { type: 'application/json' }))) return;
      fetch(TRACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    } catch (e) {}
  }

  function loadFont() {
    if (document.querySelector('link[data-ned-ads-font]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap';
    l.setAttribute('data-ned-ads-font', '');
    document.head.appendChild(l);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function mount(host, ads) {
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    var wrap = el('div', 'wrap');
    var section = el('section', 'ads');
    section.setAttribute('aria-label', 'Advertisers');
    section.appendChild(el('h2', null, host.getAttribute('data-heading') || 'Advertisers'));
    var carousel = el('div', 'carousel');
    var viewport = el('div', 'viewport');
    var track = el('div', 'track');
    viewport.appendChild(track);
    carousel.appendChild(viewport);
    section.appendChild(carousel);

    var slides = ads.map(function (a, i) {
      var link = el('a', 'slide whole');
      link.href = a.link;
      link.target = '_blank';
      link.rel = 'noopener sponsored';
      link.setAttribute('aria-label', (a.name || 'Advertiser') + ' (opens in a new tab), ad ' + (i + 1) + ' of ' + ads.length);
      var color = COLORS[a.color] || COLORS[COLOR_ORDER[i % COLOR_ORDER.length]];
      link.style.setProperty('--bg', color.bg);
      link.style.setProperty('--fg', color.fg);
      var img = el('img');
      img.alt = a.name || 'Advertiser';
      link.appendChild(img);
      var site = a.link.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
      function layout(whole) {
        link.className = 'slide ' + (whole ? 'whole' : 'cover');
        var old = link.querySelector('.panel');
        if (old) link.removeChild(old);
        if (!whole || a.showName === false || !a.name) return;
        var panel = el('span', 'panel');
        panel.appendChild(el('span', 'name', a.name));
        panel.appendChild(el('span', 'visit', 'Visit ' + site + ' →'));
        link.appendChild(panel);
      }
      if (a.fit === 'whole') layout(true);
      else if (a.fit === 'banner') layout(false);
      else {
        layout(false);
        img.addEventListener('load', function () { layout(img.naturalWidth / img.naturalHeight < WIDE_ENOUGH); });
      }
      img.src = new URL(a.image, BASE).href;
      link.addEventListener('click', function () { trackClick(a); });
      link.addEventListener('auxclick', function (e) { if (e.button === 1) trackClick(a); });
      track.appendChild(link);
      return link;
    });

    var current = 0, timer = null, paused = false, hover = false;
    var controls = el('div', 'controls');
    var dots = ads.map(function (a, i) {
      var d = el('button', 'dot');
      d.type = 'button';
      d.setAttribute('aria-label', 'Show ad ' + (i + 1) + ': ' + (a.name || 'Advertiser'));
      d.addEventListener('click', function () { go(i); restart(); });
      controls.appendChild(d);
      return d;
    });
    function arrow(dir) {
      var b = el('button', 'arrow ' + (dir < 0 ? 'prev' : 'next'));
      b.type = 'button';
      b.setAttribute('aria-label', dir < 0 ? 'Previous ad' : 'Next ad');
      b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6') + '"/></svg>';
      b.addEventListener('click', function () { go(current + dir); restart(); });
      return b;
    }
    var pause = el('button', 'pause');
    pause.type = 'button';
    pause.addEventListener('click', function () { paused = !paused; update(); restart(); });
    if (ads.length > 1) {
      controls.appendChild(arrow(-1));
      controls.appendChild(pause);
      controls.appendChild(arrow(1));
      carousel.appendChild(controls);
    }

    var cta = el('a', 'cta', 'Advertise with us');
    cta.href = ADVERTISE_URL;
    cta.target = '_blank';
    cta.rel = 'noopener';
    section.appendChild(cta);
    wrap.appendChild(section);
    root.appendChild(wrap);

    function go(i) {
      current = (i + ads.length) % ads.length;
      track.style.transform = 'translateX(' + (-100 * current) + '%)';
      slides.forEach(function (s, k) {
        s.tabIndex = k === current ? 0 : -1;
        s.setAttribute('aria-hidden', String(k !== current));
      });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === current)); });
    }
    function update() {
      pause.textContent = paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Play advertiser slideshow' : 'Pause advertiser slideshow');
    }
    function restart() {
      clearInterval(timer);
      if (ads.length > 1 && !paused && !hover) timer = setInterval(function () { go(current + 1); }, SECONDS * 1000);
    }
    viewport.addEventListener('mouseenter', function () { hover = true; restart(); });
    viewport.addEventListener('mouseleave', function () { hover = false; restart(); });
    viewport.addEventListener('focusin', function () { hover = true; restart(); });
    viewport.addEventListener('focusout', function () { hover = false; restart(); });
    var startX = null;
    viewport.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      if (startX == null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });
    go(0); update(); restart();
  }

  function start() {
    var hosts = Array.prototype.filter.call(document.querySelectorAll('[data-ned-ads]'), function (h) { return !h.__nedAds; });
    if (!hosts.length) return;
    hosts.forEach(function (h) { h.__nedAds = true; });
    loadFont();
    fetch(BASE + 'ads.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var here = location.hostname.replace(/^www\./, '');
        var ads = (list || []).filter(function (a) {
          if (!a || !a.image || !/^https?:\/\//i.test(a.link || '')) return false;
          if (a.sites && a.sites.length && a.sites.indexOf(here) === -1) return false;
          if (a.hideOn && a.hideOn.indexOf(here) !== -1) return false;
          return true;
        });
        if (!ads.length) return;
        hosts.forEach(function (h) { mount(h, ads); });
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
