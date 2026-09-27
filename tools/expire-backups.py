#!/usr/bin/env python3
"""Expire generated OnlyIdeas snapshots, never live data, configuration or keys."""
import pathlib
import time


def expire(history, now=None):
    cutoff = (time.time() if now is None else now) - 30 * 86400
    removed = 0
    if not history.is_dir() or history.is_symlink():
        return removed
    for directory in history.iterdir():
        if not directory.is_dir() or directory.is_symlink():
            continue
        candidates = list(directory.glob('state*.sqlite'))
        candidates += [directory / 'papers.retained.tar.gz', directory / 'manifest.retained.json']
        for path in candidates:
            if path.is_file() and not path.is_symlink() and path.stat().st_mtime < cutoff:
                path.unlink()
                removed += 1
    return removed


if __name__ == '__main__':
    history = pathlib.Path('/root/.config/onlyideas/history')
    print(f'OnlyIdeas generated snapshot files expired: {expire(history)}')
