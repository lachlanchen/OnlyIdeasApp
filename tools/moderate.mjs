// Run only on the application host, under its service account. No public admin API.
import { Store } from '../server/store.mjs';
import { moderate } from '../server/community.mjs';
const [directory, action = 'queue', id] = process.argv.slice(2);
if (!directory) throw Error('Usage: node tools/moderate.mjs DATA_DIRECTORY [queue | approve-comment ID | remove-comment ID | approve-paper JOB_ID | reject-paper JOB_ID | suspend ACCOUNT_ID | resolve-report ID]');
process.umask(0o077);
const store = new Store(directory);
try {
  if (action === 'queue') {
    console.log(JSON.stringify({
      reports: store.db.prepare('SELECT id,body FROM reports').all(),
      comments: store.db.prepare("SELECT id,owner,body FROM comments WHERE json_extract(body,'$.visibility') IN ('public','pending') AND COALESCE(json_extract(body,'$.moderation'),'pending')!='approved'").all(),
      publications: store.db.prepare("SELECT id,owner,body FROM jobs WHERE state='awaiting_review'").all(),
    }, null, 2));
  } else console.log(JSON.stringify(moderate(store, action, id)));
} finally { store.close(); }
