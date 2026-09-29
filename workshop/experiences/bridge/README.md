# The Bridge workshop exhibit

This is a runtime-only copy of the root **The Bridge** film. No files from the
separate Loki project are included. `source-manifest.json` records each copied
file's original size and SHA-256 before the embedding changes.

The original screenplay, chapter timing, portals, score cues, and credits remain
in the film. The added transport holds its first frame until the workshop
starts playback through the open portal. The film and score then continue
uninterrupted as the camera crosses. The copied audio transport also respects a pause
during a late score load and does not resume independently on tab visibility.
The original optional QA beacon and its Netlify form are omitted.

Serve this directory over HTTP with byte-range support for the Opus score.
Preload a same-origin iframe at its final viewport dimensions, hidden using
visibility/opacity. Do not use a zero-size frame: the film splits text lines at
boot. If dimensions change before first playback, the zero-time build is re-split
once at its actual playback size, after restored text layout and its computed
fonts finish loading; the clock and audio stay held during that wait. Midfilm
typography is never rebuilt. Its
animation ticker sleeps until `arm()` to avoid competing with the
workshop renderer. Include `allow="autoplay; fullscreen"` on the iframe.

## Parent contract

`iframe.contentWindow.__WORKSHOP_BRIDGE` exposes:

- `ready`: Promise resolving to the API after embedded fonts and the film initialize; rejects on
  missing local scripts or WebGL initialization failure.
- `arm(muted)`: call **synchronously inside a trusted click**, after `ready`.
  Arms audio immediately, prepares the timeline within the original 900 ms
  loading window, and leaves the film paused at zero. Returns a snapshot Promise.
  Calling while fonts are loading primes the audio module immediately, then
  waits for readiness. A late non-gesture call may require the viewer's explicit
  start button inside the frame.
- `play({preview:true})`: start/resume the actual film and score through the
  portal while its native controls stay hidden. Returns a snapshot Promise.
  Internal rotation/reflow resumption preserves this preview state.
- `present()`: reveal native controls when the camera crosses; returns a snapshot
  (or waits for readiness). Does not play, pause, resume, seek or restart sound.
- `play()`: normal start/resume with controls revealed, retaining the original
  standalone and explicit-retry behavior. If sound is blocked, pauses the clock
  and soundtrack and presents native start/muted
  buttons. Portrait touch viewports and portrait windows at most 700 px wide
  hold at zero behind the rotate-to-watch gate until landscape.
- `pause()`: pauses the soundtrack and timeline together.
- `setMuted(boolean)`: synchronizes sound and the native mute control.
- `dispose()`: stops sound, animation and renderer; then the parent must remove
  the iframe to release its document and remaining event handlers.
- `snapshot()`: readiness, preparation, state, current time, duration, mute, preview,
  rotate gate, narrative layout dimensions and audio diagnostics. Getters `state`, `currentTime`, `duration`
  expose the common fields directly.

Child messages have `{source:'workshop-bridge', type, ...}`. Types are `ready`,
`armed`, `state`, `ended`, `needs-gesture`, `error`, `return`, and `disposed`.
The parent must validate both `event.source === iframe.contentWindow` and
`event.origin === location.origin`. Return/Escape pauses before sending `return`.
No inbound message commands are accepted. Native automatic fullscreen is bypassed.

Do not return automatically on `ended`: it preserves the authored post-credits
scene with its quiet looping score and portal. The viewer chooses when to return.
Keep the workshop renderer running during the doorway preview and traversal;
pause it once the film owns the full screen.

## Validation and provenance

`node transport.test.cjs` uses the actual copied audio module with simulated
media to check arm/hold (including an early score cue), delayed score readiness,
visibility, resume, rearm and dispose. `node layout.test.cjs` checks the actual
source helpers for the portrait gate, font-readiness/audio hold and one-time
zero-frame reflow. `node preview.test.cjs` checks running preview playback,
presentation without transport changes, internal-resume ownership, and public
API option forwarding. These checks are not browser typography, autoplay or
real-device sound validation.

The local reference score is included to preserve this local viewing experience;
this copy does not grant or imply public music-distribution rights. Music and
SFX attribution remains in the original credits and `assets/audio/CREDITS.md`.
No deployment is performed by this directory or its adapter.

## Soundtrack selection

Only the supplied `score-local.opus` soundtrack is used. There is no backup song
and no late substitution. The project click primes this one stable player
silently; playback uses the same authorized element. A file/decode failure
returns an explicit loading error through the host instead of another song.
