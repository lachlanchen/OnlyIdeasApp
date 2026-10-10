import {hash} from './domain.mjs';
// Call only AFTER authentication, current visibility and block checks. A cache
// validator never establishes permission to read a paper.
export function conditionalResponse(req,res,bytes,type='application/json; charset=utf-8') {
 const tag='"'+hash(bytes)+'"';
 res.setHeader('ETag',tag);res.setHeader('Cache-Control','private, no-cache');res.setHeader('Vary','Origin, Authorization, Cookie');res.setHeader('Access-Control-Expose-Headers','ETag');
 if(String(req.headers['if-none-match']||'').split(',').map(s=>s.trim()).includes(tag)){res.writeHead(304);res.end();return;}
 res.writeHead(200,{'Content-Type':type});res.end(req.method==='HEAD'?undefined:bytes);
}
export const conditionalJSON=(req,res,value)=>conditionalResponse(req,res,JSON.stringify(value));
