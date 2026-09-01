/* main.js — boot. Everything heavy is imported after first paint. */

import { initTV } from './tv.js';
import { initTransport } from './transport.js';
import { initSound } from './sound.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* (A three.js modulepreload lived here for one commit. It is gone WITH
   three.js itself — the hero now runs on ~90 lines of raw WebGL in hero.js,
   and there is nothing heavy left to warm.) */

/* ---- start at the top --------------------------------------------------
   Browsers restore the previous scroll position on reload, and with a 100svh
   hero that drops you into the middle of the page on what feels like a fresh
   visit — you never see the cold open. Own it: opt out of restoration, and
   re-assert the top once on load (layout shifts as fonts and the marquee
   settle, which can nudge the offset on its own). A real scroll input from the
   visitor cancels the re-assert, so we never yank anyone back. */
let userMoved = false;
{
  const mark = () => { userMoved = true; };
  addEventListener('wheel', mark, { passive: true, once: true });
  addEventListener('touchstart', mark, { passive: true, once: true });
  addEventListener('keydown', mark, { once: true });
}
/* Two things fight this and both had to be handled, verified by reloading from
   4000px rather than by reading the flag:
   - ScrollTrigger sets history.scrollRestoration back to 'auto' when it loads,
     so setting it once at boot is not enough;
   - Lenis owns the scroll position, so a native scrollTo(0,0) is overridden on
     its next frame. It has to be told through its own API. */
const stripHash = () => history.replaceState(null, '', location.pathname + location.search);

/* A real deep link wins on THIS load — but the hash is then stripped, because
   a hash that stays in the URL makes every future reload start at that section.
   That was the bug the reload test missed: click WORK once, the URL becomes
   /#portfolio forever, and "the site doesn't start at the top" on every visit
   after. The target is CAPTURED once (toTop runs at boot, after Lenis exists,
   and at `load` — the first version stripped the hash on call one and call
   three then forced the top, killing deep links). */
let deepTarget = null;   // null = not looked yet · false = no deep link · element = jump here
function toTop() {
  if (userMoved) return;

  if (deepTarget === null) {
    deepTarget = (location.hash && document.getElementById(location.hash.slice(1))) || false;
    if (deepTarget) stripHash();
  }

  if (deepTarget) {      // re-asserted each call: layout grows under it as things load
    if (window.__srLenis) window.__srLenis.scrollTo(deepTarget, { immediate: true, force: true });
    else deepTarget.scrollIntoView();
    return;
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  window.__srLenis?.scrollTo(0, { immediate: true, force: true });
}
toTop();
addEventListener('load', toTop, { once: true });

/* ---- in-page anchors never write the hash ------------------------------
   The nav, the brand mark and the scroll cue all point at #sections. Left
   native, one click poisons the URL (see above). They scroll instead, and the
   URL stays clean. The skip-link keeps native behaviour: intercepting it would
   break its focus hand-off for keyboard users, and #main-content is the top of
   the page anyway. */
document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(a => {
  a.addEventListener('click', e => {
    const el = document.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    e.preventDefault();
    if (window.__srLenis) window.__srLenis.scrollTo(el);
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    // a native anchor would have moved keyboard focus too — keep that contract
    el.tabIndex = -1;
    el.focus({ preventScroll: true });
    stripHash();
  });
});

/* ---- the screens ------------------------------------------------------- */
initTV();

/* ---- the sound chip (nothing is fetched until it is clicked) ------------ */
initSound();

/* ---- the stacks: filters ----------------------------------------------- */
{
  const chips = [...document.querySelectorAll('.chip')];
  const cards = [...document.querySelectorAll('.card')];

  const has = (cat) =>
    cat === 'all' || cards.some(c => c.dataset.category.split(' ').includes(cat));

  // a chip that can never match anything is a dead end — don't offer it.
  // (Education currently lands here: its only card was promoted to the marquee.)
  chips.forEach(ch => { if (!has(ch.dataset.filter)) ch.remove(); });

  chips.filter(ch => ch.isConnected).forEach(ch => {
    ch.addEventListener('click', () => {
      const cat = ch.dataset.filter;
      chips.forEach(c => {
        c.classList.toggle('is-active', c === ch);
        c.setAttribute('aria-pressed', String(c === ch));
      });
      cards.forEach(card => {
        card.hidden = cat !== 'all' && !card.dataset.category.split(' ').includes(cat);
      });

      /* Filtering can lift a card into view with no scroll at all, and a reveal
         tween that never fired leaves it stamped at opacity:0 — measured: two of
         the four AI Policy cards were invisible. ScrollTrigger.refresh() alone
         did NOT fix it, so settle the shown cards outright. */
      const shown = cards.filter(c => !c.hidden);
      window.gsap?.set(shown, { y: 0, opacity: 1 });
      window.ScrollTrigger?.refresh();
      window.__srTransportRefresh?.();      // the doc got shorter; ticks must move
    });
    ch.setAttribute('aria-pressed', String(ch.classList.contains('is-active')));
  });
}

/* ---- nav: solid once we leave the hero -------------------------------- */
const nav = document.getElementById('nav');
if (nav) {
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---- compact navigation: the MENU disclosure ---------------------------
   Below 620px the desktop links are display:none and the transport is
   pointer-only, so this panel is the ONLY way to reach a section. It is a
   plain disclosure, not a modal: no scroll lock, no focus trap.
   The panel markup ships in the DOM from boot (merely CSS-hidden), so the
   anchor interceptor above has already bound its four links — nothing here
   re-implements scrolling. */
{
  const btn = document.getElementById('nav-menu-btn');
  const panel = document.getElementById('nav-menu');
  const chip = document.getElementById('sound-chip');
  const foot = panel && panel.querySelector('.nm-foot');
  const compact = matchMedia('(max-width: 620px)');

  if (nav && btn && panel) {
    const isOpen = () => btn.getAttribute('aria-expanded') === 'true';

    /* returnFocus is ESC-only ON PURPOSE. Choosing a link hands keyboard focus
       to the scroll target (the interceptor does `el.focus()`); pulling focus
       back to this button afterwards would undo that and dump the user at the
       top of the page again. */
    const close = (returnFocus) => {
      if (!isOpen()) return;
      panel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) btn.focus();
    };

    btn.addEventListener('click', () => {
      if (isOpen()) return close(false);
      panel.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    });

    /* The click that OPENS the menu also bubbles to document. The panel is a
       child of #nav, so this one containment check covers button and panel
       both and keeps the opening click from immediately closing it. */
    document.addEventListener('click', e => { if (!nav.contains(e.target)) close(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(true); });
    panel.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => close(false)));

    /* The sound chip is bar furniture on wide and menu furniture on compact.
       Moving the node keeps its behaviour: sound.js bound the ELEMENT, not a
       selector, so its listener and label reference survive the reparent. */
    const placeChip = () => {
      if (!chip || !foot) return;
      const home = compact.matches ? foot : nav;
      if (chip.parentElement === home) return;
      if (compact.matches) foot.appendChild(chip);
      else nav.insertBefore(chip, btn);
    };
    compact.addEventListener('change', () => { close(false); placeChip(); });
    placeChip();
  }
}

/* ---- motion: smooth scroll + reveals -----------------------------------
   gsap.fromTo, never gsap.from: `from` leaves content stranded at opacity 0 if
   the tween never runs. With fromTo inside this guard, no gsap means no tween
   means the page is simply already visible. */
let lenis = null;
if (!reduced && window.Lenis && window.gsap && window.ScrollTrigger) {
  lenis = new Lenis({ autoRaf: true });
  window.__srLenis = lenis;
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  toTop();                                  // now that Lenis and ScrollTrigger both exist

  document.querySelectorAll('.section-head, .feat, .card, .pub, .edu-item, .exp-item, .creds, .contact-link, .offer-item, .offer-note')
    .forEach(el => gsap.fromTo(el,
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: .8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } }));
}

initTransport({ reduced, lenis });

/* ---- hero mouse parallax (transform only) ------------------------------
   Gated on a real hovering pointer. On touch `pointermove` fires only while a
   finger is already down and dragging, so the parallax was never a parallax
   there — just a listener and a transform write on every touch-drag frame, for
   an effect nobody could see. Measured on real hardware: `hover:hover` is `no`
   on the iPhone AND the iPad, both orientations, so this is dead code on every
   touch device the site supports. */
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const photo = document.querySelector('.hero-photo img');
  if (photo) {
    addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5) * 2;
      const y = (e.clientY / innerHeight - .5) * 2;
      photo.style.transform = `translate3d(${(-x * 6).toFixed(2)}px, ${(-y * 6).toFixed(2)}px, 0)`;
    }, { passive: true });
  }
}

/* ---- the cold open ----------------------------------------------------- */
addEventListener('load', () => {
  const canvas = document.getElementById('particle-canvas');
  const nameEl = document.getElementById('hero-name');
  // reduced motion: the settled state is the plain headline (the motes fade to
  // nothing anyway) — don't make those users download three.js to render it
  if (canvas && nameEl && !reduced) {
    import('./hero.js')
      .then(m => m.default({ canvas, nameEl, reduced }))
      .catch(() => {});                 // headline stays real text if this never lands
  }
});
