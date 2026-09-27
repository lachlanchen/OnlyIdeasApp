# Community review and deletion

Public comments and publication jobs wait for human review. Private papers,
private comments and agent conversations remain private. Moderators must review
the queue and reports daily and address urgent safety reports promptly. Contact:
contact@lazying.art. Never approve a private comment for public display.

On the application host, run as the OnlyIdeas service user with its Node runtime:

```sh
node tools/moderate.mjs /var/lib/onlyideas queue
node tools/moderate.mjs /var/lib/onlyideas approve-comment COMMENT_ID
node tools/moderate.mjs /var/lib/onlyideas remove-comment COMMENT_ID
node tools/moderate.mjs /var/lib/onlyideas approve-paper PUBLICATION_JOB_ID
node tools/moderate.mjs /var/lib/onlyideas reject-paper PUBLICATION_JOB_ID
node tools/moderate.mjs /var/lib/onlyideas suspend ACCOUNT_ID
node tools/moderate.mjs /var/lib/onlyideas resolve-report REPORT_ID
```

Queue output contains private reports and moderation data. Keep it off Git,
public logs and screenshots. Inspect the paper, source license and every figure
before approving publication. The public repository is a separate permanent
publication destination; disclose its history/fork retention before confirmation.

Blocking is mutual for visibility and interaction. Blocks can be removed in
Profile. Suspension revokes existing app sessions and stops queued jobs; it
does not silently delete evidence. A support operator should inspect any running
publication before suspending its owner. Reports remain until resolved.

Account deletion revokes Apple authorization where applicable, removes active
account data and app sessions, and removes private figures and temporary PDFs.
In-flight jobs cannot restore the deleted identity. A later sign-in starts a
new account, with no access to the old data. Minimal deletion identifiers remain
for that protection. Offline devices clear private downloads on their next
authenticated connection. Already downloaded public copies cannot be recalled.

The OnlyIdeas backup expiration timer removes generated SQLite snapshots after
30 days. Configuration and signing keys are excluded. Never restore a database
snapshot without merging current deletion identifiers and reapplying deletions;
never restore deleted private files. Record restoration privately and run the
deletion/isolation tests before opening ingress. Existing releases can be rolled
back without rolling back account data.

Generated figure backups named `papers.retained.tar.gz` and their
`manifest.retained.json` expire alongside database snapshots after 30 days.
The live `/var/lib/onlyideas` database and paper directory are outside this cleanup.
Owner-requested real-paper verification results remain in the live private library;
“test result” is not permission to reset the database or remove a paper.
Run `python3 -m unittest discover -s tests -p test_backup_retention.py` when changing
retention rules; it verifies recent backups, live data, credentials and symlinks
are preserved.

## Shared-by-default imports

Current clients show Shared / Only me before import and default to Shared. Each
shared request creates one durable publication review job after conversion; the
reader can open the personal result while review is pending. Moderation must
verify the source license and all figures before approving the job. Unknown
permissions remain pending; neither a public URL nor an agent message grants
redistribution rights. The small curated registry in `server/sharing.mjs` records
verified source metadata but does not bypass community approval.

Legacy clients that omit a visibility value keep their previous private behavior.
Choosing Shared again for an existing completed import queues review without a
second PDF conversion. Sharing a paper does not publish its private comments,
notes, AI artifacts or agent conversation. Public papers are readable signed out.
