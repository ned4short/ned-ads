/*!
 * Ned Ads – shared advertiser slideshow
 * https://ads.nedwebservices.com
 *
 * Add to any page, where the slideshow should appear:
 *   <div data-ned-ads></div>
 *   <script async src="https://ads.nedwebservices.com/widget.js"></script>
 *
 * Ads come from ads.json next to this file, so one change updates every site.
 * Each click is recorded in Ned Traffic ("Ned Ads" site) as a visit to /click/<ad-name>.
 * Impressions go to a separate Ned Traffic site ("Ned Ads Impressions"):
 *   /view?from=<site>                  the slideshow was seen (once per page load)
 *   /impression/<ad-name>?from=<site>  that ad was seen (once per ad per page load)
 * "Seen" means at least half the slideshow on screen, tab in front, for 1 second.
 */
(function () {
  'use strict';

  var SECONDS = 5;                 // time each ad stays up
  var WIDE_ENOUGH = 2.4;           // width ÷ height at or above this = banner-shaped, shown as-is
  var TRACK_URL = 'https://nedtraffic.replit.app/api/track';
  var TRACK_SITE = '56feae0c-8998-42ad-844d-ee2ba1a6a26c'; // Ned Traffic site ID for "Ned Ads" (clicks)
  var IMPRESSION_SITE = 'ac3f7c21-7fa7-4d91-839a-9828629acc3d'; // Ned Traffic site ID for "Ned Ads Impressions"
  var SEEN_SHARE = 0.5;            // how much of the slideshow must be on screen to count as seen
  var SEEN_MS = 1000;              // ...and for how long
  var ADVERTISE_URL = 'https://ads.nedwebservices.com/advertise.html';
  var SHOW_ADVERTISE_BUTTON = false; // hidden for now; set to true to bring the "Advertise with us" button back

  // Ads and images always come from ads.nedwebservices.com, even if a site saves its own copy of this file.
  var HOME = 'https://ads.nedwebservices.com/';
  var script = document.currentScript;
  var BASE = script && /^https?:\/\/(ads\.nedwebservices\.com|localhost|127\.0\.0\.1)(:\d+)?\//.test(script.src) ? new URL('.', script.src).href : HOME;
  var COLORS = {
    red: { bg: '#D62839', fg: '#FFFFFF' },
    blue: { bg: '#1F4FBF', fg: '#FFFFFF' },
    yellow: { bg: '#FFC93C', fg: '#14213D' }
  };
  var COLOR_ORDER = ['blue', 'red', 'yellow'];

  var CSS = [
    ':host{all:initial;display:block;font-family:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;color:#14213D;}',
    '*{box-sizing:border-box;}',
    '.wrap{max-width:1200px;margin:0 auto;padding:0 24px;}',
    '.ads{background:transparent;border:none;padding:10px 0 10px;display:flex;flex-direction:column;align-items:center;gap:0;text-align:center;}',
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
    '.controls{display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:6px;margin-top:8px;width:100%;}',
    '.dots{flex:1 1 0;min-width:0;display:flex;flex-wrap:nowrap;align-items:center;}',
    '.dots.left{justify-content:flex-end;}',
    '.dots.right{justify-content:flex-start;}',
    '.center{flex:0 0 auto;display:flex;align-items:center;gap:6px;}',
    '.dot{flex:0 1 32px;min-width:10px;height:32px;border:none;background:transparent;cursor:pointer;position:relative;padding:0;}',
    '.dot::after{content:"";position:absolute;top:50%;left:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#C9CEDB;}',
    '.dot[aria-current="true"]::after{background:#D62839;}',
    '.arrow{flex:0 0 auto;width:32px;height:32px;border-radius:50%;border:1.5px solid #C9CEDB;background:#fff;color:#14213D;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;}',
    '.arrow:hover{border-color:#1F4FBF;color:#1F4FBF;}',
    '.pause{flex:0 0 auto;height:32px;padding:0 12px;border:1.5px solid #C9CEDB;border-radius:999px;background:#fff;color:#14213D;font:inherit;font-size:13px;font-weight:600;cursor:pointer;}',
    'button:focus-visible,a:focus-visible{outline:3px solid #1F4FBF;outline-offset:2px;}',
    '.cta{display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 32px;margin-top:10px;border-radius:12px;background:#D62839;color:#fff;font-size:17px;font-weight:700;text-decoration:none;box-shadow:5px 5px 0 #FFC93C;}',
    '.cta:hover{background:#B81F2F;}',
    '@media (max-width:520px){.dot::after{width:8px;height:8px;margin:-4px 0 0 -4px;}.controls,.center{gap:4px;}.wrap{padding:0 16px;}.carousel{padding:0 12px;}.cta{width:calc(100% - 24px);}}'
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

  // Send one event to Ned Traffic as a visit to `path`; the site it came from is the referrer.
  function send(siteId, path) {
    if (!/^[0-9a-f-]{20,}$/i.test(siteId)) return;
    var payload = JSON.stringify({
      siteId: siteId,
      type: 'pageview',
      page: path + '?from=' + encodeURIComponent(location.hostname),
      referrer: location.href,
      userAgent: navigator.userAgent,
      sessionId: sessionId()
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(TRACK_URL, new Blob([payload], { type: 'application/json' }))) return;
      fetch(TRACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    } catch (e) {}
  }

  function trackClick(ad) { send(TRACK_SITE, '/click/' + slug(ad.name)); }

  // Each thing counts at most once per page load, even with several slideshows on the page.
  var counted = {};
  function trackOnce(path) {
    if (counted[path]) return;
    counted[path] = true;
    send(IMPRESSION_SITE, path);
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
        panel.appendChild(el('span', 'visit', 'Visit ' + site + ' \u2192'));
        link.appendChild(panel);
      }
      if (a.fit === 'whole') layout(true);
      else if (a.fit === 'banner') layout(false);
      else {
        layout(false);
        img.addEventListener('load', function () { layout(img.naturalWidth / img.naturalHeight < WIDE_ENOUGH); });
      }
      // If the image can't load, try once more; if it still fails, show the ad as text instead of a broken picture.
      var retried = false;
      img.addEventListener('error', function () {
        if (!retried) { retried = true; img.src = new URL(a.image, BASE).href + (a.image.indexOf('?') === -1 ? '?' : '&') + 'retry=1'; return; }
        img.style.display = 'none';
        link.className = 'slide whole';
        if (!link.querySelector('.panel')) {
          var panel = el('span', 'panel');
          panel.appendChild(el('span', 'name', a.name || 'Visit our sponsor'));
          panel.appendChild(el('span', 'visit', 'Visit ' + site + ' \u2192'));
          link.appendChild(panel);
        }
      });
      img.src = new URL(a.image, BASE).href;
      link.addEventListener('click', function () { trackClick(a); });
      link.addEventListener('auxclick', function (e) { if (e.button === 1) trackClick(a); });
      track.appendChild(link);
      return link;
    });

    var current = 0, timer = null, paused = false, hover = false;
    // One line: half the dots, then ‹ Pause › in the middle, then the other half.
    var controls = el('div', 'controls');
    var leftDots = el('div', 'dots left');
    var center = el('div', 'center');
    var rightDots = el('div', 'dots right');
    var half = Math.ceil(ads.length / 2);
    var dots = ads.map(function (a, i) {
      var d = el('button', 'dot');
      d.type = 'button';
      d.setAttribute('aria-label', 'Show ad ' + (i + 1) + ': ' + (a.name || 'Advertiser'));
      d.addEventListener('click', function () { go(i); restart(); });
      (i < half ? leftDots : rightDots).appendChild(d);
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
      center.appendChild(arrow(-1));
      center.appendChild(pause);
      center.appendChild(arrow(1));
      controls.appendChild(leftDots);
      controls.appendChild(center);
      controls.appendChild(rightDots);
      carousel.appendChild(controls);
    }

    if (SHOW_ADVERTISE_BUTTON) {
      var cta = el('a', 'cta', 'Advertise with us');
      cta.href = ADVERTISE_URL;
      cta.target = '_blank';
      cta.rel = 'noopener';
      section.appendChild(cta);
    }
    wrap.appendChild(section);
    root.appendChild(wrap);

    // Impressions: count only when the slideshow is really on screen.
    var inView = !('IntersectionObserver' in window), seenTimer = null;
    function checkSeen() {
      clearTimeout(seenTimer);
      if (!inView || document.hidden) return;
      var ad = ads[current];
      seenTimer = setTimeout(function () {
        if (!inView || document.hidden || ads[current] !== ad) return;
        trackOnce('/view');
        trackOnce('/impression/' + slug(ad.name));
      }, SEEN_MS);
    }
    if (!inView) {
      new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].intersectionRatio >= SEEN_SHARE;
        checkSeen();
      }, { threshold: [0, SEEN_SHARE, 1] }).observe(viewport);
    }
    document.addEventListener('visibilitychange', checkSeen);

    function go(i) {
      current = (i + ads.length) % ads.length;
      track.style.transform = 'translateX(' + (-100 * current) + '%)';
      slides.forEach(function (s, k) {
        s.tabIndex = k === current ? 0 : -1;
        s.setAttribute('aria-hidden', String(k !== current));
      });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === current)); });
      checkSeen();
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
