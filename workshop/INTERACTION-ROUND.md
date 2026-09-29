# Workshop interaction round — 2026-09-27

Target: `/Users/lorenzocolombani/.codex/worktrees/773a/LorenzoColombani.github.io`.
Current local Garage / Workshop 2.0. No deployment requested in this round.

Work in sequence. Finish and verify each item before starting the next.

## 1. Flick to the Staging Area

The Staging Area is the table hologram receiving the launched card. A short,
deliberate flick in its general direction should leave the fingers/pointer
immediately and carry its momentum into the flight, without snapping back.
Slow rearrangement, selection taps, pauses, cancelled gestures, and throws away
from the table must remain safe. Keep the explicit launch button and existing
Bridge/Loki destinations. Preserve reduced-motion behavior and audio unlocking.

- [x] Use recent movement through pointer release, tolerating normal lift-off delay.
- [x] Accept broad directional flicks; precise aim and dragging all the way are unnecessary.
- [x] Keep release position and momentum continuous into the launch animation.
- [x] Automated pointer/intent regressions and desktop browser launch/return check.

Verified: 20 focused gesture/motion/Bridge tests pass. Actual pointer-handler test sends a short touch flick once, primes the experience in the release gesture, and restores the card position. Browser launch remains functional. Lorenzo tested the local flick and answered **“Yes, noticeably better.”**

## 2. Mobile and responsive experience

After item 1, inspect the actual phone/short-screen layouts and fix the main
navigation, Products interaction, control placement, and return paths. Retain
the holographic visual treatment. Avoid turning the experience into tiny scaled
desktop controls. Browser viewport checks are not physical touchscreen proof.

- [x] Focused portrait and landscape audit of landing, desk, Products, and staging.
- [x] Repair observed responsive problems, then verify each affected flow.

## 3. Remaining project experiences — waiting for Lorenzo's instructions

Loki and Bridge already have authored experiences. Upgrading the other cards is
a separate mini run; do not start importing or redesigning them in this round.

Assumptions: a flick is intentional motion toward the Staging Area; generic
cards keep their existing destinations for now. Physical-device approval of
the feel remains a user check. Use existing scene/gesture assets, no new library.

## Responsive checkpoint

- Real holographic cards now face the viewer and fit a reserved screen rectangle.
  Tall phones show four; small phones and short landscape show two; tablets reflow
  to six. The Staging Area stays visible. The desktop six-card composition stays.
- Proper card/title texture proportions, larger readable text, at least 44px launch
  targets, full-size paging, compact header, safe-area spacing, and shorter room help.
- Selection/page anchor survives rotation; orbit distance adapts even if resized
  while Products is focused. A visible Return button supplements staging gestures.
- Loki plays in portrait with a contained picture and quicker return. Bridge keeps
  a stable landscape document inside its portrait player, with native-sized
  pause/play, mute and return controls. Rotation does not restart its film.
- Browser checked: phone entry/navigation/Products, paging, generic details/return,
  small-phone and short-landscape layouts, Loki portrait play/return, Bridge
  portrait play/pause/mute/rotation/return. No observed runtime errors.
- 67 tests passed, including actual card pointer handlers, layout sizes, sky fit,
  Bridge lifecycle and the existing embedded-film suites. Physical phones remain
  unverified; narrow browser views and simulated pointer events are not hardware tests.

Local release: `interaction-round-1`. No deployment or independent Claude-repo sync.
The remaining project content has not been upgraded; waiting for Lorenzo's brief.
