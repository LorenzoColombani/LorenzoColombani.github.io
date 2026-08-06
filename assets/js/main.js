/* main.js — boot. Everything heavy is imported after first paint. */

import { initTV } from './tv.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- the screens ------------------------------------------------------- */
initTV();

/* ---- nav: solid once we leave the hero -------------------------------- */
const nav = document.getElementById('nav');
if (nav) {
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
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
