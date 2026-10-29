import {roles,fixture,validateCandidate} from './terminal-engine.mjs';
const icons={
Scout:'<ellipse cx="12" cy="12" rx="9" ry="6"/><circle cx="12" cy="12" r="2.5"/>',
Guard:'<path d="M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
Sizer:'<path d="M3 17a9 9 0 0 1 18 0M12 14l5-6"/><circle cx="12" cy="15" r="1"/>',
Trigger:'<path d="m14 2-9 12h6l-1 8 9-12h-6z"/>',
Scribe:'<path d="m4 16 12-12 4 4L8 20l-5 1zM13 7l4 4"/>',
Ledger:'<path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5"/>',
You:'<path d="M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z"/>'
};
const icon=n=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[n]+'</svg>';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const when=s=>new Date(s).toLocaleTimeString('en-GB',{hour12:false});
const owl='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="m20 27-5-17 22 12M80 27l5-17-22 12"/><circle cx="50" cy="52" r="38"/><circle cx="35" cy="47" r="14"/><circle cx="65" cy="47" r="14"/><circle class="nd-pupil" cx="36" cy="47" r="5"/><circle class="nd-pupil" cx="64" cy="47" r="5"/><path d="m44 66 6 9 6-9z"/></svg>';
const label=(a,b)=>'<div class="nd-label"><span>'+a+'</span><span>'+b+'</span></div>';
export function mountDesk(){
 const section=document.createElement('section');section.className='app-view night-desk';section.dataset.view='desk';section.id='desk';
 section.innerHTML='<div class="nd-topline"><span>◒ NIGHTJAR / NIGHT DESK</span><span>six agents · every line logged</span><b>PAPER · SYNTHETIC</b></div><header class="nd-heading"><div class="nd-identity"><div class="nd-owl">'+owl+'</div><div><div class="nd-title"><h1>Nightjar Terminal</h1><span>DESK / 02</span></div><p class="nd-running"><i></i><b data-nd-status>STANDBY</b><time data-nd-clock></time></p><div class="nd-latest" data-nd-latest>NO REASON, NO TRADE</div><small>watch the handoff. inspect the why.</small></div></div><div class="nd-metrics">'+[['balance','ACCOUNT EQUITY'],['trades','CLOSED TRADES'],['wins','WINS'],['losses','LOSSES']].map(([k,v])=>'<div><strong data-nd="'+k+'">—</strong><span>'+v+'</span></div>').join('')+'</div></header><div class="nd-layout"><aside class="nd-sidebar">'+label('AGENT ROSTER','06 SPECIALISTS')+'<div data-nd-agents></div><article class="nd-operator">'+icon('You')+'<div><b>YOU / OPERATOR</b><p>Review the desk. Read every reason.</p><small>Paper session runs only while this browser is open.</small></div></article><div class="nd-controls"><button data-action="toggle">START PAPER SESSION</button><button data-action="export">EXPORT SESSION ↗</button><a href="#spawn">CONFIGURE RISK ↗</a></div></aside><div class="nd-workspace"><section class="nd-panel nd-pipeline">'+label('01 / DECISION PIPELINE','SCOUT → GUARD → SIZE → FIRE → LOG → SETTLE')+'<div class="nd-candidates" data-nd-candidates></div><div class="nd-signal">'+label('SYNTHETIC MARKET REPLAY','NO LIVE PRICE FEED')+'<svg viewBox="0 0 640 70" role="img" aria-label="Recent paper balance trajectory" data-nd-signal></svg></div><div class="nd-stages">'+roles.map(([n])=>'<button data-nd-agent="'+n+'" title="Inspect '+n+' decisions">'+icon(n)+'<span>'+n.toUpperCase()+'</span></button>').join('')+'</div><div class="nd-mini-stats">'+[['filtered','FILTERED'],['size','POSITION POLICY'],['lines','SCRIBE'],['balance','LEDGER']].map(([key,name])=>'<article><small>'+name+'</small><strong data-nd="'+key+'">—</strong><span>'+({filtered:'no pass, no position',size:'of current paper equity',lines:'each line has a why',balance:'settled after each close'}[key])+'</span></article>').join('')+'</div></section><div class="nd-middle"><section class="nd-panel">'+label('02 / TRADE · ENTRY VS EXIT','CLOSED ROUND TRIP')+'<div data-nd-trade></div></section><section class="nd-panel">'+label('03 / $ tail -f night.log','LATEST DECISIONS')+'<div class="nd-tail" data-nd-tail></div></section></div><section class="nd-panel nd-result">'+label('04 / RESULT · START VS NOW','ACTUAL PAPER LEDGER / LINEAR SCALE')+'<div class="nd-equity"><div><small>START</small><strong data-nd="initial">—</strong><small>NOW</small><strong data-nd="balance">—</strong></div><div class="nd-chart"><svg viewBox="0 0 640 120" role="img" aria-label="Paper account equity curve" data-nd-chart></svg><div><span data-nd-record></span><small>modeled fees + adverse slippage included</small></div></div></div></section><section class="nd-panel nd-log">'+label('05 / AUDIT STREAM','CLICK A TRACE TO INSPECT')+'<div data-nd-audit></div></section></div></div><footer class="nd-footer"><span><i></i> LOCAL SIMULATION / NO WALLET CONNECTED</span><span>no manufactured returns. every balance reconciled.</span><a href="#manual">READ OPERATOR MANUAL ↗</a></footer>';
 document.querySelector('#landingDetail').before(section);
 const link=document.createElement('a');link.href='#desk';link.dataset.route='desk';link.innerHTML='<b>06</b> night desk';document.querySelector('.topbar nav').append(link);
 section.addEventListener('click',e=>{const button=e.target.closest('[data-nd-agent]');if(button){document.querySelector('#agentFilter').value=button.dataset.ndAgent;document.querySelector('#agentFilter').dispatchEvent(new Event('change'));location.hash='lineage';}});
}
function curve(values,height=120){
 const low=Math.min(...values),high=Math.max(...values),range=high-low||Math.max(low*.01,.01);
 const points=values.map((v,i)=>[8+i/(Math.max(1,values.length-1))*624,height-14-(v-low)/range*(height-28)]);
 if(points.length===1)points.push([632,points[0][1]]);
 const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' '),last=points.at(-1);
 return '<path class="nd-gridline" d="M0 '+height/2+'H640M0 '+(height-14)+'H640"/><path class="nd-area" d="'+path+'L'+last[0]+' '+height+'H8Z"/><path class="nd-line" d="'+path+'"/><circle class="nd-dot" cx="'+last[0]+'" cy="'+last[1]+'" r="3"/>';
}
export function renderDesk(session,running){
 const root=document.querySelector('#desk');if(!root)return;
 root.classList.toggle('is-running',running);
 const $=s=>root.querySelector(s),wins=session.trades.filter(t=>t.pnl>0).length,losses=session.trades.filter(t=>t.pnl<0).length;
 const stats={balance:money(session.balance),initial:money(session.config.initial),trades:session.trades.length,wins,losses,filtered:session.filtered,size:session.config.allocation+'% EQ',lines:session.logs.length+' LINES'};
 root.querySelectorAll('[data-nd]').forEach(el=>el.textContent=stats[el.dataset.nd]);
 $('[data-nd-status]').textContent=session.halted?'LOSS STOP':running?'PAPER RUNNING':'PAPER PAUSED';
 $('[data-nd-clock]').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});
 const latest=session.logs[0];$('[data-nd-latest]').textContent=latest?latest.agent.toUpperCase()+' · '+latest.decision+' · '+latest.trace:'NO REASON, NO TRADE';
 $('[data-nd-agents]').innerHTML=roles.map(([name,role,description],i)=>{const last=session.logs.find(l=>l.agent===name);return '<button class="nd-agent '+(last?.trace===latest?.trace&&last?'nd-recent':'')+'" data-nd-agent="'+name+'"><span class="nd-agent-icon">'+icon(name)+'</span><span class="nd-agent-content"><span class="nd-agent-name"><b>'+name.toUpperCase()+'</b><em>'+(last?esc(last.decision):'READY')+'</em></span><small>'+role+'</small><p>'+esc(description)+'</p><code>'+esc(last?last.reason:'Awaiting first paper decision.')+'</code></span></button>';}).join('');
 $('[data-nd-candidates]').innerHTML=Array.from({length:4},(_,i)=>{const q=fixture(session.cursor+i),reason=validateCandidate(q,session.config);return '<article class="'+(reason?'nd-rejected':'')+'"><div><b>'+esc(q.symbol)+'</b><i></i></div><small>'+esc(reason||'candidate · synthetic fixture')+'</small></article>';}).join('');
 const chronological=[...session.trades].reverse(),equity=[session.config.initial,...chronological.map(t=>t.balance)];
 $('[data-nd-chart]').innerHTML=curve(equity);
 $('[data-nd-signal]').innerHTML=curve(equity.slice(-18),70);
 $('[data-nd-record]').textContent=wins+' W / '+losses+' L · '+session.filtered+' FILTERED';
 const trade=session.trades[0];
 $('[data-nd-trade]').innerHTML=trade?'<div class="nd-trade-name"><strong>'+esc(trade.symbol)+'</strong><b class="'+(trade.pnl<0?'nd-negative':'')+'">'+money(trade.pnl)+'</b></div><dl>'+[['entry',trade.entry.toFixed(6)],['exit',trade.exit.toFixed(6)],['slippage',trade.slippage+'% per side'],['size',money(trade.size)],['fees',money(trade.fees)],['settled',money(trade.balance)]].map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')+'</dl><p class="nd-why"><b>WHY / </b>'+esc(trade.reason)+'</p><button class="nd-trace" data-trace="'+esc(trade.trace)+'">INSPECT '+esc(trade.trace)+' ↗</button>':'<div class="nd-empty">Scout is watching.<br><span>Start paper mode to generate a complete decision trace.</span></div>';
 $('[data-nd-tail]').innerHTML=session.logs.slice(0,5).reverse().map(l=>'<button data-trace="'+esc(l.trace)+'"><span>'+when(l.at)+' <b>'+esc(l.agent)+'</b><em class="'+(l.decision==='REJECT'?'nd-negative':'')+'">'+esc(l.decision)+'</em></span><small>'+esc(l.reason)+'</small></button>').join('')||'<div class="nd-empty">$ tail -f night.log<br><span>waiting for the first decision<span class="nd-cursor">_</span></span></div>';
 $('[data-nd-audit]').innerHTML=session.logs.slice(0,7).map(l=>'<button data-trace="'+esc(l.trace)+'"><time>'+when(l.at)+'</time><b class="'+(l.decision==='REJECT'?'nd-negative':'')+'">'+esc(l.decision)+'</b><span><strong>'+esc(l.agent)+' / '+esc(l.trace)+'</strong><small>'+esc(l.reason)+'</small></span><em>↗</em></button>').join('')||'<div class="nd-empty">No decisions yet. Every signal will be logged here.</div>';
}

