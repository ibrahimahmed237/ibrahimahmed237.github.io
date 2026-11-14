/*
 * Motion on scroll, kept cheap: only transform and opacity move.
 * - Things marked .rv come in once, as they reach the screen (.in), then settle (.done).
 * - Numbers in the open-source cards count up the first time they are seen.
 * - The hero drifts apart as you scroll, the timeline draws itself, and the top bar shows how far you are.
 * - Cards marked .tilt lean a little toward the pointer.
 * With "reduce motion" on, everything is shown at once and nothing moves.
 */
(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null;

  // ---------------------------------------------------------------- come in once
  function settle(el) {
    setTimeout(function () { el.classList.add('done'); }, 1500);
  }

  function show(el) {
    el.classList.add('in');
    settle(el);
    var counters = el.querySelectorAll('[data-count]');
    for (var i = 0; i < counters.length; i++) countUp(counters[i], i);
  }

  var io = null;
  var proxies = new Map();
  if (!reduce && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var heads = proxies.get(e.target);
          if (heads) { heads.forEach(show); proxies.delete(e.target); }
          if (e.target.classList.contains('rv')) show(e.target);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  }

  function scan() {
    var els = document.querySelectorAll('.rv:not(.in)');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (seen && seen.has(el)) continue;
      if (seen) seen.add(el);
      if (!io) { el.classList.add('in', 'done'); continue; }
      // A heading that wipes in starts fully clipped, so it can never be seen to intersect: watch its parent instead.
      if (el.classList.contains('rvh')) { proxies.set(el.parentElement, (proxies.get(el.parentElement) || []).concat(el)); io.observe(el.parentElement); }
      else io.observe(el);
    }
  }

  // ---------------------------------------------------------------- count up
  function countUp(el, order) {
    var text = el.textContent.trim();
    var m = /^(~?)(\d[\d,]*)([+%]?)$/.exec(text);
    if (!m || reduce) return;
    var target = parseInt(m[2].replace(/,/g, ''), 10);
    var start = null;
    var wait = 350 + order * 90;
    var length = target > 100 ? 1300 : 800;
    el.setAttribute('data-counting', '1');
    el.textContent = m[1] + '0' + m[3];
    function frame(t) {
      if (start === null) start = t + wait;
      var p = Math.min(1, Math.max(0, (t - start) / length));
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + Math.round(target * eased).toLocaleString('en-US') + m[3];
      if (p < 1) requestAnimationFrame(frame);
      else { el.textContent = text; el.removeAttribute('data-counting'); }
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- scroll-linked
  var ticking = false;
  function q(sel) { return document.querySelector(sel); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    var y = window.scrollY || window.pageYOffset;
    var doc = document.documentElement;

    var bar = q('.progress');
    if (bar) bar.style.transform = 'scaleX(' + clamp(y / Math.max(1, doc.scrollHeight - vh)).toFixed(4) + ')';

    var p = clamp(y / vh);
    if (p < 1) {
      var copy = q('.hero-copy'), panel = q('.hero-panel'), orbs = q('.orbs');
      if (copy) { copy.style.transform = 'translate3d(0,' + (-p * 70).toFixed(1) + 'px,0)'; copy.style.opacity = (1 - p * 0.65).toFixed(3); }
      if (panel) panel.style.transform = 'translate3d(0,' + (-p * 30).toFixed(1) + 'px,0)';
      if (orbs) orbs.style.transform = 'translate3d(0,' + (p * 160).toFixed(1) + 'px,0)';
    }

    var line = q('.tl-draw');
    if (line) {
      var r = line.parentNode.getBoundingClientRect();
      line.style.transform = 'scaleY(' + clamp((vh * 0.72 - r.top) / Math.max(1, r.height)).toFixed(4) + ')';
    }
  }

  if (!reduce) {
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
    }, { passive: true });
    window.addEventListener('resize', function () { window.requestAnimationFrame(onScroll); }, { passive: true });
  }

  // ---------------------------------------------------------------- lean toward the pointer
  var fine = false;
  try { fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
  if (!reduce && fine) {
    var current = null, pending = null, moving = false;
    var reset = function (card) {
      ['--mx', '--my', '--rx', '--ry'].forEach(function (k) { card.style.removeProperty(k); });
    };
    document.addEventListener('mousemove', function (e) {
      pending = e;
      if (moving) return;
      moving = true;
      window.requestAnimationFrame(function () {
        moving = false;
        var ev = pending;
        var card = ev.target && ev.target.closest ? ev.target.closest('.tilt.done') : null;
        if (current && current !== card) reset(current);
        current = card;
        if (!card) return;
        var r = card.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width, yy = (ev.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (yy * 100).toFixed(1) + '%');
        card.style.setProperty('--rx', ((0.5 - yy) * 4).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x - 0.5) * 5).toFixed(2) + 'deg');
      });
    }, { passive: true });
  }

  window.__motion = { scan: scan };
  if (document.readyState !== 'loading') { scan(); onScroll(); }
  else document.addEventListener('DOMContentLoaded', function () { scan(); onScroll(); });
})();
