# Isolated store desktop

OnlyIdeas store operations use a dedicated Chrome process, persistent private
profile, X display and noVNC endpoint. Other projects keep their own browser
windows and CDP connections. Never run two Chromes against one user-data directory.

| Resource | OnlyIdeas |
| --- | --- |
| Display | `:190`, 1600 × 1000, 24 bit |
| VNC | `127.0.0.1:5990` |
| noVNC | `http://127.0.0.1:6190/vnc.html?autoconnect=1&resize=scale&view_only=0&shared=0&reconnect=0` |
| CDP | `http://127.0.0.1:9490` |
| Profile | `~/.local/share/onlyideas-store-chrome` |
| Ownership and logs | `.runtime/store-desktop/` (ignored, private) |

From this repository:

Requires Chrome, Xvfb, x11vnc, websockify/noVNC, xdotool, Python 3 and
`websocket-client` (already installed on the shared workstation).

```sh
python3 tools/store-desktop.py start
python3 tools/store-desktop.py status
python3 tools/store-desktop.py stop
```

Start reuses an existing live runtime. It refuses occupied ports or displays;
it never kills their owners. A file lock prevents duplicate supervisors. The
supervisor owns Chrome, Xvfb, x11vnc, websockify and the window-fit loop. Stop
first requests a graceful CDP `Browser.close` so cookies reach disk, checks PID
start times, terminates only the remaining owned process groups, and retains
the profile. A subsequent start reuses the profile. Stop after evidence capture
unless the owner is actively using the desktop. Chrome windows fit the canvas;
noVNC scales that canvas and accepts only one interactive viewer.

## One-time reuse of an existing sign-in

On first setup only, before starting the new desktop:

```sh
python3 tools/store-desktop.py seed --source /absolute/path/to/existing/chrome-user-data
```

This requires an explicitly authorized source profile. It never stops or writes
the source browser. It copies website cookies, saved-password databases and
bookmarks into the new mode-700 directory. Files are private by default. SQLite
uses online backup; where Chrome holds an exclusive lock, a bounded stable
copy of the database and journal/WAL is recovered and integrity-checked privately.
A changing or invalid database aborts seeding. No cookie/password values are logged.

Chrome Sync tokens, account reconciliation preferences, open tabs, extensions,
caches and source lock files are excluded. Website authentication must not be
confused with signing the browser itself into a Google account. Browser sync is
disabled in this operator profile. Do not overwrite an established profile to
refresh login; sign in through its own visible window if the provider requires it.
Existing provider expiry, security challenges and OS-keyring binding still apply.
This cannot promise permanent Google or Apple authentication or bypass verification.

On 2026-09-30, the isolated browser opened the authenticated Google Play Console
and verified OnlyIdeas build21 in review without another login. A restart check
then found Google signed out in both source and copy. The initial broader profile
copy was narrowed to exclude Chrome account tokens. Shutdown was corrected to
flush Chrome before stopping its children. Repeated runtime restart and a
synthetic persistent-cookie check passed. Continued provider login is
not claimed. No further sign-in was required to complete the existing submission.

## CDP clients and other projects

Use `9490` for OnlyIdeas. Store owned target IDs in private runtime state; reconnect
to those IDs, never choose whichever tab happens to be frontmost. After creating
a target, wait for it to appear before resolving its Playwright page. Bring only
the owned tab forward. Read its app ID and visible title before store mutations.
Keep one tab per store and record receipts before closing it.

Other repos should use the same ownership pattern with different displays,
ports, profiles and state directories. They must not attach to OnlyIdeas' CDP or
copy a live user-data directory wholesale. Allocate their resources after checking
listeners and the workstation memory/process policy. Do not switch this project's
constants to another project's values while its runtime is active.
