/* main.js — boot. Everything heavy is imported after first paint. */

import { initTV } from './tv.js';

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
