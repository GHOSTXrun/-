export const roles=[['Scout','DISCOVERY'],['Guard','BASIC SCREEN'],['Sizer','POSITION RISK'],['Trigger','PAPER EXECUTION'],['Scribe','DECISION AUDIT'],['Ledger','RECONCILIATION']];
export const defaults=Object.freeze({initial:33.4,allocation:10,maxImpact:1.5,minLiquidity:25000,minVolume:1000,takeProfit:4,stopLoss:2,maxHold:180,lossLimit:10,feePct:.1});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Math.round(n*1e8)/1e8;
export function config(input={}){
 const c={...defaults,...input};for(const k of Object.keys(defaults))if(!finite(c[k]))throw Error('Invalid setting: '+k);
 if(c.initial<1||c.initial>1e6||c.allocation<1||c.allocation>25||c.maxImpact<.05||c.maxImpact>1.5||c.minLiquidity<1000||c.minVolume<0||c.takeProfit<.1||c.takeProfit>100||c.stopLoss<.1||c.stopLoss>50||c.maxHold<15||c.maxHold>86400||c.lossLimit<1||c.lossLimit>25||c.feePct<0||c.feePct>2)throw Error('Settings outside permitted range');
 return c;
}
export function createSession(input={}){
 const c=config(input);return {version:1,config:c,cash:c.initial,realized:0,position:null,trades:[],logs:[],history:[{at:Date.now(),value:c.initial}],filtered:0,blockedKeys:[],counter:0,halted:false};
}
export function fresh(pair,now=Date.now()){return !!pair&&finite(pair.price)&&pair.price>0&&finite(pair.receivedAt)&&now>=pair.receivedAt&&now-pair.receivedAt<=45000;}
export function screen(pair,c=defaults,now=Date.now()){
 if(!fresh(pair,now))return 'Price missing or fetched more than 45s ago';
 if(!finite(pair.liquidity)||pair.liquidity<c.minLiquidity)return 'Liquidity below policy';
 if(!finite(pair.volumeH1)||pair.volumeH1<c.minVolume)return '1h volume below policy';
 if(!finite(pair.sellsM5)||pair.sellsM5<1)return 'No recent sells reported by provider';
 return null;
}
export function impactPct(size,pair){
 if(!finite(pair?.liquidity)||pair.liquidity<=0)return Infinity;
 // Constant-product reserve approximation, not a router quote or executable price.
 const reserve=pair.liquidity/2;return size/(reserve+size)*100;
}
export function equity(s,pair){
 if(!s.position)return s.cash;
 const p=s.position,price=finite(pair?.price)&&pair.price>0?pair.price:p.lastPrice;
 const gross=p.units*price,impact=impactPct(gross,pair||{liquidity:p.lastLiquidity});
 return round(s.cash+gross*(1-impact/100)*(1-s.config.feePct/100));
}
function record(s,agent,decision,reason,trace,now){s.logs.unshift({at:new Date(now).toISOString(),trace,agent,decision,reason,mode:'LIVE DATA / PAPER EXECUTION'});}
export function reject(s,pair,reason,now=Date.now()){
 const next=structuredClone(s),key=(pair?.pairAddress||'unknown')+':'+reason;
 if(!next.blockedKeys.includes(key)){next.blockedKeys.push(key);next.filtered++;record(next,'Guard','REJECT',reason,next.position?.trace||'WATCH',now);}
 return next;
}
export function openPaper(s,pair,now=Date.now(),manual=false){
 if(s.position)throw Error('A paper position is already open');
 if(s.halted)throw Error('Session loss stop is active');
 const reason=screen(pair,s.config,now);if(reason)throw Error(reason);
 const size=round(s.cash*s.config.allocation/100),impact=impactPct(size,pair);
 if(size<=0||size>s.cash||!finite(impact)||impact>s.config.maxImpact)throw Error('Estimated price impact exceeds policy');
 const next=structuredClone(s),trace='NJ-'+now.toString(36).toUpperCase()+'-'+String(++next.counter).padStart(3,'0');
 const entry=pair.price*(1+impact/100),units=size/(entry*(1+next.config.feePct/100));
 next.cash=round(next.cash-size);
 next.position={trace,at:new Date(now).toISOString(),openedAt:now,pairAddress:pair.pairAddress,baseAddress:pair.baseAddress,symbol:pair.symbol,entry,entryMark:pair.price,units,size,slippage:impact,lastPrice:pair.price,lastLiquidity:pair.liquidity,lastReceivedAt:pair.receivedAt,mode:'PAPER',reason:manual?'Operator requested paper entry':'Positive 5m change and basic market screen'};
 record(next,'Scout','CANDIDATE',pair.symbol+' · 5m '+pair.changeM5+'% · volume/h $'+pair.volumeH1.toFixed(0),trace,now);
 record(next,'Guard','LIMITED','Liquidity, volume and recent-sell metadata passed. Honeypot, mint/freeze controls and sell simulation NOT verified.',trace,now);
 record(next,'Sizer','SIZED','$'+size.toFixed(2)+' · '+next.config.allocation+'% of available paper cash',trace,now);
 record(next,'Trigger','OPEN','Paper fill only · aggregate price $'+pair.price+' · estimated impact '+impact.toFixed(4)+'% · no transaction sent',trace,now);
 record(next,'Scribe','RECORDED',next.position.reason,trace,now);
 return next;
}
export function closePaper(s,pair,reason='Operator paper close',now=Date.now()){
 if(!s.position)throw Error('No paper position to close');
 if(!pair||pair.pairAddress!==s.position.pairAddress||!fresh(pair,now))throw Error('A fresh quote for the held pair is required');
 const next=structuredClone(s),p=next.position,gross=p.units*pair.price,impact=impactPct(gross,pair);
 if(!finite(impact)||impact>next.config.maxImpact)throw Error('Exit impact estimate exceeds policy; paper position remains open');
 const exit=pair.price*(1-impact/100),proceeds=round(p.units*exit*(1-next.config.feePct/100)),pnl=round(proceeds-p.size);
 next.cash=round(next.cash+proceeds);next.realized=round(next.realized+pnl);
 next.trades.unshift({...p,at:new Date(now).toISOString(),closedAt:now,exit,pnl,proceeds,balance:next.cash,exitImpact:impact,fees:round(p.size-p.size/(1+next.config.feePct/100)+p.units*exit*next.config.feePct/100),reason});
 next.position=null;
 record(next,'Trigger','CLOSED',reason+' · estimated exit impact '+impact.toFixed(4)+'%',p.trace,now);
 record(next,'Scribe','RECORDED','Entry and exit costs reconciled under '+p.trace,p.trace,now);
 record(next,'Ledger','SETTLED','Net '+pnl.toFixed(4)+' USD · cash $'+next.cash.toFixed(4),p.trace,now);
 if(next.cash<=next.config.initial*(1-next.config.lossLimit/100)){next.halted=true;record(next,'Guard','HALTED','Session loss limit reached; new entries disabled',p.trace,now);}
 return next;
}
export function onQuotes(s,pairs,auto=false,now=Date.now()){
 let next=structuredClone(s);
 if(next.position){
  const pair=pairs.find(q=>q.pairAddress===next.position.pairAddress);
  if(fresh(pair,now)){
   next.position.lastPrice=pair.price;next.position.lastLiquidity=pair.liquidity;next.position.lastReceivedAt=pair.receivedAt;
   const net=equity(next,pair)-next.cash-next.position.size,returnPct=net/next.position.size*100,age=(now-next.position.openedAt)/1000;
   let reason=null;
   if(returnPct<=-next.config.stopLoss)reason='Stop loss '+returnPct.toFixed(2)+'%';
   else if(returnPct>=next.config.takeProfit)reason='Take profit '+returnPct.toFixed(2)+'%';
   else if(equity(next,pair)<=next.config.initial*(1-next.config.lossLimit/100))reason='Session equity loss limit';
   else if(age>=next.config.maxHold)reason='Maximum hold time '+next.config.maxHold+'s';
   if(reason&&auto){try{next=closePaper(next,pair,reason,now);}catch(error){next=reject(next,pair,error.message,now);}}
  }
 }else if(auto&&!next.halted){
  for(const pair of pairs){
   const reason=screen(pair,next.config,now);
   if(reason){next=reject(next,pair,reason,now);continue;}
   if(!finite(pair.changeM5)||pair.changeM5<=0)continue;
   try{next=openPaper(next,pair,now);break;}catch(error){next=reject(next,pair,error.message,now);}
  }
 }
 const pair=next.position?pairs.find(q=>q.pairAddress===next.position.pairAddress):null;
 next.history.push({at:now,value:equity(next,pair)});if(next.history.length>600)next.history.shift();
 return next;
}
export function validateSession(s){
 config(s.config);if(s.version!==1||!finite(s.cash)||s.cash<0||!finite(s.realized)||!Array.isArray(s.trades)||!Array.isArray(s.logs)||!Array.isArray(s.history)||!Array.isArray(s.blockedKeys)||!Number.isInteger(s.counter))throw Error('Invalid stored session');
 const pnl=s.trades.reduce((sum,t)=>sum+t.pnl,0);
 if(s.position&&(!finite(s.position.units)||s.position.units<=0||!finite(s.position.entry)||s.position.entry<=0||!finite(s.position.size)||s.position.size<=0||!finite(s.position.lastPrice)||s.position.lastPrice<=0||typeof s.position.pairAddress!=='string'||typeof s.position.baseAddress!=='string'))throw Error('Invalid stored position');
 if(Math.abs(pnl-s.realized)>1e-5||Math.abs(s.cash+(s.position?.size||0)-s.config.initial-s.realized)>1e-5)throw Error('Stored ledger cannot reconcile');
 return s;
}

