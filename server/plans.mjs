export const plans = Object.freeze([
  { id:'reader', name:'Reader', credits:200, pages:200, fetches:60, stripe:'onlyideas_reader_monthly_v1', agentTurns:40, targetUSD:'2.99', apple:'art.onlyideas.reader.monthly', google:'onlyideas_reader_monthly' },
  { id:'researcher', name:'Researcher', credits:1200, pages:1200, fetches:300, stripe:'onlyideas_researcher_monthly_v1', agentTurns:80, targetUSD:'14.99', apple:'art.onlyideas.researcher.monthly', google:'onlyideas_researcher_monthly' },
  { id:'studio', name:'Studio', credits:2600, pages:2600, fetches:700, stripe:'onlyideas_studio_monthly_v1', agentTurns:160, targetUSD:'29.99', apple:'art.onlyideas.studio.monthly', google:'onlyideas_studio_monthly' },
]);
export const planForProduct = (platform, product) => plans.find(p => p[platform] === product);
