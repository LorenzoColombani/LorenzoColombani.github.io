# Table and hologram — 24 September 2026

Lorenzo requested implementation of an Endgame-quality upgrade to the existing
table and hologram after the reference review. This is the bounded first change;
the wider setting is still undecided.

Target: `/Users/lorenzocolombani/.codex/worktrees/773a/LorenzoColombani.github.io/workshop/`.
Local preview only. Preserve the separately evolving Developer copy.

The saved Endgame study is the visual target: a usable, carefully finished table,
a simple square luminous source, thin translucent surfaces, fine internal
structure, selective bright edges and warm traces, depth, and local light tying
the projected object to its source. Reference fidelity is an ambition requiring
visual review, not a claim of matching a film render.

Latest direction supersedes the intervening ball request: use the projected
visual elements from Endgame — the folded translucent loop, fine mesh, colored
traces. Floating field/coherence readouts were subsequently rejected and removed. Keep field release / TVA launch behavior.
The table material/geometry quality is explicitly included. Preserve all project content, sound and controls.
Use existing self-hosted Three.js, projector timing and particle choreography.
The design library's holographic-blueprint / GPU flow-mote patterns are relevant;
no new third-party dependency or asset download is required.

Lighting decision: the Workshop is always in night mode, from the first frame
through entry, field release and exhibit return. Remove the daylight switch.

## Work and verification

- [x] Replace the pedestal/reactor presentation with a refined work surface and
  flush optical source; preserve artifact placement and reachability.
- [x] Replace the orb with a folded, layered translucent loop with internal contours,
  structured light paths and controlled glow; preserve release and sky handoff.
- [x] Visually inspect local desktop night presentation; correct clipping,
  contrast and composition. Check fresh GPU/runtime errors.
- [x] Check 390×844 phone-sized presentation and in-bounds project controls.
- [x] Check desktop field release, TVA dossier / return, and OpenBots / Bridge
  entry and return. Physical mobile performance is UNVERIFIED.
- [x] Save results and leave the local build ready for Lorenzo's visual review.

Room, droid, sales/navigation redesign and deployment are outside this pass.

## Latest refinement

Movie-quality appearance and motion remain the visual target; this working pass
requires Lorenzo's judgment. Primary visual comparison: [Cantina Creative's
Endgame HoloTable stills](https://www.cantinacreative.com/film/avengers-endgame).
The large bright emitter, selective gold triangular details, clear glass-like
facets and local projection light informed the revision. No film images are
embedded in the site's assets.

The initially separate shafts were rejected as disjointed. The folded surface
now continues into the emitter through faint curved light sheets, sharing its
parameterization, color, motion and visibility. The continuous volume disappears
with the hologram when an exhibit opens. A brighter etched source and its moving footprint establish a common
origin. Surface detail has separate coarse facets, faint fine layers, bright
edges and flowing colored paths. Deliberate eased turns settle between poses;
flow continues during those settled moments. No field/coherence readout floats
beside the hologram.

Validation: three geometry/lifecycle tests passed, including fixed table origin
and exact joining to the moving surface; 17 existing Bridge/portal/audio tests
passed. The fresh browser page had no shader/runtime errors. Phone-sized
390×844 layout had no horizontal overflow and all three project targets within
bounds. No physical-device or film-quality parity claim. Local only, optical-13.

Flicker follow-up: corrected SSAO depth treatment of optical surfaces and
invisible hit targets, with two restoration/filter tests passing. Replaced
subpixel wireframe ghost layers with faint continuous surfaces and filtered
small shader markings. The inherited scene already used 2-sample MSAA; the
fix addresses the incorrect depth contribution instead of increasing GPU cost.

The first filtering change used a reserved GLSL identifier. The browser compiler
caught it; the identifier was corrected in optical-13. Static JS/unit tests alone
do not validate GLSL compilation.

Browser verification of optical-13: complete surface visible again, with its
gold facet/flow details. No further shader error after the corrected reload;
the browser log retains the earlier optical-12 compile failure. The local
preview is entered and remains open for visual motion review.

Latest feedback and correction — optical-15: Lorenzo says the flashes began
with the projection volume and look like electricity on the hologram. The
SSAO correction alone did not solve his observation. Continuation geometry is
now in the same local space as the ribbon; fixed transparent layer ordering
and additive composition remove swapping/absorption between source sheets.
Their curves do not overshoot the join, and the ribbon uses symmetric two-sided
brightness. Joining/order tests pass. Two reproduced moving-point jumps were
also fixed and tested. Visual confirmation of the reported flashes remains
pending; do not label the issue conclusively resolved from static checks.

## Recording-backed diagnosis — optical-16

The supplied four-second screen recording has 217 frames. Frame 116 contains
a large single-frame white flare: 0 bright white pixels in the hologram region
in the preceding frame, 5,882 in the flash, and 0 in the following frame.
This is not the subtle shimmer previously targeted.

The real GPU reproduction uses the current hologram, HalfFloat render targets,
2-sample MSAA and the actual bloom pass. The old calculation produces spikes in
31 of 192 frames, reaching a linear channel value of 20,128. Disabling only the
new continuation volume removes the spikes. Bounding only its interpolated
height also removes them in a matched test. `vUv.y` was assumed to be between
0 and 1; edge interpolation under MSAA could escape that range, and its fifth
power drove extreme light/alpha values that bloom expanded into white squares.

The production fix is the single bounded height calculation; the projection
volume remains. Diagnostic fixture: `hologram-render-test.html` (excluded from
the deployment package). Use `?variant=legacy-height&frames=192` to reproduce
the old calculation and `?variant=current&frames=192` for the fixed code.
Structured evidence: `.claude/preview/hologram-flicker-evidence.json`.

Full production verification — optical-16: the real GPU replay completed all
192 frames with zero brightness spikes (peak 2.5859375), compared with 31 spike
frames and peak 20,128 under the old projection-height calculation. The GPU
fixture is closed after testing; the normal local preview is the deliverable.

Fidelity restoration — optical-17: restored rich highlights, colored paths,
bright points and fine inner linework after Lorenzo rejected the softened
diagnostic appearance. The projection-height correction remains. Real GPU
replay: 192 frames, 0 spikes, maximum channel 8.5859375; no shader errors.
Filtered wire shading restores the fine layers. This remains a local preview.

## Hidden-transform regression found during garage integration

The source sheet could acquire non-finite CPU vertices after the host shrank
the hidden hologram almost to zero during a long film. Inverting that matrix
magnified the fixed tabletop source beyond Float32 range. A failing regression
test reproduced this at near-zero/zero scale; the determinant guard retains the
last finite mesh while hidden and reconnects after returning to scale one.

This is separate from the earlier shader-height / MSAA brightness spike. Both
guards remain. Arrival-9: 28 focused tests pass; GPU motion fixture 192 frames,
zero spike frames, peak 8.5859375. A fresh long OpenBots playback/return produced
no new browser errors. The rich optical-17 detail/glow is retained.
