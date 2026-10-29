import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {Script} from 'node:vm';
const root=dirname(fileURLToPath(import.meta.url));
const read=file=>readFileSync(join(root,file),'utf8');
let html=read('index.html');
const engine=read('terminal-engine.mjs').replace(/^export /gm,'');
const desk=read('desk.js').replace(/^import .*?;\r?\n/,'').replace(/^export /gm,'');
const terminal=read('terminal.js').replace(/^import .*?;\r?\n/gm,'');
const script='const NightjarEngine=(()=>{'+engine+';return {defaults,roles,settings,createSession,validateCandidate,fixture,step,advance};})();\nconst NightjarDesk=(()=>{const {roles,fixture,validateCandidate}=NightjarEngine;'+desk+';return {mountDesk,renderDesk};})();\n(()=>{const {createSession,settings,step,advance,roles}=NightjarEngine;const {mountDesk,renderDesk}=NightjarDesk;'+terminal+'})();';
html=html.replace(/<link rel="stylesheet" href="\.\/(styles|terminal|desk|desk-reference)\.css[^\"]*">/g,(_,file)=>'<style>'+read(file+'.css')+'</style>');
new Script(script,{filename:'nightjar-frontend-bundle.js'});
html=html.replace(/<script type="module" src="\.\/terminal\.js[^\"]*"><\/script>/,()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>');
for(const file of ['favicon.svg','cellumo-logo.png']){const type=file.endsWith('.svg')?'image/svg+xml':'image/png';const data='data:'+type+';base64,'+readFileSync(join(root,'assets',file)).toString('base64');html=html.replace(new RegExp('\\./assets/'+file.replace('.','\\.')+'(?:\\?[^\"]*)?','g'),data);}
if(/<script[^>]*src=/.test(html)||/import .*? from /.test(html))throw Error('Standalone frontend still has script dependencies');
writeFileSync(join(root,'frontend.html'),html);
mkdirSync(join(root,'dist'),{recursive:true});writeFileSync(join(root,'dist/index.html'),html);writeFileSync(join(root,'dist/.nojekyll'),'');
console.log('Built self-contained frontend.html and dist/index.html. Open frontend.html directly or deploy dist/.');
