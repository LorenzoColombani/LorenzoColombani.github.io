/* sectionrail.js — the section rail: one mark per chapter down the right edge of
   a document page, the current one lit, every one a jump.

   WHY IT EXISTS, and why it is not the film transport. `#transport` (the
   hairline along the bottom of the frame) builds its ticks from a hardcoded list
   of the home page's section ids — portfolio, publications, education,
   experience, contact. None of those exist on a case study, so on all twelve
   document pages the transport renders as a bare fill: a progress bar with no
   landmarks and no jump, on exactly the pages long enough to need one. Rather
   than teach the transport a second vocabulary, the document pages get their own
   device and hide the transport. One wayfinding object per page.

   THE SPINE IS NOT DECORATION. Equal marks at an equal pitch encode chapter
   ORDER, not distance — and on a case study one chapter is 300px and another is
   4000px, so "three of ten lit" is not an answer to "how much is left". The film
   transport this replaces encoded distance honestly. The hairline spine carries
   that back: it fills with the scroll, so the column tells the truth on both
   axes at once. Without it the component claims a model it cannot honour.

   WHY BUTTONS AND NOT ANCHORS. An anchor would make Back the undo and the
   destination shareable, which is the better default almost everywhere. Not
   here: every jump would push a history entry, so Back would walk a visitor back
   through the chapters one at a time instead of returning them to the page they
   arrived from — on a site whose whole job is a single visit ending in an email.
   Buttons, and the cost is that a jump has no undo but the scroll.

   NO VENDOR DEPENDENCY. An IntersectionObserver picks the current chapter with a
   scroll-position fallback under it, so the rail costs nothing on load and keeps
   working if the vendor bundle is ever dropped from these pages. Jumps go
   through Lenis when main.js has published it and reduced motion is not asked
   for, and fall back to the native scroll otherwise. The landing offset lives in
   CSS (`scroll-margin-top`) so both paths land in the same place. */

const MIN_SECTIONS = 3;
const MIN_PAGE_HEIGHT = 2.5;      // viewports; a short page does not need a rail
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function build() {
  const main = document.querySelector('main.doc');
  if (!main) return;

  /* A mark is a chapter, and a chapter starts at a heading. Some sections carry
     no heading of their own — on a case study the screen and its metadata grid
     sit in one — so they fold into the chapter above rather than becoming a mark
     reading "Section 2". A section BEFORE any heading folds forward into the
     first chapter instead, so no part of the page is left unobserved and
     reporting whatever was lit last. */
  const groups = [];
  let orphans = [];
  for (const el of main.children) {
    if (el.tagName !== 'SECTION') continue;
    /* A visible heading. The screen block on a case study carries an sr-only
       h2 so the document hierarchy does not skip a level, but a chapter whose
       name no sighted reader can see is not a chapter — it folds into the one
       above, which is where it belongs anyway. */
    const heading = [...el.querySelectorAll('h1, h2')].find(h => !h.classList.contains('sr-only'));
    if (heading) {
      groups.push({ els: [...orphans, el], name: heading.textContent.trim().replace(/\s+/g, ' '), heading });
      orphans = [];
    } else if (groups.length) {
      groups[groups.length - 1].els.push(el);
    } else {
      orphans.push(el);
    }
  }
  if (groups.length && orphans.length) groups[0].els.unshift(...orphans);

  if (groups.length < MIN_SECTIONS) return;
  if (document.documentElement.scrollHeight < innerHeight * MIN_PAGE_HEIGHT) return;

  const rail = document.createElement('div');
  rail.className = 'srail';
  /* Not a <nav>. The page already has one, and a second navigation landmark
     makes html-validate require an accessible name on both — which would mean
     editing the shared top bar on every page including the two live ones. The
     group is named, and every mark carries its own label and its position in the
     set, which is the contract the film transport already ships with. */
  rail.setAttribute('role', 'group');
  rail.setAttribute('aria-label', 'Chapters on this page');

  const spine = document.createElement('span');
  spine.className = 'srail-spine';
  spine.setAttribute('aria-hidden', 'true');
  const spineFill = document.createElement('span');
  spineFill.className = 'srail-fill';
  spine.appendChild(spineFill);
  rail.appendChild(spine);

  let jumping = false;
  let current = -1;

  function setCurrent(i) {
    if (i === current) return;
    current = i;
    dots.forEach(({ b }, n) => {
      const on = n === i;
      b.classList.toggle('is-on', on);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  const dots = groups.map((group, i) => {
    const section = group.els.find(el => el.contains(group.heading)) || group.els[0];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'srail-dot';
    /* Position in the set, because "Jump to Testing" does not tell a screen
       reader user how far through the page that is — the one thing the sighted
       column says at a glance. */
    b.setAttribute('aria-label', `Jump to ${group.name} — ${i + 1} of ${groups.length}`);
    /* One tab stop for the whole rail, arrow keys within it. Ten sequential
       stops would mean nine presses to reach the tenth chapter, through a device
       whose entire purpose is one press. */
    b.tabIndex = i === 0 ? 0 : -1;

    const cap = document.createElement('span');
    cap.className = 'srail-label';
    cap.textContent = group.name;
    b.appendChild(cap);

    b.addEventListener('click', () => {
      /* Acknowledge the press before reporting the result — otherwise nothing
         changes until the scroll carries the target into the observer band,
         several hundred milliseconds later. */
      jumping = true;
      setCurrent(i);
      const lenis = window.__srLenis;
      if (lenis && !REDUCED) {
        lenis.scrollTo(section, { onComplete: () => { jumping = false; } });
      } else {
        section.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        setTimeout(() => { jumping = false; }, REDUCED ? 0 : 700);
      }
      /* A native anchor would have moved keyboard focus too. Focus the chapter's
         heading rather than the whole section: the global focus ring would
         otherwise draw a gold rectangle around an entire chapter, an
         acknowledgement larger than the screen. */
      const target = group.heading || section;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });

    rail.appendChild(b);
    return { section, els: group.els, b };
  });

  /* Roving focus: one stop into the rail, then the arrows walk it. */
  rail.addEventListener('keydown', e => {
    const from = dots.findIndex(d => d.b === document.activeElement);
    if (from < 0) return;
    const moves = { ArrowDown: from + 1, ArrowRight: from + 1, ArrowUp: from - 1,
                    ArrowLeft: from - 1, Home: 0, End: dots.length - 1 };
    if (!(e.key in moves)) return;
    const to = Math.max(0, Math.min(dots.length - 1, moves[e.key]));
    e.preventDefault();
    dots.forEach(({ b }, n) => { b.tabIndex = n === to ? 0 : -1; });
    dots[to].b.focus();
  });

  /* Before <main>, so the device for skipping ahead is not itself reachable only
     by not skipping. It is painted at the right edge either way. */
  main.parentNode.insertBefore(rail, main);

  const io = new IntersectionObserver(entries => {
    if (jumping) return;
    for (const e of entries) {
      if (e.isIntersecting) {
        const i = dots.findIndex(d => d.els.includes(e.target));
        if (i > -1) setCurrent(i);
      }
    }
  }, { rootMargin: '-12% 0px -70% 0px', threshold: 0 });

  dots.forEach(({ els }) => els.forEach(el => io.observe(el)));

  /* Three things the observer alone cannot do. Its band is 18% of the viewport,
     so a chapter shorter than that can cross without ever intersecting; at
     maximum scroll the last, short chapter can never reach the band at all, so
     the final mark — which on every page here is the closing action — would
     never light; and the spine needs a scroll position, not an intersection.
     Measuring covers all three, and seeds the opening state instead of asserting
     chapter one on a page that may have opened halfway down. */
  const measure = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max > 0) spineFill.style.transform = `scaleY(${Math.min(1, scrollY / max)})`;
    if (jumping) return;
    if (max > 0 && scrollY >= max - 2) { setCurrent(dots.length - 1); return; }
    const line = innerHeight * 0.25;
    let best = 0;
    dots.forEach(({ els }, i) => {
      if (els.some(el => el.getBoundingClientRect().top <= line)) best = i;
    });
    setCurrent(best);
  };

  let raf = 0;
  addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); });
  }, { passive: true });
  addEventListener('resize', measure, { passive: true });
  measure();
}

if (document.readyState === 'loading') {
  addEventListener('DOMContentLoaded', build, { once: true });
} else {
  build();
}
