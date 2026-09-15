#!/usr/bin/env python3
"""Open this exact local workshop, reusing or starting its preview server."""
from pathlib import Path
import argparse
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
MARKER = (ROOT / 'workshop' / 'build-id.txt').read_bytes()

def matches(port):
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/workshop/build-id.txt', timeout=.35) as response:
            return response.read() == MARKER
    except (OSError, ValueError):
        return False

def preview_url():
    for port in range(8766, 8781):
        if matches(port):
            return f'http://127.0.0.1:{port}/workshop/'
    for port in range(8766, 8781):
        with socket.socket() as probe:
            try:
                probe.bind(('127.0.0.1', port))
            except OSError:
                continue
        log_path = Path(tempfile.gettempdir()) / 'the-field-preview.log'
        with log_path.open('ab') as log:
            process = subprocess.Popen(
                [sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(ROOT)],
                stdout=log, stderr=log, start_new_session=True,
            )
        for _ in range(30):
            if matches(port):
                return f'http://127.0.0.1:{port}/workshop/'
            if process.poll() is not None:
                break
            time.sleep(.15)
    raise RuntimeError('The preview could not start. Check ' + str(log_path))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--print-url', action='store_true', help='Check/start the server without opening a browser.')
    args = parser.parse_args()
    url = preview_url()
    print(url)
    if not args.print_url:
        subprocess.run(['/usr/bin/open', url], check=True)
