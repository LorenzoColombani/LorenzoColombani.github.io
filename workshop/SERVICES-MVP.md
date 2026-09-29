# Services desk MVP

This pane lets a prospective customer read Lorenzo's three existing offers, select one, optionally add a name and short brief, and open an email draft addressed to Lorenzo. It uses native page controls on one room-anchored CSS3D screen. No new dependencies, iframe, backend, external service, message send, or deployment are involved.

## Content sources — checked 2026-09-29

- Public homepage, [the practice / three things you can hire me for](https://lorenzocolombani.com/#offer): the exact three offer labels are **Build, Train, Retain**. All three titles and descriptions in `SERVICE_OFFERS` reproduce that section, with HTML entities decoded. The public pricing sentence is also preserved: “Details and price with me, not on this page.”
- Public homepage, [contact](https://lorenzocolombani.com/#contact): `mailto:lorenzo.colombani@live.fr`. This destination also appears in the public homepage's Person structured data.
- Local corroboration: `../index.html:182–196` (labels, titles, descriptions), `../index.html:200` (pricing sentence), and `workshop/index.html:70` (existing contact link). The local offer section matched the fetched public section.
- Verification method: the web open tool could not access the homepage, so a direct HTTPS `curl -L` fetch was inspected. Temporary response `/tmp/garage-public-services.html` contained the public offers at lines 208–222 and contact mailto at line 580. The temporary fetch is evidence only; it is not a shipping dependency.
- The portfolio disciplines “AI products / Learning systems / Interactive web experiences” are different from these three public service offers. No prices, testimonials, deadlines, new service commitments, or additional availability promises were added.

## Contact behavior

- `createServiceDraft` returns an encoded `mailto:` URL with a fixed, verified recipient. Visitor text is encoded into the body; the service id is accepted only from the three known offers.
- The button says **Draft email**. Its adjacent explanation says **Opens your email app. Review and send from there.** Clicking never claims a message was sent or delivered.
- A visible, selectable email address is always available as a fallback when no mail handler is configured. The post-click status explains that fallback without claiming the email app launched successfully.
- Optional name and brief are held in the current page only, capped at 80 and 700 characters. They survive leaving and reopening Services during the page session, but a reload clears them. No storage, analytics, fetch, or form submission is added.
- There is no browser-only send path. A usable email app/service remains necessary to send. No email was sent during validation.

## Integration contract

`services-experience.js` exports `createServicesExperience({scene,camera,canvas,onOpen,onClose})` plus the pure draft builder and offer data. It provides `open()`, `close({restoreFocus=true,notify=true})`, `active`, `ownsScreen` (false), `getFocusPose()`, `update()`, and `dispose()`.

The integrating owner of `main.js` should:

1. Import and construct the module after the existing room/interface instances. `onOpen` clears gestures and pending product dispatch, stops camera inertia, and disables unrelated world controls, consistent with website opening.
2. On the navigation desk's `onDeskFocus`, open the module when `title === 'Services'`. When another title is selected, call `close({restoreFocus:false,notify:false})` so closing cannot clear the new station.
3. On `onDeskReturn`, close with `restoreFocus:false,notify:false`; the desk already owns return focus. For user close (`onClose`), call `navigationDesk.clearFocus()` and restore the room's normal controls/status.
4. Include `servicesExperience?.active` in the exhibit/interaction guard. Prioritize its `getFocusPose().position` and `.target` before website/film/desk camera branches, so the generic exhibit or desk pose cannot override Services. Call `servicesExperience.update()` after the room camera pose is applied.
5. Close silently before other programmatic destinations and dispose it with other experiences if a shared teardown path exists. Do not route the contact CTA through the project launcher.

The module's Escape handler uses capture to produce one return action. It does not trap Tab. The visible **Return to the desk** control and the email route use native buttons/links. Desktop controls retain native CSS pixel sizes instead of being scaled down to fit; narrow layouts use a vertical offer list. At short viewport heights the entire pane scrolls so its footer remains reachable.

## Validation

`node --test workshop/services-experience.test.mjs` — **12 passed**, 2026-09-29.

Coverage: only the three source offers and fixed email recipient; safe URL encoding for punctuation/newlines/Unicode; unknown service ids; bounded optional text; selection changes the draft; no sent status; open/close/reopen and brief preservation; Escape/default suppression; room-space projection with native text/control sizing at 1440×900, 1200×800, 820×1180, 390×844, 320×568, 844×390, and 375×270; disposal and no reopening after disposal.

Independent source review confirmed the copy/contact route and found short-height footer clipping, corrected by whole-pane scrolling. Automated checks use a DOM stub and real Three.js projection math. Integrated browser interaction, native mail-handler launch, and visual appearance remain for the integrating owner to verify; no browser proof or deployment is claimed here.

## Integration completed by parent

Integrated in main.js: Services desk focus opens the module, return closes it,
Services camera pose takes precedence, frame updates and teardown are wired.
`?view=services` is available for a direct local preview. Curated package includes
the module. The combined suite passes 102 tests. Browser verified service selection,
encoded brief/email recipient, Escape/desk return, actual Services desk reopening,
and a phone-sized scrollable layout with visible contact CTA/no horizontal overflow.
No mail handler was launched and no message sent. In-app browser coordinate-based
click automation remains inconsistent; tested these controls using keyboard input.
