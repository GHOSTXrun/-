// Local paper execution only. No wallet, RPC, exchange or signing integration.
export const defaults = Object.freeze({initial:33.40, allocation:10, slippage:1.5, lossLimit:10});
export const roles = [
  ['Scout','DISCOVERY','Tracks new pairs and volume acceleration. Produces candidates; never submits orders.'],
  ['Guard','SAFETY GATE','Rejects honeypots, sell restrictions, thin liquidity and unverified token controls. Holds veto authority.'],
  ['Sizer','POSITION RISK','Sizes every position from current equity, available cash and the session exposure limit.'],
  ['Trigger','EXECUTION','Opens and closes approved paper positions. Rejects quotes above the 1.5% slippage ceiling.'],
  ['Scribe','DECISION AUDIT','Records the signal, safety verdict, sizing rationale and execution outcome under one trace ID.'],
  ['Ledger','RECONCILIATION','Reconciles cash, fees and realized P&L after every close. Never counts an open position as settled profit.']
];
export function settings(input={}) {
  const c={...defaults,...input};
  for(const key of Object.keys(defaults)) if(typeof c[key]!=='number'||!Number.isFinite(c[key])) throw Error('Invalid '+key);
  if(c.initial<1||c.initial>1000000||c.allocation<1||c.allocation>25||c.slippage<0.1||c.slippage>1.5||c.lossLimit<1||c.lossLimit>25) throw Error('Settings outside permitted range');
  return c;
}
export function createSession(config=defaults){ const c=settings(config);return {version:1,config:c,balance:c.initial,trades:[],logs:[],filtered:0,cursor:0,halted:false}; }
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function validateCandidate(q,c=defaults){
  if(!q||!Number.isFinite(q.entry)||!Number.isFinite(q.exit)||q.entry<=0||q.exit<=0)return 'invalid price';
  if(!Number.isFinite(q.age)||q.age<0||q.age>30)return 'stale quote';
  if(q.sellable!==true)return 'sell simulation failed';
  if(q.controlsRevoked!==true)return 'token controls unverified';
  if(!Number.isFinite(q.liquidity)||q.liquidity<25000)return 'liquidity below $25,000';
  if(!Number.isFinite(q.slippage)||q.slippage<0||q.slippage>c.slippage)return 'slippage cap exceeded';
  return null;
}
export function fixture(i){
  const entry=1+(i%7)*.23;
  return {symbol:['NOVA','WING','DUSK','MOSS','ECHO','FERN'][i%6]+'/USDC',entry,exit:entry*(1+[.035,-.025,.018,.05,-.04,.012][i%6]),age:i%11===7?45:2,sellable:i%9!==4,controlsRevoked:i%13!==8,liquidity:i%8===3?12000:85000,slippage:i%10===6?1.8:.35};
}
export function step(session,quote=fixture(session.cursor),at=new Date().toISOString()){
  if(session.halted)return session;
  const s=structuredClone(session),trace='NJ-'+String(++s.cursor).padStart(5,'0');
  const log=(agent,decision,reason)=>s.logs.unshift({trace,at,agent,decision,reason,mode:'PAPER / SYNTHETIC'});
  log('Scout','CANDIDATE',quote.symbol+' · synthetic volume signal');
  const rejection=validateCandidate(quote,s.config);
  if(rejection){s.filtered++;log('Guard','REJECT',rejection);log('Scribe','RECORDED','No order created; safety gate closed.');return s;}
  log('Guard','PASS','Synthetic safety fixture passed; not an on-chain token audit.');
  const size=round(s.balance*s.config.allocation/100);
  if(size<=0||size>s.balance){log('Sizer','REJECT','Insufficient available paper cash');return s;}
  log('Sizer','SIZED','$'+size.toFixed(2)+' · '+s.config.allocation+'% of available equity');
  // Two-sided adverse slippage plus a 0.1% fee on each side.
  const buy=quote.entry*(1+quote.slippage/100),sell=quote.exit*(1-quote.slippage/100);
  const units=size/(buy*1.001),proceeds=units*sell*.999,pnl=round(proceeds-size);
  s.balance=round(s.balance+pnl);
  s.trades.unshift({trace,at,symbol:quote.symbol,size,pnl,balance:s.balance,entry:buy,exit:sell,slippage:quote.slippage,fees:round(size-size/1.001+units*sell*.001),mode:'PAPER',reason:'Synthetic momentum fixture; safety gate passed; size capped by current equity.'});
  log('Trigger','CLOSED','Paper round trip · slippage '+quote.slippage+'% per side; fees 0.1% per side');
  log('Scribe','RECORDED','Signal → guard → sizing → execution recorded under '+trace);
  log('Ledger','SETTLED','Net '+(pnl>=0?'+':'')+pnl.toFixed(2)+' · balance $'+s.balance.toFixed(2));
  if(s.balance<=s.config.initial*(1-s.config.lossLimit/100)){s.halted=true;log('Guard','HALTED','Session loss limit reached; start a new session to resume.');}
  return s;
}
