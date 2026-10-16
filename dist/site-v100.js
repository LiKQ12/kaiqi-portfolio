/* Keep final Chinese phrases together without changing approved text. */
(()=>{
 const excluded='script,style,textarea,option,#tool-shell,.keep-tail,svg';
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh-CN',{granularity:'word'}):null;
 function guard(root){
  const walker=document.createTreeWalker(root,4);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const parent=node.parentElement;
   if(!parent||parent.matches('a,button')||parent.closest(excluded)||parent.querySelector(':scope > .keep-tail'))continue;
   if([...parent.childNodes].slice([...parent.childNodes].indexOf(node)+1).some(n=>n.nodeType===1||n.textContent.trim()))continue;
   const text=node.textContent;
   const han=[...text.matchAll(/[\u3400-\u9fff]/g)];
   if(han.length<5)continue;
   let at=han[han.length-4].index;
   if(segmenter){
    const segments=[...segmenter.segment(text)];let count=0;
    for(let i=segments.length-1;i>=0;i--){
     count+=(segments[i].segment.match(/[\u3400-\u9fff]/g)||[]).length;
     if(count>=4){at=segments[i].index;break;}
    }
   }
   const tail=document.createElement('phrase-tail');tail.className='keep-tail';tail.textContent=text.slice(at);
   node.textContent=text.slice(0,at);node.after(tail);
  }
 }
 guard(document.body);
 let frame=0;
 new MutationObserver(records=>{
  if(!records.some(r=>r.type==='characterData'||[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches('.keep-tail'))))return;
  cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>guard(document.body));
 }).observe(document.body,{childList:true,subtree:true,characterData:true});

 document.addEventListener('click',e=>{
  const link=e.target.closest('[data-experience-card]');
  if(!link)return;
  const card=document.querySelector('.work-card[data-copy-id="'+link.dataset.experienceCard+'"]');
  if(card&&card.getAttribute('aria-expanded')!=='true')card.click();
 });
})();
