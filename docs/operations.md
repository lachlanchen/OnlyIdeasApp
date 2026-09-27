# Running OnlyIdeas

Node 22.13+ and `pdfinfo` (Poppler) are required. Build on a workstation.

```bash
npm ci
npm run check
npm run server
```

In another terminal run `npm run dev` for localhost development. The app is at
http://127.0.0.1:4182 and API at http://127.0.0.1:18628. If no config exists, the
service starts a loopback-only preview with local login and providers disabled.
Production must have an explicit configuration, HTTPS origin and development=false.

Configuration is JSON at `~/.config/onlyideas/config.json`, mode 600, or a path named
by `ONLYIDEAS_CONFIG`. Do not put credentials in shell history or command arguments.

```json
{
  "origin": "https://agent.onlyideas.art",
  "port": 18628,
  "development": false,
  "dataDir": "/var/lib/onlyideas",
  "webRoot": "/opt/onlyideas/current/dist",
  "maxPages": 30,
  "maxPagesPerDay": 100,
  "maxJobsPerUserPerDay": 20,
  "maxAssistantJobsPerDay": 40,
  "github": {
    "clientId": "SET_PRIVATELY",
    "clientSecret": "SET_PRIVATELY",
    "repository": "lachlanchen/OnlyIdeas-papers"
  },
  "mathpix": { "appId": "SET_PRIVATELY", "appKey": "SET_PRIVATELY" },
  "model": {
    "url": "https://api.deepseek.com/chat/completions",
    "name": "deepseek-flash",
    "token": "SET_PRIVATELY"
  }
}
```

Never enable local preview login behind a public reverse proxy. The public service
requires GitHub sign-in for uploads, notes, comments, conversions and AI requests.
Disable providers by removing their config, not by bypassing authentication.

## Deployment

Use the existing ingress, an unprivileged service account, systemd LoadCredential,
loopback service, immutable checksum-named release, and an exact previous symlink.
Validate Caddy before reload and probe unrelated sites before and after. No firewall
change is needed to add this host to the existing shared Caddy listener.

Use the private `.runtime/handoff.md` for real hosts, paths, owned runtime IDs,
provider activation, checksum and rollback state. It must contain no raw secrets.
The shared store desktop is not owned by OnlyIdeas; close only its recorded tab.

Back up SQLite with the SQLite backup API or `VACUUM INTO`, along with private
figure files. Keep a matching manifest; do not copy a live SQLite file without WAL.
No private data goes in Git. Restore testing is required before broad availability.

### Static policy mirror

Store policy checks encountered timeouts resolving the application's authoritative
DNS. The same privacy, terms, support and account-deletion content is also published
on this repository's `gh-pages` branch. Its canonical Pages address is
`https://lachlan.lazying.art/OnlyIdeasApp/` (the account's custom Pages domain).
Native apps and store forms use this mirror. The API origin remains unchanged.

After a policy change, run `python3 tools/export-policy-pages.py <empty-directory>`
and review/copy its output to a separate `gh-pages` checkout. Commit and push that
branch, then verify all four pages return HTTPS 200. The exporter has no deployment
side effects. Only these public HTML pages belong there; never copy runtime data,
credentials, paper payloads or the application database into the Pages branch.

## Source references

- [Mathpix document conversion](https://docs.mathpix.com/guides/pdf-processing)
- [Mathpix supported output formats](https://docs.mathpix.com/reference/supported-formats)
- [Scientific renderer](https://github.com/Mathpix/mathpix-markdown-it)
- [GitHub repository size guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- [DeepSeek API](https://api-docs.deepseek.com/)
