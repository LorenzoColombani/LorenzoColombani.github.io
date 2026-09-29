# The Workshop — After Hours / Live Room

**Current version:** `Workshop - Live Room.band`.
The earlier `Workshop - After Hours.band` and its generated MIDI are the first
sketch. Lorenzo heard that sketch and asked for more instruments and a less
synthetic sound. The current version replaces its MIDI guitar/bass performances
with recorded Apple Loops, arranged and mixed in GarageBand on this Mac.

## Current arrangement

114 BPM, E minor, 4/4, 32 bars (67.3684 seconds). The source song was studied
through guitar lessons and a bass transcription; see `REFERENCE-STUDY.md`.
This is a new arrangement of GarageBand material, not a cover or a sampled
recording of The Clash. Its character comes from clipped rock phrasing, live
string articulation, a bass-led groove and contrasting instrumental density.

| Part | GarageBand material | Entry | Track level |
| --- | --- | --- | --- |
| Drums | Max / Punk Rock, East Bay kit; Gilman Street with hi-hats | Bar 1 | -2 dB |
| Rhythm guitar | Razor Rock Rhythm Guitar 01 | Bar 1 | -2 dB |
| Bass | Razor Rock Bass Guitar 01 | Bar 1 | -3 dB |
| Lead guitar | Razor Rock Lead Guitar 01 | Bar 9 | -5 dB |
| Piano | 70s Rock Piano 01 | Bar 9 | -10 dB |
| Tambourine | Tambourine 01 | Bar 9 | -8.6 dB |
| Organ | Disco Dreams Verse Organ (Cory Wong pack) | Bar 17 | -8.6 dB |

The installed Apple Loops library supplies the recordings; GarageBand follows
the project tempo/key. Empty tracks left during arrangement have no regions
and do not contribute audio. The native project needs the corresponding Apple
Sound Library packs. The rendered web recording is portable on its own.

## Export and web preparation

1. Open the current `.band` project. Keep the metronome off and monitoring off.
2. Share → Export Song to Disk → WAVE → Uncompressed 24-bit.
3. Save as `Workshop - Live Room - master.wav` in this folder. Export the whole
   song, including the room/instrument decay after the last measure.
4. Run `python3 workshop/music/master-web-loop.py` from the repository root.
   It uses local ffmpeg and numpy, retains exactly 32 bars, folds the exported
   decay over the loop start, removes DC, leaves peak headroom, applies a short
   boundary fade and encodes a 192-kbit/s MP3. The `.band` project is untouched.
5. The script writes `../media/workshop-garage-rock-v1.mp3` and
   `web-loop-verification.json`. Bump the asset version if replacing it later.

The master is 24-bit stereo / 44.1 kHz. The web file is 1,618,308 bytes;
FFmpeg decodes exactly 2,970,947 samples (no extra encoder-padding silence).
Measured integrated loudness: -20.2 LUFS; true peak: -3.2 dBFS. The runtime
applies additional background-level gain. Numerical checks establish file and
playback correctness, not subjective musical approval of this final mix.

## Website integration and validation

`recorded-score.js` fetches one same-origin recording after sound is enabled.
`audio.js` unlocks AudioContext from the original entry click; delayed loading
cannot restart sound after mute or teardown. The music keeps playing while the
tab is in the background (Lorenzo, 2026-09-24); if the browser suspends it there,
returning to the page resumes the recording at its saved offset, as unmuting does. Film ducking retains the
existing separate bus for hologram gestures. There is no backup song.

Nine tests in `recorded-score.test.mjs` pass, covering the music lifecycle and its
integration with effects and film ducking. The local in-app browser entered the
room, enabled the recording, toggled sound off/on and showed no console errors.
The package builder validates the music dependency and includes only the MP3
and runtime module, excluding GarageBand sessions, master audio and research.
Physical iPhone listening has not been checked in this pass.

Published as a separate Netlify draft at Lorenzo's request:
https://6ab4fa2bb767c659e6c8cbb5--the-workshop-lorenzo-preview.netlify.app/workshop/

The independent Developer/the-workshop-garage copy and the existing production
website remain unchanged. The previous garage draft URL is also preserved.

## Update: selectable calm score and stable 2.0 deployment

The upper-right Sound and music selector now offers Workshop rock, the original
Calm score, and Sound off. The preferred music mode is remembered across visits;
choosing Off remains immediate during loading. `calm-score.js` contains the
recovered original score; it is deliberately selected, never an error fallback.
Eight playback tests now pass, including score-switching and slow-download races.

The permanent 2.0 website is https://the-workshop-garage-lorenzo.netlify.app/workshop/
Normal updates go to its dedicated site ID in `../DEPLOYMENT.md`. The seaside
1.0 website remains untouched. Earlier draft links above are historical.
