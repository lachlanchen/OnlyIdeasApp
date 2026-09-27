"""Operator retention must never remove live data, credentials or linked files."""
import importlib.util
import os
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('retention', pathlib.Path(__file__).parents[1] / 'tools/expire-backups.py')
retention = importlib.util.module_from_spec(spec)
spec.loader.exec_module(retention)


class RetentionTest(unittest.TestCase):
    def test_only_old_generated_snapshot_files_expire(self):
        now = 2_000_000_000
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            history = root / 'history'
            old = history / 'old'
            recent = history / 'recent'
            old.mkdir(parents=True)
            recent.mkdir()
            def create(path, age):
                path.write_text('preserve evidence')
                os.utime(path, (now-age, now-age))
                return path
            names = ['state.retained.sqlite', 'papers.retained.tar.gz', 'manifest.retained.json']
            for name in names:
                create(old / name, 31*86400)
                create(recent / name, 29*86400)
            keep = [create(old / name, 31*86400) for name in ['config.before.json', 'private-key', 'paper.pdf']]
            live = create(root / 'state.sqlite', 31*86400)
            (old / 'state-linked.sqlite').symlink_to(live)
            outside = root / 'other-project'
            outside.mkdir()
            keep.append(create(outside / 'state.sqlite', 31*86400))
            (history / 'linked-directory').symlink_to(outside)
            self.assertEqual(retention.expire(history, now), 3)
            self.assertTrue(all(p.exists() for p in keep + [live, old/'state-linked.sqlite']))
            self.assertTrue(all((recent/n).exists() for n in names))
            self.assertFalse(any((old/n).exists() for n in names))


if __name__ == '__main__':
    unittest.main()
