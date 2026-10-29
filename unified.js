import {createSession,settings,advance,fixture,validateCandidate,roles} from './terminal-engine.mjs';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const key='nightjar.paper.v1';
let session=createSession(),running=false,traceFilter=null,speed=1,lastTick=performance.now(),storageOK=true;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const time=at=>new Date(at).toLocaleTimeString('en-GB',{hour12:false});
const decisionNames={CANDIDATE:'发现',PASS:'通过',REJECT:'拒绝',SIZED:'定仓',OPEN:'开仓',CLOSED:'平仓',RECORDED:'记录',SETTLED:'结算',HALTED:'停机'};
const roleNames={Scout:'发现交易对与成交量信号',Guard:'安全检查与交易否决',Sizer:'按当前权益计算仓位',Trigger:'开平仓与滑点控制',Scribe:'记录每个决策的原因',Ledger:'平仓结算与账本核对'};
function toast(text){const element=$('.toast');element.textContent=text;element.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.hidden=true,4500);}
try{
 const raw=localStorage.getItem(key);
 if(raw){const parsed=JSON.parse(raw);settings(parsed.config);if(parsed.version!==1||!Array.isArray(parsed.logs)||!Array.isArray(parsed.trades)||!Number.isFinite(parsed.balance)||parsed.balance<0||!Number.isInteger(parsed.cursor)||!Number.isInteger(parsed.filtered))throw Error('会话数据不完整');const balance=parsed.config.initial+parsed.trades.reduce((sum,t)=>sum+t.pnl,0);if(Math.round(balance*100)!==Math.round(parsed.balance*100))throw Error('账本无法核对');if(parsed.position&&!parsed.pendingClose)throw Error('待结算订单不完整');session=parsed;}
}catch{toast('保存的会话无法恢复，已创建新的模拟会话。');}
function save(){try{localStorage.setItem(key,JSON.stringify(session));storageOK=true;}catch{storageOK=false;toast('浏览器存储不可用，请导出会话以保存记录。');}}
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
 const status=session.halted?'亏损停机':running?'运行中':'已暂停';$$('[data-status]').forEach(el=>el.textContent=status);
 $('[data-record]').textContent=wins+' 盈 / '+losses+' 亏'+(session.trades.length?' · 胜率 '+(wins/session.trades.length*100).toFixed(0)+'%':'');
 $('[data-open]').textContent=session.position?'持仓 '+session.position.symbol:'当前无持仓';
 $('[data-progress]').textContent='已检查 '+session.cursor+' 个候选';
 $('[data-saving]').textContent=storageOK?'自动保存':'未保存 / 请导出';
 const toggle=$('[data-action="toggle"]');toggle.textContent=session.halted?'已停机 · 设置新会话':running?'暂停模拟':'启动模拟';toggle.setAttribute('aria-pressed',String(running));
 const latest=session.logs[0];$('[data-trace-label]').textContent=latest?latest.trace+' / '+latest.agent:'等待第一条信号';
 $('[data-agents]').innerHTML=roles.map(([name],i)=>{const log=session.logs.find(l=>l.agent===name);return '<button class="agent '+(latest?.agent===name?'active':'')+'" data-agent="'+name+'"><span class="agent-index">0'+(i+1)+'</span><span><strong translate="no">'+name+'</strong><small>'+roleNames[name]+'</small><code title="'+esc(log?.reason||'')+'">'+esc(log?.reason||'等待首条模拟信号')+'</code></span><em>'+esc(log?decisionNames[log.decision]||log.decision:'待机')+'</em></button>';}).join('');
 $('[data-pipeline]').innerHTML=roles.map(([name],i)=>'<div class="stage '+(latest?.agent===name?'active':'')+'"><b>0'+(i+1)+'</b><span translate="no">'+name+'</span></div>').join('');
 $('[data-candidates]').innerHTML=Array.from({length:4},(_,i)=>{const q=fixture(session.cursor+i),reason=validateCandidate(q,session.config);const labels={'invalid price':'无效价格','stale quote':'报价过期','sell simulation failed':'卖出检查失败','token controls unverified':'控制权未验证','liquidity below $25,000':'流动性不足','slippage cap exceeded':'滑点超限'};return '<article class="candidate '+(reason?'reject':'')+'"><b translate="no">'+esc(q.symbol)+'</b><small>'+esc(reason?labels[reason]||reason:'待安全检查')+'</small></article>';}).join('');
 const position=session.position||session.trades[0],isOpen=!!session.position;
 $('[data-position-status]').textContent=isOpen?'OPEN':position?'CLOSED':'FLAT';
 $('[data-position]').innerHTML=position?'<h3 class="position-name" translate="no">'+esc(position.symbol)+'</h3><dl>'+[['进场价',position.entry.toFixed(6)],['出场价',isOpen?'等待平仓':position.exit.toFixed(6)],['分配仓位',money(position.size)],['每侧滑点',position.slippage+'%'],['净盈亏',isOpen?'待结算':money(position.pnl)]].map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl><button class="inspect" data-trace="'+esc(position.trace)+'">追踪 '+esc(position.trace)+' ↗</button>':'<p class="empty">暂无持仓。<br>启动模拟后，符合条件的候选会进入开仓流程。</p>';
 for(const el of $$('[data-policy]')){const name=el.dataset.policy;el.textContent=session.config[name]+'%'+(name==='allocation'?' 当前权益':'');}
 const agent=$('#agent-filter').value,filtered=session.logs.filter(log=>(agent==='all'||log.agent===agent)&&(!traceFilter||log.trace===traceFilter));
 $('[data-log-count]').textContent=session.logs.length+' 条记录';
 $('[data-trace-filter]').hidden=!traceFilter;$('[data-trace-filter]').textContent=traceFilter?'当前追踪：'+traceFilter+' · 清除筛选可返回全部记录':'';
 const list=$('[data-logs]'),scroll=list.scrollTop;
 list.innerHTML=filtered.slice(0,150).map(log=>'<button class="log-row '+(log.decision==='REJECT'?'reject':'')+'" data-trace="'+esc(log.trace)+'"><time>'+time(log.at)+'</time><b>'+esc(decisionNames[log.decision]||log.decision)+'</b><span><strong><span translate="no">'+esc(log.agent)+'</span> / '+esc(log.trace)+'</strong><small>'+esc(log.reason)+'</small></span></button>').join('')||'<p class="empty">暂无匹配记录。启动模拟，或清除当前筛选。</p>';list.scrollTop=scroll;
 $('[data-chart]').innerHTML=chart();$('[data-return]').textContent='变化 '+((session.balance/session.config.initial-1)*100).toFixed(2)+'%';
 $('[data-chart-note]').textContent=session.trades.length?'已核对 '+session.trades.length+' 笔平仓记录 · 最近最多 300 个结算点':'完成首笔交易后更新曲线';
 $('[data-trades]').innerHTML=session.trades.slice(0,100).map(trade=>'<tr><td>'+time(trade.at)+'<small>'+esc(trade.trace)+'</small></td><td translate="no">'+esc(trade.symbol)+'</td><td>'+money(trade.size)+'</td><td class="'+(trade.pnl<0?'negative':'positive')+'">'+money(trade.pnl)+'</td><td>'+money(trade.balance)+'</td><td><button data-trace="'+esc(trade.trace)+'">追踪 ↗</button></td></tr>').join('')||'<tr><td colspan="6">暂无已平仓交易；开仓和安全拒绝均不会提前计为收益。</td></tr>';
}
function tick(){if(!running)return;try{session=advance(session);if(session.halted)running=false;save();render();}catch(error){running=false;render();toast('模拟已暂停：'+error.message);}}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function focusLogs(){document.querySelector('#decisions').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
document.addEventListener('click',event=>{
 const agent=event.target.closest('[data-agent]');
 if(agent){$('#agent-filter').value=agent.dataset.agent;traceFilter=null;render();focusLogs();return;}
 const trace=event.target.closest('[data-trace]');
 if(trace){traceFilter=trace.dataset.trace;$('#agent-filter').value='all';render();focusLogs();return;}
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='toggle'){if(session.halted){$('#risk').scrollIntoView({behavior:'smooth'});return;}running=!running;lastTick=performance.now();if(running)tick();else{save();render();}}
 if(action==='clear-filter'){traceFilter=null;$('#agent-filter').value='all';render();}
 if(action==='json')download('nightjar-session.json',JSON.stringify({...session,mode:'PAPER / SYNTHETIC',exportedAt:new Date().toISOString()},null,2),'application/json');
 if(action==='csv'){const headers=['trace','at','symbol','size','pnl','balance','fees','slippage','mode','reason'],quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';download('nightjar-trades.csv','\uFEFF'+[headers.join(','),...session.trades.map(t=>headers.map(k=>quote(t[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8');}
});
$('#agent-filter').innerHTML='<option value="all">全部代理</option>'+roles.map(([name])=>'<option value="'+name+'">'+name+'</option>').join('');
$('#agent-filter').addEventListener('change',()=>{traceFilter=null;render();});
$('#speed').addEventListener('change',event=>{const n=Number(event.target.value);speed=[1,2,4].includes(n)?n:1;lastTick=performance.now();});
$('#session-form').addEventListener('submit',event=>{
 event.preventDefault();
 try{if(!event.currentTarget.reportValidity())return;const form=new FormData(event.currentTarget),config=Object.fromEntries(['initial','allocation','slippage','lossLimit'].map(k=>[k,Number(form.get(k))]));const next=createSession(config);session=next;running=false;traceFilter=null;$('#agent-filter').value='all';save();render();$('#form-message').textContent='新模拟会话已创建。点击顶部「启动模拟」开始运行。';toast('新会话已创建，所有面板已同步。');}catch(error){$('#form-message').textContent=error.message;}
});
for(const [key,value] of Object.entries(session.config)){const input=$('#session-form [name="'+key+'"]');if(input)input.value=value;}
function normalizeHash(){
 const aliases={live:'overview',desk:'overview',mutations:'agents',lineage:'decisions',treasury:'ledger',spawn:'risk',top:'overview'};
 const hash=location.hash.slice(1);if(aliases[hash]){history.replaceState(null,'','#'+aliases[hash]);if(aliases[hash]!=='overview')$('#'+aliases[hash]).scrollIntoView();}
}
addEventListener('hashchange',normalizeHash);normalizeHash();
function clock(){$('#clock').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false})+' LOCAL';}
render();clock();setInterval(clock,1000);setInterval(()=>{if(running&&performance.now()-lastTick>=3000/speed){lastTick=performance.now();tick();}},150);
if(new URLSearchParams(location.search).get('autoplay')==='1'&&!session.halted){running=true;lastTick=performance.now();tick();}

