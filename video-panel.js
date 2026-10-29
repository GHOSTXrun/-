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
const owl="<svg viewBox=\"0 0 112 112\" aria-hidden=\"true\"><defs><radialGradient id=\"owlshade\"><stop stop-color=\"#343b4a\"/><stop offset=\"1\" stop-color=\"#1b2232\"/></radialGradient></defs><path d=\"m19 33-4-22 25 12m53 10 4-22-25 12\" fill=\"#171e2b\"/><circle cx=\"56\" cy=\"58\" r=\"49\" fill=\"url(#owlshade)\" stroke=\"#eeb24d\" stroke-width=\"2.5\"/><ellipse cx=\"38\" cy=\"55\" rx=\"12\" ry=\"14\" fill=\"#f4efdc\"/><ellipse cx=\"74\" cy=\"55\" rx=\"12\" ry=\"14\" fill=\"#f4efdc\"/><circle cx=\"40\" cy=\"57\" r=\"7\" fill=\"#0c1321\"/><circle cx=\"72\" cy=\"57\" r=\"7\" fill=\"#0c1321\"/><circle cx=\"42\" cy=\"53\" r=\"2.7\" fill=\"#fff\"/><circle cx=\"74\" cy=\"53\" r=\"2.7\" fill=\"#fff\"/><path d=\"m50 74 6 10 6-10\" fill=\"#f6bc49\"/></svg>";
const label=(a,b)=>'<div class="nd-label"><span>'+a+'</span><span>'+b+'</span></div>';
let shadow,handlers={};
export function connectVideoPanel(callbacks){
 handlers=callbacks;const host=document.getElementById("video-panel-host");if(!host)throw Error('Right panel host is missing');shadow=host.shadowRoot||host.attachShadow({mode:"open"});if(!shadow.querySelector('style'))shadow.append(document.getElementById("video-panel-template").content.cloneNode(true));
 let section=shadow.querySelector('#desk');if(!section){section=document.createElement('section');section.className='night-desk';section.id='desk';
 section.innerHTML='<div class="nd-topline"><span>☾</span><span>Nightjar Terminal — overnight · six agents · every line logged</span><b>paper · sim</b></div><header class="nd-heading"><div class="nd-identity"><div class="nd-owl">'+owl+'</div><div><div class="nd-title"><h1>Nightjar Terminal</h1><span>v2.0-night</span></div><p class="nd-running"><i></i><b data-nd-status>STANDBY</b><time data-nd-clock></time></p><div class="nd-latest" data-nd-latest>NO REASON, NO TRADE</div><small>no reason, no trade</small></div></div><div class="nd-metrics">'+[['balance','balance'],['trades','trades'],['wins','wins'],['losses','losses']].map(([k,v])=>'<div><strong data-nd="'+k+'">—</strong><span>'+v+'</span></div>').join('')+'</div></header><div class="nd-layout"><aside class="nd-sidebar">'+label('AGENTS','6 online')+'<div data-nd-agents></div><article class="nd-operator">'+icon('You')+'<div><b>YOU</b><p>reads the log with coffee</p><small>browser-local paper session</small></div></article><div class="nd-controls"><button data-action="toggle">START PAPER SESSION</button><button data-action="export">EXPORT SESSION ↗</button><a href="#spawn">CONFIGURE RISK ↗</a></div></aside><div class="nd-workspace"><section class="nd-panel nd-pipeline">'+label('PIPELINE · scout → safety → size → fire → scribe','PAPER REPLAY')+'<div class="nd-candidates" data-nd-candidates></div><div class="nd-signal">'+label('SYNTHETIC MARKET REPLAY','NO LIVE PRICE FEED')+'<svg viewBox="0 0 640 70" role="img" aria-label="Recent paper balance trajectory" data-nd-signal></svg></div><div class="nd-stages">'+roles.slice(0,5).map(([n])=>'<button data-nd-agent="'+n+'" title="Inspect '+n+' decisions">'+icon(n)+'<span>'+n.toUpperCase()+'</span></button>').join('')+'</div><div class="nd-mini-stats">'+[['filtered','FILTERED'],['size','POSITION POLICY'],['lines','SCRIBE'],['balance','LEDGER']].map(([key,name])=>'<article><small>'+name+'</small><strong data-nd="'+key+'">—</strong><span>'+({filtered:'no pass, no position',size:'of current paper equity',lines:'each line has a why',balance:'settled after each close'}[key])+'</span></article>').join('')+'</div></section><div class="nd-middle"><section class="nd-panel">'+label('TRADE · ENTRY VS EXIT','PAPER EXECUTION')+'<div data-nd-trade></div></section><section class="nd-panel">'+label('$ tail -f night.log','LIVE APPENDS')+'<div class="nd-tail" data-nd-tail></div></section></div><section class="nd-panel nd-result">'+label('RESULT · start vs now','paper fills · linear scale')+'<div class="nd-equity"><div><small>START</small><strong data-nd="initial">—</strong><small>NOW</small><strong data-nd="balance">—</strong></div><div class="nd-chart"><svg viewBox="0 0 640 120" role="img" aria-label="Paper account equity curve" data-nd-chart></svg><div><span data-nd-record></span><small>modeled fees + adverse slippage included</small></div></div></div></section><section class="nd-panel nd-log">'+label('LOG','reading the log ↗')+'<div data-nd-audit></div></section></div></div><footer class="nd-footer"><span><i></i> LOCAL SIMULATION / NO WALLET CONNECTED</span><span>no manufactured returns. every balance reconciled.</span><a href="#manual">MANUAL / OTHER VIEWS ↗</a></footer>';
 shadow.append(section);
 const playback=document.createElement('div');playback.className='nd-playback';playback.innerHTML='<span>simulation speed</span><select id="nd-speed" aria-label="Simulation speed"><option value="1">1× / 3s</option><option value="2">2× / 1.5s</option><option value="4">4× / 0.75s</option></select>';section.querySelector('.nd-controls').append(playback);
 }


 shadow.addEventListener('click',event=>{const agent=event.target.closest('[data-nd-agent]'),trace=event.target.closest('[data-trace]'),action=event.target.closest('[data-action]'),link=event.target.closest('a');if(agent){handlers.agent?.(agent.dataset.ndAgent);return;}if(trace){handlers.trace?.(trace.dataset.trace);return;}if(action){const name=action.dataset.action==='export'?'json':action.dataset.action;handlers[name]?.();return;}if(link){event.preventDefault();handlers.jump?.(link.hash==='#spawn'?'risk':link.hash.slice(1));}});
 shadow.addEventListener('change',event=>{if(event.target.id==='nd-speed')handlers.speed?.(Number(event.target.value));});
 setInterval(()=>{const clock=shadow.querySelector('[data-nd-clock]');if(clock)clock.textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});},1000);
}
function curve(values,height=120){
 const low=Math.min(...values),high=Math.max(...values),range=high-low||Math.max(low*.01,.01);
 const points=values.map((v,i)=>[8+i/(Math.max(1,values.length-1))*624,height-14-(v-low)/range*(height-28)]);
 if(points.length===1)points.push([632,points[0][1]]);
 const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' '),last=points.at(-1);
 return '<path class="nd-gridline" d="M0 '+height/2+'H640M0 '+(height-14)+'H640"/><path class="nd-area" d="'+path+'L'+last[0]+' '+height+'H8Z"/><path class="nd-line" d="'+path+'"/><circle class="nd-dot" cx="'+last[0]+'" cy="'+last[1]+'" r="3"/>';
}
export function updateVideoPanel(session,running,speed=1){
 const root=shadow?.querySelector('#desk');if(!root)return;
 root.classList.toggle('is-running',running);
 const $=s=>root.querySelector(s),wins=session.trades.filter(t=>t.pnl>0).length,losses=session.trades.filter(t=>t.pnl<0).length;
 const stats={balance:money(session.balance),initial:money(session.config.initial),trades:session.trades.length,wins,losses,filtered:session.filtered,size:session.config.allocation+'% EQ',lines:'line #'+session.logs.length};
 root.querySelectorAll('[data-nd]').forEach(el=>el.textContent=stats[el.dataset.nd]);
 $('[data-nd-status]').textContent=session.halted?'LOSS STOP':running?'running':'paused';
 $('[data-nd-clock]').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});
 const latest=session.logs[0];$('[data-nd-latest]').textContent=latest?latest.agent.toUpperCase()+' · '+latest.decision+' · '+latest.trace:'NO REASON, NO TRADE';
const captions={Scout:['new pairs + volume spikes','points, never pulls the trigger'],Guard:['rug + honeypot screen','no pass, no position'],Sizer:['sizes from live equity','size follows equity, not mood'],Trigger:['opens + closes, caps slip','slip cap '+session.config.slippage+'%'],Scribe:['writes every decision','every line has a why'],Ledger:['balance + curve','marks the result on every close']};
 $('[data-nd-agents]').innerHTML=roles.map(([name,role,description],i)=>{const last=session.logs.find(l=>l.agent===name);return '<button class="nd-agent '+(latest?.agent===name?'nd-focus':'')+'" data-nd-agent="'+name+'"><span class="nd-agent-icon">'+icon(name)+'</span><span class="nd-agent-content"><span class="nd-agent-name"><b>'+name.toUpperCase()+'</b><em>'+(last?esc(last.decision):'READY')+'</em></span><small>'+esc(captions[name][0])+'</small><p>'+esc(captions[name][1])+'</p><code>'+esc(last?last.reason:'Awaiting first paper decision.')+'</code></span></button>';}).join('');
 $('[data-nd-candidates]').innerHTML=Array.from({length:4},(_,i)=>{const q=fixture(session.cursor+i),reason=validateCandidate(q,session.config);return '<article class="'+(reason?'nd-rejected':'')+'"><div><b>'+esc(q.symbol)+'</b><i></i></div><small>'+esc(reason||'candidate · synthetic fixture')+'</small></article>';}).join('');
 const chronological=[...session.trades].reverse(),equity=[session.config.initial,...chronological.map(t=>t.balance)];
 $('[data-nd-chart]').innerHTML=curve(equity);
 $('[data-nd-signal]').innerHTML=curve(equity.slice(-18),70);
 $('[data-nd-record]').textContent=wins+' W / '+losses+' L · '+session.filtered+' FILTERED';
 const trade=session.position||session.trades[0];
 const isOpen=!!session.position;
 root.querySelectorAll('.nd-stages [data-nd-agent]').forEach(el=>el.classList.toggle('nd-focus',el.dataset.ndAgent===latest?.agent));
 $('[data-nd-trade]').innerHTML=trade?'<div class="nd-trade-name"><strong>'+esc(trade.symbol)+'</strong><b class="'+(trade.pnl<0?'nd-negative':'')+'">'+(isOpen?'OPEN':money(trade.pnl))+'</b></div><dl>'+[['entry',trade.entry.toFixed(6)],['exit',isOpen?'open':trade.exit.toFixed(6)],['slippage',trade.slippage+'% per side'],['size',money(trade.size)]].map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('')+'</dl><p class="nd-why"><b>WHY / </b>'+esc(isOpen?'Paper entry approved · awaiting next replay tick to close.':trade.reason)+'</p><button class="nd-trace" data-trace="'+esc(trade.trace)+'">INSPECT '+esc(trade.trace)+' ↗</button>':'<div class="nd-empty">Scout is watching.<br><span>Start paper mode to generate a complete decision trace.</span></div>';
 $('[data-nd-tail]').innerHTML=session.logs.slice(0,5).reverse().map(l=>'<button data-trace="'+esc(l.trace)+'"><span>'+when(l.at)+' <b>'+esc(l.agent)+'</b><em class="'+(l.decision==='REJECT'?'nd-negative':'')+'">'+esc(l.decision)+'</em></span><small>'+esc(l.reason)+'</small></button>').join('')||'<div class="nd-empty">$ tail -f night.log<br><span>waiting for the first decision<span class="nd-cursor">_</span></span></div>';
 $('[data-nd-audit]').innerHTML=session.logs.slice(0,5).map(l=>'<button data-trace="'+esc(l.trace)+'"><time>'+when(l.at)+'</time><b class="'+(l.decision==='REJECT'?'nd-negative':'')+'">'+esc(l.decision)+'</b><span><strong>'+esc(l.agent)+' / '+esc(l.trace)+'</strong><small>'+esc(l.reason)+'</small></span><em>↗</em></button>').join('')||'<div class="nd-empty">No decisions yet. Every signal will be logged here.</div>';
 root.querySelectorAll('[data-action="toggle"]').forEach(button=>{button.textContent=session.halted?'LOSS STOP':running?'PAUSE PAPER SESSION':'START PAPER SESSION';button.setAttribute('aria-pressed',String(running));});const select=root.querySelector('#nd-speed');if(select)select.value=String(speed);
}

