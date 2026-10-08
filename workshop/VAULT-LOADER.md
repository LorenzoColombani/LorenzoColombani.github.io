# Reactor vault loading sequence · 8 October 2026

Approved scope: replace the initial loading overlay with an elaborate original
arc-reactor mechanism that rotates, releases locks, and opens a heavy vault onto
the Garage. The reactor is the single entry control; the former secondary
welcome/Enter screen is removed. Preserve the site-preview experience, ribbon,
authored films and room.

The loader appears immediately using inline SVG and CSS, independent of WebGL.
Its loading state follows real scene initialization. After readiness, a tap on
the reactor starts the finite unlock/open sequence and enters the Garage. A Skip
control becomes available during opening; no arbitrary delay fakes download progress. Reduced motion gets
a short fade. Failed initialization reveals the existing useful fallback instead
of trapping the visitor behind a door.

Sound is original procedural powered machinery: reactor hum/rise, lock releases,
servo movement and a short final seat. The reactor tap unlocks audio, so door
sound is on automatically with no separate sound toggle. Background music is
primed in the same gesture but ducked until the door has opened; Music off still
controls only music. Unsupported/stalled audio cannot trap entry. No film recording
is copied and no autoplay bypass is used.

Verify lifecycle/race/cleanup and sound envelopes with automated tests; inspect
the sequence and Enter flow at desktop,390×844,320×568 and844×390 in the browser.
Physical mobile hardware is not available, so do not claim an on-device test.

Release only the approved current version. Commit/push explicitly to the Garage
branch, not main; deploy the curated package to Netlify Garage2 site
47dd72b3-ac20-4adb-b750-55c81f3a1574. Preserve seaside1 and public portfolio.
