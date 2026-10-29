import {createSession,settings,step,advance,roles} from './terminal-engine.mjs';
import {mountDesk,renderDesk} from './desk.js';
mountDesk();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const key='nightjar.paper.v1';let running=false,session=createSession(),filterTrace=null,storageOK=true;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const time=at=>new Date(at).toLocaleTimeString('en-GB',{hour12:false});
function toast(text){const el=$('.nj-toast');el.textContent=text;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4500);}
try{const raw=localStorage.getItem(key);if(raw){const s=JSON.parse(raw);settings(s.config);if(s.version!==1||!Array.isArray(s.logs)||!Array.isArray(s.trades)||!Number.isFinite(s.balance)||s.balance<0||!Number.isInteger(s.cursor)||!Number.isInteger(s.filtered))throw Error('Invalid session');const reconciled=Math.round((s.config.initial+s.trades.reduce((sum,t)=>sum+t.pnl,0))*100);if(reconciled!==Math.round(s.balance*100))throw Error('Unreconciled session');session=s;}}catch{toast('Saved session unavailable. A fresh paper session is ready.');}
function save(){try{localStorage.setItem(key,JSON.stringify(session));storageOK=true;}catch{storageOK=false;toast('Browser storage unavailable. Export your session to retain the audit trail.');}}
function route(){
 const name=location.hash.slice(1)||'desk',valid=$$('[data-view]').some(v=>v.dataset.view===name),next=valid?name:'desk';
 $$('[data-view]').forEach(v=>v.classList.toggle('is-active',v.dataset.view===next));
 $$('[data-route]').forEach(v=>{v.classList.toggle('active',v.dataset.route===next);if(v.dataset.route===next)v.setAttribute('aria-current','page');else v.removeAttribute('aria-current');});
 $('#landingDetail').hidden=next!=='live';document.body.dataset.route=next;
 const nav=$('.topbar nav'),active=nav.querySelector('[aria-current="page"]');if(innerWidth<=680&&active)nav.scrollLeft=active.offsetLeft-nav.offsetLeft;
}
function render(){
 const wins=session.trades.filter(t=>t.pnl>0).length,losses=session.trades.filter(t=>t.pnl<0).length;
 const stats={balance:money(session.balance),initial:money(session.config.initial),pnl:money(session.balance-session.config.initial),trades:session.trades.length,filtered:session.filtered,record:wins+' / '+losses};
 $$('[data-stat]').forEach(el=>el.textContent=stats[el.dataset.stat]);
 $$('[data-session-status]').forEach(el=>el.textContent=session.halted?'LOSS STOP':running?'RUNNING':'PAUSED');
 $$('[data-agent-status]').forEach(el=>el.textContent=running?'paper':'ready');
 $$('[data-action="toggle"]').forEach(el=>{el.textContent=session.halted?'LOSS STOP · NEW SESSION':running?'PAUSE PAPER SESSION':'START PAPER SESSION';el.setAttribute('aria-pressed',String(running));});
 $('[data-last-trace]').textContent=session.logs[0]?.trace||'AWAITING PAPER SESSION';
 $('.awaiting strong').textContent=session.halted?'session loss stop reached':running?'six agents. one decision trace.':'ready for the night shift';
 $('.awaiting span').textContent=running?'synthetic replay running · no live orders':'synthetic market replay · execution adapter';
 $('[data-feed]').innerHTML=session.logs.slice(0,5).map(l=>'<p><time>'+time(l.at)+'</time><b>'+esc(l.agent)+'</b><span>'+esc(l.decision)+'</span><em>'+esc(l.reason)+'</em></p>').join('')||'<p>Start a paper session to inspect agent decisions.</p>';
 const agent=$('#agentFilter').value;
 const logs=session.logs.filter(l=>(agent==='all'||l.agent===agent)&&(!filterTrace||l.trace===filterTrace));
 $('[data-decisions]').innerHTML=logs.slice(0,300).map(l=>'<tr><td>'+time(l.at)+'</td><td>'+esc(l.trace)+'</td><td>'+esc(l.agent)+'</td><td class="'+(l.decision==='REJECT'?'nj-red':'')+'">'+esc(l.decision)+'</td><td>'+esc(l.reason)+'</td></tr>').join('')||'<tr><td colspan="5">No matching decisions. Start a paper session or change the filter.</td></tr>';
 const title=$('[data-view="lineage"] .subhead>span');title.textContent=filterTrace?'trace '+filterTrace+' · click to clear':'decision audit / newest first (latest 300)';
 title.style.cursor=filterTrace?'pointer':'default';title.onclick=()=>{filterTrace=null;render();};
 $('[data-trades]').innerHTML=session.trades.slice(0,200).map(t=>'<tr><td>'+esc(t.trace)+'<br><small>'+time(t.at)+'</small></td><td>'+esc(t.symbol)+'</td><td>'+money(t.size)+'</td><td class="'+(t.pnl<0?'nj-red':'nj-green')+'">'+money(t.pnl)+'</td><td>'+money(t.balance)+'</td><td><button data-trace="'+esc(t.trace)+'">inspect</button></td></tr>').join('')||'<tr><td colspan="6">No closed trades. Rejected candidates never create a ledger entry.</td></tr>';
 $('[data-agents]').innerHTML=roles.map(([name,role,description],i)=>{const log=session.logs.find(l=>l.agent===name);return '<article class="machine-tile nj-agent"><header>0'+i+' / '+name+' <span>'+(running?'PAPER ACTIVE':'STANDBY')+'</span></header><div class="nj-agent-body"><span class="mini-cell"><i></i><i></i><b></b></span><h2>'+name+'</h2><small>'+role+'</small><p>'+description+'</p><pre>'+esc(log?log.decision+' / '+log.trace+'\n'+log.reason:'Waiting for first paper decision.')+'</pre></div><footer>ROLE SIMULATOR / '+(log?time(log.at):'NO EVENTS')+'</footer></article>';}).join('');
 const notice=$('#sessionMessage');if(!storageOK)notice.textContent='Browser storage unavailable. Export for a durable copy.';
 renderDesk(session,running);
}
function tick(){if(!running)return;try{session=advance(session);if(session.halted)running=false;save();render();}catch(error){running=false;render();toast('Paper replay paused: '+error.message);}}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.addEventListener('click',event=>{
 const trace=event.target.closest('[data-trace]');if(trace){filterTrace=trace.dataset.trace;$('#agentFilter').value='all';location.hash='lineage';render();return;}
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='toggle'){if(session.halted){location.hash='spawn';return;}running=!running;lastReplayTick=performance.now();if(running)tick();else{save();render();}}
 if(action==='export')download('nightjar-paper-session.json',JSON.stringify({...session,exportedAt:new Date().toISOString(),mode:'PAPER / SYNTHETIC'},null,2),'application/json');
 if(action==='csv'){const headers=['trace','at','symbol','size','pnl','balance','fees','slippage','mode','reason'];const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';download('nightjar-paper-trades.csv',[headers.join(','),...session.trades.map(t=>headers.map(k=>quote(t[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8');}
});
$('#agentFilter').addEventListener('change',render);
$('#sessionForm').addEventListener('submit',e=>{e.preventDefault();try{const form=new FormData(e.currentTarget),config=Object.fromEntries(['initial','allocation','slippage','lossLimit'].map(k=>[k,Number(form.get(k))]));const next=createSession(config);running=false;session=next;filterTrace=null;save();render();$('#sessionMessage').textContent='New paper session ready. No real funds are connected.';toast('New paper session created.');location.hash='live';}catch(error){$('#sessionMessage').textContent=error.message;}});
addEventListener('hashchange',route);
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;const routes=['live','mutations','lineage','treasury','spawn','manual','desk'];if(/^[0-6]$/.test(e.key))location.hash=routes[Number(e.key)];});
function clock(){const value=new Date().toLocaleTimeString('en-GB',{hour12:false});$('#clock').textContent=value+' LOCAL';const deskClock=$('[data-nd-clock]');if(deskClock)deskClock.textContent=value;}
for(const [k,v] of Object.entries(session.config)){const input=$('#sessionForm [name="'+k+'"]');if(input)input.value=v;}
let replaySpeed=1,lastReplayTick=0;
document.addEventListener('change',event=>{if(event.target.id==='nd-speed')replaySpeed=Number(event.target.value);});
route();render();clock();if(new URLSearchParams(location.search).get("autoplay")==="1"&&!session.halted){running=true;lastReplayTick=performance.now();tick();}setInterval(clock,1000);setInterval(()=>{if(performance.now()-lastReplayTick>=3000/replaySpeed){lastReplayTick=performance.now();tick();}},150);

