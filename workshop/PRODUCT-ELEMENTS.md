# Products: select, move and launch — 2026-09-24

Target: Workshop 2.0 in
`/Users/lorenzocolombani/.codex/worktrees/773a/LorenzoColombani.github.io`.
The seaside 1.0 and the separate Claude copy stay untouched.

## Brief and scope

Use the saved Iron Man 2 periodic-table study: a stable grid of translucent blue
element tiles, bright symbols and fine technical edges; selection becomes pink,
the chosen object lifts forward, and its identity survives movement and launch.
The Products display contains subtly floating, independently movable cards.
Bridge and Loki/TVA keep their complete authored experiences. Other projects
listed on LorenzoColombani.com receive matching cards and concise project views.

Two deliberate launch paths: an explicit control inside a card; or a drag/drop
or directional flick toward a generous table/hologram capture area. A simple
click on the card body only selects it. A cancelled gesture never launches.
Missed throws settle back inside the display. Escape cancels/returns. Reduced
motion removes idle floating and shortens the handoff. Native buttons provide
keyboard and touch alternatives to throwing.

Bridge/Loki launch after a continuous card-to-table flight and expansion. Bridge
audio is prepared in the original gesture. Generic projects show a readable
summary with their verified original link, inside the Workshop. Return restores
Products and the card positions. No buying/combine-two-products semantics added.

## Design decisions

- DOET: distinct selection and launch, immediate grab/target feedback, reversible
  placement, explicit return; never make a small accidental drag open a film.
- Jakob/Fitts: familiar button action plus generous drop target; no precise aim.
- Gestalt/UI: aligned element grid, restrained blue/pink palette, stable card
  identity, crisp readable titles and visible action labels. Screen area is
  adapted on small viewports. Engagement is direct manipulation, not a separate
  gamification or reward system.
- Reuse: existing Three.js scene, periodic-table reference notes, Bridge portal,
  Loki sequence, existing audio/gesture system. No replacement of room shaders.

## To do / acceptance

- [x] Read the saved reference and current Products/navigation/film hooks.
- [x] Retrieve the live portfolio home and work pages for the catalogue.
- [x] Build the element cards and their responsive Products display.
- [x] Implement constrained movement, table capture and directional throwing.
- [x] Connect the two authored experiences and generic project views.
- [x] Test gesture decisions/cancellation, then desktop and narrow-browser flows.
- [x] Save the verified stage and leave it open for review.

Physical touch-device testing is distinct from a narrow desktop viewport. Exact
movie fidelity remains a visual benchmark, not an unmeasured completion claim.

## Selection-to-target feedback requested during implementation

Selecting a tile visibly saturates the table hologram and smoothly accelerates
its own motion clock to exactly 3x. A faint bowed, floating dotted connection
streams from the selected tile to the table. It follows the card while moving,
and fades on return/deselection or experience launch. Reduced motion retains
the color/link cues with a static link and no speed increase. Room and film
clocks are not accelerated; existing shader stability guards remain intact.

## Verified and deployed checkpoint

Release `product-elements-3` is live on Workshop 2.0 at
https://the-workshop-garage-lorenzo.netlify.app/workshop/
Deploy: `6ab50ed97333d23ebbbd4c2e`. 23 focused tests pass. Ten deployed files
match the staged package and retain noindex headers. 1.0's entry script is byte
identical to its protected version.

Browser evidence: click selects without launching; moving within the display
persists after return; Bridge drop opens the authored film and returns to
Products; an OpenBots throw ending short of the target launches its project
view; explicit Loki launch opens its authored dossier; generic views return.
Selection shows the pink tile, bowed dotted connection and saturated hologram.
Desktop and 390 px browser layout inspected, no runtime errors. Physical phone
gestures and exact cinematic parity are not claimed.

Budget checkpoint: usage reached 2% remaining after deployment verification.
Stop further work here. All code, catalogue data, tests and notes are saved.
