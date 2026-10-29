let lastState=null,handlers={},mainFrame,dialog,largeFrame;
const frames=new Set(),heights=new WeakMap();
function sendState(frame){if(lastState)frame.contentWindow?.postMessage({type:'nightjar:session',...lastState},'*');}
function fit(frame){
 const natural=heights.get(frame)||1500,width=1060;
 frame.style.width=width+'px';frame.style.height=natural+'px';
 if(frame===mainFrame){const box=frame.parentElement;const scale=Math.max(.05,Math.min(box.clientWidth/width,box.clientHeight/natural));frame.style.transform='scale('+scale+')';frame.style.left=Math.max(0,(box.clientWidth-width*scale)/2)+'px';frame.style.top='0';}
 else if(frame===largeFrame){const box=frame.parentElement,scale=Math.min(1,box.clientWidth/width);frame.style.transform='scale('+scale+')';frame.style.left=Math.max(0,(box.clientWidth-width*scale)/2)+'px';frame.style.top='0';box.style.height=natural*scale+'px';}
}
function attach(frame){frames.add(frame);heights.set(frame,1500);frame.addEventListener('load',()=>{sendState(frame);fit(frame);});new ResizeObserver(()=>fit(frame)).observe(frame.parentElement);fit(frame);}
export function connectVideoPanel(callbacks){
 handlers=callbacks;mainFrame=document.getElementById('video-panel-frame');if(!mainFrame)return;
 attach(mainFrame);
 addEventListener('message',event=>{
  const frame=[...frames].find(item=>item.contentWindow===event.source);if(!frame)return;
  const data=event.data;if(!data||typeof data!=='object')return;
  if(data.type==='nightjar:panel-ready'){sendState(frame);return;}
  if(data.type==='nightjar:panel-size'){if(Number.isFinite(data.height)&&data.height>100&&data.height<10000){heights.set(frame,data.height);fit(frame);}return;}
  if(data.type==='nightjar:panel-command'&&['toggle','json','agent','trace','speed','jump'].includes(data.command)){handlers[data.command]?.(data.value);}
 });
 document.getElementById('expand-video-panel').addEventListener('click',()=>{
  if(!dialog){dialog=document.createElement('dialog');dialog.className='video-panel-dialog';dialog.innerHTML='<header><span>NIGHTJAR / 视频交易面板</span><button type="button" data-close-panel>关闭 ×</button></header><div class="video-panel-scroll"><div class="video-panel-large-canvas"></div></div>';document.body.append(dialog);largeFrame=mainFrame.cloneNode();largeFrame.id='video-panel-large-frame';dialog.querySelector('.video-panel-large-canvas').append(largeFrame);dialog.querySelector('[data-close-panel]').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});attach(largeFrame);}
  dialog.showModal();requestAnimationFrame(()=>{sendState(largeFrame);fit(largeFrame);});
 });
}
export function updateVideoPanel(session,running,speed=1){lastState={session,running,speed};for(const frame of frames)sendState(frame);}

