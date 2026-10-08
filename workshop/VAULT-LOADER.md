# Reactor vault loading sequence · 8 October 2026

Approved scope: replace the initial loading overlay with an elaborate original
arc-reactor mechanism that rotates, releases locks, and opens a heavy vault onto
the existing Garage welcome/entry view. Preserve the restored site-preview
experience, ribbon, authored films, room, and existing Enter control.

The loader appears immediately using inline SVG and CSS, independent of WebGL.
Its loading state follows real scene initialization. After readiness, a finite
unlock/open sequence reveals the Garage. A Skip control becomes available when
ready; no arbitrary delay is used to fake download progress. Reduced motion gets
a short fade. Failed initialization reveals the existing useful fallback instead
of trapping the visitor behind a door.

Sound is original procedural powered machinery: reactor hum/rise, lock releases,
servo movement and a short final seat. Browsers require a user gesture, so first
load is silent until the visitor enables opening sound. This is separate from
Rock/Calm/Music off. No film recording is copied and no autoplay bypass is used.

Verify lifecycle/race/cleanup and sound envelopes with automated tests; inspect
the sequence and Enter flow at desktop,390×844,320×568 and844×390 in the browser.
Physical mobile hardware is not available, so do not claim an on-device test.

Release only the approved current version. Commit/push explicitly to the Garage
branch, not main; deploy the curated package to Netlify Garage2 site
47dd72b3-ac20-4adb-b750-55c81f3a1574. Preserve seaside1 and public portfolio.
