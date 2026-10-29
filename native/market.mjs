const NATIVE_SOL='So11111111111111111111111111111111111111112';
const base=typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)?'/api/dex':'https://api.dexscreener.com';
const address=s=>typeof s==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
let profiles=[],profilesAt=0;
async function json(path){
 const response=await fetch(base+path,{signal:AbortSignal.timeout(12000),headers:{accept:'application/json'}});
 if(!response.ok)throw Error('DEX Screener HTTP '+response.status);
 return response.json();
}
export function normalizePair(p,at=Date.now()){
 const price=Number(p.priceUsd);
 if(p.chainId!=='solana'||!address(p.pairAddress)||!address(p.baseToken?.address)||!Number.isFinite(price)||price<=0)return null;
 return {pairAddress:p.pairAddress,baseAddress:p.baseToken.address,symbol:String(p.baseToken.symbol||'TOKEN').slice(0,20)+'/'+String(p.quoteToken?.symbol||'USD').slice(0,12),price,liquidity:Number(p.liquidity?.usd)||0,volumeH1:Number(p.volume?.h1)||0,changeM5:Number.isFinite(Number(p.priceChange?.m5))?Number(p.priceChange.m5):null,sellsM5:Number(p.txns?.m5?.sells)||0,buysM5:Number(p.txns?.m5?.buys)||0,createdAt:p.pairCreatedAt||null,receivedAt:at,source:'DEX Screener',url:'https://dexscreener.com/solana/'+p.pairAddress};
}
export async function loadMarket(position=null){
 let profileError=null;
 if(Date.now()-profilesAt>60000){try{const list=await json('/token-profiles/latest/v1');if(!Array.isArray(list))throw Error('Invalid profiles response');profiles=list.filter(p=>p.chainId==='solana'&&address(p.tokenAddress)).slice(0,10);profilesAt=Date.now();}catch(error){profileError=error.message;}}
 const tokens=[...new Set([NATIVE_SOL,...profiles.map(p=>p.tokenAddress),...(position?[position.baseAddress]:[])])].filter(address).slice(0,20);
 const raw=await json('/tokens/v1/solana/'+tokens.join(','));
 if(!Array.isArray(raw))throw Error('Invalid pair response');
 const at=Date.now(),mapped=raw.map(p=>normalizePair(p,at)).filter(Boolean);
 const best=new Map();
 for(const p of mapped)if(!best.has(p.baseAddress)||p.liquidity>best.get(p.baseAddress).liquidity)best.set(p.baseAddress,p);
 const pairs=[...best.values()].sort((a,b)=>b.volumeH1-a.volumeH1).slice(0,12);
 if(position&&!pairs.some(p=>p.pairAddress===position.pairAddress)){
  let held=mapped.find(p=>p.pairAddress===position.pairAddress);
  if(!held){const response=await json('/latest/dex/pairs/solana/'+position.pairAddress);held=(response.pairs||[]).map(p=>normalizePair(p,Date.now())).find(Boolean);}
  if(held)pairs.unshift(held);
 }
 if(!pairs.length)throw Error('No valid Solana pair prices returned');
 return {pairs,receivedAt:at,profileError,source:'DEX Screener',scope:profileError?'SOL + cached watchlist':'Recent profiles + SOL watchlist'};
}

