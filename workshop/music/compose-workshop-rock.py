#!/usr/bin/env python3
"""Original instrumental sketch for GarageBand. Standard MIDI; no external packages.

Render/edit in GarageBand, not a runtime synthesizer. Regenerates only the MIDI
sketch, never the edited .band project or the final mix.
"""
from pathlib import Path
import math
import random
import struct

OUT = Path(__file__).with_name('Workshop - After Hours.mid')
PPQ, BPM, BARS = 480, 114, 40
rng = random.Random(240926)
END = BARS * 4 * PPQ


def vlq(value):
    data = [value & 127]
    while value >> 7:
        value >>= 7
        data.insert(0, (value & 127) | 128)
    return bytes(data)


def meta(kind, text):
    text = text.encode() if isinstance(text, str) else text
    return b'\xff' + bytes([kind]) + vlq(len(text)) + text


class Track:
    def __init__(self, name, channel, program, pan, volume):
        self.channel = channel
        self.events = [(0, meta(3, name)), (0, bytes([0xc0 | channel, program])),
                       (0, bytes([0xb0 | channel, 7, volume])),
                       (0, bytes([0xb0 | channel, 10, pan]))]

    def note(self, beat, note, duration, velocity, drift=0):
        start = max(0, round((beat + drift) * PPQ))
        end = min(END, start + max(24, round(duration * PPQ)))
        if start >= END or end <= start:
            return
        self.events += [(start, bytes([0x90 | self.channel, note, max(1, min(127, round(velocity)))])),
                        (end, bytes([0x80 | self.channel, note, 0]))]

    def chunk(self):
        events = sorted(self.events, key=lambda e: (e[0], 0 if e[1][0] & 0xf0 == 0x80 else 1))
        raw, last = bytearray(), 0
        for tick, message in events:
            raw += vlq(tick - last) + message
            last = tick
        raw += vlq(END - last) + meta(47, b'')
        return b'MTrk' + struct.pack('>I', len(raw)) + raw


# E minor; this is deliberately its own chord sequence and rhythmic phrasing.
# 8-bar verse, 8-bar lift, 4-bar breakdown/build, 8-bar return, 8-bar lift,
# 4-bar turnaround. The final bar leads naturally back into the opening.
roots = ([40, 40, 45, 45, 48, 48, 47, 47]
         + [40, 43, 50, 45, 40, 43, 48, 47]
         + [48, 50, 40, 47]
         + [40, 40, 45, 45, 48, 48, 47, 47]
         + [40, 43, 50, 45, 40, 43, 48, 47]
         + [48, 50, 45, 47])
assert len(roots) == BARS
conductor = Track('After Hours - original Workshop score', 15, 0, 64, 100)
conductor.events += [(0, meta(81, round(60_000_000 / BPM).to_bytes(3, 'big'))),
                     (0, meta(88, bytes([4, 2, 24, 8]))),
                     (0, meta(89, bytes([1, 1])))]  # E minor
for bar, label in [(0, 'Main groove'), (8, 'Open guitars'), (16, 'Half-time break'),
                   (20, 'Back to work'), (28, 'Open guitars'), (36, 'Turnaround')]:
    conductor.events.append((bar * 4 * PPQ, meta(6, label)))
drums = Track('01 - Dry room drums', 9, 0, 64, 104)
bass = Track('02 - Picked electric bass', 1, 34, 64, 94)
left = Track('03 - Rhythm guitar left', 2, 29, 28, 84)
right = Track('04 - Rhythm guitar right', 3, 27, 100, 75)
lead = Track('05 - Guitar replies', 4, 27, 76, 78)

for bar, root in enumerate(roots):
    b = bar * 4
    lift = 8 <= bar < 16 or 28 <= bar < 36
    quiet = 16 <= bar < 18
    build = 18 <= bar < 20
    turn = bar >= 36
    fill = bar in [7, 15, 19, 27, 35, 39]
    # Hand-played timing: locked kick/bass, snare a touch late, hats alternating.
    kick_beats = [0, 1.5, 2.5] if bar % 2 == 0 else [0, 2, 3.5]
    if lift: kick_beats = [0, 1, 2, 3]
    if quiet: kick_beats = [0, 2.5]
    for beat in kick_beats:
        drums.note(b + beat, 36, .10, 94 + rng.randrange(-5, 6), rng.uniform(-.006, .006))
    for beat in ([2] if quiet else [.5, 1.5, 2.5, 3.5] if lift else [1, 3]):
        drums.note(b + beat, 38, .12, 101 + rng.randrange(-5, 6), .012)
    if bar % 2 and not quiet and not fill:
        drums.note(b + 2.75, 38, .07, 39, .012)
    for i in range(8):
        if quiet and i % 2: continue
        if fill and i > 5: continue
        hat = 46 if (lift or build) and i == 7 and bar % 2 else 42
        drums.note(b + i * .5, hat, .21 if hat == 46 else .10,
                   (64 if i % 2 == 0 else 45) + rng.randrange(-6, 7), rng.uniform(-.01, .01))
    if bar in [0, 8, 20, 28, 36]:
        drums.note(b, 49, .9, 78 if bar else 66)
    if fill:
        for index, beat in enumerate([2.5, 2.75, 3, 3.25, 3.5, 3.75]):
            drums.note(b + beat, [38, 38, 48, 48, 45, 43][index], .13,
                       61 + index * 5 + rng.randrange(-5, 5), .006)
    # A picked line with octave and fifth replies; not constant root doubling.
    pattern = [(0, 0, .43), (.5, 0, .33), (1.25, 7, .20), (1.5, 0, .4),
               (2.25, 0, .20), (2.5, 12, .36), (3, 7, .33), (3.5, 0, .32)]
    if quiet: pattern = [(0, 0, 1.55), (2, 7, .7), (3, 12, .55)]
    if lift: pattern = [(i / 2, [0, 0, 7, 0, 12, 0, 7, 0][i], .37) for i in range(8)]
    for beat, offset, length in pattern:
        bass.note(b + beat, root - 12 + offset, length, 83 + rng.randrange(-7, 8), rng.uniform(-.005, .005))
    if bar in [7, 15, 19, 27, 35, 39]:
        bass.note(b + 3.85, 39, .12, 67)
    # Short chord stabs and open responses. Double tracking has different
    # strum timing/voicing; it isn't just a delayed copy of one performance.
    rhythm = [(0, .33, 94), (.75, .16, 68), (1.5, .32, 88), (3.5, .24, 81)]
    if bar % 2: rhythm = [(.25, .26, 84), (1, .29, 94), (1.75, .28, 84)]
    if lift: rhythm = [(0, .67, 99), (1, .32, 84), (1.5, .32, 83), (2, .65, 97), (3, .32, 82), (3.5, .4, 87)]
    if quiet: rhythm = [(0, 1.5, 69), (2.5, .9, 65)]
    for beat, length, velocity in rhythm:
        for string, note in enumerate([root, root + 7, root + 12]):
            left.note(b + beat + string * .014, note, length, velocity - string * 5 + rng.randrange(-4, 5))
    if not quiet:
        for beat, length, velocity in rhythm:
            if not lift and beat == .75: continue
            for string, note in enumerate([root + 7, root + 12, root + 19]):
                right.note(b + beat + .018 + string * .012, note, length * .86,
                           velocity - 10 - string * 6 + rng.randrange(-4, 5))
    # Sparse original pentatonic replies, leaving the foreground to the site.
    if bar in [3, 7, 11, 15, 23, 27, 31, 35, 39]:
        phrase = [(2.25, 71, .19), (2.5, 74, .28), (3, 76, .29), (3.5, 71, .38)]
        if bar in [7, 27, 39]: phrase = [(2.5, 69, .22), (2.75, 67, .22), (3.25, 66, .23), (3.5, 64, .36)]
        for beat, note, length in phrase:
            lead.note(b + beat, note, length, 66 + rng.randrange(-6, 8), .008)

tracks = [conductor, drums, bass, left, right, lead]
OUT.write_bytes(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), PPQ) + b''.join(t.chunk() for t in tracks))
print(f'{OUT}: {BARS} bars, {BPM} BPM, {BARS * 4 * 60 / BPM:.3f} seconds, {len(tracks)-1} instruments')
