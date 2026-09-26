#!/usr/bin/env python3
"""Build using a project-specific upload key, never printed or stored in Git."""
import json, os, pathlib, subprocess
root = pathlib.Path(__file__).resolve().parents[2]
config = pathlib.Path.home()/'.config/onlyideas/android/signing.json'
if config.stat().st_mode & 0o077:
    raise SystemExit('Signing config must be mode 600.')
settings = json.loads(config.read_text())
env = os.environ.copy()
env.update(ONLYIDEAS_KEYSTORE=settings['keystore'], ONLYIDEAS_STORE_PASSWORD=settings['password'])
subprocess.run(['./gradlew','--no-daemon','--max-workers=2',':app:lintRelease',':app:assembleRelease',':app:bundleRelease',':app:assembleDebug'], cwd=root/'android', env=env, check=True)
