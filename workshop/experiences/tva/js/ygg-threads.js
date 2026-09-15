/* ═══════════════════════════════════════════════════════════════════════
   ygg-threads.js — THE ASSET SUBSTITUTION (recipes R1 + R2, verbatim
   mechanism). The film's band ribbons and its 318-fiber tree are REPLACED
   by the recipe's own system: 32 PERSISTENT THREADS that are the Sacred
   Timeline and, by a root→tip wavefront morph, Yggdrasil. Nothing is
   created or destroyed between the phases — the same 32 objects live from
   the wordmark to the credits.

   Ported from loki/prototypes/yggdrasil.html (the rebuilt artifact) to ES5
   + the film's vendored THREE. Recipe law kept:
   — thread objects persist across ALL phases (no create/destroy)
   — root point anchored at the world anchor G throughout the morph
   — wavefront drives mu PER-POINT (root→tip), never globally
   — additive blending + bloom = the glow look
   — the geometry NEVER rotates; the camera does the work (ygg-hinge.js)

   STAGING (the one sanctioned adaptation, per the recipes' own R5 —
   "you already have the background images and the rest of the
   visualization; this is a job of substituting the key elements"): the
   threads braid around the FILM's own spine curve and leave along the
   FILM's own fork curves, so the cast cards, the text matte and the
   exhibit-tag anchors all still land. The substance, colour grammar,
   morph and prune are the recipe's; the staging is the film's.

   The fold: the film's anchor G sits at the MIDDLE of the band, so each
   thread's two halves both travel to the tree (u = |s−0.5|·2, root at G,
   band ends → canopy tips) — 64 tree strands out of 32 threads, and the
   wavefront opens outward from the root exactly as R2 specifies.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.THREE || !window.FX) { window.YggThreads = null; return; }
  var T = window.THREE, U = window.FX.util;

  var CFG = {
    // (no threadCount: the total is DERIVED — cordCount + the film's own fork
    // census — so it can never drift out of step with the deviations. See THE
    // WEAVE below. It comes out at 7 + 25 = 32, the original count.)
    sampleCount:          120,

    // Sacred Timeline braid (R2's grammar, wound around the film's spine).
    // braidRadius is the one value the film's framing forces down from the
    // artifact's 0.22: the artifact watches the cord from CLOSE, along its
    // axis, where 0.22 reads as a rope; the film watches the band broadside
    // from ~12 units, where 0.22 splays 32 one-pixel lines into separate
    // wires (and the film's chromatic aberration then fringes each one).
    // At 0.10 the threads overlap into a single glowing cord — the artifact's
    // READ, which is what the recipe is for. Taste dial.
    braidRadius:          0.10,
    braidAmplitude:       0.05,   // artifact 0.12 — same reason as the radius: broadside, the extra wrap splays the cord
    braidFrequency:       3.2,
    braidWind:            1.9,    // turns across the film's 20-unit band — the artifact's own pitch (1.25 across 14)
    noiseAmplitude:       0.18,
    shimmerSpeed:         1.2,

    /* ── THE WEAVE (his note, 2026-07-18): "limit the number of threads to 7,
       but increase thickness to maintain the approximate girth of the timeline
       AND make sure that the threads do look threaded / knitted / entangled".

       Why 7 VISIBLE strands and still 32 thread objects. The girth is fixed
       (~0.20 world units ≈ 22px broadside). 32 strands inside it sit ~0.7px
       apart, so ANY real thickness merges them into one solid slab — a weave
       needs few strands, which is what his 7 is. But the film puts 18
       deviations on screen at once (2 cold-open + 7 cast + 2 doctrine + 7
       crew), and a deviation IS a thread leaving the braid, so 7 objects
       cannot carry them.
       So: 7 CORD strands, drawn thick, are the timeline you read. The 25
       deviation threads ride hidden INSIDE their carrier strand (same braid
       path, sub-strand offset, carrier-keyed shimmer) until their own fork
       point, then peel off exactly as composed — cards, tags and prunes
       untouched. 7 + 25 = 32: his "keep the original amount of thread" and
       his "limit to 7" are the same build.
       Only the 7 cord strands change how they RENDER (ribbon, not 1px line).
       The tree is held: width tapers back to hair by mu, so Yggdrasil is the
       one he screened. */
    cordCount:            7,
    weaveFrequency:       2.4,    // radial in/out cycles across the band — the over/under
    weaveDepth:           0.55,   // how far a strand travels between core and rim (fraction of braidRadius)
    counterWind:          true,   // odd strands wind the other way: they CROSS instead of running parallel
    cordHalfWidth:        0.024,  // band strand, world units (~3.5px broadside) — his "increase thickness"
    // the deviations get the same real-width treatment (his note): thinner than
    // the cord, because a branch IS a thinner offshoot, but no longer 1px hairs.
    // Side effect worth having: the heavy red/cyan fringing on the branches was
    // the film's colour-separation grade biting on one-pixel lines — width
    // buries it, exactly as it did on the cord.
    // 0.032: fusing the cast pair into one strand took away the width the two
    // rails used to span, so matching "a bit thicker" needed more than a nudge
    // (0.018 two-ply -> 0.022 single read THINNER, not thicker). Still well
    // under the cord's total girth — a branch is one strand, the cord is seven.
    forkHalfWidth:        0.032,
    /* A cast deviation is TWO threads (the cold-open/doctrine/crew forks are
       one) — invisible at hairline width, but with real width the pair read as
       two separate strands while every other branch read as one. His note.
       Collapsed to a single strand by killing the lane spread rather than by
       deleting a thread: those threads are ALSO tree branches later, so
       dropping them would thin the canopy by a quarter. A hair of spread is
       kept so the two do not sit perfectly coincident — it reads as one strand
       with a slightly hotter core, which is also where the cast branches keep
       the extra weight they were composed with over the crew branches. */
    forkLaneSpread:       0.006,  // was 0.045, tuned for 1px lines
    treeHalfWidth:        0.002,  // every strand thins back to hair for Yggdrasil (~1px at the credo)

    /* Exposure. bandGain/treeGain are the SCREENED numbers and stay untouched:
       they now light only the 25 deviation threads, which are still the same
       1px lines, so every card, tag and prune keeps its composed weight.
       The two cord gains are new, and they are not free parameters — a fat
       soft-edged ribbon emits differently from a hair. Seven strands at ~3.5px
       with a smoothstep cross-section carry roughly a third of the lit area
       that 32 hairs did, so the per-strand gain has to rise to hold the cord,
       and is then pulled back under it for his "reduce luminescence". */
    bandGain:             2.6,    // deviations — unchanged
    treeGain:             1.0,    // deviations in the tree — unchanged
    cordGain:             3.0,    // the 7 ribbons in the band (swept on the rig: 4.2 blows out, 1.0 goes dull rope, 3.3 glows but softens the weave)

    /* ── SPROUT, don't detach (his note, 2026-07-18): "forking branches must
       sprout and grow FROM the main branch, instead of just detaching".
       The old behaviour lerped a deviation's whole tail from the braid to its
       fork curve at ONE uniform rate — every point travelling together, so the
       branch read as a rigid strand peeling sideways off the cord. Now the
       branch sits in its final place from the start and is REVEALED from the
       fork point outward by a growth front running along its own length. It
       grows out of the cord. The clock is untouched: the same fk ramp, still
       complete at t0 + 1.4s, so no CUE onset or card beat moves. */
    growSoftness:         0.06,   // softness of the growing tip, in branch-length units
    growTipHeat:          0.55,   // heat right at the growing tip — a sprout, not a cut end
    treeGainCord:         2.0,    // the same 7, thinned to hair in the canopy

    // Yggdrasil (R1/R2 L-system, scaled to the film's frame:
    // canopyRadius 8.0 -> 3.4, the one dimensional adaptation — the film's
    // camera sees ±3.3 world units at the credo, the artifact's 8.6-tall
    // tree would stand clean off the top of the frame)
    treeDepth:            4,
    branchesPerNode:      2,
    lengthDecay:          0.68,
    treeDivergenceAngle:  0.48,
    primaryLimbCount:     8,
    /* THE TREE LIES ALONG THE BAND now, so it is scaled to the band, not to the
       old credo framing: the measured skeleton is 7.2 wide x 4.287 tall at 3.9,
       and the band is 20 units. x4.3 puts the growth axis at ~18 units and the
       canopy fan at ~+-15 — which fits the 29.9 x 16.8 frame the camera already
       has at the morph's end. Measure the real extent on the rig; the limbs
       leave the trunk at 45 deg so the X reach is well under the arc length. */
    canopyRadius:         16.8,  // was 3.9 when the tree stood upright at G
    // one extra branch per lost fold-half, so the canopy keeps its screened density
    fillerCount:          30,
    trunkHeightFraction:  0.18,
    tipFrayAmount:        0.30,

    // Colours (R1/R2 verbatim)
    coreColor:            0xFFF0C4,  // hot trunk centre
    midColor:             0xFF9A3C,  // mid-branch amber
    tealColor:            0x2FBFC4,  // cool canopy accent
    hotColor:             0xFFFFFF,  // wavefront / ignition peak

    /* ── THE BLOOM (his note, 2026-07-18): "the tree must form / expand / be
       born more slowly. Right now it reads as near instantaneous. It should be
       slower, as to evoke natural bloom."

       It was running turn+2.9 → wm2+0.3 = 4.06s — roughly a QUARTER of the
       film's own tree-formation envelope. That mismatch, not taste, is why it
       snapped.

       Starting at turn+0.45 means the tree begins forming essentially AT the
       eruption rather than 2.9s after it — which is what the film's own tree
       does, and reads as the ROOT hit birthing the tree.

       And the film's tree does not grow in ONE sweep: its spine envelope is a
       weighted pair — 95% over turn+0.45 → turn+8.131, then a 0.3s HOLD, then
       the last 5% over turn+8.431 → settleStart. world.js's own note on it:
       "completion deliberately unfinished — the finale owns the last tenth."
       That shape is copied here verbatim, because it IS the natural bloom he is
       asking for: the tree is essentially there by 118.6, and its final tenth is
       still quietly unfurling while the camera stands it up.

       Consequence, deliberate and documented: ygg-hinge's orbitPose still keys
       its own mu off turn+2.9 → wm2+0.3. Those two windows used to be identical
       by coincidence (no shared reference). They no longer are — harmless, since
       the orbit is the TURN's framing move and the stand-up is a later event. */
    morphStartOff:        0.45,   // after CUE.turn — the film's own tree-grow start
    morphEndOff:          8.131,  // the main bloom's end (95%) — also the camera's lag anchor
    morphMainWeight:      0.95,   // the film's own spine weighting
    morphTailStartOff:    8.431,  // after a 0.3s hold...
    morphTailEndOff:     13.305,  // ...the last tenth resolves at settleStart

    // a wider front makes each POINT take longer to travel from band pose to
    // tree pose — softness independent of total duration. Second bloom lever.
    wavefrontSoftness:    0.18,   // was 0.12
    wavefrontGlowBoost:   0.6,

    swayFrequency:        0.4,
    swayAmplitudeScale:   0.06,

    emberCount:           120,
    emberSize:            0.085,

    /* ── THE CANOPY (his note, 2026-07-18, with two S2-finale reference frames):
       "recreate a rich canopy that makes the tree look like it has actually more
       than just branches in the canopy — that it's effectively blooming."

       The film ALREADY answered this for its own tree: world.js carries a crown
       of 84 nebula billows, 13 dark trunk-mass billows and 46 pink/violet
       blossoms, screened and landed, and its comment carries his ruling from
       that pass — "the dark limbs sit INSIDE a light mass, never the other way
       round". The substitution switched all of it off (treeVis = false under
       ?ygg=1), which is why Yggdrasil has been running as bare tracery since.

       It cannot be un-gated in place: that crown hangs off the riser, which sits
       at G, holds upright, and is scaled for canopyRadius 3.9 — this tree lies
       along +X, roots at the band's left end, and is 4.3x bigger. So the volume
       is rebuilt here, generated from the threads' OWN baked tree points. It
       then inherits the lying-down frame and the camera's stand-up for free.

       Three layers, all pure f(t), all riding the SAME wavefront that already
       builds the tree — the bloom needs no clock of its own:
         · the dome  — billows clustered on branch points, 2/3 additive luminous
                       and 1/3 normal-blended dark, capping the additive sum
         · the crown — the hot bloom where the trunk opens (the reference's
                       brightest feature, and the reason its canopy reads as lit
                       from WITHIN rather than as a lit outline)
         · sparkle   — the magenta/violet specks, igniting at the stillness

       The billows are ONE merged mesh billboarded in the vertex shader, not N
       sprites: 220 sprites would be 220 draw calls, and at this tree's scale
       each covers ~18x the screen area world.js's did. The blob itself is drawn
       procedurally in the fragment shader — so there is no texture to dither,
       and the Safari Canvas2D-gradient law (see emberTex) is answered by having
       no texture at all. */
    canopyOn:             true,
    billowCount:         1700,
    billowScale:          1.75,   // world units, mean half-size
    billowScaleVar:       1.25,
    billowAlpha:          0.200,  // per billow — they ACCUMULATE into the mass
    capFraction:          0.34,   // his ruling: ~1/3 dark, capping the sum
    capAlpha:             0.38,
    capColor:             0x0C1B22,
    /* FOLIAGE, not a dome (his note: "the dome still doesn't extend all the way
       up the branches. A real tree has foliage all over the branches").
       canopyUStart is now the BOLE line: below it the trunk stays bare, above it
       every branch carries clumps for its whole length. */
    canopyUStart:         0.38,   // the trunk's bare bole ends here
    floretCount:          150,    // clumps, spread along every branch — not packed in a crown
    floretRadius:         2.2,    // how tightly billows pack into one clump
    /* REACH (his note, 2026-07-18: "extend the foliage even more upwards along
       the branches"). Three separate terms were attenuating the tips at once, and
       one of them compounds — foliageTipThin is applied TWICE, to the clump's
       radius AND again to each billow's scale, so the dial is effectively
       squared: 0.55 came out as a ~80% shrink at the twigs. Together with a 42%
       fade and a mild outward lean, the mass died well before the branch ended.
       All three loosened. The taper is kept, not removed — a twig that ends in a
       wall of leaves reads as a hedge, and both plates fray at their edges. */
    foliageBias:          0.70,   // leans further out along the branch (<1 = outward)
    foliageTipThin:       0.28,   // squared by the double application -> ~0.52 at the twigs
    foliageTipFade:       0.20,   // the junction law, running ALONG the branch
    /* RETIRED 2026-07-18 — canopyInner/canopyOuter/domeAspect/domeSquash/
       domeCenterU. They bounded the mass as one blob around a single centre, and
       a blob has an OUTSIDE: the branch tips were always past it, so the reach was
       capped by construction and no value of canopyOuter could ever fix it. Three
       tuning passes failed against that before the shape itself was the answer. */
    /* The junction law now lives in foliageTipFade above, where it belongs: the
       bible says growth is lit from its ROOT and fades outward, which is a
       per-branch statement. Measuring it radially from a dome centre was a poor
       stand-in that dimmed the whole outer canopy to obey a law about branches. */
    /* CALIBRATION (rig, 2026-07-18) — the exposure is set against the film's OWN
       approved credo rather than against a number out of the bible. Measured at
       133.2, wordmark peak vs the background right behind it:
         ygg, bare (before this pass)   239 over  58   contrast 181
         THE FALLBACK, his signed-off    224 over 158   contrast  66
       The frame he approved runs a background nearly three times brighter than
       the bare ygg tree and keeps only 66 levels of margin. "Cream phosphor on
       near-black" is the ENDING WORDMARK's register, not a law about this frame —
       reading it as one had me dim the canopy twice for nothing. The dial below
       is set to land near 145, which is still more margin than he has approved. */
    /* The FOLIAGE ramp is its own thing, and it never touches amber. The branch
       tracery keeps the recipe's gold->amber->teal, because that is the wood; but
       leaves that run orange read as fire, and neither reference plate has a warm
       canopy anywhere. Both greens below are from world.js's own approved DOMEC
       set, so the palette is the film's, not a new one. */
    greenColor:       0x54BC96,   // inner foliage, nearest the trunk
    tealMidColor:     0x3E9E86,   // the body of the mass
    blueColor:        0x4090BC,   // outer-canopy blue — world.js's own DOMEC family
    domeHueJitter:        0.30,   // green<->blue drift per billow: pools, not a wash

    /* ── THE NAME SCRIM — REMOVED 2026-07-18, and worth the paragraph ──────────
       A soft screen-space rectangle used to thin the canopy behind the ending
       wordmark. It was added when the camera sat at pullZ 16 and the extended
       dome really was drowning the letters. His note killed it: "it's some sort
       of rectangle shader that makes a big chunk of the foliage invisible."

       He was right and the earlier verification was wrong in an instructive way:
       it tested for a hard EDGE, found none, and concluded there was no
       rectangle. Feathering removes the edge, not the RECTANGULARITY — a
       soft-cornered rectangular void is still a rectangle. Wrong property
       measured.

       Isolated by A/B (keepAmount 0.88 vs 0, same frame): the scrim removed 30%
       of the light inside its rect and 40% just above it, where the feather
       reached into the densest canopy.

       And by then it bought nothing. The pull-back to pullZ 32 solved the problem
       it existed for. Glyph-band separation with the scrim FULLY OFF, measured at
       pullZ 32 — 127: 107.0 · 130.5: 99.1 · credo 133.2: 72.0 — against the
       film's own approved credo, which reads 66. It was buying 9 points on a
       measure already passing twice over, and paying with a third of the canopy.

       If the letters are ever at risk again, do NOT rebuild a rectangle. Either
       mask from the wordmark's OWN alpha (glyph-shaped, so the thinning is the
       shape of the thing it protects and cannot read as a shape of its own), or
       take the contrast from the type side — a soft dark halo behind the glyphs
       in the ortho pass, glyph-shaped by construction and free to the canopy. */
    /* "a branch arrives, THEN it flowers" — the volume trails the growth front by
       a lag in u-space, so the canopy is caused by the branches rather than
       co-incident with them. No new clock: nothing in the growth or the stand-up
       moves. */
    bloomLag:             0.10,
    bloomSoft:            0.24,
    crownCount:           9,
    crownScale:           1.9,
    crownAlpha:           0.055,
    crownU:               0.20,   // where the limbs actually leave the trunk
    sparkleCount:         520,
    sparkleSize:          0.17,
    sparkleAlpha:         1.15,
    sparkleUStart:        0.68,
    blossomP:         0xFFDCF0,   // world.js's own blossom pink...
    blossomV:         0xE4D6FF,   // ...and violet, already the reference's accent

    /* ── THE ROOTS (his note, 2026-07-18): "build thick roots (different geometry
       than the branches obviously, and need to grow from the timeline as well)".

       They ARE timeline threads — appended after the branch total NB, cord-carried
       and dark through the whole band era, released by the morph into root poses.
       Same mechanism the filler threads use, so "grow from the timeline" is
       literal: a root is the same object that was Sacred Timeline a moment before.

       Geometry is deliberately NOT the branches': few, thick, shallow and wide,
       two levels instead of four, and sinuous rather than clean. Both reference
       plates show roots spreading out, not plunging down. */
    rootCount:             16,
    /* THE UN-BRAID (see bakeRootPaths). These describe a thread leaving a weave,
       not a branch: how far it finally splays, how fast it opens, how much of the
       braid's turn it still carries, and how steeply it drops before flattening. */
    rootSpread:           7.2,     // final radius from the trunk axis — wide
    rootSplayPow:        2.40,     // >1: hugs the column, then opens out. At 1.45 a root
                                   // was already 5x the column radius by s=0.10 — that flare
                                   // AT the junction is what read as a visible shoulder.
    rootUnwind:          0.34,     // turns of residual braid still in it at the junction
    rootDrop:             4.6,     // how far below the base it finally reaches
    rootDropPow:         0.82,     // <1: steep out of the column, then flattens — but 0.62
                                   // dropped a quarter of the depth in the first tenth
    /* CROOKED (his note): a root kinks rather than curving. Two noise octaves, both
       gated to zero at the junction so it leaves the weave cleanly. */
    rootKinkAmp:         0.85,
    rootKinkFine:        0.38,
    rootColumnR:        0.055,     // the braid's own radius where it meets the trunk
    rootBandSpan:        0.05,     // roots ride only the leftmost 5% of the band — the base
    /* ANCHORED TO THE WRONG NUMBER, twice. This matched cordHalfWidth (0.024) —
       the BAND-era strand. But at the credo the trunk's own threads have tapered to
       treeHalfWidth, 0.002: hair. So it was hairs above the junction and sixteen
       ribbons twelve times wider below, piling up additively into a bright bulb.
       That step in total ink is the visible junction; no luminance ramp can hide a
       girth mismatch. The neck now matches what is actually adjacent to it. */
    rootNeckWidth:      0.004,     // ~= treeHalfWidth: what the trunk IS at the junction
    rootSwellAt:         0.40,     // and reaches full thickness only well clear of the column
    rootHeat:            0.22,     // roots barely take the wavefront's ignition — old wood
    rootHalfWidth:       0.200,    // branches 0.032, cord 0.024 — a root is the thick thing
    rootTipWidth:        0.040,    // tapers along its length, never to hair
    /* Roots finish before the canopy opens. Their whole length is compressed into
       the front's low band, so they crawl outward from the base while the trunk is
       still rising: roots -> trunk -> canopy. No new clock. */
    rootFrontSpan:       0.35,
    /* His colour call: "darker, but still along the color of the trunk — maybe some
       sort of mix between amber and the colors of the foliage?" That mix is already
       sanctioned here: amber 0xFF9A3C averaged with the foliage teal 0x3E9E86 gives
       ~0x9E9C61, squarely the STYLE BIBLE's own olive/khaki family (#484830,
       #606048). So the bridge between wood and leaf is a colour the film owns. */
    rootOliveColor:  0x9E9C61,     // the amber x foliage-teal mix — the body
    /* the tip stays in the WOOD's family — a dark warm olive-brown, not the cold
       teal it used to end on. The olive body still bridges to the foliage; ending
       cold as well made the roots read as a different material from the trunk. */
    rootTipColor:    0x4A4230,     // deepest — dark olive-brown, still warm
    rootDarken:          0.80,     // his "darker" — but only just, under the trunk
    /* the luminance gradient along a root: full at the junction (so it merges into
       the trunk with no seam), falling to rootTipLum at the tip. rootLitOut is where
       the falloff BEGINS — a short hold at full brightness first, so the merge has
       somewhere to happen. */
    rootLitOut:          0.34,     // hold full trunk luminance well past the junction...
    rootLitEnd:          1.55,     // ...then fall off SO gradually the ramp never completes
    rootTipLum:          0.30,     //    inside the root's own length — no landing, no edge

    /* ── THE TIMELINE DRAWS ITSELF (his note: "I just saw how the green timeline
       'appeared' by moving to the right. Can you do the same with the current
       version?"). The FALLBACK already does this and the substitution lost it —
       ygg's bandAlpha returns 0 before wmStart-0.5 and 1 immediately after, so the
       band POPS on. These numbers are the fallback's own, not invented: its spine
       ribbon wipes on `outCubic((t - (wmStart+0.15)) / 2.6)` with a lit head 0.05
       of the length (world.js addRibbon + the uGrow shader).

       His call: the band is TRULY DARK ahead of the front, not fading up underneath.

       Windowed on purpose: the front saturates at 1 by wmStart+2.75 = 14.40, after
       which the multiplier is exactly 1.0 — an arithmetic no-op. The first band
       gate is 16.5 and the first fork fires at 17.85, so nothing downstream moves
       and no existing baseline has to be re-established.

       NOTE on the head: the fallback's is `smoothstep(uGrow-0.05, uGrow, x)` and
       U.outCubic CLAMPS, so at grow=1 that is smoothstep(0.95,1,x) — a bright edge
       welded to the band's right tip for the rest of the film. Whether that is a
       glint or a latent bug in the original, inheriting it would break the
       no-op property, so the head here is killed explicitly by wipeHeadEnd. */
    wipeOn:              true,
    wipeStartOff:        0.15,   // after CUE.wmStart — the fallback's own offset
    wipeDur:              2.6,   // the fallback's own duration
    wipeSoft:           0.015,   // the front's own softness in s — near-hard, as the fallback discards
    wipeHead:            0.05,   // lit head behind the front, the fallback's width
    wipeHeadGain:        0.95,   // how hot that head runs
    wipeHeadEnd:         0.88,   // head is gone by this fraction of the window — guarantees the no-op

    seed:                 1121
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function smoothstep(a, b, x) {
    var k = clamp((x - a) / (b - a), 0, 1);
    return k * k * (3 - 2 * k);
  }
  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  /* ---------- real 3D simplex (Gustavson) — the brief's placeholder,
     replaced, exactly as the artifact does it ---------- */
  function makeSimplex(rand) {
    var F3 = 1 / 3, G3 = 1 / 6;
    var grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],
                 [1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    var p = new Uint8Array(256), i, j, tmp;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      j = Math.floor(rand() * (i + 1));
      tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    var perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
    for (i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
    return function (xin, yin, zin) {
      var n0, n1, n2, n3, g;
      var s = (xin + yin + zin) * F3;
      var ii = Math.floor(xin + s), jj = Math.floor(yin + s), kk = Math.floor(zin + s);
      var tt = (ii + jj + kk) * G3;
      var x0 = xin - (ii - tt), y0 = yin - (jj - tt), z0 = zin - (kk - tt);
      var i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0)      { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
        else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
        else               { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
      } else {
        if (y0 < z0)       { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
        else if (x0 < z0)  { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
        else               { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
      }
      var x1 = x0-i1+G3,   y1 = y0-j1+G3,   z1 = z0-k1+G3;
      var x2 = x0-i2+2*G3, y2 = y0-j2+2*G3, z2 = z0-k2+2*G3;
      var x3 = x0-1+3*G3,  y3 = y0-1+3*G3,  z3 = z0-1+3*G3;
      var iA = ii & 255, jA = jj & 255, kA = kk & 255;
      var t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
      if (t0 < 0) n0 = 0; else { g = grad3[permMod12[iA+perm[jA+perm[kA]]]]; t0 *= t0; n0 = t0*t0*(g[0]*x0+g[1]*y0+g[2]*z0); }
      var t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
      if (t1 < 0) n1 = 0; else { g = grad3[permMod12[iA+i1+perm[jA+j1+perm[kA+k1]]]]; t1 *= t1; n1 = t1*t1*(g[0]*x1+g[1]*y1+g[2]*z1); }
      var t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
      if (t2 < 0) n2 = 0; else { g = grad3[permMod12[iA+i2+perm[jA+j2+perm[kA+k2]]]]; t2 *= t2; n2 = t2*t2*(g[0]*x2+g[1]*y2+g[2]*z2); }
      var t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
      if (t3 < 0) n3 = 0; else { g = grad3[permMod12[iA+1+perm[jA+1+perm[kA+1]]]]; t3 *= t3; n3 = t3*t3*(g[0]*x3+g[1]*y3+g[2]*z3); }
      return 32 * (n0 + n1 + n2 + n3);
    };
  }

  /* ---------- the L-system tree, rooted at the anchor, growing +Y ----------
     R1/R2 verbatim structure (trunk, then primaryLimbCount limbs in a full
     radial arc with upward lean, recursing to treeDepth), CatmullRom-smoothed
     and arc-uniformly sampled so every thread's s maps to real arc length. */
  function bakeTreePaths(nPaths, rand, noise) {
    var branches = [];
    function recurse(start, dir, length, depth, parentIdx) {
      var end = start.clone().addScaledVector(dir, length);
      var myIdx = branches.length;
      branches.push({ start: start.clone(), end: end.clone(), depth: depth, parentIdx: parentIdx });
      if (depth < CFG.treeDepth) {
        var n = CFG.branchesPerNode, i;
        for (i = 0; i < n; i++) {
          var angle = CFG.treeDivergenceAngle * (i - (n - 1) / 2.0);
          var cos = Math.cos(angle), sin = Math.sin(angle);
          var nx = dir.x * cos - dir.y * sin;
          var ny = dir.x * sin + dir.y * cos;
          var nd = new T.Vector3(nx, ny, dir.z + (rand() - 0.5) * 0.1).normalize();
          recurse(end, nd, length * CFG.lengthDecay, depth + 1, myIdx);
        }
      }
    }
    var trunkLen = CFG.canopyRadius * CFG.trunkHeightFraction;
    var trunkTop = new T.Vector3(0, trunkLen, 0);
    branches.push({ start: new T.Vector3(0, 0, 0), end: trunkTop.clone(), depth: 0, parentIdx: -1 });
    var i2;
    for (i2 = 0; i2 < CFG.primaryLimbCount; i2++) {
      var az = (i2 / CFG.primaryLimbCount) * Math.PI * 2;
      var dir2 = new T.Vector3(Math.sin(az) * 0.75, 0.75, Math.cos(az) * 0.75).normalize();
      recurse(trunkTop.clone(), dir2, CFG.canopyRadius * 0.45, 1, 0);
    }
    var leaves = [], b;
    for (b = 0; b < branches.length; b++) if (branches[b].depth === CFG.treeDepth) leaves.push(branches[b]);

    var paths = [], pid;
    for (pid = 0; pid < nPaths; pid++) {
      // strided pick so every limb is used (plain modulo would use only half)
      var leaf = leaves[Math.floor(pid * leaves.length / nPaths) % leaves.length];
      var chain = [], node = leaf;
      while (node) {
        chain.unshift(node);
        node = (node.parentIdx >= 0) ? branches[node.parentIdx] : null;
      }
      var joints = [chain[0].start.clone()], c;
      for (c = 0; c < chain.length; c++) joints.push(chain[c].end.clone());
      var curve = new T.CatmullRomCurve3(joints);
      paths.push(curve.getSpacedPoints(CFG.sampleCount - 1));
    }
    return paths;
  }

  /* ---------- the ROOTS: the trunk's braid, RUN BACKWARDS ----------
     His note, and it is the whole design: *"think of them in geometric terms: they
     look 'deployed' as if the predecessor of the intertwined/knitted trunk."*

     So a root is not a branch pointing down. The trunk is threads KNITTED together;
     the roots are those same threads BEFORE they were gathered. The geometry is an
     UN-BRAIDING, and it is expressed directly rather than through an L-system:

       · radius  — the braid's own tight radius at the junction, splaying open as it
                   descends (pow(s, rootSplayPow): held in close at first, then out)
       · twist   — the braid's turn is still present where it meets the trunk and
                   decays to nothing once deployed. theta(s) = a0 + W*(1-(1-s)^2),
                   whose rate is greatest at s=0 and exactly zero at the tip: the
                   thread stops turning once it is no longer part of the weave.
       · descent — pow(s, rootDropPow) < 1, so it drops steeply out of the column and
                   then flattens: wide and shallow, which is what both plates show.

     Read upward it is a gathering — separate strands converging and twisting into
     one column, which is the film's thesis in geometry. ---------- */
  function bakeRootPaths(nPaths, rand, noise) {
    var N = CFG.sampleCount, paths = [], pid, i;
    for (pid = 0; pid < nPaths; pid++) {
      var a0 = (pid / nPaths) * Math.PI * 2 + (rand() - 0.5) * 0.30;
      var reach = CFG.rootSpread * (0.72 + rand() * 0.56);
      var drop = CFG.rootDrop * (0.78 + rand() * 0.44);
      var unwind = CFG.rootUnwind * (0.7 + rand() * 0.6) * (rand() < 0.5 ? -1 : 1);
      var kAmp = CFG.rootKinkAmp * (0.6 + rand() * 0.8);
      var kPh = rand() * 100;
      var pts = [];
      for (i = 0; i < N; i++) {
        var s = i / (N - 1);
        // still inside the weave at the junction, deployed by the tip
        var r = CFG.rootColumnR + (reach - CFG.rootColumnR) * Math.pow(s, CFG.rootSplayPow);
        // the braid's turn, decaying to zero: rate is max at s=0, nil at s=1
        var th2 = a0 + unwind * Math.PI * 2 * (1 - (1 - s) * (1 - s));
        var y = -drop * Math.pow(s, CFG.rootDropPow);
        var x = Math.cos(th2) * r, z = Math.sin(th2) * r;
        /* crooked: a root kinks, it does not curve gracefully. Two octaves, both
           held near zero at the junction so the thread leaves the column cleanly
           and only goes gnarled once it is free of it. */
        var g = smoothstep(0.04, 0.45, s) * kAmp;
        x += noise(kPh, s * 3.1, 2.7) * g;
        y += noise(kPh, s * 3.1, 12.3) * g * 0.40;
        z += noise(kPh, s * 3.1, 22.9) * g;
        var gf = g * CFG.rootKinkFine;
        x += noise(kPh + 40, s * 12.5, 6.1) * gf;
        y += noise(kPh + 40, s * 12.5, 16.7) * gf * 0.45;
        z += noise(kPh + 40, s * 12.5, 26.3) * gf;
        pts.push(new T.Vector3(x, y, z));
      }
      paths.push(pts);
    }
    return paths;
  }

  /* ---------- THE CORD STRAND: a real-width ribbon ----------
     THREE.Line cannot be thickened — WebGL core profile ignores `linewidth`
     (that is why every thread has been a 1px hair), and the vendored bundle
     carries no Line2/LineMaterial. So a cord strand is a camera-facing ribbon:
     two vertices per sample, pushed apart along the screen-perpendicular of
     the strand's own tangent, with a soft cross-section so it reads as a
     round glowing filament rather than a flat tape.

     The billboard is done in VIEW space, where the camera sits at the origin —
     so the shader needs no camera uniform and nothing outside this file has to
     change (the film's orbit during the turn is handled for free). */
  function ribbonMaterial() {
    return new T.ShaderMaterial({
      uniforms: {
        uAlpha: { value: 1 },
        uMatte: { value: new T.Vector4(0, 0, 0, 0) },
        uRes2: { value: new T.Vector2(1, 1) },
        uMinPx: { value: 0.75 }
      },
      vertexShader: [
        'attribute vec3 aCol;',
        'attribute vec3 aTan;',
        'attribute float aSide;',
        'attribute float aHW;',
        'uniform vec2 uRes2;',
        'uniform float uMinPx;',
        'varying vec3 vC;',
        'varying float vS;',
        'void main(){',
        '  vC = aCol; vS = aSide;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vec3 tv = (modelViewMatrix * vec4(aTan, 0.0)).xyz;',
        '  vec3 vd = normalize(-mv.xyz);',          // camera is the origin in view space
        '  vec3 ax = cross(tv, vd);',
        '  float L = length(ax);',
        '  vec3 off = L > 1e-6 ? ax / L : vec3(1.0, 0.0, 0.0);',
        /* A world-space width goes sub-pixel once the strand is far enough
           away — and a sub-pixel ribbon does not render thin, it renders
           DASHED (it falls between sample points). That is what broke the
           canopy. Clamp the half-width to a minimum on-screen size, so a
           strand stays continuous at any camera distance the film reaches. */
        '  float pxPerWorld = projectionMatrix[1][1] * uRes2.y * 0.5 / max(-mv.z, 1e-4);',
        '  float hw = max(aHW, uMinPx / max(pxPerWorld, 1e-6));',
        '  mv.xyz += off * aSide * hw;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vC;',
        'varying float vS;',
        'uniform float uAlpha; uniform vec4 uMatte; uniform vec2 uRes2;',
        'void main(){',
        // round falloff across the strand: hot core, soft shoulder
        '  float e = max(1.0 - abs(vS), 0.0);',
        '  float prof = e * e * (3.0 - 2.0 * e);',
        '  vec3 c = vC * prof;',
        '  vec2 sc = gl_FragCoord.xy / uRes2;',
        '  if (sc.x > uMatte.x && sc.x < uMatte.z && (1.0 - sc.y) > uMatte.y && (1.0 - sc.y) < uMatte.w) { c *= 0.35; }',
        '  gl_FragColor = vec4(c * uAlpha, uAlpha);',
        '}'
      ].join('\n'),
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
      fog: false
    });
  }

  // 2 vertices per sample; sides and indices are static, the rest rides the frame
  function makeRibbon(N) {
    var V = N * 2, i;
    var pos = new Float32Array(V * 3), col = new Float32Array(V * 3),
        tan = new Float32Array(V * 3), side = new Float32Array(V), hw = new Float32Array(V);
    for (i = 0; i < N; i++) { side[i * 2] = -1; side[i * 2 + 1] = 1; }
    var idx = new Uint16Array((N - 1) * 6), k = 0;
    for (i = 0; i < N - 1; i++) {
      var a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx[k++] = a; idx[k++] = b; idx[k++] = c;
      idx[k++] = b; idx[k++] = d; idx[k++] = c;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('aCol', new T.BufferAttribute(col, 3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('aTan', new T.BufferAttribute(tan, 3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('aHW', new T.BufferAttribute(hw, 1).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('aSide', new T.BufferAttribute(side, 1));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    return { geo: geo, pos: pos, col: col, tan: tan, hw: hw, n: N };
  }

  // per-pixel ember sprite (repo law: never a Canvas2D gradient — Safari dithers)
  function emberTex() {
    var S = 64, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    var cx = cv.getContext('2d'), img = cx.createImageData(S, S), d = img.data;
    var x, y, p = 0;
    for (y = 0; y < S; y++) {
      for (x = 0; x < S; x++) {
        var dx = (x + 0.5) / S * 2 - 1, dy = (y + 0.5) / S * 2 - 1;
        var a = Math.pow(Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)), 2.4);
        d[p] = 255; d[p + 1] = 250; d[p + 2] = 235; d[p + 3] = Math.round(a * 255);
        p += 4;
      }
    }
    cx.putImageData(img, 0, 0);
    return new T.CanvasTexture(cv);
  }

  /* ---------- THE BILLOW: one merged, vertex-billboarded quad soup ----------
     A canopy billow is a camera-facing quad whose blob is drawn PROCEDURALLY in
     the fragment shader — a lobed radial falloff, seeded per billow so no two
     repeat. Three consequences worth having:
       · no texture at all, so Safari's Canvas2D gradient dithering (the law that
         shaped emberTex) cannot bite;
       · one draw call for the whole layer instead of one per sprite;
       · the lobes are analytic, so a billow stays soft at any camera distance
         instead of resolving into a blurred bitmap when the camera pulls back.
     Billboarding is done in VIEW space exactly as the ribbon does it, so nothing
     outside this file learns about the camera — including the stand-up roll. */
  function billowMaterial(additive) {
    return new T.ShaderMaterial({
      uniforms: {
        uAlpha: { value: 0 },
        uMatte: { value: new T.Vector4(0, 0, 0, 0) },
        uRes2: { value: new T.Vector2(1, 1) }
      },
      vertexShader: [
        'attribute vec2 aCorner;',
        'attribute vec2 aScale;',
        'attribute vec3 aCol;',
        'attribute float aRot;',
        'attribute float aSeed;',
        'attribute float aBloom;',   // per-billow visibility, written per frame
        'varying vec2 vQ; varying vec3 vC; varying float vS; varying float vB;',
        'void main(){',
        '  vQ = aCorner; vC = aCol; vS = aSeed; vB = aBloom;',
        // the quad grows from its centre in view space — the camera is the
        // origin there, so this billboards for free
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  float cs = cos(aRot), sn = sin(aRot);',
        '  vec2 q = vec2(aCorner.x * cs - aCorner.y * sn, aCorner.x * sn + aCorner.y * cs);',
        // a billow that has not bloomed yet is collapsed to nothing, so it costs
        // no fill: the scale IS the growth
        '  mv.xy += q * aScale * vB;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec2 vQ; varying vec3 vC; varying float vS; varying float vB;',
        'uniform float uAlpha; uniform vec4 uMatte; uniform vec2 uRes2;',
        'void main(){',
        // lobed radius — the billow is a cloud puff, not a disc
        '  float an = atan(vQ.y, vQ.x);',
        '  float lob = 1.0 + 0.20 * sin(an * 3.0 + vS) + 0.13 * sin(an * 5.0 - vS * 1.7);',
        '  float r = length(vQ) / lob;',
        '  if (r > 1.0) discard;',
        '  float e = 1.0 - r;',
        '  float f = e * e * (3.0 - 2.0 * e);',
        '  f *= f;',                       // a long soft shoulder — billows sum, never edge
        '  float a = f * vB * uAlpha;',
        '  vec3 c = vC;',
        '  vec2 sc = gl_FragCoord.xy / uRes2;',
        // bible law: type stays brightest — the canopy honours the text lane
        // exactly as every ribbon does
        '  if (sc.x > uMatte.x && sc.x < uMatte.z && (1.0 - sc.y) > uMatte.y && (1.0 - sc.y) < uMatte.w) { a *= 0.30; }',
        // the name keeps its ground: a feathered screen-space scrim, so the
        // canopy thins over the wordmark without drawing an edge of its own
        additive
          ? '  gl_FragColor = vec4(c * a, 1.0);'
          : '  gl_FragColor = vec4(c, a);',
        '}'
      ].join('\n'),
      transparent: true,
      blending: additive ? T.AdditiveBlending : T.NormalBlending,
      depthWrite: false,
      depthTest: false,
      side: T.DoubleSide,
      fog: false
    });
  }

  // 4 verts + 2 tris per billow; corners/indices static, the rest rides the frame
  function makeBillows(n) {
    var V = n * 4, i, q;
    var pos = new Float32Array(V * 3), cor = new Float32Array(V * 2),
        col = new Float32Array(V * 3), scl = new Float32Array(V * 2),
        rot = new Float32Array(V), sd = new Float32Array(V), bl = new Float32Array(V);
    var CQ = [-1, -1, 1, -1, -1, 1, 1, 1];
    for (i = 0; i < n; i++) {
      for (q = 0; q < 4; q++) {
        cor[(i * 4 + q) * 2] = CQ[q * 2];
        cor[(i * 4 + q) * 2 + 1] = CQ[q * 2 + 1];
      }
    }
    var idx = new Uint16Array(n * 6), k = 0;
    for (i = 0; i < n; i++) {
      var a = i * 4;
      idx[k++] = a; idx[k++] = a + 1; idx[k++] = a + 2;
      idx[k++] = a + 1; idx[k++] = a + 3; idx[k++] = a + 2;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aCorner', new T.BufferAttribute(cor, 2));
    geo.setAttribute('aCol', new T.BufferAttribute(col, 3));
    geo.setAttribute('aScale', new T.BufferAttribute(scl, 2));
    geo.setAttribute('aRot', new T.BufferAttribute(rot, 1));
    geo.setAttribute('aSeed', new T.BufferAttribute(sd, 1));
    geo.setAttribute('aBloom', new T.BufferAttribute(bl, 1).setUsage(T.DynamicDrawUsage));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    return { geo: geo, pos: pos, col: col, scl: scl, rot: rot, sd: sd, bloom: bl, n: n };
  }

  /* ═══════════════════ THE SYSTEM ═══════════════════ */
  function ThreadSystem(scene, G, spineCurve, forkDefs, C) {
    this.C = C;
    this.G = G;
    this.threads = [];
    this.group = new T.Group();
    scene.add(this.group);

    var rand = U.mulberry32(CFG.seed);
    this.noise = makeSimplex(U.mulberry32(CFG.seed * 3 + 7));
    var noise = this.noise;
    var N = CFG.sampleCount, CORD = CFG.cordCount;

    /* --- fork assignment, deterministic: ids 0..CORD-1 are the visible cord
       strands and NEVER fork; every deviation thread takes its own id above
       them (2 per cast deviation, 1 per cold-open/doctrine/crew fork), so the
       count follows the film's own fork census instead of a fixed constant.
       Each deviation also gets a CARRIER — the cord strand it hides inside
       until its fork point — spread round-robin so the seven strands each
       shed their share of branches. */
    var forkOwner = [], carrierOf = [], f, k, nextId = CORD;
    for (f = 0; f < forkDefs.length; f++) {
      var want = forkDefs[f].tagIdx !== undefined ? 2 : 1;
      forkDefs[f].threads = [];
      for (k = 0; k < want; k++) {
        forkOwner[nextId] = f;
        carrierOf[nextId] = f % CORD;
        forkDefs[f].threads.push(nextId);
        nextId++;
      }
    }
    var nLive = nextId;                    // 7 cord + 23 deviations = 30

    /* --- FILLER threads. Unfolding the tree (u = s, one path per thread) halves
       the canopy: a thread used to contribute TWO strands, one per half. These
       make the difference up. They are cord-carried for the whole band era —
       same braid path, same carrier-keyed shimmer, a sub-strand offset — and
       gated dark until the morph, so the timeline is visually untouched; they
       exist only to be branches of Yggdrasil.
       They are APPENDED as the highest ids, never interleaved: the construction
       loop draws rand() per thread, so inserting them anywhere earlier would
       shift every existing thread's draws and silently re-roll the whole band. */
    var fillerFrom = nextId;
    for (k = 0; k < CFG.fillerCount; k++) { carrierOf[nextId] = k % CORD; nextId++; }

    /* ── THE BRANCH TOTAL, frozen here ──────────────────────────────────────────
       NB is every thread that becomes a BRANCH. Roots are appended after it, and
       nothing tree- or canopy-side may ever observe the larger count. This is not
       a style point: the thread total feeds six readers, and each one would
       silently re-roll work already screened —
         · bakeTreePaths(n): its strided leaf pick is leaves[floor(pid*L/n)], so a
           different n hands EVERY branch a different leaf. The whole tree re-poses.
         · the ember anchor, the canopy floret anchor and the sparkle anchor all
           index threads[floor(rand()*n)] — different n, different picks, and some
           would land on roots, which point DOWN.
         · meanTreeAt() averages this.threads.length — roots would drag the crown
           centre and the crown billows down with them.
         · tune()'s live rebuild passes threadTotal straight back into buildCanopy.
       So every one of those reads NB, and only the per-frame update loop (which
       must draw roots) reads the full length. */
    var NB = nextId;

    var rootFrom = nextId;
    for (k = 0; k < CFG.rootCount; k++) { carrierOf[nextId] = k % CORD; nextId++; }

    var NT = nextId;
    this.forkDefs = forkDefs;
    this.cordCount = CORD;
    this.threadTotal = NT;
    this.branchTotal = NB;
    this.rootFrom = rootFrom;
    this.fillerFrom = fillerFrom;
    this.spine = spineCurve;               // kept so the braid can be relaid on a dial change

    /* tree strands: ONE path per thread now (the fold is gone — see the tree
       layout below). Note bakeTreePaths' strided leaf pick stops being a no-op
       the moment nPaths != 64: it is what keeps the paths spread across all 8
       limbs instead of leaving half the tree bald. */
    var paths = bakeTreePaths(NB, U.mulberry32(CFG.seed * 7 + 3), noise);
    // roots draw from their OWN stream, so tuning rootCount cannot disturb the tree
    var rootPaths = CFG.rootCount > 0
      ? bakeRootPaths(CFG.rootCount, U.mulberry32(CFG.seed * 29 + 11), noise) : [];

    /* THE TREE LIES DOWN (his note): it is baked exactly as before — growing +Y
       from a local origin — and then the SUMMED local point is rotated -90°
       about Z, (x,y,z) -> (y,-x,z), so the growth axis becomes +X. Rotating the
       sum rather than re-authoring the bake is deliberate: the trunk cable
       (which circles in the XZ plane with Y zeroed), the tip fray's Y-squash
       and the wobble all rotate coherently with the skeleton, and the tree's
       FORM is preserved bit-for-bit — which is what "keep its final form"
       requires. Root sits at the band's left end, so the earliest part of the
       threads is the bottom of the tree and the end of them is the canopy.
       G is deliberately NOT moved: it anchors the fork curves, the split
       flares and the eruption blast. */
    var ROOT = spineCurve.getPointAt(0);

    var up = new T.Vector3(0, 1, 0);
    var tmpT = new T.Vector3(), tmpS = new T.Vector3(), tmpU = new T.Vector3();

    for (var id = 0; id < NT; id++) {
      var isCord = id < CORD;
      var cordId = isCord ? id : carrierOf[id];
      var th = {
        id: id,
        isCord: isCord,
        isFiller: id >= fillerFrom && id < rootFrom, // hidden in the cord until the morph
        isRoot: id >= rootFrom,                     // grows DOWN, and stays thick
        cordId: cordId,                             // which strand it IS, or rides inside
        phaseI: (cordId / CORD) * Math.PI * 2,      // braid phase — shared with its carrier
        /* NB, not NT: phaseT drives the trunk cable twist, the sway and the colour
           pulse, so a changed divisor would silently re-pose every branch. Before
           roots existed NB == the old NT, so every branch keeps its exact phase;
           roots get their own even spread over their own count. */
        phaseT: (id < NB ? (id / NB) : ((id - rootFrom) / Math.max(1, CFG.rootCount))) * Math.PI * 2,
        shimmerOff: rand() * Math.PI * 2,
        brightScale: 0.90 + 0.20 * rand(),
        fork: forkOwner[id] !== undefined ? forkDefs[forkOwner[id]] : null,
        base: new Float32Array(N * 3),   // braided around the film's spine
        forkPts: null,                    // the same thread, gone off on its deviation
        tree: new Float32Array(N * 3),    // Yggdrasil pose (world coords, LYING along +X)
        pos: new Float32Array(N * 3),
        col: new Float32Array(N * 3),
        mu: new Float32Array(N)           // morph state per point (drives the width taper)
      };
      var r3 = rand();

      /* ---- linear (Sacred Timeline) layout: the recipe's braid, wound around
         the film's own drawn spine curve — now WOVEN.
         Two additions make it read as knitted rather than as a bundle of
         parallel helices: odd strands wind the OTHER way, so strands cross
         each other instead of running side by side; and each strand's radius
         breathes between the core and the rim, so at every crossing one strand
         is passing inside and the other outside. That is the over/under.
         A deviation thread uses its CARRIER's phase and wind, so it sits on
         the same helix — plus a fixed sub-strand offset that keeps it buried
         inside the carrier's thickness until it forks away. */
      var i, s;
      this.layoutBraid(th);

      // ---- the deviation: from its fork point on, this thread rides the
      // film's own fork curve (hug at the anchor, then diverging)
      if (th.fork) {
        th.forkPts = new Float32Array(N * 3);
        var ux = th.fork.ux, fc = th.fork.curve;
        var lane = 0.5 + 0.5 * ((th.fork.threads.indexOf(id) === 0) ? -1 : 1);
        for (i = 0; i < N; i++) {
          s = i / (N - 1);
          if (s <= ux) {
            th.forkPts[i * 3] = th.base[i * 3];
            th.forkPts[i * 3 + 1] = th.base[i * 3 + 1];
            th.forkPts[i * 3 + 2] = th.base[i * 3 + 2];
          } else {
            var fu = (s - ux) / Math.max(1e-6, 1 - ux);
            var fp = fc.getPointAt(clamp(fu, 0, 1));
            var spread = CFG.forkLaneSpread * (lane - 0.5) * 2 * smoothstep(0, 0.25, fu);
            th.forkPts[i * 3]     = fp.x;
            th.forkPts[i * 3 + 1] = fp.y + spread;
            th.forkPts[i * 3 + 2] = fp.z + spread * 0.6;
          }
        }
      }

      /* ---- Yggdrasil layout, UNFOLDED and LYING DOWN.
         The fold is gone: u = s, so the thread's earliest/left end is the
         bottom of the tree and its end is the canopy — one path per thread,
         read left to right. The cable twist, tip fray and per-point wisp are
         computed in the bake's own upright frame exactly as before, then the
         SUM is rotated -90° about Z so the whole thing lies along +X. */
      var pth = th.isRoot ? rootPaths[id - rootFrom] : paths[id];
      var fdx = rand() - 0.5, fdy = (rand() - 0.5) * 0.6, fdz = rand() - 0.5;
      var fl = Math.sqrt(fdx * fdx + fdy * fdy + fdz * fdz) || 1;
      fdx /= fl; fdy /= fl; fdz /= fl;
      for (i = 0; i < N; i++) {
        s = i / (N - 1);
        var u = s;
        var pi = Math.round(u * (N - 1));
        var pp = pth[pi < 0 ? 0 : (pi > N - 1 ? N - 1 : pi)];
        // the trunk is a TIGHT near-parallel column (a wider cable draws a
        // visible spindle outline at this strand count), opening as limbs leave
        var cable, twist, ox, oy, oz, fray, wob;
        if (th.isRoot) {
          /* nothing added here. The root's crookedness, its splay and its unwinding
             twist are all IN the path (bakeRootPaths) — that is what makes it read
             as the trunk's braid run backwards rather than a wobbled branch. The
             trunk cable and the tip fray below are branch grammar and would fight
             it. (An earlier pass added noise here on top of a smooth path; when the
             path became the un-braid, this became a leftover that referenced a
             retired dial — caught by grep, not by node --check, which cannot see an
             undefined CFG key.) */
          ox = 0; oy = 0; oz = 0;
        } else {
        cable = 0.045 * (1 - smoothstep(0.10, 0.30, u)) * smoothstep(0, 0.02, u);
        twist = th.phaseT + u * 7.0;
        ox = Math.cos(twist) * cable; oy = 0; oz = Math.sin(twist) * cable;
        fray = CFG.tipFrayAmount * smoothstep(0.68, 1, u) * (0.35 + 0.65 * r3);
        ox += fdx * fray; oy += fdy * fray; oz += fdz * fray;
        wob = 0.05 * smoothstep(0.25, 1, u);
        ox += noise(id * 0.37, u * 6.1, 7.7) * wob;
        oy += noise(id * 0.37, u * 6.1, 17.3) * wob;
        oz += noise(id * 0.37, u * 6.1, 27.9) * wob;
        }
        // local point, then Rz(-90): (x,y,z) -> (y,-x,z). Roots were baked along
        // -Y, so the same rotation puts them below the trunk — the stand-up
        // carries them for free, exactly as it does the canopy.

        var lx = pp.x + ox, ly = pp.y + oy, lz = pp.z + oz;
        th.tree[i * 3]     = ROOT.x + ly;
        th.tree[i * 3 + 1] = ROOT.y - lx;
        th.tree[i * 3 + 2] = ROOT.z + lz;
      }

      /* EVERY strand is now a real-width ribbon — cord and deviation alike.
         They differ only in half-width (cordHalfWidth vs forkHalfWidth, read
         live in buildRibbon), and both taper back to hair in the tree. */
      th.rib = makeRibbon(N);
      th.mat = ribbonMaterial();
      th.line = new T.Mesh(th.rib.geo, th.mat);
      th.geo = th.rib.geo;
      th.line.frustumCulled = false;
      th.line.renderOrder = isCord ? 1 : 0;
      this.group.add(th.line);
      this.threads.push(th);
    }

    // ---- split-point spark flare (R3 phase 3), one shared rig
    var PR = window.YggHinge ? window.YggHinge.PRUNE : { splitFlareCount: 5, splitFlareLength: 0.08 };
    var fpos = new Float32Array(PR.splitFlareCount * 6);
    var fgeo = new T.BufferGeometry();
    fgeo.setAttribute('position', new T.BufferAttribute(fpos, 3).setUsage(T.DynamicDrawUsage));
    var fmat = new T.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
    fmat.color.setRGB(2.2, 2.05, 1.47); // 0xFFEEAA x2.2, HDR so it blooms
    this.flare = { seg: new T.LineSegments(fgeo, fmat), geo: fgeo, mat: fmat, pos: fpos, n: PR.splitFlareCount };
    this.flare.seg.frustumCulled = false;
    this.flare.seg.visible = false;
    this.group.add(this.flare.seg);

    // ---- embers (R1 SETTLED): warm motes rising off the canopy
    var n = CFG.emberCount, epos = new Float32Array(n * 3), ecol = new Float32Array(n * 3);
    this.em = {
      pos: epos, col: ecol, n: n,
      base: new Float32Array(n * 3), colBase: new Float32Array(n * 3),
      life: new Float32Array(n), rise: new Float32Array(n),
      off: new Float32Array(n), seed: new Float32Array(n)
    };
    var eb = U.mulberry32(CFG.seed * 17 + 9);
    var MC = new T.Color(CFG.midColor), TC = new T.Color(CFG.tealColor);
    for (var e = 0; e < n; e++) {
      var et = this.threads[Math.floor(eb() * NB)];
      var canopy = eb() < 0.85;
      var eiRaw = canopy ? (0.45 + eb() * 0.54) : (eb() * 0.2);
      // sample the thread's TREE pose — unfolded, so u maps straight to the index
      var eIdx = Math.round(eiRaw * (N - 1));
      var e3 = e * 3;
      this.em.base[e3] = et.tree[eIdx * 3];
      this.em.base[e3 + 1] = et.tree[eIdx * 3 + 1];
      this.em.base[e3 + 2] = et.tree[eIdx * 3 + 2];
      this.em.life[e] = 5 + eb() * 4;
      this.em.rise[e] = 0.10 + eb() * 0.20;
      this.em.off[e] = eb() * this.em.life[e];
      this.em.seed[e] = eb() * 100;
      var mixT = eb() * 0.7 * (canopy ? 1 : 0.2), lum = 0.7 + 0.5 * eb();
      this.em.colBase[e3]     = (MC.r + (TC.r - MC.r) * mixT) * lum;
      this.em.colBase[e3 + 1] = (MC.g + (TC.g - MC.g) * mixT) * lum;
      this.em.colBase[e3 + 2] = (MC.b + (TC.b - MC.b) * mixT) * lum;
    }
    var egeo = new T.BufferGeometry();
    egeo.setAttribute('position', new T.BufferAttribute(epos, 3).setUsage(T.DynamicDrawUsage));
    egeo.setAttribute('color', new T.BufferAttribute(ecol, 3).setUsage(T.DynamicDrawUsage));
    this.em.geo = egeo;
    this.em.mat = new T.PointsMaterial({
      size: CFG.emberSize, map: emberTex(), vertexColors: true,
      blending: T.AdditiveBlending, transparent: true, depthWrite: false,
      opacity: 0, sizeAttenuation: true, fog: false
    });
    this.em.points = new T.Points(egeo, this.em.mat);
    this.em.points.frustumCulled = false;
    this.group.add(this.em.points);

    // ---- prune wisps (CONSUME r2): the sparks that fly away as a branch is
    // pruned — the people-pruning's signature element ("energy coming out of
    // the victim's body"). One shared Points pool; every wisp's BIRTH is the
    // moment the consume edge passes its own anchor on its branch, so the
    // whole system is a pure function of t and a seek lands identically.
    // The draw call only exists while a prune window is open (visible-by-t).
    this.wisp = null;
    var wn = PR.wispPerThread || 0, wisps = [];
    for (var wt = 0; wt < this.threads.length && wn > 0; wt++) {
      var wth = this.threads[wt];
      if (!wth.fork || !wth.fork.prune) continue;
      var wprT = PR.pruneTime * (1 + (U.hash01(wth.fork.idx * 7.7) - 0.5) * 2 * (PR.pruneSpeedVar || 0));
      for (var wk2 = 0; wk2 < wn; wk2++) {
        var wb = U.mulberry32(wth.fork.idx * 977 + wk2 * 31 + 5);
        var wsL = 0.06 + wb() * 0.88;   // where on the tail this wisp tears off
        var wIdx = Math.round((wth.fork.ux + wsL * (1 - wth.fork.ux)) * (N - 1)) * 3;
        /* r3: a VIOLENT scatter — sparks burst in all directions from the
           burning length (birth spread across the whole in-place devour) and
           the drive gives them gravity, so they arc and FALL like the show's. */
        var wAz = wb() * 6.283, wSp = (PR.wispBurst || 0.95) * (0.35 + wb() * 0.85);
        wisps.push({
          x: wth.forkPts[wIdx], y: wth.forkPts[wIdx + 1], z: wth.forkPts[wIdx + 2],
          birth: wth.fork.prune + (PR.warningFlashDuration || 0.15) + wprT * (0.12 + wb() * 0.72),
          vx: Math.cos(wAz) * wSp * 0.7,
          vy: wSp * (0.25 + 0.75 * wb()),
          vz: Math.sin(wAz) * wSp * 0.45,
          hue: wb(), seed: wb() * 100
        });
      }
    }
    if (wisps.length) {
      var wpos = new Float32Array(wisps.length * 3), wcol = new Float32Array(wisps.length * 3);
      var wgeo = new T.BufferGeometry();
      wgeo.setAttribute('position', new T.BufferAttribute(wpos, 3).setUsage(T.DynamicDrawUsage));
      wgeo.setAttribute('color', new T.BufferAttribute(wcol, 3).setUsage(T.DynamicDrawUsage));
      var wmat = new T.PointsMaterial({
        size: PR.wispSize || 0.07, map: emberTex(), vertexColors: true,
        blending: T.AdditiveBlending, transparent: true, depthWrite: false,
        opacity: 0.95, sizeAttenuation: true, fog: false
      });
      this.wisp = { list: wisps, pos: wpos, col: wcol, geo: wgeo, mat: wmat,
                    points: new T.Points(wgeo, wmat), t0: Infinity, t1: -Infinity };
      for (var wq = 0; wq < wisps.length; wq++) {
        if (wisps[wq].birth < this.wisp.t0) this.wisp.t0 = wisps[wq].birth;
        var wEnd = wisps[wq].birth + (PR.wispLife || 1.5);
        if (wEnd > this.wisp.t1) this.wisp.t1 = wEnd;
      }
      this.wisp.points.frustumCulled = false;
      this.wisp.points.visible = false;
      this.group.add(this.wisp.points);
    }

    // colour constants
    this.CC = new T.Color(CFG.coreColor);
    this.MC = MC;
    this.TC = TC;
    this.HC = new T.Color(CFG.hotColor);
    this.OC = new T.Color(CFG.rootOliveColor);   // the amber x foliage-teal bridge
    this.RT = new T.Color(CFG.rootTipColor);
    this.HW2 = Math.pow(CFG.wavefrontSoftness * 1.4, 2);
    this.castTips = [];

    this.canopy = null;
    if (CFG.canopyOn) this.buildCanopy(N, NB);
  }

  /* ---- THE CANOPY, generated from the threads' own tree poses.
     Every billow hangs off a real branch point, so the mass is clustered the way
     both reference plates are (lumpy, floret-like) instead of scattered through a
     volume — and it lands in the tree's own lying-down frame, which is what makes
     the camera's stand-up carry it for free.
     Its PRNG is a SEPARATE stream. The construction loops above draw rand() per
     thread, so borrowing that stream here would silently re-roll the whole band —
     the same law the filler threads are appended under. ---- */
  /* the tree's own mean position at a given u — measured off the baked poses, so
     every canopy anchor moves with a dial change to canopyRadius or to the
     L-system instead of drifting away from the tree it is supposed to dress. */
  ThreadSystem.prototype.meanTreeAt = function (u, N) {
    var i3 = Math.round(clamp(u, 0, 1) * (N - 1)) * 3, x = 0, y = 0, z = 0, i;
    /* BRANCHES ONLY. Roots grow the other way, so averaging them in would drag the
       crown centre and its billows down toward the ground. */
    var n = this.branchTotal || this.threads.length;
    for (i = 0; i < n; i++) {
      var tr = this.threads[i].tree;
      x += tr[i3]; y += tr[i3 + 1]; z += tr[i3 + 2];
    }
    return { x: x / (n || 1), y: y / (n || 1), z: z / (n || 1) };
  };

  /* tear the canopy down so a dial sweep can rebuild it live. Its geometry is
     BAKED (florets, positions, colours), unlike the gains and widths, so a dial
     that moves it needs a rebuild rather than a per-frame read — see tune(). */
  ThreadSystem.prototype.disposeCanopy = function () {
    var K = this.canopy;
    if (!K) return;
    var objs = [K.litMesh, K.capMesh, K.sp.pts];
    for (var i = 0; i < objs.length; i++) {
      this.group.remove(objs[i]);
      if (objs[i].geometry) objs[i].geometry.dispose();
      if (objs[i].material) objs[i].material.dispose();
    }
    this.canopy = null;
  };

  ThreadSystem.prototype.buildCanopy = function (N, NB) {   // NB = BRANCH total: the canopy must never anchor on a root
    var rb = U.mulberry32(CFG.seed * 23 + 5);
    var CCc = new T.Color(CFG.coreColor), MCc = new T.Color(CFG.greenColor),
        TCc = new T.Color(CFG.tealMidColor), BCc = new T.Color(CFG.blueColor);
    var i, k, th;

    /* FOLIAGE ON THE BRANCHES — his note: "the dome still doesn't extend all the
       way up the branches. A real tree has foliage all over the branches."

       The previous build shaped the mass as ONE bounded dome: every anchor was
       pulled toward a single centre by an asymptotic map that could never exceed
       canopyOuter, then dimmed by its radius from that centre. Raising the radius
       only made a bigger blob — and a blob has an OUTSIDE, so the branch tips
       stayed past it. The reach was capped BY CONSTRUCTION, not by any dial,
       which is why three separate tuning passes never moved it. The tell was in
       the same file the whole time: the sparkle layer never used the compression,
       and the sparkle always did reach the tips.

       So the compression and the radial bound are gone. A clump now sits exactly
       where its branch point is. The canopy's silhouette IS the branches'
       silhouette, and it reaches wherever they reach, because it rides them.

       What shapes it now is branch-local, and reads as botany rather than as
       geometry:
         · the trunk keeps a bare bole below canopyUStart — a real tree carries no
           foliage on its trunk;
         · clumps thin and shrink toward the twigs, so the outermost branches FRAY
           out of the mass instead of ending in a wall of leaves — which is what
           both reference plates show at their edges;
         · the junction law runs ALONG the branch (brightest where the foliage
           leaves its parent, fading outward). That is the bible's own wording;
           the radial version was a stand-in that dimmed the entire outer canopy
           to satisfy a law about branches. */
    var flor = [];
    for (i = 0; i < CFG.floretCount; i++) {
      th = this.threads[Math.floor(rb() * NB)];
      // spread along the WHOLE branch, not bunched at its end
      var fu = CFG.canopyUStart + (1 - CFG.canopyUStart) * Math.pow(rb(), CFG.foliageBias);
      var fbi = Math.round(fu * (N - 1)) * 3;
      flor.push({
        x: th.tree[fbi], y: th.tree[fbi + 1], z: th.tree[fbi + 2], u: fu,
        r: CFG.floretRadius * (0.62 + 0.76 * rb()) *
           (1 - CFG.foliageTipThin * smoothstep(0.70, 1, fu))
      });
    }
    // kept for diagnostics only — nothing positions off it any more
    this.crownC = this.meanTreeAt(0.62, N);

    /* One pass builds every billow record in index order off the one stream, so
       the partition below is a DIAL (capFraction can move without re-rolling a
       single position). The hash spreads the caps through the mass instead of
       banding them. */
    var recs = [], nCap = 0;
    for (i = 0; i < CFG.billowCount; i++) {
      var fq = flor[Math.floor(rb() * flor.length)];
      // a clump opens as a unit, with just enough spread that it unfurls rather
      // than switching on
      var u = clamp(fq.u + (rb() - 0.5) * 0.07, 0, 1);
      var px = fq.x + (rb() - 0.5) * 2 * fq.r;
      var py = fq.y + (rb() - 0.5) * 2 * fq.r;
      var pz = fq.z + (rb() - 0.5) * 2 * fq.r;
      // the junction law, along the branch: lit where it leaves its parent
      var edge = 1 - CFG.foliageTipFade * smoothstep(CFG.canopyUStart, 1.0, u);
      // green at the bole, teal through the body, blue at the rim — the leaves'
      // own ramp; the branches keep the screened gold->amber->teal underneath
      var g = smoothstep(CFG.canopyUStart, 1, u);
      var m1 = smoothstep(0, 0.45, g), m2 = smoothstep(0.42, 1, g);
      var cr = MCc.r + (TCc.r - MCc.r) * m1; cr += (BCc.r - cr) * m2;
      var cg = MCc.g + (TCc.g - MCc.g) * m1; cg += (BCc.g - cg) * m2;
      var cb = MCc.b + (TCc.b - MCc.b) * m1; cb += (BCc.b - cb) * m2;
      /* pools, not a wash. The approved credo's field is not one hue — it drifts
         green through teal to blue across the frame, and that internal variation
         is most of why it reads as weather rather than as a gradient. A per-billow
         tilt on the green/blue balance buys the same thing for free. */
      var hj = (rb() - 0.5) * 2 * CFG.domeHueJitter;
      cg *= 1 + hj * 0.45; cb *= 1 - hj;
      var isCap = (((i * 997) % 1000) / 1000) < CFG.capFraction;
      if (isCap) nCap++;
      recs.push({
        cap: isCap, x: px, y: py, z: pz, u: u,
        sc: (CFG.billowScale + rb() * CFG.billowScaleVar) *
            (1 - CFG.foliageTipThin * smoothstep(0.72, 1, u)),
        ar: 0.72 + rb() * 0.5,           // billows are wider than tall
        rot: rb() * 6.283, seed: rb() * 6.283,
        lum: edge * (0.70 + 0.52 * rb()),
        r: cr, g: cg, b: cb
      });
    }

    /* THE CROWN — the hot bloom where the trunk opens into the canopy. It is the
       brightest thing in the reference plate and the reason its canopy reads as
       lit from WITHIN; the tracery alone can only read as a lit outline. Carried
       on the lit mesh so it costs no extra draw call, and keyed to a low u so it
       ignites as the trunk arrives, ahead of the canopy it lights. */
    var TC0 = this.meanTreeAt(CFG.crownU, N);
    for (k = 0; k < CFG.crownCount; k++) {
      recs.push({
        /* keyed BELOW its own position, so the crown ignites while the trunk is
           still arriving — measured on the rig, it was lighting after the canopy
           it is supposed to be lighting, which reads as backwards. The source
           comes first, then what it lights. */
        cap: false, u: CFG.crownU - 0.05 + rb() * 0.08,
        x: TC0.x + (rb() - 0.3) * 2.2,
        y: TC0.y + (rb() - 0.5) * 1.8,
        z: TC0.z + (rb() - 0.5) * 1.8,
        sc: CFG.crownScale * (0.7 + rb() * 0.7),
        ar: 0.8 + rb() * 0.45,
        rot: rb() * 6.283, seed: rb() * 6.283,
        lum: (CFG.crownAlpha / CFG.billowAlpha) * (0.7 + rb() * 0.6),
        r: CCc.r, g: CCc.g, b: CCc.b
      });
    }

    var nLit = recs.length - nCap;
    var lit = makeBillows(nLit), cap = makeBillows(nCap);
    var litU = new Float32Array(nLit), capU = new Float32Array(nCap);
    var li = 0, pi = 0;
    for (i = 0; i < recs.length; i++) {
      var R = recs[i], M, mi, uu;
      if (R.cap) { M = cap; mi = pi++; uu = capU; } else { M = lit; mi = li++; uu = litU; }
      uu[mi] = R.u;
      for (k = 0; k < 4; k++) {
        var v = mi * 4 + k;
        M.pos[v * 3] = R.x; M.pos[v * 3 + 1] = R.y; M.pos[v * 3 + 2] = R.z;
        M.scl[v * 2] = R.sc; M.scl[v * 2 + 1] = R.sc * R.ar;
        M.rot[v] = R.rot; M.sd[v] = R.seed;
        // the dark caps carry ONE colour (they are shadow, not light); the lit
        // billows carry their own place on the ramp, pre-multiplied by their lum
        if (R.cap) {
          M.col[v * 3] = ((CFG.capColor >> 16) & 255) / 255;
          M.col[v * 3 + 1] = ((CFG.capColor >> 8) & 255) / 255;
          M.col[v * 3 + 2] = (CFG.capColor & 255) / 255;
        } else {
          M.col[v * 3] = R.r * R.lum; M.col[v * 3 + 1] = R.g * R.lum; M.col[v * 3 + 2] = R.b * R.lum;
        }
      }
      if (R.cap) { for (k = 0; k < 4; k++) cap.bloom[mi * 4 + k] = 0; }
    }

    var litMat = billowMaterial(true), capMat = billowMaterial(false);
    var litMesh = new T.Mesh(lit.geo, litMat), capMesh = new T.Mesh(cap.geo, capMat);
    litMesh.frustumCulled = false; capMesh.frustumCulled = false;
    // the glow sits BEHIND the tracery, the dark caps sit over both — his ruling
    // ("the dark limbs sit INSIDE a light mass") read as a render order
    litMesh.renderOrder = -2; capMesh.renderOrder = 3;
    this.group.add(litMesh); this.group.add(capMesh);

    /* SPARKLE — the magenta/violet specks, the reference's signature accent and
       the one thing in it that is unmistakably alive. Clustered on the outermost
       branch points, and igniting at the stillness exactly as the film's own
       blossoms do. Points with a procedural disc, so again no texture. */
    var SN = CFG.sparkleCount;
    var sp = new Float32Array(SN * 3), sc2 = new Float32Array(SN * 3),
        ss = new Float32Array(SN), sbl = new Float32Array(SN), su = new Float32Array(SN);
    var PC = new T.Color(CFG.blossomP), VC = new T.Color(CFG.blossomV);
    for (i = 0; i < SN; i++) {
      th = this.threads[Math.floor(rb() * NB)];
      var su2 = CFG.sparkleUStart + (1 - CFG.sparkleUStart) * Math.pow(rb(), 0.5);
      var si = Math.round(su2 * (N - 1)) * 3;
      sp[i * 3] = th.tree[si] + (rb() - 0.5) * 1.7;
      sp[i * 3 + 1] = th.tree[si + 1] + (rb() - 0.5) * 1.7;
      sp[i * 3 + 2] = th.tree[si + 2] + (rb() - 0.5) * 1.7;
      su[i] = su2;
      // pink and violet in alternation, a few burning near-white: the plate's
      // specks are not one colour
      var mixp = rb(), lum2 = 0.55 + rb() * 0.8;
      var pr = i % 2 ? PC.r : VC.r, pg = i % 2 ? PC.g : VC.g, pb = i % 2 ? PC.b : VC.b;
      if (mixp > 0.93) { pr = 1; pg = 1; pb = 0.96; lum2 *= 1.25; }
      sc2[i * 3] = pr * lum2; sc2[i * 3 + 1] = pg * lum2; sc2[i * 3 + 2] = pb * lum2;
      ss[i] = CFG.sparkleSize * (0.55 + rb() * 0.95);
    }
    var sgeo = new T.BufferGeometry();
    sgeo.setAttribute('position', new T.BufferAttribute(sp, 3));
    sgeo.setAttribute('aCol', new T.BufferAttribute(sc2, 3));
    sgeo.setAttribute('aSize', new T.BufferAttribute(ss, 1));
    sgeo.setAttribute('aBloom', new T.BufferAttribute(sbl, 1).setUsage(T.DynamicDrawUsage));
    var smat = new T.ShaderMaterial({
      uniforms: {
        uAlpha: { value: 0 },
        uMatte: { value: new T.Vector4(0, 0, 0, 0) },
        uRes2: { value: new T.Vector2(1, 1) }
      },
      vertexShader: [
        'attribute vec3 aCol; attribute float aSize; attribute float aBloom;',
        'uniform vec2 uRes2;',
        'varying vec3 vC; varying float vB;',
        'void main(){',
        '  vC = aCol; vB = aBloom;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  float pxPerWorld = projectionMatrix[1][1] * uRes2.y * 0.5 / max(-mv.z, 1e-4);',
        '  gl_PointSize = max(aSize * pxPerWorld * aBloom, 0.0);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vC; varying float vB;',
        'uniform float uAlpha; uniform vec4 uMatte; uniform vec2 uRes2;',
        'void main(){',
        '  float r = length(gl_PointCoord - vec2(0.5)) * 2.0;',
        '  if (r > 1.0) discard;',
        '  float e = 1.0 - r; float f = e * e * (3.0 - 2.0 * e); f *= f;',
        '  float a = f * vB * uAlpha;',
        '  vec2 sc = gl_FragCoord.xy / uRes2;',
        '  if (sc.x > uMatte.x && sc.x < uMatte.z && (1.0 - sc.y) > uMatte.y && (1.0 - sc.y) < uMatte.w) { a *= 0.30; }',
        // the name keeps its ground: a feathered screen-space scrim, so the
        // canopy thins over the wordmark without drawing an edge of its own
        '  gl_FragColor = vec4(vC * a, 1.0);',
        '}'
      ].join('\n'),
      transparent: true, blending: T.AdditiveBlending,
      depthWrite: false, depthTest: false, fog: false
    });
    var spts = new T.Points(sgeo, smat);
    spts.frustumCulled = false;
    spts.renderOrder = 4;
    this.group.add(spts);

    this.canopy = {
      lit: lit, cap: cap, litU: litU, capU: capU,
      litMat: litMat, capMat: capMat, litMesh: litMesh, capMesh: capMesh,
      sp: { geo: sgeo, mat: smat, pts: spts, bloom: sbl, u: su, n: SN }
    };
  };

  /* ---- the woven braid layout for ONE thread, around the film's own spine.
     Lifted out of the constructor so a dial change can relay it live without a
     page reload (see YggThreads.tune). Allocates — construction/relayout only,
     never per frame. ---- */
  ThreadSystem.prototype.layoutBraid = function (th) {
    var N = CFG.sampleCount, spineCurve = this.spine;
    var up = new T.Vector3(0, 1, 0);
    var tmpT = new T.Vector3(), tmpS = new T.Vector3(), tmpU = new T.Vector3();
    var windSign = (CFG.counterWind && (th.cordId % 2 === 1)) ? -1 : 1;
    var subR = th.isCord ? 0 : CFG.cordHalfWidth * 0.55;
    var subA = th.id * 2.399963;              // golden angle — even fill of the cross-section
    var subX = Math.cos(subA) * subR, subY = Math.sin(subA) * subR;
    var i, s, ang, braid, off1, off2, wr;
    for (i = 0; i < N; i++) {
      s = i / (N - 1);
      /* ROOTS RIDE ONLY THE BAND'S LEFT END (his note: the roots "spawn on screen
         when the timelines start turning into the tree, while they are supposed to
         be the timelines as well").
         A root's band pose used to span the whole 20-unit band while its tree pose
         sits at the far left — so when the morph lit it, it flew the width of the
         frame, and because roots are keyed to the front's LOW band it did so while
         everything else was still a timeline. That reads as spawning.
         Compressed to the leftmost rootBandSpan of the spine, a root instead
         unwinds OUT of the lit cord at the base — timeline becoming root, which is
         what it actually is. Scoped to isRoot: touching this for any other thread
         would re-pose all 60 branch band poses. */
      var sB = th.isRoot ? s * CFG.rootBandSpan : s;
      var bp = spineCurve.getPointAt(sB);
      var tan = spineCurve.getTangentAt(sB);
      tmpT.copy(tan).normalize();
      tmpS.crossVectors(tmpT, up); if (tmpS.lengthSq() < 1e-8) tmpS.set(0, 0, 1); tmpS.normalize();
      tmpU.crossVectors(tmpS, tmpT).normalize();
      // the weave: the strand's radius breathes core <-> rim along its length
      wr = CFG.braidRadius * (1 - CFG.weaveDepth *
           (0.5 - 0.5 * Math.cos(sB * CFG.weaveFrequency * Math.PI * 2 + th.phaseI * 1.7)));
      braid = CFG.braidAmplitude * Math.sin(sB * CFG.braidFrequency * Math.PI * 2 + th.phaseI);
      ang = th.phaseI + windSign * sB * Math.PI * 2 * CFG.braidWind;
      off1 = Math.cos(ang) * wr + braid * Math.sin(ang) + subX;
      off2 = Math.sin(ang) * wr + braid * Math.cos(ang) + subY;
      th.base[i * 3]     = bp.x + tmpS.x * off1 + tmpU.x * off2;
      th.base[i * 3 + 1] = bp.y + tmpS.y * off1 + tmpU.y * off2;
      th.base[i * 3 + 2] = bp.z + tmpS.z * off1 + tmpU.z * off2;
    }
  };

  /* ---- the film's own band-era alpha choreography, mirrored so the cards
     read exactly as they always did (evidence fade, the preTurn refill as
     the machine loses control, the ride-out into the reveal). ---- */
  ThreadSystem.prototype.bandAlpha = function (t, isFork) {
    var C = this.C, a = 1;
    if (t < C.wmStart - 0.5) return 0;
    if (t >= C.evidence) {
      if (isFork) {
        a = Math.max(0, 1 - (t - C.evidence) / 2);
        if (t > C.preTurn) a = Math.max(a, 0.85 * clamp((t - C.preTurn) / (C.turn - C.preTurn), 0, 1));
      } else {
        a = 0.4 + 0.1 * Math.sin(t * 2.1);
        if (t > C.preTurn) a += clamp((t - C.preTurn) / (C.turn - C.preTurn), 0, 1) * 0.6;
      }
    }
    return a;
  };

  /* ---- the morph clock: ONE wavefront, front runs over u (root→tip).
     The window is keyed off CUE.turn and lives in CFG (morphStartOff /
     morphEndOff) rather than as literals here, so the bloom's duration is a
     named dial. NOTE: ygg-hinge's orbitPose computes its OWN window from
     turn+2.9 → wm2+0.3; the two used to coincide by accident. They no longer
     do, deliberately — see the comment on morphStartOff. ---- */
  ThreadSystem.prototype.frontAt = function (t) {
    var C = this.C, w = CFG.wavefrontSoftness, mw = CFG.morphMainWeight;
    // the film's own two-segment spine envelope: most of the bloom, a hold,
    // then the last tenth. Monotone, and saturates exactly at 1.
    var a = smoothstep(C.turn + CFG.morphStartOff,    C.turn + CFG.morphEndOff,     t);
    var b = smoothstep(C.turn + CFG.morphTailStartOff, C.turn + CFG.morphTailEndOff, t);
    var raw = mw * a + (1 - mw) * b;
    return { raw: raw, front: -w + raw * (1 + 3 * w) };
  };

  // when the tree has finished forming — the anchor for anything that must not
  // start until it has (sway, embers) and for the camera's stand-up lag
  ThreadSystem.prototype.morphEnd = function () { return this.C.turn + CFG.morphEndOff; };

  ThreadSystem.prototype.update = function (t, matte, res) {
    var C = this.C, N = CFG.sampleCount, w = CFG.wavefrontSoftness;
    var noise = this.noise;
    var CC = this.CC, MC = this.MC, TC = this.TC, HC = this.HC, OC = this.OC, RT = this.RT;
    var PR = window.YggHinge ? window.YggHinge.PRUNE : null;
    /* the consume's palette, derived per frame from PRUNE so the hex dials stay
       LIVE (`YggHinge.PRUNE.burnColor = 0x...` from the console, no reload). */
    var prBnC = null, prRdC = null, prHkC = null;
    if (PR && PR.burnColor !== undefined) {
      prBnC = { r: ((PR.burnColor >> 16) & 255) / 255, g: ((PR.burnColor >> 8) & 255) / 255, b: (PR.burnColor & 255) / 255 };
      prRdC = { r: ((PR.residueColor >> 16) & 255) / 255, g: ((PR.residueColor >> 8) & 255) / 255, b: (PR.residueColor & 255) / 255 };
      prHkC = { r: ((PR.huskColor >> 16) & 255) / 255, g: ((PR.huskColor >> 8) & 255) / 255, b: (PR.huskColor & 255) / 255 };
    }

    var visible = t >= C.wmStart - 0.5 && t < C.stingClear + 1;
    this.group.visible = visible;
    if (!visible) return;

    var fr = this.frontAt(t);
    var front = fr.front;
    // the reveal's own heat, and the fade into the stinger
    var fadeAll = t > C.treeFade ? Math.max(0, 1 - (t - C.treeFade) / 1.9) : 1;
    // the stillness holds the cosmetic clock; it thaws across createdBy
    var still = t > C.still && t < C.createdBy;
    var thaw = smoothstep(0, 1.2, t - C.createdBy);
    var tEff = still ? C.still : (t >= C.createdBy ? C.still + (t - C.still) * thaw : t);
    /* stays keyed to wm2 on purpose. It looks like it should move to the morph's
       end now that the bloom is longer — but wm2 is where the FILM's own tree
       starts to breathe, and at wm2 it is only ~90-93% formed. The two-segment
       envelope above puts this tree at ~93% there too, so wm2 is exactly right:
       the canopy begins to sway while its last tenth is still opening. */
    var sway = smoothstep(C.wm2, C.settleStart, t);
    var flowT = tEff;

    /* the reveal front: outCubic over the fallback's own window, and a head that is
       forced to zero before the window closes so the whole term is exactly 1.0
       afterwards (see the CFG note). */
    var wpLive = false, wpFront = 1, wpHeadK = 0;
    if (CFG.wipeOn) {
      var wpT = (t - (C.wmStart + CFG.wipeStartOff)) / CFG.wipeDur;
      if (wpT < 1) {
        wpLive = true;
        var wpC = wpT <= 0 ? 0 : wpT;
        wpFront = 1 - Math.pow(1 - wpC, 3);
        wpHeadK = 1 - smoothstep(CFG.wipeHeadEnd, 1, wpT);
      }
    }

    var mSat = fr.raw >= 1;
    var heatK = Math.sin(Math.PI * fr.raw);

    var th, i, i3, s, u, mu, x, y, z, tx, ty, tz;
    for (var ti = 0; ti < this.threads.length; ti++) {
      th = this.threads[ti];
      var P = th.pos, COL = th.col;
      var isFork = !!th.fork;
      var alpha = this.bandAlpha(t, isFork);

      // ---- this thread's deviation state (grow / warn / dissolve / restore)
      var fk = 0, prMode = 0, prFront = 1, prFlash = 0, prPulse = -1, prAlive = 1;
      /* the consume's per-thread constants (2026-07-20): prRel/prTime let any
         point derive HOW LONG AGO the front passed it — from t alone, so a seek
         lands identically; prSplay is this thread's own unravel direction. */
      var prRel = 0, prTime = 0.75, prSplay = 0;
      if (isFork) {
        var F = th.fork;
        fk = clamp((t - F.t0) / 1.4, 0, 1);
        fk = fk * fk * (3 - 2 * fk);
        if (F.prune) {
          prRel = t - F.prune;
          prTime = PR ? PR.pruneTime * (1 + (U.hash01(F.idx * 7.7) - 0.5) * 2 * PR.pruneSpeedVar) : 0.75;
          prSplay = (U.hash01(F.idx * 3.37) - 0.5) * 2;
          if (t >= F.prune && t < C.turn + 0.35) {
            var ps = window.YggHinge.pruneState(t - F.prune, { redLine: 0, vGrow: 1, pruneTime: prTime });
            prMode = ps.mode; prFront = ps.front; prFlash = ps.flash; prPulse = ps.pulse;
            var dEnd = PR.warningFlashDuration + prTime;
            if (t - F.prune >= dEnd) { prMode = 5; prAlive = 0; }
            /* the split-point spark fires at THE TOUCH now (the baton's contact
               opens the consume), not at its completion — a person's pruning
               flashes when the stick lands. ps.flash is the touch window. */
            if (ps.flash > 0) this.fireFlare(th, ps.flash * 0.9);
          } else if (t >= C.turn + 0.35) {
            // ROOT: the pruned dead RE-GROW — a re-ignition front sweeps each
            // husk split→tip (the show's own finale: dead brown branches
            // re-greened in his hands), rippled across the seven so the tree
            // wakes organically rather than on one cue. prAlive is the FRONT
            // parameter here; the per-point sweep happens in the zone block.
            prMode = 5;
            /* his note: SLOWER — regrowth is the patient answer to the prune's
               violence. 1.8s per branch, rippled by up to 0.7s across the seven. */
            prAlive = smoothstep(0, PR.regrowTime || 1.8,
              t - C.turn - 0.35 - U.hash01(F.idx * 5.13) * (PR.regrowStagger || 0));
          }
        }
      }

      var overlapBase = 0.42;
      for (i = 0; i < N; i++) {
        i3 = i * 3;
        s = i / (N - 1);
        u = s;                         // unfolded: root at the thread's left end
        /* the BAND's cosmetics (shimmer amplitude, the two colour pulses) were
           tuned against the OLD symmetric parameter, and they are what the cord
           looks like — unfolding u re-patterned the whole cord (measured: 0.030
           against a 0.00099 noise floor). Keep the symmetric one for them; the
           morph, the tree and the growth front use the unfolded u. */
        var ub = Math.abs(s - 0.5) * 2;
        /* Roots finish before the canopy opens. Their whole length is compressed
           into the front's low band, so they crawl outward from the base while the
           trunk is still rising: roots -> trunk -> canopy. Only the MORPH parameter
           is remapped — u itself still means "position along the strand", so the
           colour ramp, the overlap compensation and the sway all stay honest. */
        var uM = th.isRoot ? s * CFG.rootFrontSpan : u;
        mu = 1 - smoothstep(front - w, front + w, uM);
        if (mSat) mu = 1;
        th.mu[i] = mu;                 // the ribbon reads this for its width taper

        /* the growth front, along the BRANCH's own length: fuB is 0 where the
           deviation leaves the cord and 1 at its tip, so the front sweeps
           outward from the sprout. Runs slightly past 1 so the tip lights
           fully at fk = 1. */
        var fuB = -1, gFront = 0, grown = 1;
        if (isFork) {
          var uxF = th.fork.ux;
          fuB = (s - uxF) / Math.max(1e-6, 1 - uxF);
          gFront = fk * (1 + CFG.growSoftness);
          if (fuB > 0) grown = 1 - smoothstep(gFront, gFront + CFG.growSoftness, fuB);
        }

        var pA = 1;
        // consume tints, applied in the colour pass
        var prEmber = 0, prVapor = 0, prHusk = 0, prRegrow = 0, prCool = 0;

        if (mu < 1) {
          // ── Sacred Timeline: the braid, its deviations, its prunes ──
          x = th.base[i3]; y = th.base[i3 + 1]; z = th.base[i3 + 2];
          // the branch is ALREADY in its final place — it is revealed outward
          // by the growth front above, not slid out of the braid as a unit
          if (isFork) {
            x = th.forkPts[i3]; y = th.forkPts[i3 + 1]; z = th.forkPts[i3 + 2];
          }
          // free-flowing shimmer, wilder away from the anchor (kept under the
          // braid radius, or the cord frays back into separate wires)
          // keyed on the CORD, not the thread: a deviation shimmers in lockstep
          // with the strand it is hiding inside, so it stays buried until it forks
          var na = CFG.noiseAmplitude * (0.35 + 0.65 * ub) * 0.30;
          y += noise(th.cordId * 0.61, x * 0.35, flowT * 0.32) * na;
          z += noise(th.cordId * 0.61 + 53.7, x * 0.35, flowT * 0.32 + 11.1) * na;

          // the prune on this deviation's own tail.
          // THE CONSUME r3 (2026-07-21, built against the ACTUAL FRAMES of
          // Mobius's pruning — his notes: dissolved IN PLACE, REDDER, VIOLENT).
          // The show's burn is a RAGGED RADIAL DEVOUR from the touch: the body
          // is replaced where it stands — no linear wipe. Each point here gets
          // its own ignition moment (radial-from-the-cut bias + heavy per-point
          // hash raggedness), burns as fire (red-orange driven HDR-white at the
          // core), crackles, disperses, leaves a brief deep-red residue shimmer
          // IN PLACE, then the husk scar. The TIP HOLDS OUT LONGEST — the face
          // goes last in every pruning the show ever shot.
          if (prMode > 0 && isFork && s > th.fork.ux) {
            var sL = (s - th.fork.ux) / Math.max(1e-6, 1 - th.fork.ux);
            var g = U.hash01(i * 7.31 + th.id * 3.7);   // this point's own fate
            /* when this point ignites/dies, in window units — pure f(t) */
            var igniteAt = sL * 0.45 + g * (PR.ragged || 0.3)
                         + (sL > 0.90 ? (PR.tipHold || 0.12) : 0);
            var dieAt = (PR.warningFlashDuration + prTime * (igniteAt + 0.30) / 1.5);
            var hAge = prRel - dieAt;
            if (hAge < 0) hAge = 0;
            var hk = Math.max(PR.huskFloor, PR.huskAlpha * Math.exp(-hAge / PR.huskFade));
            /* THE AFTERLIFE (r4) — one continuous curve per point, shared by
               mode 3 and mode 5 so NO boundary can pop: the residue enters at
               exactly the burn's exit level (0.2·granule), decays on a soft
               knee (resE), the husk eases IN underneath it (huskW) landing on
               exactly hk, the dispersal returns to the line under the
               residue's own dying alpha (the trip home is invisible), and the
               droop clock starts at HUSK birth, not death — the scar begins
               straight and sags from zero. */
            /* resT, NOT "RT": var hoists to function scope, and RT up top is the
               root-tip COLOR — r4 shadowed it with this number and every root
               processed after a fork read (0.5).r = undefined → NaN colours →
               NaN into bloom's half-float chain → the banded-black frame. */
            var resT = PR.residueTime || 0.5;
            var resE = 1 - smoothstep(0, resT, hAge);          // 1 at death → 0
            var huskW = smoothstep(resT * 0.6, resT + (PR.huskEase || 0.35), hAge);
            var gGran = U.hash01(i * 3.31 + th.id * 1.9);      // this point's crumble lot
            var droopK = 1 - Math.exp(-Math.max(0, hAge - resT) / 1.2);
            if (prMode === 2) {
              /* THE STRIKE: the baton lands. A violent whip-kink near the cut
                 for the flash's few frames — the branch takes the hit. */
              var jolt = prFlash * Math.exp(-(sL * sL) / 0.05) * 0.22;
              y += jolt * Math.sin(38 * sL + th.id * 3.1);
              z += jolt * 0.5 * Math.sin(31 * sL + th.id * 1.7);
            } else if (prMode === 3) {
              var dsK = 1 - prFront;                    // 0→1 over the window
              var pk = clamp((dsK * 1.5 - igniteAt) / 0.30, 0, 1);
              if (pk > 0 && pk < 1) {
                // BURNING — the crackle and the crumbling both graduate with
                // pk, so the burn EXITS at exactly the afterlife's entry state
                prEmber = Math.sin(Math.PI * pk);       // fire intensity (boost)
                prCool = smoothstep(0.7, 1, pk);        // the flame cools INTO the red
                pA = 1 - 0.8 * pk * pk;
                if (gGran < pk * 0.75) pA *= 0.38;      // organic crumbling, not stripes
                var ck = pk > 0.2 ? (1 - pk) : 0;       // the crackle dies with the point
                pA *= 1 - 0.38 * ck * (0.5 + 0.5 * Math.sin(t * 46 + g * 40.0));
                var dr = pk * (PR.disperseDrift || 0.16);
                x += noise(i * 0.83, th.id * 1.7, 15.2) * dr;
                y += noise(i * 0.83, th.id * 1.7, 3.3) * dr + pk * 0.03; // heat lifts
                z += noise(i * 0.83, th.id * 1.7, 8.9) * dr;
              } else if (pk >= 1) {
                // the afterlife (same shape as mode 5's — see the contract above)
                pA = 0.2 * resE * (gGran < 0.75 ? 0.38 : 1) + hk * huskW;
                prVapor = resE;
                prHusk = huskW;
                var am = (PR.disperseDrift || 0.16) * (1 + 0.9 * (1 - resE)) * Math.min(1, resE * 3);
                x += noise(i * 0.83, th.id * 1.7, 15.2) * am;
                y += noise(i * 0.83, th.id * 1.7, 3.3) * am
                   + (0.03 + 0.02 * (1 - resE)) * resE   // the lift dies with the light
                   - PR.huskSag * sL * droopK;
                z += noise(i * 0.83, th.id * 1.7, 8.9) * am;
              }
              /* pk <= 0: untouched — alive right up to its own ignition */
            } else if (prMode === 5) {
              // the SAME afterlife — a residue still in flight at dEnd finishes
              // here instead of snapping to char; the regrow lifts from
              // whatever the afterlife says.
              var after = 0.2 * resE * (gGran < 0.75 ? 0.38 : 1) + hk * huskW;
              var am5 = (PR.disperseDrift || 0.16) * (1 + 0.9 * (1 - resE)) * Math.min(1, resE * 3);
              var rk = 0;
              if (prAlive > 0) {
                var rSoft = PR.regrowSoft || 0.22;
                var rF = prAlive * (1 + 2 * rSoft) - rSoft;
                rk = smoothstep(sL, sL + rSoft, rF);
                prRegrow = Math.exp(-Math.pow((sL - rF) / rSoft, 2)) * (prAlive < 1 ? 1 : 0);
              }
              pA = after + (1 - after) * rk;
              prVapor = resE * (1 - rk);
              prHusk = huskW * (1 - rk);
              x += noise(i * 0.83, th.id * 1.7, 15.2) * am5 * (1 - rk);
              y += noise(i * 0.83, th.id * 1.7, 3.3) * am5 * (1 - rk)
                 + (0.03 + 0.02 * (1 - resE)) * resE * (1 - rk)
                 - PR.huskSag * sL * droopK * (1 - rk);
              z += noise(i * 0.83, th.id * 1.7, 8.9) * am5 * (1 - rk);
            }
          }
        } else { x = 0; y = 0; z = 0; }

        if (mu > 0) {
          // ── Yggdrasil ──
          tx = th.tree[i3]; ty = th.tree[i3 + 1]; tz = th.tree[i3 + 2];
          if (sway > 0) {
            /* the sway is authored for an UPRIGHT trunk — its strong component
               is lateral and its weak one runs along the trunk. The tree now
               lies along +X, so the same Rz(-90) that laid the tree down is
               applied to the sway vector: (x,y,z) -> (y,-x,z). Left unrotated
               the strong term would run ALONG the trunk and the branches would
               telescope in and out instead of swaying. */
            var amp = CFG.swayAmplitudeScale * Math.pow(u, 1.6) * 2.0 * sway;
            var swX = Math.sin(Math.PI * 2 * CFG.swayFrequency * flowT + th.phaseT * 1.7 + u * 3.1) * amp;
            var swZ = Math.sin(Math.PI * 2 * CFG.swayFrequency * flowT * 0.8 + th.phaseT * 2.3 + u * 2.2) * amp * 0.6;
            var swY = Math.sin(Math.PI * 2 * CFG.swayFrequency * flowT * 0.5 + th.phaseT + u * 4.0) * amp * 0.25;
            tx += swY; ty += -swX; tz += swZ;
          }
          if (mu >= 1) { x = tx; y = ty; z = tz; }
          else { x += (tx - x) * mu; y += (ty - y) * mu; z += (tz - z) * mu; }
        }
        P[i3] = x; P[i3 + 1] = y; P[i3 + 2] = z;

        // ---- colour: R1/R2's grammar verbatim ----
        // ub, not u: these are the CORD's sparkle, tuned before the unfold. In
        // the tree they are overwritten by the tree gradient at mu = 1 anyway.
        var pulse = 0.5 + 0.5 * Math.sin(ub * 13 - flowT * CFG.shimmerSpeed * 2.4 + th.shimmerOff);
        var pulse2 = 0.5 + 0.5 * Math.sin(ub * 31 + flowT * CFG.shimmerSpeed * 0.9 + th.shimmerOff * 2.3);
        var m1 = 0.20 + 0.40 * pulse;
        var cr = MC.r + (CC.r - MC.r) * m1;
        var cg = MC.g + (CC.g - MC.g) * m1;
        var cb = MC.b + (CC.b - MC.b) * m1;
        var bright = 0.40 + 0.55 * pulse * pulse2;

        if (mu > 0 && th.isRoot) {
          /* THE ROOT RAMP — his call: "darker, but still along the color of the
             trunk — maybe some sort of mix between amber and the colors of the
             foliage?" Amber at the junction, the amber x foliage-teal olive through
             the body, deep teal at the tip, the whole thing under rootDarken.
             Brightness peaks a little way OUT from the base (rootLitOut) rather
             than at it: the base already stacks trunk + crown + every root
             junction additively, and peaking there blows the highlight. */
          /* the ramp now STARTS at the trunk's own core colour, not at amber. His
             note: "the color and luminescence contrasts too much with the trunk".
             Beginning on CC means a root leaves the column in the column's own
             colour and only then drifts to the olive bridge — the junction is
             continuous, which is also what makes it read as flowing out rather
             than attached. */
          var q1 = smoothstep(0, 0.42, u), q2 = smoothstep(0.38, 1, u);
          var rr = CC.r + (OC.r - CC.r) * q1; rr += (RT.r - rr) * q2;
          var rg = CC.g + (OC.g - CC.g) * q1; rg += (RT.g - rg) * q2;
          var rb2 = CC.b + (OC.b - CC.b) * q1; rb2 += (RT.b - rb2) * q2;
          /* GRADIENT AT THE HINGE (his note: "apply a gradient luminescence for the
             trunk-root transition (on the roots themselves) so that it merges
             naturally"). This was backwards before: rLit ramped UP from zero over
             the first stretch, so a root was DIMMEST exactly where it meets the
             trunk — a seam at the one place that has to merge. That shape existed
             to avoid blowing the highlight where trunk, crown and every root
             junction stack; the thin neck (rootNeckWidth) now does that job
             instead, which is the better tool for it.
             So: full luminance at the junction, falling away along the root. The
             junction law as written, and it merges because the two ends of the
             transition now meet at the same brightness. */
          /* the ramp runs to rootLitEnd > 1, so it is still descending when the root
             ends: the eye never meets the place where the gradient lands, which is
             what a "clear junction" actually is. His note: extend it, make it more
             gradual. */
          var rLit = 1 - smoothstep(CFG.rootLitOut, CFG.rootLitEnd, u);
          var rBright = (CFG.rootTipLum + (1 - CFG.rootTipLum) * rLit) * CFG.rootDarken;
          cr += (rr - cr) * mu; cg += (rg - cg) * mu; cb += (rb2 - cb) * mu;
          bright += (rBright - bright) * mu;
        } else if (mu > 0) {  // warm gold core -> cool teal canopy
          var g1 = smoothstep(0, 0.32, u), g2 = smoothstep(0.34, 0.88, u);
          var tr = CC.r + (MC.r - CC.r) * g1; tr += (TC.r - tr) * g2;
          var tg = CC.g + (MC.g - CC.g) * g1; tg += (TC.g - tg) * g2;
          var tb = CC.b + (MC.b - CC.b) * g1; tb += (TC.b - tb) * g2;
          var pulseSlow = 0.5 + 0.5 * Math.sin(u * 7 - flowT * 0.55 + th.phaseT);
          var tBright = (0.46 + 0.42 * pulseSlow) * (1 - 0.15 * g2);
          cr += (tr - cr) * mu; cg += (tg - cg) * mu; cb += (tb - cb) * mu;
          bright += (tBright - bright) * mu;
        }

        // wavefront heat — the hot band riding the morph front
        if (heatK > 0.001) {
          /* The wavefront's ignition heat keys off u — a strand's GEOMETRIC position.
             Roots morph on uM (the compressed parameter), so the heat swept along
             them out of step with their own deployment and flared them hot white:
             measured colMax 1.052 at t=114.5, at mu=1, with the bright spot
             travelling s=0.39 -> 0.48 -> 0.73. That travelling flare is what read as
             spawning — not the geometry, and not the gain (both were checked first).
             So a root takes the heat on ITS parameter, and at a fraction of the
             strength: it is the old wood the growth came from, not the growth. */
          var dh = (th.isRoot ? uM : u) - front;
          var hot = Math.exp(-(dh * dh) / this.HW2) * heatK * (th.isRoot ? CFG.rootHeat : 1);
          if (hot > 0.003) {
            cr += (HC.r * 1.15 - cr) * hot;
            cg += (HC.g * 1.15 - cg) * hot;
            cb += (HC.b * 1.15 - cb) * hot;
            bright *= 1 + hot * (0.15 + CFG.wavefrontGlowBoost * 0.25);
          }
        }

        // the growing tip glows — a sprout pushing out, not a cut end sliding away
        if (isFork && fk < 1 && fuB > 0 && CFG.growTipHeat > 0) {
          var dT = fuB - gFront;
          var gh = Math.exp(-(dT * dT) / (CFG.growSoftness * CFG.growSoftness * 2.2)) * CFG.growTipHeat;
          if (gh > 0.004) {
            cr += (HC.r - cr) * gh * 0.7;
            cg += (HC.g - cg) * gh * 0.7;
            cb += (HC.b - cb) * gh * 0.7;
            bright *= 1 + gh * 0.5;
          }
        }

        // prune grammar colour: THE STRIKE — the whole limb takes the hit for
        // the flash's few frames, red-white hot (the violence is sudden and
        // total, not a polite local glow), while the position pass whips a
        // kink near the cut. Then the burn.
        if (prMode === 2 && isFork && s > th.fork.ux && prBnC) {
          if (prFlash > 0.003) {
            cr += (1.0 - cr) * prFlash * 0.9;
            cg += (0.78 - cg) * prFlash * 0.9;
            cb += (0.58 - cb) * prFlash * 0.9;
            bright *= 1 + 3.0 * prFlash;
          }
        }

        // the consume's colours (r3 — the frames' own grammar): FIRE at every
        // burning point — red-orange driven so hard the additive core reads
        // white with a red fringe, exactly the show's burning-paper rim ·
        // a brief DEEP-RED residue shimmer where the thread just died ·
        // charred husk after (dead things don't pulse — the husk flattens the
        // shimmer). The regrow front stays the film's own hot gold — life.
        if (prBnC) {
          if (prEmber > 0.003 || prCool > 0.003) {
            /* r4 continuity: the TINT holds at 0.9 as the flame cools into the
               residue red (fw), while the BOOST dies with the fire (prEmber) —
               so the death frame hands a 0.9-weighted red straight to the
               residue's own 0.9·resE. No neutral flash, no hue pop. */
            var fw = Math.max(prEmber, 0.9 * prCool);
            var fcr = prBnC.r + (prRdC.r - prBnC.r) * prCool;
            var fcg = prBnC.g + (prRdC.g - prBnC.g) * prCool;
            var fcb = prBnC.b + (prRdC.b - prBnC.b) * prCool;
            cr += (fcr - cr) * fw; cg += (fcg - cg) * fw; cb += (fcb - cb) * fw;
            bright *= 1 + (PR.burnBoost || 2.5) * prEmber;
          }
          if (prVapor > 0.003) {
            cr += (prRdC.r - cr) * prVapor * 0.9; cg += (prRdC.g - cg) * prVapor * 0.9; cb += (prRdC.b - cb) * prVapor * 0.9;
          }
          if (prHusk > 0.003) {
            cr += (prHkC.r - cr) * prHusk * 0.9; cg += (prHkC.g - cg) * prHusk * 0.9; cb += (prHkC.b - cb) * prHusk * 0.9;
            bright += (0.5 - bright) * prHusk;
          }
          if (prRegrow > 0.003) {
            cr += (HC.r - cr) * prRegrow; cg += (HC.g - cg) * prRegrow; cb += (HC.b - cb) * prRegrow;
            bright *= 1 + 1.6 * prRegrow;
          }
        }

        // additive-overlap compensation: bundled points dim, splayed full —
        // the trunk is still all 32 threads, so brightness follows local
        // bundling (by u), not the morph state
        var treeOv = overlapBase + 0.58 * smoothstep(0.10, 0.55, u);
        var overlap = overlapBase + (treeOv - overlapBase) * mu;
        // a fat ribbon and a 1px hair need different exposure for the same
        // read, and both need different exposure in the band than in the tree
        var gBand = th.isCord ? CFG.cordGain : CFG.bandGain;
        var gTree = th.isCord ? CFG.treeGainCord : CFG.treeGain;
        /* A root is never SEEN in the band — it is dark inside its carrier strand
           until the morph — so the band gain (2.6x the tree's) is meaningless for
           it and only shows up as a FLASH while it deploys: measured 1.136 at
           t=114.5 against 0.31 settled, i.e. brightest exactly while travelling,
           which is what reads as spawning. Roots therefore carry the tree gain the
           whole way and simply grow into view. */
        if (th.isRoot) gBand = gTree;
        var gain = gBand + (gTree - gBand) * mu;
        /* A deviation stays DARK while it is still inside its carrier strand,
           and lights up only where it has actually left the cord. Isolating
           the seven strands proved the riders were what put the speckle and
           the chromatic fringing back into the cord — they were being drawn
           full-length down the braid where nothing can read them as separate
           lines anyway. Released by mu, so the tree still gets every strand
           whole (killing it outright would gut Yggdrasil's inner branches). */
        var dep = 1;
        // filler threads exist only to be branches: hidden inside their carrier
        // strand for the whole band era, released by the morph itself
        // roots and fillers alike: hidden inside the carrier strand for the whole
        // band era, released only by the morph. Without this a root would paint a
        // fat strand straight into the Sacred Timeline.
        if (th.isFiller || th.isRoot) dep = mu;
        else if (isFork) {
          // dark inside the carrier strand, and beyond it only as far as the
          // growth front has reached
          dep = grown * smoothstep(th.fork.ux - 0.015, th.fork.ux + 0.05, s);
          dep = dep + (1 - dep) * mu;
        }
        /* THE REVEAL. Multiplied into `bright` (not added to fA) so it passes
           through `dep` — otherwise the head would light the deviation and root
           threads that are supposed to be dark inside the cord. */
        if (wpLive) {
          var wv = 1 - smoothstep(wpFront, wpFront + CFG.wipeSoft, s);
          if (wpHeadK > 0.001) {
            var hd = smoothstep(wpFront - CFG.wipeHead, wpFront, s) * wv;
            bright *= 1 + hd * CFG.wipeHeadGain * wpHeadK;
          }
          alpha *= wv;
        }
        var fA = bright * th.brightScale * overlap * gain * pA * alpha * fadeAll * dep;
        COL[i3] = cr * fA; COL[i3 + 1] = cg * fA; COL[i3 + 2] = cb * fA;
      }
      this.buildRibbon(th);
      th.mat.uniforms.uAlpha.value = 1;
      if (matte && matte.length === 4) th.mat.uniforms.uMatte.value.set(matte[0], matte[1], matte[2], matte[3]);
      else th.mat.uniforms.uMatte.value.set(0, 0, 0, 0);
      if (res) th.mat.uniforms.uRes2.value.copy(res);
    }

    // prune wisps: the energy leaving each dying branch. Visible only while a
    // consume window is open (pure-by-t flag — the draw call doesn't exist
    // outside the prune era, so no gate sees it at the turn or the credo).
    if (this.wisp && prBnC) {
      var wLive = t >= this.wisp.t0 - 0.05 && t <= this.wisp.t1 + 0.1;
      this.wisp.points.visible = wLive;
      if (wLive) {
        var WLIST = this.wisp.list, WP = this.wisp.pos, WCL = this.wisp.col;
        var wLife = PR.wispLife || 1.1;
        for (var wi2 = 0; wi2 < WLIST.length; wi2++) {
          var Wp = WLIST[wi2], w3 = wi2 * 3;
          var wAge = t - Wp.birth;
          if (wAge <= 0 || wAge >= wLife) {
            WCL[w3] = WCL[w3 + 1] = WCL[w3 + 2] = 0;
            WP[w3] = Wp.x; WP[w3 + 1] = Wp.y; WP[w3 + 2] = Wp.z;
            continue;
          }
          var wkk = wAge / wLife, wFade = Math.sin(Math.PI * wkk);
          // gravity: sparks arc and FALL, like every pruning the show shot
          WP[w3]     = Wp.x + Wp.vx * wAge + noise(Wp.seed, wAge * 0.7, 2.2) * 0.05;
          WP[w3 + 1] = Wp.y + Wp.vy * wAge - 0.55 * wAge * wAge;
          WP[w3 + 2] = Wp.z + Wp.vz * wAge + noise(Wp.seed, wAge * 0.7, 7.7) * 0.05;
          // fire cooling to deep red; a few sparks (hue > .8) carry the show's
          // iridescent interior as a magenta accent — the only survivor of the
          // nebula a 1px thread can't otherwise hold
          var wmx = Math.min(1, wkk * 1.5);
          var wr, wg2, wbl;
          if (Wp.hue > 0.8) { wr = 0.62; wg2 = 0.30; wbl = 0.55; }
          else {
            wr  = prBnC.r + (prRdC.r - prBnC.r) * wmx;
            wg2 = prBnC.g + (prRdC.g - prBnC.g) * wmx;
            wbl = prBnC.b + (prRdC.b - prBnC.b) * wmx;
          }
          var wl = wFade * (0.85 + 0.5 * Wp.hue);
          WCL[w3] = wr * wl; WCL[w3 + 1] = wg2 * wl; WCL[w3 + 2] = wbl * wl;
        }
        this.wisp.geo.attributes.position.needsUpdate = true;
        this.wisp.geo.attributes.color.needsUpdate = true;
      }
    }

    // embers ride the settled canopy
    // keyed to wm2 for the same reason as the sway above
    var settle = smoothstep(C.wm2, C.settleStart, t) * fadeAll;
    this.em.mat.opacity = 0.85 * settle;
    if (settle > 0.001) {
      for (var e2 = 0; e2 < this.em.n; e2++) {
        var e6 = e2 * 3;
        var age = (flowT + this.em.off[e2]) % this.em.life[e2];
        var kk2 = age / this.em.life[e2], fadeE = Math.sin(Math.PI * kk2);
        // embers rise along the TREE's axis (+X now that it lies down), so the
        // plume still reads as rising once the camera has stood the tree up
        this.em.pos[e6]     = this.em.base[e6] + age * this.em.rise[e2];
        this.em.pos[e6 + 1] = this.em.base[e6 + 1] + noise(this.em.seed[e2], flowT * 0.16, 1.7) * 0.35;
        this.em.pos[e6 + 2] = this.em.base[e6 + 2] + noise(this.em.seed[e2], flowT * 0.16, 9.4) * 0.35;
        this.em.col[e6]     = this.em.colBase[e6] * fadeE;
        this.em.col[e6 + 1] = this.em.colBase[e6 + 1] * fadeE;
        this.em.col[e6 + 2] = this.em.colBase[e6 + 2] * fadeE;
      }
      this.em.geo.attributes.position.needsUpdate = true;
      this.em.geo.attributes.color.needsUpdate = true;
    }
    if (!this._flareLive) { this.flare.mat.opacity = 0; this.flare.seg.visible = false; }
    this._flareLive = false;

    if (this.canopy) this.updateCanopy(t, front, fadeAll, flowT, matte, res);
  };

  /* ---- the canopy's frame. Pure f(t) like everything else here: a billow's
     whole state is a smoothstep of the SAME wavefront that places the tree
     points, offset by its own u — so a seek lands the canopy exactly where a
     watch-through would leave it, with nothing stored between frames.
     "A branch arrives, then it flowers": the lag is in u-space, not in seconds,
     which is why the bloom stays glued to the growth at any morph duration. ---- */
  ThreadSystem.prototype.updateCanopy = function (t, front, fadeAll, flowT, matte, res) {
    var K = this.canopy, C = this.C, i, k, b;
    var lag = CFG.bloomLag, soft = CFG.bloomSoft;

    // the dome and its dark caps ride the wavefront
    var nL = K.litU.length, nC = K.capU.length;
    for (i = 0; i < nL; i++) {
      b = smoothstep(K.litU[i] + lag, K.litU[i] + lag + soft, front);
      for (k = 0; k < 4; k++) K.lit.bloom[i * 4 + k] = b;
    }
    for (i = 0; i < nC; i++) {
      /* the caps trail their own light a little further: shadow cannot precede
         the mass it is cast in, and the delay is what makes the dome resolve
         from haze INTO cloud instead of arriving pre-textured. */
      b = smoothstep(K.capU[i] + lag * 1.8, K.capU[i] + lag * 1.8 + soft * 1.3, front);
      for (k = 0; k < 4; k++) K.cap.bloom[i * 4 + k] = b;
    }
    K.lit.geo.attributes.aBloom.needsUpdate = true;
    K.cap.geo.attributes.aBloom.needsUpdate = true;
    K.litMat.uniforms.uAlpha.value = CFG.billowAlpha * fadeAll;
    K.capMat.uniforms.uAlpha.value = CFG.capAlpha * fadeAll;

    /* SPARKLE ignites at the stillness and swells to the credo — the film's own
       blossom grammar ("ignite at the stillness"), which is also the only beat
       in the piece that wants more, not less. Gated by the wavefront too, so a
       speck can never light on a branch that has not grown yet. */
    var ign = smoothstep(C.settleStart, C.still, t);
    if (ign > 0) ign *= 0.72 + 0.28 * smoothstep(C.still, C.createdBy, t);
    K.sp.mat.uniforms.uAlpha.value = CFG.sparkleAlpha * fadeAll;
    if (ign > 0.001) {
      for (i = 0; i < K.sp.n; i++) {
        var w = smoothstep(K.sp.u[i] + lag, K.sp.u[i] + lag + soft, front);
        // each speck breathes on its own phase — a canopy that twinkles reads as
        // alive; one that sits still reads as a texture
        var tw = 0.62 + 0.38 * Math.sin(flowT * 2.1 + i * 1.7);
        K.sp.bloom[i] = w * ign * tw;
      }
    } else {
      for (i = 0; i < K.sp.n; i++) K.sp.bloom[i] = 0;
    }
    K.sp.geo.attributes.aBloom.needsUpdate = true;

    /* the film's own text lane (uMatte — bible law, type stays brightest) and the
       resolution the point-size maths needs. The name's own scrim is GONE; see
       the CFG note. The card-text matte stays: it protects the cast/crew type
       over a thin band where the canopy does not reach, and it was never the
       thing that punched a hole in the foliage. */
    var mv = (matte && matte.length === 4) ? matte : null;
    var mats = [K.litMat, K.capMat, K.sp.mat];
    for (i = 0; i < 3; i++) {
      var un = mats[i].uniforms;
      if (mv) un.uMatte.value.set(mv[0], mv[1], mv[2], mv[3]);
      else un.uMatte.value.set(0, 0, 0, 0);
      if (res) un.uRes2.value.copy(res);
    }
  };

  /* ---- expand a cord strand's centreline into its camera-facing ribbon.
     Tangent by central difference (forward/backward at the ends); the width
     tapers from cord to hair on the strand's own morph state, so the band is
     thick and Yggdrasil stays the filigree he screened. The billboarding
     itself happens in the vertex shader — this only feeds it. ---- */
  ThreadSystem.prototype.buildRibbon = function (th) {
    var N = CFG.sampleCount, P = th.pos, COL = th.col, MU = th.mu, R = th.rib;
    var rp = R.pos, rc = R.col, rt = R.tan, rw = R.hw;
    // read live so thickness stays a dial (YggThreads.tune)
    var hwB = th.isCord ? CFG.cordHalfWidth : CFG.forkHalfWidth;
    var isRt = th.isRoot;
    var i, i3, a, b, ax, ay, az, L, hw, v0, v1;
    for (i = 0; i < N; i++) {
      i3 = i * 3;
      a = (i > 0 ? i - 1 : i) * 3;
      b = (i < N - 1 ? i + 1 : i) * 3;
      ax = P[b] - P[a]; ay = P[b + 1] - P[a + 1]; az = P[b + 2] - P[a + 2];
      L = Math.sqrt(ax * ax + ay * ay + az * az);
      if (L > 1e-9) { ax /= L; ay /= L; az /= L; } else { ax = 1; ay = 0; az = 0; }
      /* Every other strand tapers to treeHalfWidth (0.002 — hair) as it becomes
         the tree. A root cannot: it is the thick thing. So a root tapers along its
         OWN length instead of by morph state, from rootHalfWidth at the junction to
         rootTipWidth at the tip — thinner toward the ends, never filament. */
      if (isRt) {
        /* GIRTH CONTINUITY AT THE HINGE (his note: the trunk/root junction "looks
           funnelled"). 16 roots at full thickness all converging on one narrow
           column made the ropes four times wider than the column they came out of —
           a step in width, which reads as a funnel.
           So a root leaves the weave at a CORD STRAND's width (it is one), swells to
           its full thickness once clear of the column, then tapers to its tip.
           thin -> thick -> thin, anchored to the trunk's own strand width. */
        var sR = i / (N - 1);
        var k1 = smoothstep(0, CFG.rootSwellAt, sR);
        var k2 = smoothstep(CFG.rootSwellAt, 1, sR);
        hw = CFG.rootNeckWidth + (CFG.rootHalfWidth - CFG.rootNeckWidth) * k1;
        hw = hw + (CFG.rootTipWidth - hw) * k2;
      } else {
        hw = hwB + (CFG.treeHalfWidth - hwB) * MU[i];
      }
      v0 = i * 6; v1 = v0 + 3;
      rp[v0] = P[i3]; rp[v0 + 1] = P[i3 + 1]; rp[v0 + 2] = P[i3 + 2];
      rp[v1] = P[i3]; rp[v1 + 1] = P[i3 + 1]; rp[v1 + 2] = P[i3 + 2];
      rt[v0] = ax; rt[v0 + 1] = ay; rt[v0 + 2] = az;
      rt[v1] = ax; rt[v1 + 1] = ay; rt[v1 + 2] = az;
      rc[v0] = COL[i3]; rc[v0 + 1] = COL[i3 + 1]; rc[v0 + 2] = COL[i3 + 2];
      rc[v1] = COL[i3]; rc[v1 + 1] = COL[i3 + 1]; rc[v1 + 2] = COL[i3 + 2];
      rw[i * 2] = hw; rw[i * 2 + 1] = hw;
    }
    R.geo.attributes.position.needsUpdate = true;
    R.geo.attributes.aCol.needsUpdate = true;
    R.geo.attributes.aTan.needsUpdate = true;
    R.geo.attributes.aHW.needsUpdate = true;
  };

  ThreadSystem.prototype.fireFlare = function (th, amp) {
    var F = th.fork, N = CFG.sampleCount;
    var si = Math.round(F.ux * (N - 1)) * 3;
    var px = th.pos[si], py = th.pos[si + 1], pz = th.pos[si + 2];
    var PR = window.YggHinge.PRUNE;
    for (var k = 0; k < this.flare.n; k++) {
      var az = U.hash01(F.idx * 31.7 + k * 7.3) * 6.283;
      var el = (U.hash01(F.idx * 13.9 + k * 3.1) - 0.5) * 3.1416;
      var dx = Math.cos(az) * Math.cos(el), dy = Math.sin(el), dz = Math.sin(az) * Math.cos(el);
      var L = PR.splitFlareLength * (0.6 + 0.8 * U.hash01(F.idx * 5.3 + k * 11.1)) * (0.4 + 0.6 * amp);
      var k6 = k * 6;
      this.flare.pos[k6] = px + dx * 0.01; this.flare.pos[k6 + 1] = py + dy * 0.01; this.flare.pos[k6 + 2] = pz + dz * 0.01;
      this.flare.pos[k6 + 3] = px + dx * L; this.flare.pos[k6 + 4] = py + dy * L; this.flare.pos[k6 + 5] = pz + dz * L;
    }
    this.flare.geo.attributes.position.needsUpdate = true;
    this.flare.mat.opacity = amp;
    this.flare.seg.visible = true;
    this._flareLive = true;
  };

  window.YggThreads = {
    CFG: CFG,
    inst: null,
    create: function (scene, G, spineCurve, forkDefs, C) {
      this.inst = new ThreadSystem(scene, G, spineCurve, forkDefs, C);
      return this.inst;
    },
    /* Task 3: reused verbatim by ygg-cosmos.js's nebula layer so "same billow
       grammar" is true by construction, not resemblance — same shader, same
       merged-geometry constructor, just fed different CFG numbers at sky scale. */
    billowMaterial: billowMaterial,
    makeBillows: makeBillows,
    /* QA dial hook (flag-gated file, so it exists only under ?ygg=1).
       NOTE on roots: their LOOK dials (rootDarken, rootLitOut, rootHalfWidth,
       rootTipWidth and the three colours) are read per frame and land live. Their
       GEOMETRY dials (rootCount/rootSpread/rootSplayPow/rootUnwind/rootDrop/…) are
       baked in the constructor, not in buildCanopy, so they need a page reload —
       they are deliberately NOT in the CANOPY list below, which would rebuild the
       canopy and leave the roots untouched while looking like it had worked.
       Gains and widths are read fresh every frame, so they land immediately;
       anything that changes the braid ITSELF needs the layout relaid, which
       this does. Lets thickness/luminance/weave be judged without a reload.
         YggThreads.tune({ cordHalfWidth: 0.03, cordGain: 3.4 }) */
    tune: function (o) {
      var k, relay = false;
      var GEOM = { braidRadius: 1, braidAmplitude: 1, braidFrequency: 1, braidWind: 1,
                   weaveFrequency: 1, weaveDepth: 1, counterWind: 1, cordHalfWidth: 1 };
      var CANOPY = { billowCount: 1, billowScale: 1, billowScaleVar: 1, capFraction: 1,
                     canopyUStart: 1, foliageBias: 1, foliageTipThin: 1,
                     foliageTipFade: 1, domeHueJitter: 1,
                     floretCount: 1, floretRadius: 1, crownCount: 1, crownScale: 1,
                     crownAlpha: 1, crownU: 1, sparkleCount: 1, sparkleSize: 1,
                     sparkleUStart: 1, blueColor: 1, greenColor: 1, tealMidColor: 1,
                     capColor: 1, blossomP: 1,
                     blossomV: 1, canopyOn: 1 };
      var recan = false;
      for (k in o) if (o.hasOwnProperty(k)) {
        CFG[k] = o[k];
        if (GEOM[k]) relay = true;
        if (CANOPY[k]) recan = true;
      }
      if (relay && this.inst) {
        for (var i = 0; i < this.inst.threads.length; i++) this.inst.layoutBraid(this.inst.threads[i]);
      }
      if (recan && this.inst) {
        this.inst.disposeCanopy();
        if (CFG.canopyOn) this.inst.buildCanopy(CFG.sampleCount, this.inst.branchTotal);
      }
      return CFG;
    }
  };
})();
