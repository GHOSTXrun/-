import {createSession,validateSession,onQuotes,openPaper,closePaper,reject,equity,screen} from './model.mjs';
import {loadMarket} from './market.mjs';
import {mountView,renderView} from './view.mjs';
mountView();
const $=s=>document.querySelector(s),key='nightjar.native.v1';
let state=createSession(),market={pairs:[],prices:{},receivedAt:0,source:'DEX Screener'},network={online:false,loading:false,error:null},selectedId=null,auto=false,filter=null,pollMs=15000,lastAttempt=0,storageOK=true;
function toast(text){const el=$('.native-toast');el.textContent=text;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,5000);}
try{const saved=localStorage.getItem(key);if(saved)state=validateSession(JSON.parse(saved));}catch{toast('Stored paper session could not reconcile. A new ledger was created.');}
function save(){try{localStorage.setItem(key,JSON.stringify(state));storageOK=true;}catch{storageOK=false;toast('Browser storage unavailable. Export the ledger to keep a copy.');}}
function selected(){return market.pairs.find(p=>p.pairAddress===selectedId)||market.pairs[0]||null;}
function log(agent,decision,reason,trace='WATCH'){state.logs.unshift({at:new Date().toISOString(),trace,agent,decision,reason,mode:'LIVE DATA / PAPER EXECUTION'});}
function render(){
 renderView(state,market,selected(),auto,network,filter);
 $('[data-watch-table]').innerHTML='<table><thead><tr><th>Pair</th><th>Price / USD</th><th>Liquidity</th><th>5m</th><th></th></tr></thead><tbody>'+market.pairs.map(p=>'<tr><td>'+escape(p.symbol)+'</td><td>'+p.price.toPrecision(6)+'</td><td>$'+p.liquidity.toFixed(0)+'</td><td>'+(p.changeM5??'—')+'%</td><td><button data-pair="'+p.pairAddress+'">SELECT</button></td></tr>').join('')+'</tbody></table>';
 if(!storageOK)$('[data-network-info]').textContent='Browser storage unavailable. Export your session.';
}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function refresh(){
 if(network.loading)return;network.loading=true;lastAttempt=Date.now();render();
 try{
  const result=await loadMarket(state.position),prices={...market.prices};
  for(const pair of result.pairs){prices[pair.pairAddress]=[...(prices[pair.pairAddress]||[]),pair.price].slice(-120);}
  market={...result,prices};network={online:true,loading:false,error:null};
  if(!market.pairs.some(p=>p.pairAddress===selectedId))selectedId=market.pairs[0]?.pairAddress;
  log('Scout','OBSERVED',market.pairs.length+' Solana pools · DEX Screener · aggregate USD prices');
  for(const pair of market.pairs){const reason=screen(pair,state.config);if(reason)state=reject(state,pair,reason);}
  state=onQuotes(state,market.pairs,auto);
  if(state.halted)auto=false;
  save();
 }catch(error){
  const changed=network.error!==error.message;
  network={online:false,loading:false,error:error.message};
  if(changed){log('Scout','OFFLINE',error.message+' · no new fills until a fresh market observation arrives');save();}
 }finally{render();}
}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csv(){const headers=['trace','at','symbol','size','entry','exit','pnl','balance','fees','reason','mode'],q=s=>'"'+String(s??'').replaceAll('"','""')+'"';return '\uFEFF'+[headers.join(','),...state.trades.map(t=>headers.map(k=>q(t[k])).join(','))].join('\r\n');}
document.addEventListener('click',event=>{
 const pair=event.target.closest('[data-pair]');if(pair){selectedId=pair.dataset.pair;if($('#markets').open)$('#markets').close();render();return;}
 const agent=event.target.closest('[data-agent]');if(agent){filter=agent.dataset.agent;render();document.querySelector('.nd-log').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
 const trace=event.target.closest('[data-trace]');if(trace){filter=trace.dataset.trace;render();document.querySelector('.nd-log').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
 const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
 if(['settings','manual','markets'].includes(action)){event.preventDefault();if(action==='settings'){for(const [name,value] of Object.entries(state.config)){const input=$('#risk-form [name="'+name+'"]');if(input)input.value=value;}}$('#'+action).showModal();return;}
 if(action==='close-dialog'){event.target.closest('dialog').close();return;}
 if(action==='clear'){filter=null;render();return;}
 if(action==='refresh'){refresh();return;}
 if(action==='json'){download('noxvil-native-session.json',JSON.stringify({...state,exportedAt:new Date().toISOString(),source:'DEX Screener',execution:'PAPER',networkStatus:network,latestMarketFetchedAt:market.receivedAt},null,2),'application/json');return;}
 if(action==='csv'){download('noxvil-native-trades.csv',csv(),'text/csv;charset=utf-8');return;}
 if(action==='auto'){
  if(state.halted){toast('Session loss stop is active. Create a new paper session in risk settings.');return;}
  auto=!auto;log('Scribe',auto?'ARMED':'PAUSED',auto?'Paper rule strategy armed. Orders require real observations.':'Automatic paper orders paused; market observation continues.');
  save();render();if(auto)refresh();return;
 }
 if(action==='buy'){try{if(!network.online)throw Error('Market connection is offline');state=openPaper(state,selected(),Date.now(),true);save();render();}catch(error){if(selected())state=reject(state,selected(),error.message);save();render();toast(error.message);}return;}
 if(action==='close'){try{const pair=market.pairs.find(p=>p.pairAddress===state.position?.pairAddress);state=closePaper(state,pair);save();render();}catch(error){toast(error.message);}return;}
});
$('#risk-form').addEventListener('submit',event=>{
 event.preventDefault();if(!event.currentTarget.reportValidity())return;
 try{const data=new FormData(event.currentTarget),input={};for(const key of Object.keys(state.config)){if(data.has(key))input[key]=Number(data.get(key));}state=createSession(input);auto=false;filter=null;pollMs=Number($('#poll-setting').value);save();render();$('#settings').close();toast('New paper ledger created. No real funds are connected.');}catch(error){$('#settings-message').textContent=error.message;}
});
document.querySelector('.nd-controls').insertAdjacentHTML('beforeend','<button data-action="csv">EXPORT TRADES / CSV ↗</button>');
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
render();refresh();setInterval(()=>{if(Date.now()-lastAttempt>=pollMs&&!network.loading)refresh();},1000);
setInterval(()=>{if(network.online&&Date.now()-market.receivedAt>45000){network.online=false;network.error='Market observation is stale. Waiting for a fresh response.';}render();},1000);

