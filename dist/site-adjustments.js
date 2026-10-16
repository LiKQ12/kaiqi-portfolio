/* Keep the complete desktop demo in view while switching or using modules. */
(()=>{
 const shell=document.querySelector('#tool-shell');
 if(!shell)return;
 let frame=0;
 const schedule=(event)=>{
  if(event?.type==='focusin'&&!event.target.matches(':focus-visible'))return;
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   if(innerWidth<=1100)return;
   const box=shell.getBoundingClientRect();
   if(box.top<96 || box.bottom>innerHeight-16){
    scrollTo({top:scrollY+box.top-100,behavior:'instant'});
   }
  });
 };
 ['click','focusin','change'].forEach(type=>shell.addEventListener(type,schedule));
 addEventListener('resize',event=>{
  if(location.hash==='#tool-shell')schedule(event);
 });
})();

/* Preserve V9.2 frame positions; move each left-hand copy by 15% of its width. */
(()=>{
 const entries=[...document.querySelectorAll('.route-item.reverse')];
 let frame=0,initialHashHandled=false;
 const revealLinkedWork=()=>{
  if(!/^#(?:work-C\d+|competence|tool-shell)$/.test(location.hash))return;
  history.scrollRestoration='manual';
  document.querySelector(location.hash)?.scrollIntoView({block:'start',behavior:'instant'});
 };
 function update(){
  entries.forEach(entry=>{
   entry.style.setProperty('--reverse-video-shift','0px');
   entry.style.setProperty('--reverse-copy-shift','0%');
  });
  if(innerWidth>900){
   const distances=entries.map(entry=>{
    const video=entry.querySelector('.media-window').getBoundingClientRect();
    const copy=entry.querySelector('.media-copy').getBoundingClientRect();
    return Math.max(0,video.left-copy.right);
   });
   entries.forEach((entry,index)=>{
    const distance=distances[index];
    entry.style.setProperty('--reverse-video-shift',(-distance*.15)+'px');
    entry.style.setProperty('--reverse-copy-shift','15%');
    entry.dataset.gapBefore=distance.toFixed(4);
    entry.dataset.copyMove=(entry.querySelector('.media-copy').getBoundingClientRect().width*.15).toFixed(4);
    entry.dataset.gapTarget=(distance*.85-Number(entry.dataset.copyMove)).toFixed(4);
   });
  }
  dispatchEvent(new Event('portfolio:media-layout'));
  if(!initialHashHandled){initialHashHandled=true;revealLinkedWork();}
 }
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
 addEventListener('resize',schedule);
 addEventListener('hashchange',revealLinkedWork);
 addEventListener('load',()=>{schedule();requestAnimationFrame(revealLinkedWork);},{once:true});
 addEventListener('pageshow',()=>requestAnimationFrame(revealLinkedWork));
 document.fonts?.ready.then(schedule);
 if('ResizeObserver' in window){
  const observer=new ResizeObserver(schedule);
  ['#aigc-list','#trailers'].forEach(selector=>observer.observe(document.querySelector(selector)));
 }
 schedule();
})();
