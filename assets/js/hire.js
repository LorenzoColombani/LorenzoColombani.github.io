/* hire.js — every "hire me" opens a mail draft that is already written.

   WHY. An empty draft is a blank page, and a blank page is the most expensive
   thing you can hand someone who has just decided they might want to work with
   you. It also costs Lorenzo the reply: an enquiry that says "hi, interested"
   needs a whole round trip before he knows whether he can help. The template
   asks, in four lines, for exactly what a useful first answer needs — what,
   who for, when, and roughly what size — and names the page the visitor was
   reading, so he knows what convinced them.

   PLACEHOLDERS ARE SQUARE-BRACKETED because that is the convention every
   client-side reader already knows, and because an unfilled one is obvious in
   a sent mail rather than invisible.

   PROGRESSIVE ENHANCEMENT. The href in the HTML is a plain mailto with no
   payload, so the link works with this file blocked, missing or broken. This
   only upgrades it. And the address stays visible in the closing block on every
   page, because a mailto is the one link on the web that can silently do
   nothing — a browser with no mail handler registered swallows the click, and
   the visitor must be able to fall back to copying the address.

   LENGTH. A mailto URL is unreliable past roughly 2000 characters in some
   clients. This one lands near 700 encoded, with room for the longest page
   name on the site. */

const ADDRESS = 'lorenzo.colombani@live.fr';

/* One template, in his voice: plain, direct, no corporate throat-clearing.
   Kept short on purpose — a wall of template is worse than a blank page. */
const lines = page => [
  'Hello Lorenzo,',
  '',
  page
    ? `I was reading ${page} on your site and I think you might be able to help us.`
    : 'I found your site and I think you might be able to help us.',
  '',
  'What we want built: [a sentence or two is plenty]',
  'Who will use it: [the team, or the people it is for]',
  'When we would like it: [a date, or "not fixed yet"]',
  'Budget range, if you have one: [a range, or "not sure yet"]',
  '',
  'About us: [company, and what you do]',
  '',
  'Best,',
  '[your name]',
];

/* The page's own name, the way a person would say it — the h1 of a case study
   is the project, so "I was reading OpenBots" reads correctly. Falls back to
   nothing rather than to something wrong. */
function pageName() {
  const h1 = document.querySelector('main h1');
  if (!h1) return '';
  const t = h1.textContent.trim().replace(/\s+/g, ' ').replace(/\.$/, '');
  return t && t.length <= 60 ? t : '';
}

function build() {
  const main = document.querySelector('main.doc');
  if (!main) return;

  const page = pageName();
  const subject = page ? `Project enquiry — ${page}` : 'Project enquiry';
  const body = lines(page).join('\r\n');
  const href =
    `mailto:${ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  /* Two kinds of target: the hire button, which pointed at the home page's
     contact section and made the reader leave the page that convinced them,
     and the plain address link in the closing block. Both become the same
     draft. Nothing else on the page is touched — the LinkedIn and GitHub rows
     stay what they are. */
  const targets = [
    ...main.querySelectorAll('a.btn-hire'),
    ...main.querySelectorAll(`a[href^="mailto:"]`),
  ];

  for (const a of targets) {
    a.href = href;
    /* The affordance has to tell the truth about what will happen — tv.js
       states that rule for the viewers and it holds here. A button that says
       "Let's work together" and opens a mail client is a surprise unless it
       says so. */
    if (a.classList.contains('btn-hire') && !a.dataset.hint) {
      a.dataset.hint = '1';
      /* The hint carries the address itself, which does two jobs: it tells the
         truth about what the button does, and it leaves the address on screen
         and selectable for the visitor whose browser has no mail handler and
         swallows the click silently. The case-study pages need no hint — their
         closing block already prints the address as a row. */
      const hint = document.createElement('span');
      hint.className = 'hire-hint';
      hint.textContent = `opens an email to ${ADDRESS}, already written`;
      a.after(hint);
    }
  }
}

if (document.readyState === 'loading') {
  addEventListener('DOMContentLoaded', build, { once: true });
} else {
  build();
}
