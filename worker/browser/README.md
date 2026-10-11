# OnlyIdeas retrieval browser

A real, sandboxed Chromium instance for bounded public paper retrieval. See
[the operating guide](../../docs/operations/browser-retrieval.md).

`seccomp.json` derives from Microsoft Playwright v1.64.0's
`utils/docker/seccomp_profile.json` (Apache-2.0; see `LICENSE.seccomp`). The local
change permits `chroot` inside Chromium's unprivileged user namespace without
adding container capabilities. Chromium's own sandbox stays enabled.

The browser container uses `--network none`. Only the public-only proxy's Unix
socket is mounted. Do not mount a browser profile, home directory, credentials
or the Docker socket. Runtime configuration is outside this directory and Git.
