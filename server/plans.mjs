export const plans = Object.freeze([
  { id:'reader', name:'Reader', credits:200, agentTurns:40, targetUSD:'2.99', apple:'art.onlyideas.reader.monthly', google:'onlyideas_reader_monthly' },
  { id:'researcher', name:'Researcher', credits:1200, agentTurns:80, targetUSD:'14.99', apple:'art.onlyideas.researcher.monthly', google:'onlyideas_researcher_monthly' },
  { id:'studio', name:'Studio', credits:2600, agentTurns:160, targetUSD:'29.99', apple:'art.onlyideas.studio.monthly', google:'onlyideas_studio_monthly' },
]);
export const planForProduct = (platform, product) => plans.find(p => p[platform] === product);
