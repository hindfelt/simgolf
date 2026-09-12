// Render in a separate document so preview terrain globals and WebGL resources
// cannot change the open course. Each settings change replaces that document.
export function drawTerrainPreview(element,environment,{seed,style}) {
 let frame=element;
 if(element.tagName!=='IFRAME'){
  frame=document.createElement('iframe');frame.id=element.id;frame.title='New property in-game terrain preview';
  frame.setAttribute('aria-label',frame.title);element.replaceWith(frame);
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='terrain-preview-ready')return;
   if(event.data.query!==new URL(frame.src).search)return;
   frame.dataset.ready='true';
  });
 }
 frame.dataset.ready='false';
 frame.src=`/terrain-preview.html?seed=${seed}&landscape=${encodeURIComponent(style)}&environment=${encodeURIComponent(environment)}`;
}
