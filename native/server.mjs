import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||4310),cache=new Map();
const publicFiles=new Set(['index.html','styles.css','native.css','app.mjs','view.mjs','market.mjs','model.mjs','打开独立终端.html','assets/noxvil-logo.png']);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',png:'image/png'};
createServer(async(req,res)=>{
 const reply=(status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(body);};
 try{
  if(req.method!=='GET'){reply(405,JSON.stringify({error:'Read-only server'}));return;}
  const url=new URL(req.url,'http://127.0.0.1'),path=decodeURIComponent(url.pathname);
  if(path.startsWith('/api/dex/')){
   const remote=path.slice(8),allowed=remote==='/token-profiles/latest/v1'||/^\/tokens\/v1\/solana\/[1-9A-HJ-NP-Za-km-z,]{32,1000}$/.test(remote)||/^\/latest\/dex\/pairs\/solana\/[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(remote);
   if(!allowed||url.search){reply(400,JSON.stringify({error:'Unsupported market endpoint'}));return;}
   const saved=cache.get(remote);if(saved&&Date.now()-saved.at<4000){reply(200,saved.body);return;}
   const upstream=await fetch('https://api.dexscreener.com'+remote,{signal:AbortSignal.timeout(12000),headers:{accept:'application/json'}});
   const body=await upstream.text();if(upstream.ok){JSON.parse(body);cache.set(remote,{at:Date.now(),body});}reply(upstream.status,body);return;
  }
  const file=path==='/'?'index.html':path.slice(1);if(!publicFiles.has(file)){reply(404,JSON.stringify({error:'Not found'}));return;}
  reply(200,await readFile(join(root,file)),types[file.split('.').at(-1)]||'application/octet-stream');
 }catch(error){reply(502,JSON.stringify({error:'Market connection unavailable',detail:error.message}));}
}).listen(port,'127.0.0.1',()=>console.log('NOXVIL native terminal: http://127.0.0.1:'+port));

