# The Workshop

An original interactive workshop experiment for Lorenzo Colombani.

**Online preview:** https://the-workshop-lorenzo-preview.netlify.app/workshop/

The preview is a separate Netlify project. The existing portfolio and other Netlify projects were not changed. All preview HTML and HTTP responses carry noindex directives. The link is unlisted, not password-protected.

## Open or resume

- Open the preview link above, or the Desktop “Open The Workshop” shortcut.
- The Codex task “Explore a bold portfolio redesign” is pinned.
- For local work, double-click `Open The Workshop.command` at the repository root. It reuses or starts this exact worktree's local server.
- Resume from `.claude/HANDOFF.md`, then `EXPERIMENT.md`. The project is paused; wait for Lorenzo’s next direction before editing.

## Latest local iteration

`entrance-2` adds The Workshop landing, a centered reactor entry and the working droid. Netlify currently holds the pre-change `ui-round-2` snapshot; the newer entrance is local for user debugging. The usage automation now stops work at 3% and never deploys.

## Interaction

- Entering the workshop turns sound on from that user gesture. Sound off remains available and, once chosen, is respected by TVA.
- Drag empty space to orbit around the table. Gesture speed carries into restrained inertia. Wheel or trackpad pinch changes distance; two-finger pinch does the same on touchscreens.
- Drag the field to shape it; release it to spread the particles and shift to blue hour.
- Touch a labeled project prism to open it. Pulling or dragging a project only moves it and never launches it.
- Open the TVA dossier to send the existing orb into the sky. Its released particles blend into the original authored cosmic sequence.
- Touch the sky or press Space to pause/resume. Draw down or press Escape to return from every TVA phase, including the portrait rotation cue.
- TVA requires a wide view on a phone. A holographic rotation cue holds playback in portrait.
- OpenBots loops continuously. Click/Space do not stop its animation. Drag to inspect; draw down or Escape to dismiss.
- The projected guide is also dismissed by drawing down or pressing Escape.
- The workshop starts muted until entry. The workshop score gives way to TVA's original score without overriding a later explicit mute.

## Runtime

Static HTML/CSS/JavaScript, self-hosted Three.js and add-ons, custom shaders, original GLB models with embedded color/contact and roughness atlases, WebAudio effects, and the curated original TVA source. No runtime cloud AI API or build service is required.

The sky preserves the original film's composition, typography, changing-name choreography, musical clock, branch identities/pruning, cosmic finale and chinchilla handoff. The parent requests the original rendered frame directly so an offscreen iframe's scheduling cannot stall the handoff. Its rendered image is composited after the room's grade, avoiding a second color grade.

Active modules: `main.js`, `world-interface.js`, `sky-stage.js`, `projector.js`, `pavilion-finish.js`, `coastal-world.js`, `illustrated-materials.js`, `audio.js`. Earlier `native-story.js`, `golden-threads.js`, `stage-space.js` and `story-timeline.js` are dormant experiments and excluded from the deployed package.

## Publish this separate preview

Run `python3 workshop/package-preview.py` from the repository root. It packages only the active runtime and required assets into `/private/tmp/the-field-netlify-preview`, validates imports/paths and noindex rules, and records an external ownership manifest. It refuses unrelated files or unrecognized staging contents.

Deploy only to the site recorded in `.claude/netlify-preview.json`; always pass its explicit site ID. Do not link this repository to, or publish it over, the existing portfolio site. The package rewrites outside-workshop portfolio destinations to their canonical public URLs and excludes the earlier editorial draft, launchers, builder scripts, QA renders and private working metadata.

## Remaining observation

Lorenzo perceived choppiness in the OpenBots preview and explicitly asked not to investigate it during this session. It is already an MP4 conversion of the source GIF. The cause is unverified; do not assume that it is only the viewer. Revisit only if it remains objectionable on the deployed preview.

Browser checks covered desktop and simulated phone/landscape dimensions. Physical-device touch and Mac trackpad pinch remain UNVERIFIED-ON-DEVICE. Model and shader checks do not establish an Awwwards-level subjective quality verdict.

## Visual benchmark

`assets/social-preview.png` is the approved target for the finished interactive world's detail, materials, lighting and atmosphere. It is generated sharing artwork and an art-direction reference; the current real-time scene is an intermediate prototype.
