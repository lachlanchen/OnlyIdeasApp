// Exact server-provisioned account IDs only; never trust names or client flags.
export const unlimitedAllowance=(config,account)=>typeof account==='string' && Array.isArray(config.allowanceExemptAccounts) && config.allowanceExemptAccounts.includes(account);
export const allowanceAccount=job=>job.requestedBy || job.owner;
export const countsAsRequest=job=>job.state!=='failed' || !!(job.submittedAt||job.ocrSubmittedAt||job.aiSubmittedAt);
export function conversionAllowance(store,config,job,now=Date.now()) {
 const limit=config.maxPagesPerDay || 100;
 const used=store.db.prepare("SELECT body FROM jobs WHERE json_extract(body,'$.submittedAt')>?").all(now-86400_000).map(r=>JSON.parse(r.body)).filter(j=>j.id!==job.id&&!unlimitedAllowance(config,allowanceAccount(j))).reduce((n,j)=>n+(j.pages||0),0);
 return {unlimited:unlimitedAllowance(config,allowanceAccount(job)),used,limit,remaining:Math.max(0,limit-used)};
}
