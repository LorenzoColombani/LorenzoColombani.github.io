# Garage and navigation desk — 24 September 2026

## Approved direction

Lorenzo approved the readback and authorized implementation in the existing
Codex worktree. The actual rear-view **Daddy’s home** garage is the spatial
reference, not a generic equipment room. Local preview only.

- Retain the praised lighting/material quality, floor reflections and reflected
  lights on the tabletop. Prominent high windows on the right light the garage;
  low horizontal rear-wall lighting and angled structure replace the tall bays.
- Keep the living landing view and the existing entrance reactor. Clicking it
  unlocks sound and advances the camera toward a semicircular brushed-metal desk.
- Four holographic screens spread sideways into left/right pairs, with a clear
  central gap. The local reference GIF shows panes moving laterally at full
  height while their contents populate, not stretching vertically upward.
- Products and Services are the assigned screens. Their selection, switching and
  return establish the self-serve navigation foundation. The other two areas,
  business content, actual purchasing and service flows remain undecided.
- Keep the Endgame-style workbench and connected hologram farther ahead, visible
  through the gap. Remove the three use-case diamonds, their labels and seats.
- Move the working droid and its assembly effect into the left garage bay for
  now. Remove View Companion and the companion tag. Its future role is undecided.
- Retain the hologram’s drag and click-to-release behavior as a hidden discovery.
  Remove only the visible Release the Field world label. This supersedes the
  brief intervening request to remove the interaction itself.
- Other car / future use-case spaces stay empty. Films remain in the project and
  available through the guide’s optional text controls.

## Parked for later

Use the saved **select/combine**, **objects and screens**, and **clear the
space** motion studies for richer hologram interactions. Future use-case
presentation and whether those objects are interactable remain undecided.
Do not invent destinations for the two unassigned screens or new commercial copy.

## Implementation

- `stark-workshop.js`: garage shell, right clerestories, peripheral benches,
  empty bays, real floor reflections and retained material textures.
- `navigation-desk.js`: machined curved desk, four optical slots/panes,
  staged lateral reveal, focus/return/switching and pointer-slip suppression.
- `main.js`: cinematic entry and responsive room/focus cameras, droid placement,
  retained surprise field interaction, no picking of the removed diamonds.
- `world-interface.js`: removed world labels and reachable optional text controls.
- `holographic-table.js`: project seats optional/removed in this layout. Also
  guards the projection against a nearly singular transform while it is hidden.
- Build marker: **arrival-9**. The separate Developer/Claude copy is untouched.

## Checks and evidence

- [x] Starting source checkpoint: `.claude/preview/workshop-studio-2-source.tgz`.
- [x] Desktop landing, entry, clear central gap and right-side light inspected.
- [x] Products selection, Services switch, Return to the desk and name/home tested.
- [x] Portrait framing and controls inspected; no horizontal overflow. The native
  browser exposed a 354×767 CSS viewport for the 390×844 override at current zoom.
  Section controls have 44px hit heights. **Physical phone performance unverified.**
- [x] Field click announces release; dragging changed coherence from 28 to 48.
  Both removed world labels are absent.
- [x] OpenBots plays, then removes its video on return. TVA reaches fullscreen
  sky and returns. Bridge reaches its film and its in-film return restores the room.
- [x] **28 focused tests pass**: desk geometry/reveal/reversible selection/slips;
  hologram transforms/motion/fade, physical occlusion, Bridge/portal/audio.
- [x] Retained hologram GPU fixture: **192 frames, zero spike frames, peak 8.5859375**.
- [x] Package validates 58 scripts, 170 dependency edges and four noindex pages;
  164 files / 28,817,457 bytes. Reference board/GIFs and diagnostics are excluded.
- [x] Long-playback browser check: OpenBots continued playing without new errors;
  Escape removed its video and restored the desk. Final local source checkpoint
  is `.claude/preview/workshop-arrival-9-source.tgz`.

The final check found a separate CPU geometry defect: during a long exhibit,
shrinking the hidden hologram made the inverse transform exceed Float32 range.
A reproducing test failed, then passed with a determinant guard. The last finite
mesh is retained while hidden and reconnects to the tabletop upon return.
The earlier shader-height bound remains intact; visual detail/glow are retained.

Design review uses hierarchy, reversible familiar controls, accessible text
alternatives and explicit targets where needed. No gamification was added.
Matching the movie remains a visual direction; exact movie-quality parity and
user acceptance of the complete new room are not claimed. No deploy or Git push.

## Garage reconstruction correction — in progress

Lorenzo rejected the room as an approximation and reiterated that the actual
garage must be reproduced. Stop adding adjacent features. A larger still of the
exact shot is https://i.sstatic.net/4ElQw.jpg (1280×544, viewed in browser; not
downloaded). It clearly shows the rear surface as uninterrupted fluted metal
with UPWARD light from its base, not framed downlight panels. Windows on the
right are wide, raked rectangles; the ceiling left has exposed strip-light banks
and heavy inward-slanting structural members. Receding rows of small floor
lights establish the long aisle. These are now being modeled specifically.

Current in-progress source: garage-frame-1. Earlier arrival-9 checkpoint is safe.
Do not mark the latest architecture as visually verified until the new render
has been examined. Preserve the floor and tabletop reflection treatment.

## Latest user correction — real garage exit, brighter GIF is primary

The user says the end is where the cars leave and the right side has windows;
our room still read as sealed. His brighter local Daddy’s Home GIF is the
PRIMARY reference, ahead of the darker large still. The next revision creates a
vehicle-width opening and a rising driveway beyond it, a raised fluted metal
gate with deep jambs/tracks, and properly raked right-side glazing. The open
exit is an implementation choice to make the route out legible; do not claim
that its exact open state is established by the GIF. Preserve approved surfaces.

In-progress build: garage-exit-1. Needs browser render verification. Website
reopening was requested after an accidental close; latest visible browser was
created through the explicit in-app-browser entry point.

## Authoritative correction from the user’s supplied screenshot

Primary image saved privately as `.claude/references/stark/garage-user-frame.png`.
His close crop shows the low curved metal feature and upward light cones.
**The car route goes LEFT**, not right and not straight through a raised shutter.
The raised-shutter interpretation was wrong and is removed. Current source
uses a low continuous curved retaining wall, with a left-bending vehicle lane
and exit. Rear furniture has moved out of that route.

The user explicitly rejected the darkness. Current garage-reference-2 increases
neutral ambient fill and exposure, reduces excessive depth fog, and preserves
the approved floor/table reflection mechanisms. Browser inspection still needed.

## Current local review stage — garage-reference-4

Desktop render inspected with no runtime errors. The car route bends LEFT
around the low curved metal feature; right-side raised shutter removed. Stronger
neutral illumination and reduced fog now reveal the room. A heavy teal landing
scrim was independently found and removed; this was masking the 3D lighting.
Upward footlights and a bounded static emissive wash retain the narrow luminous
cores shown in the user’s crop. Floor/table reflection mechanisms remain intact.

The current architecture is ready for the user’s visual review, not a claim of
exact movie-quality parity. Prior navigation/film/mobile-viewport checks remain
recorded above; the final architecture-only pass was checked on desktop. Real
phone performance remains unverified. Source saved in
`.claude/preview/workshop-garage-reference-4-source.tgz`. Local only, not deployed.

## Selected-image alignment — garage-reference-5

The user explicitly marked the Daddy’s Home GIF as the visual target. The right
window wall is now oriented along the side of the garage, so its windows recede
into depth rather than facing the viewer across the background. Left structural
I-beams are heavier, the workbench is within the visible left bay, and a machined
work station, tool boom and trolley occupy that peripheral working area. Car
footprints remain free apart from the parked droid. The driveway curves left.

The current native desktop render from the desk viewpoint was inspected without
runtime errors. The architecture remains a local review stage; primary provided
images govern later visual feedback. The lower-level interaction, geometry and
film regression results from this round remain recorded above. No new deployment.
Checkpoint: `.claude/preview/workshop-garage-reference-5-source.tgz`.

## Ramp-direction bug corrected — left-turn-2

The user’s screenshot proved that the previous “left driveway” still faced
forward. That was a modeling error. The straight road, frontal portal, and blue
view directly ahead are now removed. The actual route turns behind the lit
metal wall and rises toward -X through a left-side opening. A concrete front
retaining wall visibly rises left and conceals the road, matching the specified
view. The metal band follows that grade. Rear/roof envelope extended around it.

`garage-ramp.test.mjs` verifies the exit tangent points left (x < -.97 and
abs(z) < .02), crosses the left building boundary while rising, and retains
finite upward-facing geometry. Two tests pass. Front rendered view inspected
without runtime errors; no straight opening remains. Cache version left-turn-2.
Checkpoint `.claude/preview/workshop-left-turn-2-source.tgz`. Local only.

## Separate Netlify draft — production preserved

Published at the user’s explicit request, without replacing the live website:
https://6ab4a248129d4717b81c54ae--the-workshop-lorenzo-preview.netlify.app/workshop/

Netlify’s production deployment pointer and the live HTML/bootstrap hashes are
unchanged. Eight draft files match the validated package and retain noindex
headers. The draft landing renders without runtime errors. Deployment receipt:
`.claude/preview/left-turn-2-draft-verification.json`.
