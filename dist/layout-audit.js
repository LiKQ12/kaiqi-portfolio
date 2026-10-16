/* Opt-in rendered layout report for the requested viewport checks. */
(()=>{
 if(!new URLSearchParams(location.search).has('layoutAudit'))return;
 let frame=0;
 function inspect(){
  const issues=[];let checked=0;
  const nodes=document.querySelectorAll('h1,h2,h3,h4,p,.copy-sentence,.work-card>b,.work-card>span,.profile-points li,small');
  for(const el of nodes){
   if(el.closest('#tool-shell,.chapter-label,dialog:not([open])')||!el.getClientRects().length)continue;
   let angle=0;
   for(let ancestor=el;ancestor;ancestor=ancestor.parentElement){
    const transform=getComputedStyle(ancestor).transform;
    if(transform!=='none'){const m=new DOMMatrix(transform);angle+=Math.atan2(m.b,m.a)}
   }
   const slope=Math.tan(angle);
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),lines=[];
   while(walker.nextNode()){
    const node=walker.currentNode;
    for(let i=0;i<node.textContent.length;i++){
     const ch=node.textContent[i];if(!ch.trim())continue;
     const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
     const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;
     const baseline=r.top+r.height/2-slope*(r.left+r.width/2);
     let line=lines.find(l=>Math.abs(l.top-baseline)<5);
     if(!line){line={top:baseline,text:''};lines.push(line)}line.text+=ch;
    }
   }
   if(lines.length<2)continue;
   checked++;lines.sort((a,b)=>a.top-b.top);
   const last=lines.at(-1).text,count=(last.match(/[\u3400-\u9fffA-Za-z0-9]/g)||[]).length;
   if(count>0&&count<=3)issues.push({tag:el.tagName,class:el.className,copy:el.closest('[data-copy-id]')?.dataset.copyId,text:el.textContent,last,lines:lines.map(l=>l.text)});
  }
  document.body.dataset.layoutAudit=JSON.stringify({view:[innerWidth,innerHeight],checked,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),issues});
 }
 function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(inspect)})}
 addEventListener('resize',schedule);addEventListener('load',schedule);
 document.fonts.ready.then(schedule);
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
 schedule();
})();
