#!/usr/bin/env python3
"""Expire generated OnlyIdeas database snapshots, never configuration or keys."""
import pathlib
import time

history = pathlib.Path('/root/.config/onlyideas/history')
cutoff = time.time() - 30 * 86400
removed = 0
for path in history.glob('*/state*.sqlite'):
    if path.is_file() and not path.is_symlink() and path.stat().st_mtime < cutoff:
        path.unlink()
        removed += 1
print(f'OnlyIdeas database snapshots expired: {removed}')
