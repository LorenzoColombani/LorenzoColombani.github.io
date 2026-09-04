/* sectionrail.js — the section rail: one dot per section down the right edge of
   a document page, the current one lit, every one a jump.

   WHY IT EXISTS, and why it is not the film transport. `#transport` (the
   hairline along the bottom of the frame) builds its ticks from a hardcoded list
   of the home page's section ids — portfolio, publications, education,
   experience, contact. None of those exist on a case study, so on all twelve
   document pages the transport renders as a bare fill: a progress bar with no
   landmarks and no jump, on exactly the pages that are long enough to need one.
   Rather than teach the transport a second vocabulary, the document pages get
   their own device and hide the transport. One wayfinding object per page.

   WHY DOTS AND NOT A SECOND NAV. The top bar answers "which page am I on". This
   answers "where am I inside it, how much is left, and can I skip ahead" — a
   different question, and the reason a rail earns its pixels on a nine-section
   case study and would be noise on a two-section one. It draws nothing when a
   page has fewer than three sections.

   NO DEPENDENCIES. Active section comes from an IntersectionObserver, not from
   ScrollTrigger, so the rail costs nothing on load and keeps working if the
   vendor bundle is ever dropped from these pages. Jumps go through Lenis when
   main.js has published it, and fall back to the native smooth scroll. */

const MIN_SECTIONS = 3;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function build() {
  const main = document.querySelector('main.doc');
  if (!main) return;

  /* A dot is a chapter, and a chapter starts at a heading. Some sections carry
     no heading of their own — on a case study the screen and its metadata grid
     sit in one — so they are folded into the chapter above them rather than
     given a dot reading "Section 2". The fold matters for the observer too:
     both sections light the same dot, so scrolling through the screen does not
     dim the rail. */
  const groups = [];
  for (const el of main.children) {
    if (el.tagName !== 'SECTION') continue;
    const heading = el.querySelector('h1, h2');
    if (heading || !groups.length) {
      groups.push({ els: [el], name: heading ? heading.textContent.trim().replace(/\s+/g, ' ') : '' });
    } else {
      groups[groups.length - 1].els.push(el);
    }
  }
  const sections = groups.filter(g => g.name);
  if (sections.length < MIN_SECTIONS) return;

  const rail = document.createElement('div');
  rail.className = 'srail';
  /* Not a <nav>. The page already has one, and a second navigation landmark
     makes html-validate require an accessible name on both — which would mean
     editing the shared top bar on every page including the two live ones. The
     buttons carry their own labels, which is the same contract the film
     transport already ships with. */
  rail.setAttribute('role', 'group');
  rail.setAttribute('aria-label', 'Sections on this page');

  const dots = sections.map((group, i) => {
    const section = group.els[0];
    const name = group.name;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'srail-dot';
    b.setAttribute('aria-label', `Jump to ${name}`);

    const cap = document.createElement('span');
    cap.className = 'srail-label';
    cap.textContent = name;
    b.appendChild(cap);

    b.addEventListener('click', () => {
      const lenis = window.__srLenis;
      if (lenis) lenis.scrollTo(section, { offset: -72 });
      else section.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      /* A native anchor would have moved keyboard focus too — keep that
         contract, the way main.js does for its in-page links. */
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
    });

    rail.appendChild(b);
    return { section, els: group.els, b };
  });

  document.body.appendChild(rail);

  /* The section that owns the upper third of the viewport is the one you are
     reading. A plain "is it visible" test lights two dots at once on a short
     section, which is worse than lighting none. */
  let current = -1;
  const setCurrent = i => {
    if (i === current) return;
    current = i;
    dots.forEach(({ b }, n) => {
      const on = n === i;
      b.classList.toggle('is-on', on);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  };

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const i = dots.findIndex(d => d.els.includes(e.target));
        if (i > -1) setCurrent(i);
      }
    }
  }, { rootMargin: '-12% 0px -70% 0px', threshold: 0 });

  dots.forEach(({ els }) => els.forEach(el => io.observe(el)));
  setCurrent(0);
}

if (document.readyState === 'loading') {
  addEventListener('DOMContentLoaded', build, { once: true });
} else {
  build();
}
