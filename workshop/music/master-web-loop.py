#!/usr/bin/env python3
"""Make a gapless web loop from the saved GarageBand 24-bit mix.
Requires ffmpeg and numpy; does not alter the editable GarageBand project.
"""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name('Workshop - Live Room - master.wav')
OUTPUT = ROOT / 'workshop/media/workshop-garage-rock-v1.mp3'
SR, BPM, BARS = 44100, 114, 32
x = np.frombuffer(subprocess.check_output([
    'ffmpeg', '-v', 'error', '-i', str(SOURCE), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'
]), dtype='<f4').reshape(-1, 2).copy()
length = round(BARS * 4 * 60 / BPM * SR)
assert len(x) > length and np.isfinite(x).all(), 'Missing/invalid GarageBand render'
loop = x[:length].copy()
# GarageBand includes the instrument/room tails after the last measure. Carry
# that decay across the boundary instead of leaving a silent export trailer.
tail = x[length:]
loop[:len(tail)] += tail
loop -= np.mean(loop, axis=0)
loop *= 10 ** (-2.5 / 20) / max(float(np.max(np.abs(loop))), 1e-6)
# A 6 ms window prevents a discontinuity from sample rounding or lossy decode.
fade = round(SR * .006)
loop[:fade] *= np.linspace(0, 1, fade)[:, None]
loop[-fade:] *= np.linspace(1, 0, fade)[:, None]
OUTPUT.parent.mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                '-c:a', 'libmp3lame', '-b:a', '192k', '-write_xing', '1',
                '-metadata', 'title=After Hours - The Workshop',
                '-metadata', 'comment=GarageBand mix of recorded Apple Loops and Rock Drummer; original arrangement.',
                str(OUTPUT)], input=loop.astype('<f4').tobytes(), check=True)
decoded = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(OUTPUT),
                                                '-f', 'f32le', '-']), dtype='<f4').reshape(-1, 2)
report = {'source': SOURCE.name, 'bars': BARS, 'bpm': BPM, 'sample_rate': SR,
          'duration_seconds': len(decoded)/SR, 'expected_samples': length,
          'decoded_samples': len(decoded), 'bytes': OUTPUT.stat().st_size,
          'peak_dbfs': round(float(20*np.log10(np.max(np.abs(decoded)))), 2),
          'boundary_sample_delta': float(np.max(np.abs(decoded[-1]-decoded[0]))),
          'finite': bool(np.isfinite(decoded).all()),
          'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
          'output_sha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}
assert abs(len(decoded)-length) <= 1, report
assert report['peak_dbfs'] < -1 and report['finite'], report
assert report['boundary_sample_delta'] < .01, report
Path(__file__).with_name('web-loop-verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
