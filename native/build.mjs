import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=dirname(fileURLToPath(import.meta.url)),read=name=>readFileSync(join(root,name),'utf8');
const plain=name=>read(name).replace(/^import .*?;\r?\n/gm,'').replace(/^export /gm,'');
export function build(){
 let html=read('index.html');
 const model=plain('model.mjs'),market=plain('market.mjs'),view=plain('view.mjs'),app=plain('app.mjs');
 const modelNames='roles,defaults,config,createSession,fresh,screen,impactPct,equity,reject,openPaper,closePaper,onQuotes,validateSession';
 const script='const NativeModel=(()=>{'+model+';return {'+modelNames+'};})();\nconst NativeMarket=(()=>{'+market+';return {loadMarket,normalizePair};})();\nconst NativeView=(()=>{const {roles,screen,impactPct,equity}=NativeModel;'+view+';return {mountView,renderView};})();\n(()=>{const {createSession,validateSession,onQuotes,openPaper,closePaper,reject,equity,screen}=NativeModel;const {loadMarket}=NativeMarket;const {mountView,renderView}=NativeView;'+app+'})();';
 new Script(script,{filename:'nightjar-native.js'});
 html=html.replace(/<link rel="stylesheet" href="\.\/(styles|native)\.css">/g,(_,name)=>'<style>'+read(name+'.css')+'</style>');
 html=html.replace('<script type="module" src="./app.mjs"></script>',()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
 if(/<iframe\b/i.test(html)||/parent\.postMessage/.test(html)||/<script[^>]*src=/.test(html))throw Error('Native build contains an embedded or external app');
 writeFileSync(join(root,'打开独立终端.html'),html);mkdirSync(join(root,'dist'),{recursive:true});writeFileSync(join(root,'dist/index.html'),html);
 console.log('Built independent native terminal (no iframe).');return {html,root};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))build();

