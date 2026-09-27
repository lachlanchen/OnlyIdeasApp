#!/usr/bin/env python3
"""Export the public legal pages for the repository's static gh-pages mirror."""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path, help='An empty output directory')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
if args.output.exists() and any(args.output.iterdir()):
    parser.error('Use an empty output directory; existing files are preserved.')
args.output.mkdir(parents=True, exist_ok=True)
for name in ('privacy', 'terms', 'support', 'delete-account'):
    html = (root / 'public' / f'{name}.html').read_text()
    for target in ('privacy', 'terms', 'support', 'delete-account'):
        html = html.replace(f'href="/{target}.html"', f'href="./{target}.html"')
    html = html.replace('href="/"', 'href="https://agent.onlyideas.art/"')
    (args.output / f'{name}.html').write_text(html)
(args.output / '.nojekyll').touch()
(args.output / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OnlyIdeas support</title><h1>OnlyIdeas</h1>
<p><a href="https://agent.onlyideas.art/">Open the reading room</a></p>
<p><a href="./privacy.html">Privacy</a> · <a href="./terms.html">Terms</a> ·
<a href="./support.html">Support</a> · <a href="./delete-account.html">Delete account</a></p></html>
''')
print(f'Exported public policy pages to {args.output}')
