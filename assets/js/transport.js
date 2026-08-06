/* transport.js — the film transport: a hairline at the bottom of the frame that
   fills with the read, with a tick per section.

   Tick positions are MEASURED from the live layout, never hardcoded — type
   reflows, images land, and a hardcoded percentage is wrong the moment any of
   that happens. Re-measured on resize and after fonts settle. */

const SECTIONS = [
  ['portfolio',    'Work'],
  ['publications', 'Publications'],
  ['education',    'Dossier'],
  ['experience',   'Experience'],
  ['contact',      'Contact'],
];

export function initTransport({ reduced = false, lenis = null } = {}) {
  const host = document.getElementById('transport');
  if (!host) return;

  const fill = document.createElement('div');
  fill.className = 'tp-fill';
  host.appendChild(fill);

  const ticks = SECTIONS.map(([id, label]) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tp-tick';
    b.setAttribute('aria-label', 'Jump to ' + label);
    const cap = document.createElement('span');
    cap.className = 'tp-label';
    cap.textContent = label;
    b.appendChild(cap);
    b.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(el);
      else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
    host.appendChild(b);
    return { el, b };
  }).filter(Boolean);

  host.removeAttribute('aria-hidden');

  const place = () => {
    const doc = document.documentElement.scrollHeight;
    ticks.forEach(({ el, b }) => {
      b.style.left = (el.offsetTop / doc * 100) + '%';
    });
  };

  let raf = 0;
  const update = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    fill.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { place(); update(); }, { passive: true });
  (document.fonts?.ready ?? Promise.resolve()).then(place).catch(place);

  place();
  update();
}
