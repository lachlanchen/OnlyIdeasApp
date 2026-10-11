# Public paper retrieval worker

OnlyIdeas tries shared/owned transcript reuse first, then bounded public HTTPS,
article HTML, citation PDF metadata and exact repository/index locations. Failed
identified papers can use a separate outbound worker with real Chromium in Docker.
It does not share the chat worker's token or browser profile.

## Retrieval order

1. Reuse the existing paper, figures and revision-keyed translations.
2. Use the existing 90-second download budget; normalize PMC/arXiv article URLs,
   accept complete HTTP 200/203 responses, and inspect exact OA locations.
3. On the workstation, check exact DOI records in Zenodo, Figshare, Europe PMC
   and Crossref. Crossref PDF links are candidates, not an assertion of access rights.
4. Open candidate pages in Chromium with ordinary JavaScript, redirects, TLS and
   fresh per-request cookies. Prefer complete article HTML to paid PDF conversion.
   Follow observed citation/download links, not guessed file URLs.
5. If needed, ask Codex for public bibliographic sources. Verify its DOI against
   Crossref or DataCite, then use the browser on matching candidates. A verified
   TechRxiv `.vN` can resolve its unversioned concept DOI; a different published
   DOI is not silently substituted. Verify the downloaded title/DOI before OCR.
6. Keep the source/upload recovery action when access remains unavailable.

CAPTCHAs, authentication, restricted deposits and missing/dead source files are
not automatically bypassed. Neither browser success nor “open access” grants a
republication license; the existing sharing and review rules still apply.

## Isolation and bounds

- Chromium runs as UID 1000, with its sandbox enabled, all container capabilities
  dropped, a read-only root, capped memory/CPU/processes and temporary storage.
- Its Docker network is `none`. A Unix socket is its only egress path, relayed to
  a separate small proxy container. The proxy permits HTTPS CONNECT only, checks
  all DNS answers, refuses private/reserved/mapped addresses and pins the chosen
  public address. It does not intercept TLS or expose a host port.
- No host browser cookies, credentials, private uploads, chat history, Docker
  socket or account data are mounted into the browser. Only the egress socket is
  mounted. The host worker receives limited public bibliographic metadata.
- One retrieval service and browser lane. Each browser batch is bounded to eight
  navigations, 90 seconds normally (120 maximum), 20 MB/PDF, 2 MB/HTML. Proxy
  traffic is capped at 80 MB. Both containers have a 150-second independent lifetime.
- The cloud queue has authenticated worker-only routes, a separate random token,
  parent-job binding, 60-second leases, 20-second heartbeats, at most two claims
  and a 420-second request deadline. Completion is rejected after cancellation,
  account suspension/deletion or lease loss. Result bytes are deleted on consumption.
- Codex keeps the existing operator-selected model and daily budget (currently
  12). A fresh quota check is required before spending; less than 5% remaining
  prevents a launch. Chat and retrieval serialize the full search/cache/quota
  transaction with Linux `flock`, released automatically on crash. Same-day
  verified metadata is reused. No shell, app, plugin or local-file tool is enabled.
- If the worker is offline, the existing upload recovery returns immediately
  rather than leaving an import waiting indefinitely. Existing credit, quota,
  deduplication and ambiguous Mathpix receipt protections remain in force.

## Install or update

1. Run `npm run check` with the qualified Pandoc path in `ONLYIDEAS_TEST_PANDOC`.
2. Build `worker/browser/Dockerfile`; inspect the actual Chromium version. The
   package lock pins Playwright. The current image uses Chromium 154.0.8037.92
   and Playwright 1.64.0. Record the base digest and final image ID before rollout.
3. Test real PDF and HTML retrieval, paper identity, preserved figures, and
   private-address rejection. The checked-in seccomp profile derives from
   [Playwright's Docker profile](https://github.com/microsoft/playwright/blob/v1.64.0/utils/docker/seccomp_profile.json),
   with `chroot` allowed inside Chromium's unprivileged sandbox namespace while
   the container retains no capabilities. Do not add `SYS_ADMIN` or disable the sandbox.
4. Stage an immutable API release; back up SQLite consistently and the protected
   configuration. Wait for the import and chat queues to be idle before switching.
5. Copy `tools/retrieval/config.example.json` to a mode-600 private configuration.
   Set a separate token, pin `image` to the qualified `sha256:…` ID, and configure
   the approved Codex home explicitly. Do not inherit a different interactive
   session's account profile. Never copy auth files into the image.
6. Add matching `browserRetrieval: {enabled: true, token, timeoutMs: 420000}` to
   the protected cloud config. The routes use the existing HTTPS ingress; no
   Caddy, firewall, DNS or tunnel change is needed.
7. Stage the local runtime with `tools/package-server.py`, including its runtime
   dependencies. Promote the chat and retrieval worker source together so both
   use the same Codex lock. Install `tools/retrieval/onlyideas-retrieval.service`;
   the example assumes this workstation's existing Node installation and paths.
8. Verify a real cloud queue → browser → full-text/figures conversion and an
   existing-paper reuse case. Check data preservation and stop test containers.
   Keep only the persistent lightweight worker service running between requests.

## Rollback and operations

Stop the retrieval service, restore the previous protected config and immutable
API/local-worker symlinks, then restart OnlyIdeas' services. Do not restore the
whole database over new user work; the additive retrieval tables can remain inert.
Preserve unrelated services and the shared ingress. The request queue and private
`last-retrieval.json` give bounded diagnostics; do not commit raw browser HTML,
PDFs, Codex events or configuration. A public-library paper remains the durable
content cache; temporary browser profiles are not retained.

The build source and live qualification are recorded in
[the dated receipt](../browser-retrieval-20261011.md). This backend update requires
no new iOS, Android, Mac or PWA bundle.
