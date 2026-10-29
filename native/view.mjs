import {roles,screen,impactPct,equity} from './model.mjs';
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
const owl="<img src=\"./assets/noxvil-logo.png\" alt=\"NOXVIL\" draggable=\"false\">";
const label=(a,b)=>'<div class="nd-label"><span>'+a+'</span><span>'+b+'</span></div>';
export function mountView(){
 const section=document.createElement('section');section.className='night-desk';section.id='desk';
 section.innerHTML='<div class="nd-topline"><span>☾</span><span>NOXVIL Terminal — live market · paper ledger</span><b data-network>CONNECTING</b></div><header class="nd-heading"><div class="nd-identity"><div class="nd-owl">'+owl+'</div><div><div class="nd-title"><h1>NOXVIL Terminal</h1><span>NATIVE / 01</span></div><p class="nd-running"><i></i><b data-nd-status>STANDBY</b><time data-nd-clock></time></p><div class="nd-latest" data-nd-latest>NO REASON, NO TRADE</div><small>no reason, no trade</small></div></div><div class="nd-metrics">'+[['balance','balance'],['trades','trades'],['wins','wins'],['losses','losses']].map(([k,v])=>'<div><strong data-nd="'+k+'">—</strong><span>'+v+'</span></div>').join('')+'</div></header><div class="nd-layout"><aside class="nd-sidebar">'+label('AGENTS','6 local roles')+'<div data-agents></div><article class="nd-operator">'+icon('You')+'<div><b>YOU</b><p>reads the log with coffee</p><small>browser-local paper session</small></div></article><div class="nd-controls"><button data-action="auto" data-auto>START PAPER STRATEGY</button><button data-action="json">EXPORT SESSION ↗</button><a href="#settings" data-action="settings">RISK SETTINGS ↗</a></div></aside><div class="nd-workspace"><section class="nd-panel nd-pipeline">'+label('PIPELINE · scout → safety → size → fire → scribe','LIVE QUOTES · PAPER FILLS')+'<div class="nd-candidates" data-nd-candidates></div><div class="nd-signal">'+label('OBSERVED PRICE / DEX SCREENER','<span data-selected-source>NO PRICE FEED YET</span>')+'<svg viewBox="0 0 640 70" role="img" aria-label="Recent paper balance trajectory" data-nd-signal></svg></div><div class="nd-stages">'+roles.slice(0,5).map(([n])=>'<button data-agent="'+n+'" title="Inspect '+n+' decisions">'+icon(n)+'<span>'+n.toUpperCase()+'</span></button>').join('')+'</div><div class="nd-mini-stats">'+[['filtered','FILTERED'],['size','POSITION POLICY'],['lines','SCRIBE'],['balance','LEDGER']].map(([key,name])=>'<article><small>'+name+'</small><strong data-nd="'+key+'">—</strong><span>'+({filtered:'basic market screen',size:'of current paper equity',lines:'each line has a why',balance:'cash + open mark'}[key])+'</span></article>').join('')+'</div></section><div class="nd-middle"><section class="nd-panel">'+label('TRADE · ENTRY VS EXIT','PAPER EXECUTION')+'<div data-nd-trade></div></section><section class="nd-panel">'+label('$ tail -f noxvil.log','LIVE APPENDS')+'<div class="nd-tail" data-nd-tail></div></section></div><section class="nd-panel nd-result">'+label('RESULT · start vs now','live marks · modeled costs')+'<div class="nd-equity"><div><small>START</small><strong data-nd="initial">—</strong><small>NOW</small><strong data-nd="balance">—</strong></div><div class="nd-chart"><svg viewBox="0 0 640 120" role="img" aria-label="Paper account equity curve" data-nd-chart></svg><div><span data-nd-record></span><small>recent 600 observations · estimated costs</small></div></div></div></section><section class="nd-panel nd-log">'+label('LOG','<button class="clear-log-filter" data-action="clear" data-filter-note>all decisions / click to filter</button>')+'<div data-nd-audit></div></section></div></div><footer class="nd-footer"><span><i></i> LIVE MARKET / PAPER ORDERS / NO WALLET</span><span>rule-based roles · not LLM agents</span><a href="#manual" data-action="manual">DATA / MODEL NOTES ↗</a></footer>';
 document.body.append(section);const feed=document.createElement('div');feed.className='native-feed';feed.innerHTML='<div><i></i><span data-market-state>Connecting…</span></div><span data-market-count>0 pairs</span><button data-action="refresh">REFRESH ↻</button>';section.querySelector('.nd-heading').after(feed);const more=document.createElement('div');more.className='native-more';more.innerHTML='<span data-market-scope></span><button data-action="markets">WATCHLIST ↗</button><p data-network-info></p><button id="buy-selected-main" data-action="buy">PAPER BUY SELECTED</button><button id="close-position-main" data-action="close" hidden>CLOSE PAPER POSITION</button>';section.querySelector('.nd-controls').after(more);



}
function curve(values,height=120){
 const low=Math.min(...values),high=Math.max(...values),range=high-low||Math.max(low*.01,.01);
 const points=values.map((v,i)=>[8+i/(Math.max(1,values.length-1))*624,height-14-(v-low)/range*(height-28)]);
 if(points.length===1)points.push([632,points[0][1]]);
 const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' '),last=points.at(-1);
 return '<path class="nd-gridline" d="M0 '+height/2+'H640M0 '+(height-14)+'H640"/><path class="nd-area" d="'+path+'L'+last[0]+' '+height+'H8Z"/><path class="nd-line" d="'+path+'"/><circle class="nd-dot" cx="'+last[0]+'" cy="'+last[1]+'" r="3"/>';
}
export function renderView(state,market,selected,auto,network,filter=null){
 const root=document.querySelector('#desk'),$=s=>root.querySelector(s),pair=market.pairs.find(p=>p.pairAddress===state.position?.pairAddress),balance=equity(state,pair);
 const wins=state.trades.filter(t=>t.pnl>0).length,losses=state.trades.filter(t=>t.pnl<0).length,latest=state.logs[0];
 const stats={balance:money(balance),initial:money(state.config.initial),trades:state.trades.length,wins,losses,filtered:state.filtered,size:state.config.allocation+'% EQ',lines:'line #'+state.logs.length};
 root.querySelectorAll('[data-nd]').forEach(el=>el.textContent=stats[el.dataset.nd]);
 root.classList.toggle('is-running',auto);
 $('[data-nd-status]').textContent=state.halted?'LOSS STOP':auto?'paper strategy active':'watching market';
 $('[data-nd-clock]').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false});
 $('[data-nd-latest]').textContent=latest?latest.agent.toUpperCase()+' · '+latest.decision+' · '+latest.trace:'WAITING FOR REAL MARKET DATA';
 const badge=$('[data-network]');badge.textContent=network.online?'LIVE DATA / PAPER':network.loading?'CONNECTING':'DATA OFFLINE';badge.className=network.online?'online':'offline';
 $('[data-nd-latest]').title='Rule-based role simulators. No LLM or wallet is connected.';
 const captions={Scout:['recent Solana profiles + pools','observe, never place an order'],Guard:['liquidity + volume + recent sells','basic screen; token audit not connected'],Sizer:['sizes from available paper cash','fixed exposure, no leverage'],Trigger:['aggregate-price paper fills','max estimated impact '+state.config.maxImpact+'%'],Scribe:['records the decision and source','every line has a why'],Ledger:['cash + mark-to-market equity','fees and estimated impact included']};
 $('[data-agents]').innerHTML=roles.map(([name])=>{const log=state.logs.find(l=>l.agent===name);return '<button class="nd-agent '+(latest?.agent===name?'nd-focus':'')+'" data-agent="'+name+'"><span class="nd-agent-icon">'+icon(name)+'</span><span class="nd-agent-content"><span class="nd-agent-name"><b>'+name.toUpperCase()+'</b><em>'+esc(log?.decision||'WAIT')+'</em></span><small>'+esc(captions[name][0])+'</small><p>'+esc(captions[name][1])+'</p><code title="'+esc(log?.reason||'')+'">'+esc(log?.reason||'Awaiting a market observation.')+'</code></span></button>';}).join('');
 const candidates=market.pairs.slice(0,4);
 $('[data-nd-candidates]').innerHTML=candidates.map(p=>{const fail=screen(p,state.config);return '<button class="market-card '+(fail?'nd-rejected':'')+' '+(selected?.pairAddress===p.pairAddress?'selected':'')+'" data-pair="'+esc(p.pairAddress)+'"><div><b>'+esc(p.symbol)+'</b><i></i></div><strong>$'+price(p.price)+'</strong><small>'+(p.changeM5===null?'5m n/a':(p.changeM5>=0?'+':'')+p.changeM5.toFixed(2)+'% / 5m')+'</small><small>'+esc(fail||'basic screen · limited')+'</small></button>';}).join('')||'<div class="native-empty">No market data loaded. Connecting to DEX Screener…</div>';
 const series=selected?(market.prices[selected.pairAddress]||[]):[];
 $('[data-nd-signal]').innerHTML=curve(series.length?series:[0],70);
 root.querySelectorAll('.nd-stages [data-agent]').forEach(el=>el.classList.toggle('nd-focus',el.dataset.agent===latest?.agent));
 $('[data-nd-chart]').innerHTML=curve(state.history.map(h=>h.value));
 $('[data-nd-record]').textContent=wins+' W / '+losses+' L · '+state.filtered+' SCREENED OUT';
 const trade=state.position||state.trades[0],open=!!state.position;
 const quote=state.position?market.pairs.find(p=>p.pairAddress===state.position.pairAddress):null;
 $('[data-nd-trade]').innerHTML=trade?'<div class="nd-trade-name"><strong>'+esc(trade.symbol)+'</strong><b class="'+(!open&&trade.pnl<0?'nd-negative':'')+'">'+(open?'OPEN':money(trade.pnl))+'</b></div><dl>'+[['entry',price(trade.entry)],['exit',open?'open':price(trade.exit)],['size',money(trade.size)],['cash',money(state.cash)],['unrealized',open?money(balance-state.cash-state.position.size):'—'],['quote fetched',quote?when(new Date(quote.receivedAt).toISOString()):open?'stale / awaiting':'—']].map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl><p class="nd-why"><b>WHY / </b>'+esc(trade.reason)+'</p><button class="nd-trace" data-trace="'+esc(trade.trace)+'">INSPECT '+esc(trade.trace)+' ↗</button>'+(open?'<button class="native-close" data-action="close">CLOSE PAPER POSITION</button>':''):selected?'<div class="nd-trade-name"><strong>'+esc(selected.symbol)+'</strong><b>$'+price(selected.price)+'</b></div><dl><dt>liquidity</dt><dd>'+money(selected.liquidity)+'</dd><dt>volume / 1h</dt><dd>'+money(selected.volumeH1)+'</dd><dt>sells / 5m</dt><dd>'+selected.sellsM5+'</dd><dt>estimated impact</dt><dd>'+impactPct(state.cash*state.config.allocation/100,selected).toFixed(4)+'%</dd></dl><button class="native-buy" data-action="buy" '+(!network.online||screen(selected,state.config)?'disabled':'')+'>PAPER BUY SELECTED</button><p class="nd-why">Aggregate prices; no executable quote or token audit.</p>':'<div class="nd-empty">Waiting for market data.<br><span>Trades cannot run without a valid price.</span></div>';
 const filtered=state.logs.filter(l=>!filter||l.agent===filter||l.trace===filter);
 $('[data-nd-tail]').innerHTML=state.logs.slice(0,5).reverse().map(l=>'<button data-trace="'+esc(l.trace)+'"><span>'+when(l.at)+' <b>'+esc(l.agent)+'</b><em class="'+(['REJECT','OFFLINE'].includes(l.decision)?'nd-negative':'')+'">'+esc(l.decision)+'</em></span><small>'+esc(l.reason)+'</small></button>').join('')||'<div class="nd-empty">$ tail -f noxvil.log<br><span>Waiting for data connection.</span></div>';
 $('[data-nd-audit]').innerHTML=filtered.slice(0,8).map(l=>'<button data-trace="'+esc(l.trace)+'"><time>'+when(l.at)+'</time><b class="'+(['REJECT','OFFLINE'].includes(l.decision)?'nd-negative':'')+'">'+esc(l.decision)+'</b><span><strong>'+esc(l.agent)+' / '+esc(l.trace)+'</strong><small>'+esc(l.reason)+'</small></span><em>↗</em></button>').join('')||'<div class="nd-empty">No matching decisions.</div>';
 $('[data-market-state]').textContent=network.online?'DEX Screener · fetched '+when(new Date(market.receivedAt).toISOString()):network.error||'Connecting…';
 $('[data-market-scope]').textContent=market.scope||'Recent profiles + SOL watchlist';
 $('[data-selected-source]').innerHTML=selected?'<a href="'+esc(selected.url)+'" target="_blank" rel="noopener noreferrer">SOURCE / '+esc(selected.symbol)+' ↗</a>':'NO PRICE FEED YET';
 $('[data-auto]').textContent=auto?'PAUSE PAPER STRATEGY':'START PAPER STRATEGY';
 $('[data-filter-note]').textContent=filter?'filter: '+filter+' / click to clear':'all decisions / click a role or trace';
 $('[data-network-info]').textContent=network.error||market.profileError||'Profile listings are discovery metadata, not token safety approval.';
 const count=$('[data-market-count]');count.textContent=market.pairs.length+' pairs';
 $('#close-position-main').hidden=!state.position;
 const buy=$('#buy-selected-main');buy.hidden=!!state.position;buy.disabled=!network.online||!selected||!!screen(selected,state.config);buy.textContent=selected?'PAPER BUY '+selected.symbol:'WAITING FOR PRICE';
}
function price(n){if(!Number.isFinite(n))return '—';return n>=1?n.toFixed(4):n>=.001?n.toFixed(6):n.toPrecision(5);}

