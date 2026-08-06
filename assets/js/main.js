/* main.js — boot. Everything heavy is imported after first paint. */

import { initTV } from './tv.js';
import { initTransport } from './transport.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- the screens ------------------------------------------------------- */
initTV();

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

/* ---- motion: smooth scroll + reveals -----------------------------------
   gsap.fromTo, never gsap.from: `from` leaves content stranded at opacity 0 if
   the tween never runs. With fromTo inside this guard, no gsap means no tween
   means the page is simply already visible. */
let lenis = null;
if (!reduced && window.Lenis && window.gsap && window.ScrollTrigger) {
  lenis = new Lenis({ autoRaf: true });
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);

  document.querySelectorAll('.section-head, .feat, .card, .pub, .edu-item, .exp-item, .creds, .contact-link')
    .forEach(el => gsap.fromTo(el,
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: .8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } }));

  // the filter can reveal a card that never crossed its trigger while hidden
  document.querySelectorAll('.chip').forEach(ch =>
    ch.addEventListener('click', () => requestAnimationFrame(() => ScrollTrigger.refresh())));
}

initTransport({ reduced, lenis });

/* ---- hero mouse parallax (transform only) ------------------------------ */
if (!reduced) {
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
  if (canvas && nameEl) {
    import('./hero.js')
      .then(m => m.default({ canvas, nameEl, reduced }))
      .catch(() => {});                 // headline stays real text if this never lands
  }
});

export { reduced };
