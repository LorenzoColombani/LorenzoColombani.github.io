# The Workshop Garage — current development checkpoint

Garage 2.0 is the active version of Lorenzo's interactive portfolio and services
website. This repository contains its current local implementation, including
the AI, Applied website-card prototype and the Safari scrolling correction.

**Garage production:** https://the-workshop-garage-lorenzo.netlify.app/workshop/

The committed local prototype is newer than production. Committing does not
publish it. The seaside Workshop1, public portfolio and independent Claude debug
copy are separate; do not overwrite or deploy them from this checkout.

## Open this exact version

Use this checkout's `workshop/` directory, served from the repository root over
HTTP. The real AI, Applied site permits local embedding only from
**http://127.0.0.1:8766**. Never use `file://` or a fallback port for this test.

Before starting a preview, inspect the listener on8766 and verify its process
working directory. At the last check on29 September, it belonged to the independent
Claude debug copy, not this checkout. Process IDs are ephemeral; check again.
Stop only a verified prior project preview, then start this repository from its
root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory .
```

Open `http://127.0.0.1:8766/workshop/` for the normal entrance, or
`http://127.0.0.1:8766/workshop/?view=ai-applied` for the live website projection.
`?view=services` opens Services. Confirm `/workshop/build-id.txt` matches this
checkout before reporting which version is visible.

`Open The Workshop.command` and `workshop/launch.py` can reuse/start a local
server, but their historical fallback-port behavior is unsuitable when8766 is
occupied and the live embed needs its exact allowed origin. Check the listener
first instead of opening a different checkout or port by accident.

## Current features

- Nighttime Garage environment, reflective floor, semicircular navigation desk,
  holographic workbench and working droid.
- Products presented as movable cards with click, drop and flick launches.
  Bridge and Loki retain their authored experiences.
- AI, Applied is the sole live website-template prototype: its actual Netlify
  page floats above the Staging Area. The page settles into an untransformed
  browsing layer; transparency and table light remain. The live page's alpha
  edge mask is currently removed.
- Services MVP: Build, Train and Retain, with an email-draft contact route.
- Rock / Calm / Music off selection. Interaction SFX are independent of music.
- Local visual and sound-reference boards remain in `.claude/references/` in the
  working checkout and the full independent debug copy. Private reference clips,
  diagnostics and checkpoints are intentionally excluded from Git and deployment.

## Safari scrolling fix

Startup preloads the Bridge film in an invisible full-viewport iframe. Claude's
investigation found that Safari routed scrolling into it despite
`pointer-events:none`. The inactive Bridge shell is now clipped with:

```css
.bridge-experience:not(.is-active){clip-path:inset(0 0 100% 0)}
```

Opening Bridge removes that clip through its existing active state. The preload
keeps its viewport; no Bridge timing, audio or JavaScript behavior was changed.
The stylesheet token is `bridge-scroll-19`; the JavaScript chain remains
`website-surface-17`.

The new regression failed before the rule was ported and passed afterward.
The full source suite passes **112/112**. These tests cover code, geometry and
simulated lifecycle/media behavior, not physical trackpad behavior.
Claude's separate browser investigation reported unchanged Bridge launch timing
and successful user click runs. Dead clicks were never independently reproduced
there, so their cause is still unproven. The one-off Chromium “A network change
was detected” error remains a separate, unresolved observation.

## Scope for the next session

Read `.claude/HANDOFF.md` for the latest detailed local handoff when available.
Its first current section supersedes earlier notes. The independent debug copy is
`/Users/lorenzocolombani/Developer/workshop-garage-debug-2026-09-29`; do not treat
its preview or edits as this checkout's state.

Continue polishing only the AI, Applied template unless Lorenzo changes scope.
The wider card rollout was cancelled. In-screen fullscreen controls and the
separate loading/performance pass remain deferred. If input failures return,
capture and instrument the failing state before making further visual changes.

## Tests and packaging

No build or dependency installation is needed for the static app. Vendored
Three.js and its add-ons are included. Run from the repository root:

```sh
node --test workshop/*.test.mjs workshop/experiences/bridge/*.test.cjs
```

`python3 workshop/package-preview.py` prepares and validates the curated runtime
in `/private/tmp/the-field-netlify-preview`. It excludes private metadata,
reference media and dormant experiments. Packaging is not deployment.

For a separately authorized deployment, read `workshop/DEPLOYMENT.md` and use the
explicit Garage2 site identity. The historical seaside preview identity must not
be used. Do not bare-push this experiment branch to the public portfolio upstream.
