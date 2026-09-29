# Workshop background score — 2026-09-24

Target: this Codex checkout's Workshop. The independent Claude Garage copy and
the published sites stay at their saved versions.

Lorenzo asked for a substantial music improvement, using “Should I Stay or Should
I Go” as the energy reference. Build an original instrumental garage-rock cue:
crunchy guitars, a melodic electric bass, dry punchy drums, and breathing room.
Use original notes and phrasing; no recording, lyrics or copied riff from the song.
User steering: build and finish the music in **GarageBand**. Keep an editable
GarageBand project alongside the exported web loop. Use its instrument sounds,
amp treatment and mixing rather than shipping another oscillator-only score.

## To do

- [x] Locate the existing score, sound controls and film ducking contracts.
- [x] Open and verify the current local Workshop in the right panel.
- [x] Compose and render an original, varied rock arrangement with a seamless loop.
- [x] Integrate it with click-to-enable sound, immediate mute, film ducking and
      hidden-tab cleanup; preserve the existing hologram gesture effects.
- [x] Verify audio levels, the loop boundary, playback lifecycle and packaged assets.
- [x] Refresh the local viewer and save an audition file and implementation notes.

Assumptions: instrumental background music, restrained listening volume, local
review first. The original artist's recording is a style reference, not an asset.
The audio renderer and arrangement must remain editable and reproducible.

Verification scope: Node/audio-file analysis plus the local browser on this Mac;
physical iPhone listening and subjective musical approval remain user checks.

## Completed locally

The first MIDI sketch was replaced after Lorenzo's listening feedback. Current
source: `music/Workshop - Live Room.band`; 24-bit GarageBand master retained.
Web recording: `media/workshop-garage-rock-v1.mp3`, 67.3684 seconds, 1.62 MB.
Six focused playback tests pass; local browser entry/mute/unmute succeeds with
no runtime errors. Package validation passes: 167 files, 60 JavaScript files,
174 dependency edges. No deployment or independent Claude-copy modification.
The final recorded mix is ready for Lorenzo's listening review.

## Deployed on request

Separate verified Netlify draft: https://6ab4fa2bb767c659e6c8cbb5--the-workshop-lorenzo-preview.netlify.app/workshop/
Production was not replaced. Deployment checklist and receipts are saved under
`.claude/preview/garage-rock-1-*`.

## Update: two soundtracks, normal 2.0 releases

Lorenzo requested a choice between the new rock recording and the earlier calm
music. Both are available with Sound off in a single native menu. Desktop and
320 px layout checks, preference persistence and eight playback tests pass.
Published normally to the dedicated Workshop 2.0 site:
https://the-workshop-garage-lorenzo.netlify.app/workshop/
The seaside 1.0 site is unchanged. See DEPLOYMENT.md.
