import http from 'node:http';
import net from 'node:net';
import {lookup} from 'node:dns/promises';
import {chmod,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ipaddr from 'ipaddr.js';
export function publicAddress(address){try{const a=ipaddr.process(address);return a.range()==='unicast';}catch{return false;}}
export async function publicTarget(authority,resolver=lookup) {
 const u=new URL('https://'+authority);
 if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||(u.port&&u.port!=='443'))throw Error('HTTPS only');
 const host=u.hostname.replace(/^\[|\]$/g,'');
 const addresses=net.isIP(host)?[{address:host,family:net.isIP(host)}]:await resolver(host,{all:true});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Public destinations only');
 return addresses.find(a=>a.family===4)||addresses[0];
}
export function createPublicProxy({resolve=publicTarget,maxBytes=80_000_000,maxConnections=160}={}){
 let total=0,count=0;const sockets=new Set();
 const server=http.createServer((req,res)=>{res.writeHead(403);res.end('HTTPS CONNECT only');});
 server.on('connect',async(req,client,head)=>{
  if(++count>maxConnections||total>=maxBytes){client.destroy();return;}
  sockets.add(client);client.on('error',()=>{});client.on('close',()=>sockets.delete(client));
  let upstream;
  const timer=setTimeout(()=>client.destroy(),6000);
  try{
   const target=await resolve(req.url);clearTimeout(timer);if(client.destroyed)return;
   upstream=net.connect({host:target.address,port:443,family:target.family});sockets.add(upstream);
   upstream.on('error',()=>client.destroy());upstream.on('close',()=>{sockets.delete(upstream);client.destroy();});client.on('close',()=>upstream.destroy());
   upstream.setTimeout(25_000,()=>upstream.destroy());client.setTimeout(25_000,()=>client.destroy());
   const account=chunk=>{total+=chunk.length;if(total>maxBytes)for(const s of sockets)s.destroy();};
   upstream.on('data',account);client.on('data',account);
   upstream.on('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);});
  }catch{clearTimeout(timer);if(!client.destroyed)client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');upstream?.destroy();}
 });
 server.on('close',()=>{for(const s of sockets)s.destroy();});return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path='/proxy/egress.sock';await rm(path,{force:true});const server=createPublicProxy();server.listen(path,()=>void chmod(path,0o600));}
