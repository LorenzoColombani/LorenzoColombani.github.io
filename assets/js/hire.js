/* hire.js — every "hire me" opens a mail draft that is already written.

   WHY. An empty draft is a blank page, and a blank page is the most expensive
   thing you can hand someone who has just decided they might want to work with
   you. It also costs Lorenzo the reply: an enquiry that says "hi, interested"
   needs a whole round trip before he knows whether he can help.

   REWRITTEN 2026-09-04 after a three-lens audit. What the lenses changed:

   - The opener was supplicant. "I think you might be able to help us" is the
     wrong posture from the party holding the budget, and it presumed a company
     writing collectively. Neutral now, and singular.
   - "What we want built" quietly disqualified half the funnel — the heads of
     learning and heads of data whose first ask is a workshop, a curriculum or
     an audit, not a build. Verb-neutral now.
   - The square brackets cost a select-and-replace gesture per field, which on a
     phone does not survive a double-tap. A label, a colon and a blank line say
     the same thing and cost an append. The guidance that lived inside the
     brackets moved into the labels, so nothing was lost — including the two
     escape hatches, "or not fixed yet" and "if you have one", which the
     motivation lens asked to keep on ethical grounds.
   - Nothing said a partial answer was welcome, so four labelled fields read as
     a prerequisite list. One clause fixes that, and it is the difference
     between a template and a form.
   - "[your name]" sat above whatever signature the client appends, so the last
     thing in the sent mail was the sender's visible failure to finish. Gone.
   - The page name was derived from the h1, which produced "I was reading
     Nothing is filed here on your site" from the 404 and "I was reading Lorenzo
     Colombani on your site" from /about/. It is declared per page now, and a
     page that has no sensible name simply omits the clause.
   - The caption existed on three pages and the same behaviour was silent on the
     other nine.
   - Nothing acknowledged the click. A mailto is the one link on the web that
     can do nothing at all and say nothing about it, so the recovery has to be
     on the page, not in the visitor's guesswork.

   PROGRESSIVE ENHANCEMENT, and this time it is true everywhere. The href in the
   HTML is a bare mailto on all twelve pages — the three that carry the button
   used to ship `/#contact`, so with the script blocked they sent the reader off
   the page that convinced them, which is the thing this component exists to
   stop. The address is also printed in static markup beside every affordance,
   so a swallowed click always leaves a working next step on screen. */

const ADDRESS = 'lorenzo.colombani@live.fr';

/* One template, in his voice: plain, direct, no corporate throat-clearing, and
   short — a wall of template is worse than a blank page. */
const lines = page => [
  'Hello Lorenzo,',
  '',
  (page
    ? `I read your ${page} page and wanted to get in touch about a project.`
    : 'I found your site and wanted to get in touch about a project.')
    + ' Anything you can answer below is enough — no need to fill it all in.',
  '',
  'What you have in mind:',
  '',
  'Who will use it:',
  '',
  'When you would like it, or "not fixed yet":',
  '',
  'Budget range, if you have one:',
  '',
  'About you or your company:',
  '',
  'Best,',
];

/* Declared, never derived. `main h1` gave the 404 page "Nothing is filed here"
   and /about/ the man's own name, both of which put words in the sender's mouth
   that they cannot have meant. A page with nothing sensible to call itself
   carries no attribute and the clause is simply left out. */
function pageName(main) {
  const n = (main.dataset.hirePage || '').trim();
  return n.length && n.length <= 60 ? n : '';
}

function build() {
  const main = document.querySelector('main.doc');
  if (!main) return;

  const page = pageName(main);
  const subject = page ? `Project enquiry — ${page}` : 'Project enquiry';
  const body = lines(page).join('\r\n');
  const href =
    `mailto:${ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  /* Everything except the plain address printed beside the button. That one is
     the fallback for a swallowed click and for a blocked script, so it stays a
     bare mailto: upgrading it would put a 600-character payload behind "copy
     link address" and take away the one simple thing on the page. */
  const targets = [
    ...main.querySelectorAll('a.btn-hire'),
    ...main.querySelectorAll('a[href^="mailto:"]'),
  ].filter(a => !a.closest('.hire-address'));

  for (const a of targets) {
    a.href = href;

    /* The affordance has to tell the truth about what will happen — tv.js
       states that rule for the viewers and it holds here. This was written onto
       the button only, so the identical behaviour was announced on three pages
       and silent on nine. Every upgraded target gets it now. */
    /* One promise per block. A closer that carries both the button and the
       address row would otherwise print the same sentence twice, once under
       each — and the button is the one a scanning visitor reads. */
    const block = a.closest('section') || main;
    const spoken = block.querySelector('.hire-hint');
    if (!a.dataset.hire && !(spoken && !a.classList.contains('btn-hire'))) {
      a.dataset.hire = '1';
      const hint = document.createElement('span');
      hint.className = 'hire-hint';
      hint.textContent = 'Opens a draft that is already written, with room for what you need.';
      /* After the list, never inside it. .contact-links is a bordered column
         and each row carries its own rule, so a caption dropped between Email
         and LinkedIn joined the set and read as a third contact method. */
      const anchorPoint = a.classList.contains('btn-hire')
        ? a
        : a.closest('.contact-links') || a.closest('.contact-link') || a;
      anchorPoint.after(hint);

      /* The one acknowledgement this mechanism can honestly give. A mailto on a
         machine with no handler does nothing, forever, and says nothing — so
         the recovery is placed before it is needed rather than after. */
      a.addEventListener('click', () => {
        hint.textContent =
          `Your mail app should be opening a draft to ${ADDRESS}. If nothing happened, that address is the whole of it.`;
        hint.classList.add('is-live');
      });
    }
  }
}

if (document.readyState === 'loading') {
  addEventListener('DOMContentLoaded', build, { once: true });
} else {
  build();
}
