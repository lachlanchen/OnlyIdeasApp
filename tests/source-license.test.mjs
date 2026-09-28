import{test}from'node:test';import assert from'node:assert/strict';import{sourceLicense,verifySourceLicense}from'../server/source-license.mjs';
const html='<meta name="citation_pdf_url" content="https://arxiv.org/pdf/1234.56789v2"><a href="http://creativecommons.org/licenses/by/4.0/" title="Rights to this article">License</a>';
test('automatic sharing requires a matched PDF and explicit supported article license',async()=>{
 const proof=sourceLicense(html,'https://arxiv.org/abs/1234.56789v2','https://arxiv.org/pdf/1234.56789v2');assert.equal(proof.license,'CC-BY-4.0');assert.equal(proof.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
 assert.equal(sourceLicense(html,'https://arxiv.org/abs/1234.56789v2','https://arxiv.org/pdf/1234.56789v1'),null);
 assert.equal(sourceLicense(html.replace('by/4.0','by-nc-sa/4.0'),'https://arxiv.org/abs/1234.56789v2','https://arxiv.org/pdf/1234.56789v2'),null);
 let calls=0;for(const j of [{sharing:'private'},{sharing:'shared',uploadSource:'https://arxiv.org/abs/1234.56789v2'},{sharing:'shared',metadata:{}}])assert.equal(await verifySourceLicense({...j,url:'https://arxiv.org/pdf/1234.56789v2'},{download:async()=>{calls++;return Buffer.from(html)}}),null);assert.equal(calls,0);
});
