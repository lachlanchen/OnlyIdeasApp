import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.mjs';
import { makePaper } from '../server/domain.mjs';
import { requestSharing, reviewedSource } from '../server/sharing.mjs';
import { moderate, visibleComments } from '../server/community.mjs';

test('sharing queues review, keeps private data private and rejects unsupported publication', () => {
 const dir=mkdtempSync(join(tmpdir(),'onlyideas-sharing-'));const s=new Store(dir);
 try {
  const p=makePaper({id:'verified',owner:'reader',title:'Original',mmd:'# Original\n\nResearch.',source:'https://arxiv.org/pdf/2205.01833v2'});s.savePaper(p);
  assert.equal(requestSharing(s,p,'private'),null);assert.equal(s.jobs('reader').length,0);
  const j=requestSharing(s,p,'shared');assert.equal(j.state,'awaiting_review');assert.equal(s.papers().length,0);
  assert.equal(requestSharing(s,p,'shared').id,j.id);assert.equal(s.paper(p.id).license,'CC0-1.0');
  s.db.prepare('INSERT INTO notes VALUES(?,?,?)').run('reader',p.id,'Private note');
  const comment={id:'comment',owner:'reader',visibility:'private',moderation:'private',text:'Private draft'};
  s.db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run(comment.id,p.id,'reader',JSON.stringify(comment),Date.now());
  moderate(s,'approve-paper',j.id);assert.equal(s.job(j.id).state,'queued');assert.equal(s.papers().length,0);
  p.visibility='public';s.savePaper(p);assert.equal(s.papers().length,1);assert.equal(visibleComments(s,p.id,null).length,0);
  assert.equal(s.db.prepare('SELECT body FROM notes WHERE owner=?').get('reader').body,'Private note');
  const unknown=makePaper({id:'unknown',owner:'reader',title:'Unknown',mmd:'Private source',source:'https://example.org/paper.pdf'});s.savePaper(unknown);
  const pending=requestSharing(s,unknown,'shared');assert.throws(()=>moderate(s,'approve-paper',pending.id),/license|permission/);
  assert.equal(s.paper(unknown.id).visibility,'private');
  assert.equal(reviewedSource('https://arxiv.org.evil.test/pdf/2205.01833v2'),undefined);
  assert.equal(reviewedSource('https://arxiv.org/pdf/2205.01833v2?other=paper'),undefined);
 }finally{s.close();rmSync(dir,{recursive:true,force:true})}
});
