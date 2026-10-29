import {createSession,settings,advance,fixture,validateCandidate,roles} from './terminal-engine.mjs';
import {connectVideoPanel,updateVideoPanel} from './video-panel.js';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const key='nightjar.paper.v1',playbackKey='noxvil.playback.v1';
let session=createSession(),running=false,traceFilter=null,speed=4,lastTick=performance.now(),storageOK=true;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const time=at=>new Date(at).toLocaleTimeString('en-GB',{hour12:false});
const decisionNames={CANDIDATE:'DISCOVER',PASS:'PASS',REJECT:'REJECT',SIZED:'SIZED',OPEN:'OPEN',CLOSED:'CLOSED',RECORDED:'RECORDED',SETTLED:'SETTLED',HALTED:'HALTED'};
const roleNames={Scout:'Discover pairs and volume signals',Guard:'Safety checks and vetoes',Sizer:'Size positions from current equity',Trigger:'Entries, exits and slippage limits',Scribe:'Record the reason for every decision',Ledger:'Settlement and ledger reconciliation'};
function toast(text){const element=$('.toast');element.textContent=text;element.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.hidden=true,4500);}
try{
 const raw=localStorage.getItem(key);
 if(raw){const parsed=JSON.parse(raw);settings(parsed.config);if(parsed.version!==1||!Array.isArray(parsed.logs)||!Array.isArray(parsed.trades)||!Number.isFinite(parsed.balance)||parsed.balance<0||!Number.isInteger(parsed.cursor)||!Number.isInteger(parsed.filtered))throw Error('Incomplete session data');const balance=parsed.config.initial+parsed.trades.reduce((sum,t)=>sum+t.pnl,0);if(Math.round(balance*100)!==Math.round(parsed.balance*100))throw Error('Ledger reconciliation failed');if(parsed.position&&!parsed.pendingClose)throw Error('Incomplete pending settlement');session=parsed;}
}catch{toast('Saved session could not be restored. A new research session was created.');}
let playbackRequested=true;
try{const pref=JSON.parse(localStorage.getItem(playbackKey)||"null");if(pref){playbackRequested=pref.running!==false;if([1,2,4].includes(pref.speed))speed=pref.speed;}}catch{}
function savePlayback(){try{localStorage.setItem(playbackKey,JSON.stringify({running,speed}));}catch{}}
function save(){try{localStorage.setItem(key,JSON.stringify(session));storageOK=true;}catch{storageOK=false;toast('Browser storage is unavailable. Export the session to preserve records.');}}
function chart(){
 const trades=[...session.trades].reverse(),all=[session.config.initial,...trades.map(t=>t.balance)],values=all.slice(-300);
 let low=Math.min(...values),high=Math.max(...values);const pad=Math.max((high-low)*.15,.01);low-=pad;high+=pad;
 const points=values.map((v,i)=>[65+i/Math.max(1,values.length-1)*720,150-(v-low)/(high-low)*132]);if(points.length===1)points.push([785,points[0][1]]);
 const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' '),last=points.at(-1);
 return [18,84,150].map((y,i)=>'<path class="chart-grid" d="M60 '+y+'H795"/><text class="chart-text" x="0" y="'+(y+3)+'">'+money(high-i*(high-low)/2)+'</text>').join('')+'<path class="chart-area" d="'+path+'L'+last[0]+' 152H65Z"/><path class="chart-line" d="'+path+'"/><circle class="chart-dot" cx="'+last[0]+'" cy="'+last[1]+'" r="3"/>';
}
function render(){
 const wins=session.trades.filter(t=>t.pnl>0).length,losses=session.trades.filter(t=>t.pnl<0).length,pnl=Math.round((session.balance-session.config.initial)*100)/100;
 const stats={balance:money(session.balance),pnl:money(pnl),trades:session.trades.length,filtered:session.filtered,cash:money(session.balance-(session.position?.size||0)),initial:money(session.config.initial)};
 for(const el of $$('[data-stat]')){el.textContent=stats[el.dataset.stat];if(el.dataset.stat==='pnl'){el.classList.toggle('negative',pnl<0);el.classList.toggle('positive',pnl>0);}}
 $('#speed').value=String(speed);
 const status=session.halted?'LOSS STOP':running?'RUNNING':'READY';$$('[data-status]').forEach(el=>el.textContent=status);
 $('[data-record]').textContent=wins+' W / '+losses+' L'+(session.trades.length?' · Win rate '+(wins/session.trades.length*100).toFixed(0)+'%':'');
 $('[data-open]').textContent=session.position?'Position '+session.position.symbol:'No open positions';
 $('[data-progress]').textContent='Checked '+session.cursor+' candidates';
 $('[data-saving]').textContent=storageOK?'Autosaved':'Unsaved / export records';
 for(const toggle of $$('[data-action="toggle"]')){toggle.textContent=session.halted?'HALTED · NEW SESSION':running?'TERMINAL CONTROL':'START TERMINAL';toggle.setAttribute('aria-pressed',String(running));}
 const latest=session.logs[0];$('[data-trace-label]').textContent=latest?latest.trace+' / '+latest.agent:'Awaiting first signal';
 $('[data-agents]').innerHTML='<div><span>ID</span><span>AGENT</span><span>S</span><span>ROLE</span><span>MODE</span><span>CAP</span><span>STATE</span><span>RESPONSIBILITY</span></div>'+roles.map(([name],i)=>{const log=session.logs.find(l=>l.agent===name);return '<p role="button" tabindex="0" data-agent="'+name+'" class="'+(latest?.agent===name?'template-active':'')+'"><span>100'+i+'</span><b translate="no">'+name+'</b><span>'+(running?'R':'S')+'</span><span>'+['discovery','safety','risk','execution','audit','accounting'][i]+'</span><span>PAPER</span><span>'+['READ','VETO',session.config.allocation+'%',session.config.slippage+'%','LOG','NET'][i]+'</span><span>'+esc(log?decisionNames[log.decision]||log.decision:'STANDBY')+'</span><em>'+roleNames[name]+'</em></p>';}).join('');
 $('[data-pipeline]').innerHTML=roles.map(([name],i)=>'<div class="stage '+(latest?.agent===name?'active':'')+'"><b>0'+(i+1)+'</b><span translate="no">'+name+'</span></div>').join('');
 $('[data-candidates]').innerHTML=Array.from({length:4},(_,i)=>{const q=fixture(session.cursor+i),reason=validateCandidate(q,session.config);const labels={'invalid price':'Invalid price','stale quote':'Stale quote','sell simulation failed':'Sell check failed','token controls unverified':'Token controls unverified','liquidity below $25,000':'Insufficient liquidity','slippage cap exceeded':'Slippage limit exceeded'};return '<article class="candidate '+(reason?'reject':'')+'"><b translate="no">'+esc(q.symbol)+'</b><small>'+esc(reason?labels[reason]||reason:'Awaiting safety check')+'</small></article>';}).join('');
 const position=session.position||session.trades[0],isOpen=!!session.position;
 $('[data-position-status]').textContent=isOpen?'OPEN':position?'CLOSED':'FLAT';
 $('[data-position]').innerHTML=position?'<h3 class="position-name" translate="no">'+esc(position.symbol)+'</h3><dl>'+[['Entry price',position.entry.toFixed(6)],['Exit price',isOpen?'Awaiting close':position.exit.toFixed(6)],['Allocate exposure',money(position.size)],['Slippage per side',position.slippage+'%'],['Net P&L',isOpen?'Pending settlement':money(position.pnl)]].map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl><button class="inspect" data-trace="'+esc(position.trace)+'">Trace '+esc(position.trace)+' ↗</button>':'<p class="empty">No open positions.<br>Start the terminal to process eligible candidates.</p>';
 for(const el of $$('[data-policy]')){const name=el.dataset.policy;el.textContent=session.config[name]+'%'+(name==='allocation'?' of current equity':'');}
 const agent=$('#agent-filter').value,filtered=session.logs.filter(log=>(agent==='all'||log.agent===agent)&&(!traceFilter||log.trace===traceFilter));
 $('[data-log-count]').textContent=session.logs.length+' records';
 $('[data-trace-filter]').hidden=!traceFilter;$('[data-trace-filter]').textContent=traceFilter?'Current trace: '+traceFilter+' · Clear filters to see all records':'';
 const list=$('[data-logs]'),scroll=list.scrollTop;
 list.innerHTML=filtered.slice(0,150).map(log=>'<button class="log-row '+(log.decision==='REJECT'?'reject':'')+'" data-trace="'+esc(log.trace)+'"><time>'+time(log.at)+'</time><b>'+esc(decisionNames[log.decision]||log.decision)+'</b><span><strong><span translate="no">'+esc(log.agent)+'</span> / '+esc(log.trace)+'</strong><small>'+esc(log.reason)+'</small></span></button>').join('')||'<p class="empty">No matching records. Start the terminal or clear the filter.</p>';list.scrollTop=scroll;
 $('[data-chart]').innerHTML=chart();$('[data-return]').textContent='Change '+((session.balance/session.config.initial-1)*100).toFixed(2)+'%';
 $('[data-chart-note]').textContent=session.trades.length?'Reconciled '+session.trades.length+' closed trades · up to 300 settlement points':'The curve updates after the first settled trade';
 $('[data-trades]').innerHTML=session.trades.slice(0,100).map(trade=>'<tr><td>'+time(trade.at)+'<small>'+esc(trade.trace)+'</small></td><td translate="no">'+esc(trade.symbol)+'</td><td>'+money(trade.size)+'</td><td class="'+(trade.pnl<0?'negative':'positive')+'">'+money(trade.pnl)+'</td><td>'+money(trade.balance)+'</td><td><button data-trace="'+esc(trade.trace)+'">Trace ↗</button></td></tr>').join('')||'<tr><td colspan="6">No closed trades yet. Open positions and rejected candidates are not realized gains.</td></tr>';
 updateVideoPanel(session,running,speed);
}
function tick(){if(!running)return;try{session=advance(session);if(session.halted)running=false;save();render();}catch(error){running=false;render();toast('Execution stopped: '+error.message);}}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function focusLogs(){document.querySelector('#decisions').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
document.addEventListener('click',event=>{
 const agent=event.target.closest('[data-agent]');
 if(agent){$('#agent-filter').value=agent.dataset.agent;traceFilter=null;render();focusLogs();return;}
 const trace=event.target.closest('[data-trace]');
 if(trace){traceFilter=trace.dataset.trace;$('#agent-filter').value='all';render();focusLogs();return;}
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='toggle'){if(session.halted){$('#risk').scrollIntoView({behavior:'smooth'});return;}running=!running;savePlayback();lastTick=performance.now();if(running)tick();else{save();render();}}
 if(action==='clear-filter'){traceFilter=null;$('#agent-filter').value='all';render();}
 if(action==='json')download('noxvil-session.json',JSON.stringify({...session,mode:'PAPER / SYNTHETIC',exportedAt:new Date().toISOString()},null,2),'application/json');
 if(action==='csv'){const headers=['trace','at','symbol','size','pnl','balance','fees','slippage','mode','reason'],quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';download('noxvil-trades.csv','\uFEFF'+[headers.join(','),...session.trades.map(t=>headers.map(k=>quote(t[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8');}
});
$('#agent-filter').innerHTML='<option value="all">All agents</option>'+roles.map(([name])=>'<option value="'+name+'">'+name+'</option>').join('');
$('#agent-filter').addEventListener('change',()=>{traceFilter=null;render();});
$('#speed').addEventListener('change',event=>{const n=Number(event.target.value);speed=[1,2,4].includes(n)?n:4;savePlayback();lastTick=performance.now();});
$('#session-form').addEventListener('submit',event=>{
 event.preventDefault();
 try{if(!event.currentTarget.reportValidity())return;const form=new FormData(event.currentTarget),config=Object.fromEntries(['initial','allocation','slippage','lossLimit'].map(k=>[k,Number(form.get(k))]));const next=createSession(config);session=next;running=false;savePlayback();traceFilter=null;$('#agent-filter').value='all';save();render();$('#form-message').textContent='New session created. Select START TERMINAL to begin.';toast('New session created. All panels are synchronized.');}catch(error){$('#form-message').textContent=error.message;}
});
for(const [key,value] of Object.entries(session.config)){const input=$('#session-form [name="'+key+'"]');if(input)input.value=value;}
function normalizeHash(){
 const aliases={live:'top',desk:'top',overview:'top',mutations:'agents',lineage:'decisions',treasury:'ledger',spawn:'risk'};
 const hash=location.hash.slice(1);if(aliases[hash]){history.replaceState(null,'','#'+aliases[hash]);if(aliases[hash]!=='top')$('#'+aliases[hash]).scrollIntoView();}
}
addEventListener('hashchange',normalizeHash);normalizeHash();
function clock(){$('#clock').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false})+' LOCAL';}
connectVideoPanel({
toggle:()=>document.querySelector("[data-action=toggle]").click(),
json:()=>document.querySelector("[data-action=json]").click(),
agent:name=>{if(!roles.some(([n])=>n===name))return;document.querySelector("#agent-filter").value=name;document.querySelector("#agent-filter").dispatchEvent(new Event("change"));focusLogs();},
trace:id=>{if(typeof id!=="string"||!session.logs.some(log=>log.trace===id))return;traceFilter=id;document.querySelector("#agent-filter").value="all";render();focusLogs();},
speed:n=>{if(![1,2,4].includes(n))return;document.querySelector("#speed").value=String(n);document.querySelector("#speed").dispatchEvent(new Event("change"));updateVideoPanel(session,running,speed);},
jump:id=>{if(["risk","manual","decisions","whitepaper","project-core"].includes(id))document.getElementById(id).scrollIntoView({behavior:"smooth"});}
});
render();clock();setInterval(clock,1000);setInterval(()=>{if(running&&performance.now()-lastTick>=3000/speed){lastTick=performance.now();tick();}},150);
if((new URLSearchParams(location.search).get('autoplay')==='1'||(new URLSearchParams(location.search).get('autoplay')!=='0'&&playbackRequested))&&!session.halted){running=true;lastTick=performance.now();tick();}


document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-agent]')){event.preventDefault();event.target.click();}});
