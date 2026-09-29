#!/usr/bin/env python3
"""One private, persistent OnlyIdeas store desktop. Linux; no credentials in Git."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.runtime/store-desktop'
PROFILE = Path.home() / '.local/share/onlyideas-store-chrome'
DISPLAY, VNC, NOVNC, CDP = ':190', 5990, 6190, 9490
URL = f'http://127.0.0.1:{NOVNC}/vnc.html?autoconnect=1&resize=scale&view_only=0&shared=0&reconnect=0'
os.umask(0o077)
STATE.mkdir(parents=True, exist_ok=True)


def identity(pid):
    try:
        fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        return None if fields[0] == 'Z' else fields[19]
    except (OSError, IndexError):
        return None


def alive(row):
    return row.get('born') is not None and identity(row['pid']) == row['born']


def read_state():
    p = STATE / 'state.json'
    return json.loads(p.read_text()) if p.exists() else {}


def save(data):
    p = STATE / 'state.tmp'
    p.write_text(json.dumps(data, indent=2) + '\n')
    p.replace(STATE / 'state.json')


def snapshot(source):
    source = source.expanduser().resolve()
    if PROFILE.exists():
        raise RuntimeError('Profile already exists; reuse it. Never overwrite a live or established profile.')
    if not (source / 'Local State').is_file() or not (source / 'Default').is_dir():
        raise RuntimeError('Source must be an existing Chrome user-data directory.')
    # Snapshot authentication databases online, including their WAL contents.
    # Never copy locks, caches, tabs, extensions, or an inconsistent live LevelDB.
    staging = PROFILE.with_name(PROFILE.name + '.seeding')
    staging.mkdir(mode=0o700)
    try:
        for relative in ('Local State', 'Default/Bookmarks', 'Default/Cookies', 'Default/Network/Cookies',
                         'Default/Login Data', 'Default/Login Data For Account'):
            src = source / relative
            if not src.is_file():
                continue
            dst = staging / relative
            dst.parent.mkdir(parents=True, exist_ok=True)
            with src.open('rb') as stream:
                is_sqlite = stream.read(16) == b'SQLite format 3\x00'
            if is_sqlite:
                deadline = time.monotonic() + 3
                def progress(*_):
                    if time.monotonic() > deadline:
                        raise TimeoutError('Profile database snapshot timed out; source remains untouched.')
                try:
                    with sqlite3.connect(src.as_uri() + '?mode=ro', uri=True, timeout=1) as inp, sqlite3.connect(dst) as out:
                        inp.backup(out, pages=256, progress=progress)
                except (TimeoutError, sqlite3.OperationalError):
                    # Chrome may hold an exclusive SQLite lock. Read a stable
                    # DB + journal/WAL snapshot, then recover only that copy.
                    dst.unlink(missing_ok=True)
                    files = [src, Path(str(src) + '-wal'), Path(str(src) + '-journal')]
                    def stamps():
                        return [(p.name, p.stat().st_size, p.stat().st_mtime_ns, p.stat().st_ctime_ns)
                                for p in files if p.exists()]
                    for attempt in range(3):
                        with tempfile.TemporaryDirectory(prefix='sqlite-', dir=staging) as tmp:
                            before = stamps()
                            for p in files:
                                if p.exists():
                                    shutil.copyfile(p, Path(tmp) / p.name)
                            if before != stamps():
                                time.sleep(.2)
                                continue
                            with sqlite3.connect(Path(tmp) / src.name) as inp, sqlite3.connect(dst) as out:
                                if inp.execute('PRAGMA quick_check').fetchone() != ('ok',):
                                    raise RuntimeError('Private database snapshot integrity failed.')
                                inp.backup(out)
                            break
                    else:
                        raise RuntimeError('Profile database kept changing; retry seeding later.')
            else:
                shutil.copyfile(src, dst)
            dst.chmod(0o600)
        # Website sessions and saved passwords are independent of Chrome Sync.
        # Never clone the browser's OAuth refresh tokens/account reconciliation
        # state: two browsers using those tokens can interfere with sign-in.
        local_path = staging / 'Local State'
        local = json.loads(local_path.read_text())
        local.pop('profile', None)
        local_path.write_text(json.dumps(local))
        prefs = {'profile': {'exit_type': 'Normal', 'exited_cleanly': True},
                 'session': {'restore_on_startup': 1, 'startup_urls': []}}
        (staging / 'Default/Preferences').write_text(json.dumps(prefs))
        staging.rename(PROFILE)
        (STATE / 'profile-seed.json').write_text(json.dumps({
            'source': str(source), 'destination': str(PROFILE), 'at': time.time(),
            'method': 'SQLite online backup; selected browser configuration; no shared profile lock'
        }, indent=2))
    except BaseException:
        shutil.rmtree(staging)
        raise


def stop(data):
    rows = list(data.get('processes', {}).values())
    # Chrome flushes its private profile before its display is stopped.
    chrome = data.get('processes', {}).get('chrome', {})
    if alive(chrome):
        try:
            import websocket
            with urllib.request.urlopen(f'http://127.0.0.1:{CDP}/json/version', timeout=3) as response:
                endpoint = json.load(response)['webSocketDebuggerUrl']
            connection = websocket.create_connection(endpoint, timeout=3, suppress_origin=True)
            connection.send(json.dumps({'id': 1, 'method': 'Browser.close'}))
            connection.close()
        except Exception as error:
            print('Graceful browser close fallback:', type(error).__name__, file=sys.stderr)
            # Signal only the browser first, not its network/database children.
            if alive(chrome):
                os.kill(chrome['pid'], signal.SIGTERM)
        end = time.monotonic() + 10
        while alive(chrome) and time.monotonic() < end:
            time.sleep(.1)
    for row in reversed(rows):
        if alive(row):
            os.killpg(row['pid'], signal.SIGTERM)
            end = time.monotonic() + 5
            while alive(row) and time.monotonic() < end:
                time.sleep(.1)
            if alive(row):
                os.killpg(row['pid'], signal.SIGKILL)
    data['stoppedAt'] = time.time()
    save(data)
    handoff = STATE / 'handoff.md'
    if handoff.exists():
        with handoff.open('a') as stream:
            stream.write('\nRuntime stopped; profile retained. Consult state.json before connecting.\n')


def serve():
    # Held for the full runtime; concurrent starts reuse this session.
    with (STATE / 'runtime.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        old = read_state()
        if any(alive(r) for r in old.get('processes', {}).values()):
            raise RuntimeError('Owned processes survived an earlier supervisor; run stop first.')
        if Path('/tmp/.X11-unix/X190').exists() or Path('/tmp/.X190-lock').exists():
            raise RuntimeError('Display already allocated; refusing to touch it.')
        for port in (VNC, NOVNC, CDP):
            with socket.socket() as probe:
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                probe.bind(('127.0.0.1', port))
        PROFILE.mkdir(mode=0o700, parents=True, exist_ok=True)
        PROFILE.chmod(0o700)
        data = dict(profile=str(PROFILE), display=DISPLAY, novnc=URL,
                    cdp=f'http://127.0.0.1:{CDP}', supervisor={'pid': os.getpid(), 'born': identity(os.getpid())}, processes={})
        running = True
        def terminate(*_):
            nonlocal running
            running = False
        signal.signal(signal.SIGTERM, terminate)
        signal.signal(signal.SIGINT, terminate)
        env = dict(os.environ, DISPLAY=DISPLAY, XAUTHORITY='')
        children = []
        def launch(name, args):
            with (STATE / (name + '.log')).open('a') as log:
                p = subprocess.Popen(args, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
            children.append(p)
            data['processes'][name] = {'pid': p.pid, 'born': identity(p.pid)}
            save(data)
            return p
        try:
            launch('xvfb', ['Xvfb', DISPLAY, '-screen', '0', '1600x1000x24', '-nolisten', 'tcp', '-ac', '-noreset'])
            end = time.monotonic() + 10
            while not Path('/tmp/.X11-unix/X190').exists():
                if time.monotonic() > end:
                    raise RuntimeError('X display did not start.')
                time.sleep(.1)
            launch('vnc', ['x11vnc', '-display', DISPLAY, '-localhost', '-nopw', '-forever', '-nevershared', '-noxdamage', '-rfbport', str(VNC)])
            launch('novnc', ['websockify', '--web=/usr/share/novnc', f'127.0.0.1:{NOVNC}', f'127.0.0.1:{VNC}'])
            chrome = launch('chrome', ['google-chrome', f'--user-data-dir={PROFILE}', f'--remote-debugging-port={CDP}',
                '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check',
                '--disable-sync',
                '--window-size=1600,1000', '--window-position=0,0', '--disable-session-crashed-bubble', 'about:blank'])
            (STATE / 'handoff.md').write_text(f'# OnlyIdeas store desktop\n\nViewer: {URL}\n\nCDP: {data["cdp"]}\n\nProfile: `{PROFILE}` (private, persistent)\n\nDisplay {DISPLAY}; VNC {VNC}. PIDs/start times: state.json.\n\nStart/status/stop: `python3 tools/store-desktop.py start|status|stop` from OnlyIdeasApp.\n\nOne supervisor owns all four processes and the fit guard. Stop after review; profile remains. Shared 6165/9485 is untouched. Provider expiry may still require sign-in.\n')
            while running and all(p.poll() is None for p in children):
                result = subprocess.run(['xdotool', 'search', '--onlyvisible', '--pid', str(chrome.pid)], env=env, capture_output=True, text=True)
                for window in result.stdout.split():
                    geometry = subprocess.run(['xdotool', 'getwindowgeometry', '--shell', window], env=env, capture_output=True, text=True).stdout
                    values = dict(line.split('=', 1) for line in geometry.splitlines() if '=' in line)
                    if int(values.get('WIDTH', 0)) >= 700 and int(values.get('HEIGHT', 0)) >= 450:
                        if any(values.get(k) != v for k, v in dict(X='0', Y='0', WIDTH='1600', HEIGHT='1000').items()):
                            subprocess.run(['xdotool', 'windowmove', window, '0', '0', 'windowsize', window, '1600', '1000'], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(1.5)
        finally:
            stop(data)
            for p in children:
                p.wait()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['seed', 'start', 'status', 'stop', '_serve'])
parser.add_argument('--source', type=Path, help='Explicit existing profile to snapshot once; seed only')
args = parser.parse_args()
if args.action == '_serve':
    serve()
else:
    with (STATE / 'command.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        data = read_state()
        active = alive(data.get('supervisor', {}))
        if args.action == 'seed':
            if active or not args.source:
                raise RuntimeError('Seed requires --source and a stopped desktop.')
            snapshot(args.source)
            print('Private profile seeded; source untouched. Provider sign-in status is checked separately.')
        elif args.action == 'start':
            if not active:
                with (STATE / 'supervisor.log').open('a') as log:
                    p = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '_serve'], stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
                end = time.monotonic() + 20
                while time.monotonic() < end:
                    if p.poll() is not None:
                        raise RuntimeError('Desktop startup failed; inspect private supervisor.log.')
                    current = read_state()
                    if current.get('supervisor', {}).get('pid') != p.pid or not alive(current.get('processes', {}).get('chrome', {})):
                        time.sleep(.2)
                        continue
                    try:
                        with urllib.request.urlopen(f'http://127.0.0.1:{CDP}/json/version', timeout=1):
                            break
                    except OSError:
                        time.sleep(.2)
                else:
                    raise RuntimeError('Desktop not ready; inspect status/logs before retrying.')
            print(URL)
        elif args.action == 'stop':
            if active:
                os.kill(data['supervisor']['pid'], signal.SIGTERM)
                end = time.monotonic() + 25
                while alive(data['supervisor']) and time.monotonic() < end:
                    time.sleep(.2)
            elif any(alive(r) for r in data.get('processes', {}).values()):
                stop(data)
            print('Owned runtime stopped; private profile retained.' if not any(alive(r) for r in data.get('processes', {}).values()) else 'Cleanup still running; inspect status.')
        else:
            print(json.dumps({'running': active, 'novnc': URL, 'cdp': f'http://127.0.0.1:{CDP}',
                'processes': {k: dict(v, alive=alive(v)) for k, v in data.get('processes', {}).items()}}, indent=2))
