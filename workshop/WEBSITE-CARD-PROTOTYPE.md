# Website card prototype — Garage · 29 September 2026

## Current scope

AI, Applied is the first website-card prototype. Launching, dropping, or flicking
it into the Staging Area opens the actual hosted Netlify site inside the Garage.
The multi-card rollout is cancelled; continue polishing only this card. Bridge and Loki retain
their existing cards and experiences. The seaside Workshop and independent
Claude checkout are untouched.

The iframe is native and responsive, loaded only on launch. One website is active
at a time. Returning unloads it and restores the selected product card. The local
catalog has `prototype: true, enabled: false, pendingPermission: false`: the new
viewer is local-only until a Garage rollout is chosen. No Garage deployment has
been made during this prototype work.

## Approved visual direction

A front-facing, floating projection above the table, with the room still visible.
The supplied Objects & screens reference is `.claude/references/stark/handling-holograms.gif`;
the user's crop shows a transparent pane with blue information and the room visible
through it. Keep this restrained and preserve readable website text.

- No enclosing contour, frame, border, corner brackets, glow outline, or browser bar.
- No title, website-home, expand, or external-link controls in a header. Their code
  is currently hidden; reintroduce controls inside the screen in a separate step.
- Native site colours and interactions remain intact. Steady iframe opacity 0.90
  and transparent wrapper reveal the room; no hue filter, scanlines or distortion.
- Input18 removes the live page alpha mask after the user reproduced lost clicks
  in Soft edges only mode. The separate WebGL backing/light stays feathered. Do
  not restore the page mask until the interaction regression is understood.
- Increased-contrast/reduced-transparency preferences restore an opaque page and
  disable its edge mask.
- User likes the connected light from the table. Refine that light's depth and
  natural appearance; maintain exact attachment to the emitter and page.
- Outside Return to Products remains visible and accessible. Escape works from
  the host; keyboard focus inside a cross-origin iframe belongs to the site.

Desktop defaults use 88% of viewport width (cap 1440px), 82% of usable height, with no
Products-card aspect ratio. Phones use their available native viewport. The page
has one stable DOM parent. Its entrance uses the room camera's projected plane;
after settling it uses ordinary absolute bounds with no transform or transformed
ancestors. The WebGL backing and table light remain aligned with that rectangle.

## Future controls and full-screen mode

Reintroduce a live marker and embedded expansion/return based on the portfolio's
`assets/js/tv.js` interaction pattern, styled as part of the projection.
Expand must fill the Garage viewport with the actual opaque embedded website.
It must not navigate the outer tab or open a different site/tab. Return restores
the projected view while retaining the same iframe, internal page, form/search
state, and scroll position. The hidden expand implementation only fits a
larger projection pane; it needs to be replaced for this requirement. Controls remain
explicitly deferred while graphical refinement is underway.

## Source-site permissions — completed

User approved adding only these trusted framing origins to referenced Netlify sites:

- `https://the-workshop-garage-lorenzo.netlify.app`
- `http://127.0.0.1:8766`

AI Applied and Data Vault source `netlify.toml` configs are patched and their
production permissions deployed/verified. Existing portfolio origins, all other
headers, deployed file sets and every non-config content file were preserved.
Their local config changes remain uncommitted; retain them in future Git releases.
Bridge and Loki already permit framing and were not changed.

Receipts in `.claude/preview/website-template-2026-09-29/`:
`ai-applied-permission.json`, `datavault-permission.json`.
No wildcard Netlify allowance, policy-stripping proxy or bundled website is used.
The old copied public AI build/port 8785 server are inactive diagnostic artifacts,
excluded from the Workshop package.

## Fixes and evidence

Latest user review supersedes the successful surface17 test run below: case mouse
clicks stopped working again. The failing focused Spotlight link remained a normal
anchor; the Garage had no transformed ancestors or status overlay intercepting it.
Do not call this resolved. A local pointer-comparison.html in this round's preview
folder isolates Plain / Transparency / Soft edges / Both without replacing the
iframe. The user reported Plain worked, while Soft edges only failed after two cases.
A subsequent automated plain-frame navigation independently displayed a network-
change error, so a sole mask cause is not proven. Native Safari then opened three
cases with Back between them; input18 still stalled in the in-app browser. The
full account is now at the top of .claude/HANDOFF.md. No external site changes or
wider rollout were made.

Originally, the leftover maximum-size contour was caused by CSS3DRenderer's overflow:hidden
root being scrollable when browser focus moved. Measured scrollTop 69.0909 shifted
the DOM image upward while the WebGL frame stayed put. The root now uses
`overflow:clip` corrected it at that stage. Surface17 removes this CSS3D ancestor
chain altogether for the website viewer; Services retains its separate renderer.

Surface17 fixes the browsing layer: one exact entrance transform followed by
untransformed, stable pixel bounds; no iframe reparenting/reloading on settlement,
resize or expansion. Website-only camera easing settles faster. Real in-app
verification covered search typing, mouse case/Back navigation, native scrolling,
Return to Products and reopening without Retry. All page ancestors report
transform:none.26 viewer +6 projection-audio tests pass; geometry covers all four
entrance corners, stable bounds over60 frames, preserved document identity on
resize/expansion and all light endpoints. Evidence:stable-surface-verified.json/png
in this round's preview folder. The older intermittent stall was not reproduced
on these launches; the underlying browser/network cause is not claimed resolved.

Removed toolbar pointer-hover focus theft. Moving the pointer must never arm
Return to Products or blur a website input.

Browser verified the actual Netlify embed, search filtering, internal page
navigation, return/relaunch, and (before hiding the toolbar) keyboard expansion,
restoration and website-home. The browser automation's pointer mapping to tiny
transformed toolbar controls was unreliable; keyboard and DOM hit tests passed.
Do not infer that future controls have passed pointer QA from those checks.

Focused tests cover site eligibility, iframe lifecycle, protected featured-card
routing, camera/page fit at 8 viewports, no tilt, state-preserving resize, light
attachment and resource cleanup. Latest evidence and screenshots are recorded in
`validation.json`, `live-focused-tests.txt` and adjacent screenshot files.

After the template and rollout, perform the separately requested Garage load-time
and resource-weight pass. Do not fan out into that optimization during this step.

## Projection sound direction

User explicitly separated music and SFX. Background selector should read Music off,
Rock, Calm and govern music; interaction SFX remain active after the entrance/user
gesture unlock. Do not add a new SFX toggle or interpret Music off as master mute.
New website-project / website-fold cues should follow reveal (~.56s) and closing
(~.26s), with no continuous hum while reading. Preserve Bridge/Loki player code.

## Saved hologram sound-reference collection

Separate from Stark visuals: `.claude/references/hologram-sound/index.html`.
Structured records: `.claude/references/hologram-sound/references.json`, registered
in `.claude/references/catalog.json` and linked both ways with the visual board.
Prometheus Orrery and Star Wars clips include provenance and evidence limits.
Sounddesigner interviews confirm relevant design facts; exact clip listening
notes remain pending because browser tools expose frames rather than audio.
Current synthesized cues are provisional while the user selects these references.

## Historical local checkpoint — prototype15 and loader16

Update: the multi-card rollout was explicitly cancelled. AI, Applied remains the
sole website template prototype. Loader cache version website-load-16 mounts the
empty projection before creating the iframe and permits one automatic retry only
for a visibly open viewer whose frame is provably initial about:blank. Committed,
cross-origin, unknown and hidden frames are preserved for manual recovery. The
24 focused viewer tests pass; a separate in-app browser preview still stalled,
so the original loading cause and lasting fix remain unresolved. The user later
confirmed case clicks were working again, and mouse Back/case navigation was
also observed. Settled projection bounds/transforms were unchanged across samples.
Using a normal DOM browsing surface after the projected entrance is a proposal,
not an implemented design change.

Services MVP is now integrated (see SERVICES-MVP.md): Build/Train/Retain and a
working mailto draft, tested through actual desk navigation and phone-sized layout.
Combined tests:102 passed; package177 files /30,591,140 bytes,69 JS checks.
Website projection has3 curved light layers, soft7px/4px alpha edges, no browser
chrome or drawn borders, and independent interaction SFX after a user gesture.

Final browser issue to revisit: AI Applied stopped loading in its iframe during
the final in-app check. A bare iframe on the same local origin also stalled;
the source itself loads in a direct browser tab and returns200 with the correct
framing allowance. Do not call the embed deployment-ready from source tests alone.
Renderer shaders/masks loaded without logged errors; this was an iframe load issue.

The separate Hologram sound reference dashboard has local audio excerpts and
expandable H.264/AAC video players. Entries are saved in references.json; actual
source-mix signal measurements and timed frames are retained in analysis/.
Reference media is excluded from Garage deployment. Current cues stay provisional
until reference review. No Garage deployment was performed in this round.
