# OnlyIdeas for Ubuntu

Download the Debian package from [LazyingArt](https://lazying.art/downloads/ubuntu/#onlyideas).
The package has been tested on Ubuntu 24.04 LTS (x86-64). Install it with Ubuntu’s
package installer or `sudo apt install ./filename.deb`, replacing the filename
with the name of the downloaded package.

Open OnlyIdeas from the applications menu. The window uses the live reader with its
own persistent history, settings, and website storage. Use the desktop menu for
appearance, full screen, zoom, and package updates. New package versions open
the official download page. Account providers depend on availability in the
live app.

## Build from source

Run `python3 ubuntu/build.py /path/to/output` from the repository root.
The builder packages the GTK 4 and WebKitGTK host and generates the launcher,
icon, and checksums. Build scripts and the desktop host are mirrored between
Bunko and OnlyIdeas. App identities, data directories, and published packages
remain independent. Keep both hosts in step when changing shared behavior.
