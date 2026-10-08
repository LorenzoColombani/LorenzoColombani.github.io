#!/usr/bin/env python3
"""Build the isolated, non-indexable Field preview. Never deploys anything.

Run from any directory: python3 workshop/package-preview.py
Only /private/tmp/the-field-netlify-preview is writable output. A manifest kept
outside the publish directory proves ownership before any output is replaced.
"""

from __future__ import annotations

import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import posixpath
import re
import shutil
import struct
import subprocess
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/private/tmp/the-field-netlify-preview')
MANIFEST = ROOT / '.claude/preview/package-manifest.json'
CANONICAL = 'https://lorenzocolombani.com/'
ROBOTS_META = '<meta name="robots" content="noindex,nofollow,nosnippet">'
DORMANT = {'native-story.js', 'golden-threads.js', 'story-timeline.js', 'stage-space.js'}
CORE = {
    'index.html', 'style.css', 'bootstrap.js', 'main.js', 'audio.js', 'recorded-score.js', 'calm-score.js', 'product-elements.js', 'product-catalog.js', 'product-gestures.js', 'viewport-layout.js',
    'coastal-world.js', 'pavilion-finish.js', 'illustrated-materials.js',
    'world-interface.js', 'sky-stage.js', 'projector.js', 'holographic-table.js', 'physical-occlusion.js', 'stark-workshop.js', 'garage-ramp.js', 'navigation-desk.js', 'droid-work.js',
    'bridge-experience.js', 'bridge-portal.js', 'portal-audio.js', 'website-experience.js', 'website-projection-audio.js', 'services-experience.js',
    'vault-loader.js', 'vault-loader.css', 'vault-audio.js',
}
ROOT_ASSETS = {
    'favicon.svg', 'assets/previews/wharton.webp', 'assets/previews/tva.webp', 'assets/previews/openbots-still.png', 'assets/previews/bridge.webp',
    'assets/fonts/dm-sans-v17-latin-regular.woff2',
    'assets/fonts/dm-sans-v17-latin-500.woff2',
    'assets/fonts/dm-sans-v17-latin-700.woff2',
    'assets/fonts/playfair-display-v40-latin-600italic.woff2',
    'assets/fonts/jbmono-400.woff2',
}
OPTIONAL_MISSING = {'workshop/experiences/tva/assets/homemade/score.m4a'}
WEBSITE_PREFIX = 'workshop/experiences/websites/'
WEBSITES = {
    'ai-applied', 'data-vault-foundations', 'exam-pacer', 'star-wars-decluttering-app',
    'text-readability-guide', 'easy-local-llm-guide', 'ios-assistant-for-senior-citizens',
    'can-you-understand-an-email', 'multicultural-job-applicants-guide', 'gamification-helper-tool',
}
MODULE_RE = re.compile(
    r'''(?:^|[;\n])\s*(?:import|export)\s*(?:[\w\s{},*$]+?\bfrom\s*)?['"]([^'"\n]+)['"]|\bimport\s*\(\s*['"]([^'"\n]+)['"]'''
)
ASSET_RE = re.compile(
    r'''(['"])([^'"\n]+\.(?:glb|mp4|webm|m4a|mp3|opus|woff2?|ttf|webp|png|jpe?g|svg|json)(?:\?[^'"\n]*)?)\1'''
)
PORTFOLIO_RE = re.compile(r'''(['"])(\.\./(?:work(?:/[^'"\s]*)?)?)\1''')


def website_parts(path: str) -> tuple[str, str] | None:
    if not path.startswith(WEBSITE_PREFIX):
        return None
    slug, separator, relative = path.removeprefix(WEBSITE_PREFIX).partition('/')
    return (slug, relative) if separator and slug in WEBSITES else None


def website_allowed(slug: str, relative: str) -> bool:
    # Deliberately exclude provenance, source maps, source/config files and hidden
    # state. New runtime layouts require a reviewed addition to this allowlist.
    if relative == 'index.html' or re.fullmatch(r'(?:LICENSE|LICENCE|COPYING|NOTICE)(?:\.(?:txt|md))?', relative, re.I):
        return True
    if slug == 'ai-applied':
        return bool(
            relative in {'404.html', 'favicon.svg', 'logo.svg', 'og-default.png',
                         'contributors/index.html', 'attachments/wealthy-commitments-report.pdf'}
            or re.fullmatch(r'(?:use-cases|contributors)/[a-z0-9-]+/index\.html', relative)
            or re.fullmatch(r'_astro/[A-Za-z0-9_.-]+\.(?:js|css)', relative)
        )
    if slug == 'data-vault-foundations':
        return bool(
            relative == 'nav-inject.js'
            or re.fullmatch(r'chapters/\d{2}-[a-z0-9-]+\.html', relative)
            or re.fullmatch(r'systems/[a-z0-9-]+\.js', relative)
            or re.fullmatch(r'assets/sounds/[a-z0-9-]+\.mp3', relative)
        )
    if slug in {'can-you-understand-an-email', 'multicultural-job-applicants-guide'}:
        return bool(re.fullmatch(r'assets/index-[A-Za-z0-9_-]+\.(?:js|css)', relative))
    return False


def fail(message: str) -> None:
    raise RuntimeError(message)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def without_comments(text: str) -> str:
    # Preserve strings/URLs; the runtime's import and asset references are literal.
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return re.sub(r'^\s*//[^\n]*', '', text, flags=re.M)


def local_path(reference: str, base: str) -> str | None:
    parts = urlsplit(reference)
    if parts.scheme or parts.netloc or not parts.path or reference.startswith('#'):
        return None
    path = unquote(parts.path)
    path = posixpath.normpath(path.lstrip('/') if path.startswith('/') else posixpath.join(base, path))
    if path == '..' or path.startswith('../'):
        fail(f'Reference escapes the site: {reference!r} from {base}')
    if parts.path.endswith('/'):
        path = posixpath.join(path, 'index.html')
    website = website_parts(path)
    if website and website[0] == 'ai-applied' and re.fullmatch(r'(?:contributors|(?:use-cases|contributors)/[a-z0-9-]+)', website[1]):
        path = posixpath.join(path, 'index.html')
    return path


def allowed(path: str) -> bool:
    website = website_parts(path)
    if website:
        return website_allowed(*website)
    if path in ROOT_ASSETS:
        return True
    if path.startswith('workshop/experiences/bridge/'):
        relative = path.removeprefix('workshop/experiences/bridge/')
        return relative in {'index.html', 'embed.css', 'embed-boot.js', 'assets/icon-180.png'} or (relative.startswith('assets/') and relative.endswith(('.js', '.css', '.mp3', '.opus', '.m4a')))
    if path.startswith('workshop/vendor/'):
        return path.endswith('.js')
    if path.startswith('workshop/experiences/tva/'):
        relative = path.removeprefix('workshop/experiences/tva/')
        return (
            relative == 'index.html'
            or (relative.startswith('js/') and relative.endswith('.js'))
            or (relative.startswith('css/') and relative.endswith('.css'))
            or relative in {'assets/favicon.png', 'assets/favicon.svg', 'assets/vendor/three.bundle.min.js',
                            'assets/show/score.webm', 'assets/show/score.m4a'}
            or (relative.startswith('assets/subject/') and relative.endswith('.jpg'))
            or (relative.startswith('assets/show/fonts/') and relative.endswith('.ttf'))
            or (relative.startswith('assets/webfonts/font-') and relative.endswith('.woff2'))
        )
    return path in {f'workshop/{name}' for name in CORE} or path in {
        'workshop/assets/robot.glb', 'workshop/assets/sofa.glb',
        'workshop/assets/plant.glb', 'workshop/media/workshop-garage-rock-v1.mp3', 'workshop/media/openbots.mp4', 'workshop/assets/social-preview.png',
    }


class References(HTMLParser):
    def __init__(self, website: bool = False) -> None:
        super().__init__()
        self.website = website
        self.urls: list[str] = []
        self.maps: list[str] = []
        self.in_importmap = False

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attrs = dict(attributes)
        for key in ('src', 'poster', 'component-url', 'renderer-url', 'before-hydration-url'):
            if attrs.get(key):
                self.urls.append(attrs[key])
        if (tag == 'link' or (self.website and tag == 'a')) and attrs.get('href'):
            self.urls.append(attrs['href'])
        if self.website and tag == 'astro-island' and attrs.get('props'):
            self.prop_urls(json.loads(attrs['props']))
        self.in_importmap = tag == 'script' and attrs.get('type') == 'importmap'

    def prop_urls(self, value: object) -> None:
        if isinstance(value, str) and value.startswith('/') and not value.startswith('//'):
            self.urls.append(value)
        elif isinstance(value, list):
            for item in value:
                self.prop_urls(item)
        elif isinstance(value, dict):
            for item in value.values():
                self.prop_urls(item)

    def handle_endtag(self, tag: str) -> None:
        if tag == 'script':
            self.in_importmap = False

    def handle_data(self, data: str) -> None:
        if self.in_importmap:
            self.maps.extend(json.loads(data).get('imports', {}).values())


def transform(path: str, source: str) -> str:
    text = source
    if path.startswith('workshop/') and not website_parts(path) and path.endswith(('.html', '.js')):
        text = PORTFOLIO_RE.sub(lambda m: m[1] + CANONICAL + m[2][3:] + m[1], text)
    if path == 'workshop/main.js' and 'goldenThreads' in text:
        interface = (ROOT / 'workshop/world-interface.js').read_text()
        if not re.search(r'getSystem\(\)\s*\{\s*return null;?\s*\}', interface):
            fail('Golden bridge is no longer provably dormant; review the package allowlist.')
        patterns = [
            r"^import \{ createGoldenThreads \} from './golden-threads\.js[^']*';\n",
            r'^const goldenThreads=createGoldenThreads\([^\n]+\);\n',
            r'goldenThreads\.update\(\);',
            r'goldenThreads\.dispose\(\);',
        ]
        for pattern in patterns:
            text, count = re.subn(pattern, '', text, flags=re.M)
            if count != 1:
                fail(f'Dormant golden hook changed; review required: {pattern}')
        if 'goldenThreads' in text or 'golden-threads' in text:
            fail('A golden bridge reference remains in staged main.js.')
    if path.endswith('.html'):
        text = re.sub(r'<meta\b(?=[^>]*\bname=[\'"]robots[\'"])[^>]*>\s*', '', text, flags=re.I)
        text, count = re.subn(r'(<head\b[^>]*>)', r'\1\n' + ROBOTS_META, text, count=1, flags=re.I)
        if count != 1:
            fail(f'HTML has no head for noindex: {path}')
    return text


def dependencies(path: str, text: str) -> set[str]:
    base = posixpath.dirname(path)
    website = website_parts(path)
    references: list[tuple[str, str]] = []
    if path.endswith('.html'):
        parser = References(website=website is not None)
        parser.feed(text)
        references += [(url, base) for url in parser.urls + parser.maps]
    elif path.endswith('.css'):
        references += [(match[2] if match[1] else match[3], base) for match in re.finditer(
            r'''url\(\s*(?:(['"])(.*?)\1|([^)]*?))\s*\)''', text, flags=re.S
        )]
    elif path.endswith('.js'):
        clean = without_comments(text)
        for match in MODULE_RE.finditer(clean):
            reference = next(item for item in match.groups() if item is not None)
            if reference == 'three':
                references.append(('/workshop/vendor/three.module.min.js', ''))
            elif reference.startswith(('.', '/', 'https:')):
                references.append((reference, base))
            else:
                fail(f'Unresolved bare module {reference!r} in {path}')
        if '/vendor/' not in path:
            document_base = WEBSITE_PREFIX + website[0] if website else ('workshop/experiences/' + path.split('/experiences/', 1)[1].split('/')[0] if '/experiences/' in path else 'workshop')
            references += [(match[2], document_base) for match in ASSET_RE.finditer(clean) if '/' in match[2]]
            references += [(match[2], document_base) for match in re.finditer(r'''\.src\s*=\s*(['"])(\.[^'"]*/(?:\?[^'"]*)?)\1''', clean)]
    result = set()
    for reference, reference_base in references:
        target = local_path(reference, reference_base)
        if target is not None and target not in OPTIONAL_MISSING:
            if website and not target.startswith(WEBSITE_PREFIX + website[0] + '/'):
                fail(f'Imported website dependency escapes its app: {path}: {reference}')
            result.add(target)
    return result


def check_glb(path: str, data: bytes) -> None:
    magic, version, length = struct.unpack_from('<4sII', data)
    if magic != b'glTF' or version != 2 or length != len(data):
        fail(f'Invalid GLB container: {path}')
    size, kind = struct.unpack_from('<I4s', data, 12)
    if kind != b'JSON':
        fail(f'GLB has no JSON chunk: {path}')
    doc = json.loads(data[20:20 + size])
    for item in doc.get('buffers', []) + doc.get('images', []):
        if item.get('uri') and not item['uri'].startswith('data:'):
            fail(f'GLB depends on an external asset: {path}: {item["uri"]}')


def build() -> tuple[dict[str, bytes], dict[str, str], int]:
    queue = ['workshop/index.html', 'workshop/experiences/tva/index.html', 'workshop/assets/social-preview.png']
    # The authored Bridge audio bank composes URLs from a directory and cue names.
    # Seed its curated copy because those dynamic references cannot be inferred.
    queue.extend(str(path.relative_to(ROOT)) for path in (ROOT / 'workshop/experiences/bridge').rglob('*') if path.is_file() and allowed(str(path.relative_to(ROOT))))
    # Static imports have dynamically generated chapter/card routes and sound
    # URLs. Seed every allowed runtime file, plus every required entry point.
    # SOURCE.json is intentionally not used to select public package contents.
    for slug in sorted(WEBSITES):
        app = ROOT / WEBSITE_PREFIX / slug
        queue.append(f'{WEBSITE_PREFIX}{slug}/index.html')
        queue.extend(path.relative_to(ROOT).as_posix() for path in app.rglob('*')
                     if path.is_file() and allowed(path.relative_to(ROOT).as_posix()))
    files: dict[str, bytes] = {}
    sources: dict[str, str] = {}
    edges = 0
    while queue:
        path = queue.pop()
        if path in files:
            continue
        if not allowed(path) or Path(path).name in DORMANT:
            fail(f'Dependency is outside the curated preview: {path}')
        source = ROOT / path
        if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to(ROOT):
            fail(f'Missing or unsafe source: {path}')
        data = source.read_bytes()
        sources[path] = digest(data)
        if path.endswith(('.html', '.js', '.css')):
            text = transform(path, data.decode('utf-8'))
            refs = dependencies(path, text)
            edges += len(refs)
            queue.extend(sorted(refs))
            data = text.encode('utf-8')
        elif path.endswith('.glb'):
            check_glb(path, data)
        files[path] = data
    share = re.search(r'<!-- share-preview:start -->(.*?)<!-- share-preview:end -->', files['workshop/index.html'].decode(), re.S).group(1)
    files['index.html'] = (f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
                           f'{ROBOTS_META}\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
                           '<meta http-equiv="refresh" content="0;url=/workshop/">\n'
                           f'{share}\n<title>The Field — Preview</title></head>\n'
                           '<body><a href="/workshop/">Enter The Field preview</a></body></html>\n').encode()
    files['_headers'] = b'/*\n  X-Robots-Tag: noindex, nofollow, nosnippet\n  Cache-Control: no-cache\n'
    files['robots.txt'] = b'# Crawling stays allowed so robots can read the noindex directive.\nUser-agent: *\nAllow: /\n'
    return files, sources, edges


def verify(files: dict[str, bytes]) -> int:
    required = ROOT_ASSETS | {'workshop/assets/robot.glb', 'workshop/assets/sofa.glb',
                             'workshop/assets/plant.glb', 'workshop/media/workshop-garage-rock-v1.mp3', 'workshop/media/openbots.mp4', 'workshop/assets/social-preview.png'}
    required |= {f'{WEBSITE_PREFIX}{slug}/index.html' for slug in WEBSITES}
    if required - files.keys():
        fail(f'Required assets missing: {sorted(required - files.keys())}')
    uncurated = {path for path in files if path.startswith(WEBSITE_PREFIX) and not allowed(path)}
    if uncurated:
        fail(f'Uncurated imported website files: {sorted(uncurated)}')
    node = shutil.which('node')
    if not node:
        fail('Node is required for JavaScript syntax checks; package not written.')
    checked = 0
    for path, data in sorted(files.items()):
        if path.endswith(('.html', '.js', '.css')):
            text = data.decode('utf-8')
            if path.endswith('.html') and text.count(ROBOTS_META) != 1:
                fail(f'Noindex coverage failed: {path}')
            if path.endswith(('.html', '.js')) and not website_parts(path) and PORTFOLIO_RE.search(text):
                fail(f'Unconverted portfolio navigation: {path}')
            missing = dependencies(path, text) - files.keys()
            if missing:
                fail(f'Incomplete asset/import closure in {path}: {sorted(missing)}')
        if path.endswith('.js'):
            check = subprocess.run([node, '--check', '--input-type=module'], input=data, capture_output=True)
            if check.returncode:
                fail(f'JavaScript syntax failed: {path}\n{check.stderr.decode()}')
            checked += 1
    return checked


def owned_output() -> set[str]:
    if OUTPUT.is_symlink():
        fail(f'Refusing a symlink output: {OUTPUT}')
    if not OUTPUT.exists():
        return set()
    if not OUTPUT.is_dir():
        fail(f'Output is not a directory: {OUTPUT}')
    paths = list(OUTPUT.rglob('*'))
    if not paths:
        return set()
    if any(path.is_symlink() for path in paths):
        fail('Refusing to alter staging containing symlinks.')
    if not MANIFEST.is_file():
        fail('Refusing to alter nonempty staging without its ownership manifest.')
    previous = json.loads(MANIFEST.read_text())
    if previous.get('output') != str(OUTPUT) or previous.get('source_root') != str(ROOT):
        fail('Existing ownership manifest names a different output or source root.')
    owned = {item['path']: item['sha256'] for item in previous['files']}
    actual = {path.relative_to(OUTPUT).as_posix() for path in paths if path.is_file()}
    expected_dirs = {parent.as_posix() for name in owned for parent in Path(name).parents if parent.as_posix() != '.'}
    # Netlify's completed CLI deploy creates these empty helper directories.
    # The exact file/hash comparison still rejects all unowned files.
    expected_dirs.update({'.netlify', '.netlify/functions-internal', '.netlify/v1', '.netlify/v1/functions'})
    extra_dirs = {path.relative_to(OUTPUT).as_posix() for path in paths if path.is_dir()} - expected_dirs
    if actual != owned.keys() or extra_dirs:
        fail('Refusing to alter staging with unrelated added or missing paths.')
    if any(digest((OUTPUT / name).read_bytes()) != sha for name, sha in owned.items()):
        fail('Refusing to overwrite staging files changed outside this packager.')
    return actual


def main() -> None:
    # Todo: collect curated closure; validate syntax/policy; prove ownership;
    # write staging and its external manifest. No deployment actions occur here.
    files, sources, edges = build()
    checked = verify(files)
    previous = owned_output()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, data in sorted(files.items()):
        destination = OUTPUT / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    for name in previous - files.keys():
        (OUTPUT / name).unlink()
    for directory in sorted((path for path in OUTPUT.rglob('*') if path.is_dir()), key=lambda p: len(p.parts), reverse=True):
        if not any(directory.iterdir()):
            directory.rmdir()
    total = sum(map(len, files.values()))
    manifest = {
        'output': str(OUTPUT), 'source_root': str(ROOT), 'file_count': len(files),
        'total_bytes': total, 'html_count': sum(path.endswith('.html') for path in files),
        'javascript_syntax_checks': checked, 'verified_dependency_edges': edges,
        'staging_only_changes': ['Canonical portfolio navigation', 'Noindex metadata in every HTML'],
        'policy': {'robots': 'crawl allowed; noindex via HTML and HTTP', 'cache': 'no-cache', 'sitemap': False},
        'optional_unbundled_fallback': sorted(OPTIONAL_MISSING),
        'files': [{'path': name, 'bytes': len(data), 'sha256': digest(data),
                   **({'source_sha256': sources[name]} if name in sources else {})}
                  for name, data in sorted(files.items())],
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Packaged {len(files)} files, {total:,} bytes ({total / 1024 / 1024:.2f} MiB)')
    print(f'Validated {checked} JavaScript files, {edges} dependency edges, {manifest["html_count"]} noindex HTML pages')
    print(f'Publish directory: {OUTPUT}')
    print(f'Manifest (outside publish directory): {MANIFEST}')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError) as error:
        print(f'Preview package refused: {error}', file=sys.stderr)
        sys.exit(1)
