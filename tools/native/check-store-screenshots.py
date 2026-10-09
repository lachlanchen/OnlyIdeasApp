#!/usr/bin/env python3
"""Check dimensions of reviewed, unmodified PNG captures; emit their hashes/order."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('--version', required=True)
parser.add_argument('--build', required=True, type=int)
args = parser.parse_args()
sizes = {
    'iphone': {(1320, 2868), (1290, 2796), (1242, 2688)},
    'ipad': {(2064, 2752), (2048, 2732)},
    'macos': {(1280, 800), (1440, 900), (2560, 1600), (2880, 1800)},
}
rows = []
seen = set()
for path in sorted(args.directory.glob('*/*.png')):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit(f'Not a PNG: {path}')
    width, height, depth, color = struct.unpack('>IIBB', data[16:26])
    if depth != 8 or color != 2:
        raise SystemExit(f'Expected an opaque 24-bit RGB capture: {path}')
    platform = path.parent.name
    if platform == 'android':
        valid = 320 <= min(width, height) and max(width, height) <= 3840 and max(width, height) <= 2 * min(width, height)
    else:
        valid = (width, height) in sizes.get(platform, set())
    if not valid:
        raise SystemExit(f'Unsupported screenshot dimensions: {path}: {width} x {height}')
    digest = hashlib.sha256(data).hexdigest()
    if (platform, digest) in seen:
        raise SystemExit(f'Duplicate capture in {platform}: {path}')
    seen.add((platform, digest))
    rows.append({'file': str(path.relative_to(args.directory)), 'width': width,
                 'height': height, 'sha256': digest, 'bytes': len(data)})
if not rows:
    raise SystemExit('No screenshots found')
manifest = {'version': args.version, 'build': args.build,
            'status': 'staged for next review; not uploaded to production listings',
            'capture': 'Actual native UI and public papers; see README for device and QA scope',
            'captureSources': json.loads((args.directory / 'capture-sources.json').read_text()),
            'screenshots': rows}
(args.directory / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Validated {len(rows)} screenshots. Visual review remains required.')
