# OnlyIdeas 0.1 architecture

## Paper format

`papers/<id>/paper.mmd` is the canonical text. `metadata.json` records title,
authors, source, permission, language, category, content revision and figure paths.
`figures/<sha256-prefix>.<extension>` keeps original extracted figure bytes with
content-addressed names. Section JSON is derived from MMD. TeX equations are part
of MMD, not a second full TeX copy. Export formats can be added on demand.

Mathpix `mmd.zip` embeds figures. Import fails if referenced assets are absent or
still point at temporary Mathpix images. Original uploaded/downloaded PDFs are
temporary and removed only after a complete converted paper has been saved.
Failed-job source files remain private for operator recovery. Operators should
review and remove abandoned failed-job sources after 7 days; automated retention
cleanup is a remaining operational gate.

The complete document is rendered once with mathpix-markdown-it's browser bundle,
then sanitized with DOMPurify. This preserves equation numbering and cross-references.
Only registered local paper assets may load as figures. HTML scripts, forms and
embedded frames are not accepted. Wide equations/tables scroll inside the reader.

## Services

The Node 22 service uses SQLite WAL and private files. It binds only loopback.
An existing Caddy ingress terminates TLS. The frontend is built on the workstation,
not the small cloud VM. No model weights or large build toolchains go to the cloud.

One durable worker handles conversion, translation, digest and publication jobs.
Provider receipt IDs are saved. An ambiguous paid submission cannot be resubmitted
automatically. A known receipt resumes polling. Public downloads validate and pin
DNS addresses, revalidate redirects, reject private addresses, and cap size/time.
PDFs are inspected with pdfinfo before submission. Default caps: 20 MB, 30 pages,
100 converted pages/day shared; 20 jobs/user/day and 40 assistant jobs/day shared.
No autonomous background search/download or spending occurs.

The model endpoint is configurable and compatible with LazyEdge's chat-completions
contract. The first verified hosted adapter uses DeepSeek Flash in non-thinking
mode. Text is untrusted model input; the model receives no tools, shell, browser,
filesystem access or publication authority. Generated artifacts stay separate from
the original, with model, date, source revision, section and language metadata.

## Accounts and discussion

A separate GitHub OAuth application requests only `read:user`. State, browser
binding, PKCE and an exact callback URL protect login. GitHub tokens are used once
for profile verification, then discarded. The app's own hashed opaque session is
held in a Secure HttpOnly SameSite cookie, with a sliding 90-day inactivity limit.
Logout invalidates it. Public mutations require exact Origin matching.

Threads and private notes live in SQLite, not Git history. An account can delete its
own comments; reports are stored for operator moderation. Comments made on a private
paper stay private even if that paper is later published. Public moderation workflow,
account deletion/export, abuse controls and independent multi-user review are gates
before a broad launch. The current preview should be used by invited testers.

## GitHub boundary

App code belongs in OnlyIdeasApp; cleared paper bundles in OnlyIdeas-papers.
Publishing is a separate, explicit action with a license/permission attestation.
Only CC0, CC BY, CC BY-SA or explicit author permission are accepted initially.
The public repository does not contain personal notebooks, private comments, tokens,
original PDF uploads or generated translations from private accounts.

A content token must be limited to the paper repository, or use its dedicated SSH
deploy key. Public content commits include only the paper bundle. Never install a
general personal GitHub token in the public-facing service.

## Next steps

Native iOS/Android packaging, offline paper downloads, bibliography search with
source-specific license discovery, semantic annotations across revised papers,
discussion GitHub mirroring, moderation/admin UI, account deletion/export, retention
automation, backup restore drill and additional language/accessibility review.
