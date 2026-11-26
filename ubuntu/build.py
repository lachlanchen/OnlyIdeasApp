#!/usr/bin/python3
"""Build the local Ubuntu package without installing it or using root."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

source = Path(__file__).resolve().parent
app = json.loads((source / "app.json").read_text())
parser = argparse.ArgumentParser()
parser.add_argument("out", type=Path)
args = parser.parse_args()
out = args.out.resolve()
out.mkdir(parents=True, exist_ok=True)
name, slug, app_id = (app[key] for key in ("name", "slug", "id"))
version, build = app["version"], app["build"]
assert re.fullmatch(r"[a-z]+", slug) and re.fullmatch(r"[a-z.]+", app_id)
assert re.fullmatch(r"\d+\.\d+\.\d+", version) and type(build) is int and build >= 1
debian_version = f"{version}-{build}"
filename = f"{slug}_{debian_version}_all.deb"

with tempfile.TemporaryDirectory(prefix=slug + "-deb-") as tmp:
    root = Path(tmp)
    def write(path, value, mode=0o644):
        target = root / path
        target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
        target.write_bytes(value.encode() if isinstance(value, str) else value)
        target.chmod(mode)

    write("DEBIAN/control", f"""Package: {slug}
Version: {debian_version}
Section: utils
Priority: optional
Architecture: all
Maintainer: LazyingArt <support@lazying.art>
Depends: python3, python3-gi, gir1.2-adw-1 (>= 1.5), gir1.2-webkit-6.0, gir1.2-soup-3.0
Recommends: fonts-noto-cjk
Homepage: https://lazying.art/downloads/ubuntu/#{slug}
Description: {name} reader for the GNOME desktop
 Open the {name} library with desktop navigation, zoom, and file saving.
""")
    write(f"usr/lib/{slug}/desktop.py", (source / "desktop.py").read_bytes())
    write(f"usr/lib/{slug}/app.json", (source / "app.json").read_bytes())
    write(f"usr/bin/{slug}", f'#!/bin/sh\nexec /usr/bin/python3 /usr/lib/{slug}/desktop.py "$@"\n', 0o755)
    icon = source.parent / "public" / ("icon-512.png" if slug == "bunko" else "apple-touch-icon.png")
    png = icon.read_bytes()
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    size = int.from_bytes(png[16:20], "big")
    assert size == int.from_bytes(png[20:24], "big")
    write(f"usr/share/icons/hicolor/{size}x{size}/apps/{app_id}.png", png)
    handler = "MimeType=x-scheme-handler/art.lazying.bunko;\n" if slug == "bunko" else ""
    write(f"usr/share/applications/{app_id}.desktop", f"""[Desktop Entry]
Type=Application
Name={name}
Comment=Open the {name} library
Exec={slug} %u
Icon={app_id}
Terminal=false
Categories=Education;Literature;
StartupNotify=true
{handler}""")
    editor = shutil.which("desktop-file-validate")
    if editor:
        subprocess.run([editor, str(root / f"usr/share/applications/{app_id}.desktop")], check=True)
    files = sorted(p for p in root.rglob("*") if p.is_file() and "DEBIAN" not in p.relative_to(root).parts)
    write("DEBIAN/md5sums", "".join(f"{hashlib.md5(p.read_bytes(), usedforsecurity=False).hexdigest()}  {p.relative_to(root)}\n" for p in files))
    root.chmod(0o755)
    for directory in root.rglob("*"):
        if directory.is_dir():
            directory.chmod(0o755)
    output = out / filename
    if output.exists():
        raise SystemExit(f"Package already exists: {output}")
    subprocess.run(["dpkg-deb", "--root-owner-group", "--build", "-Zgzip", str(root), str(output)],
                   check=True, env=dict(os.environ, SOURCE_DATE_EPOCH="1795651200"))
print(json.dumps({"name": name, "slug": slug, "version": version, "build": build, "filename": filename,
                  "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}))
