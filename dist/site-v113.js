/* Stable anchor destinations. User input always takes control immediately. */
(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const dimensions=window.PORTFOLIO_MEDIA_DIMENSIONS||{};
  // Intrinsic sizes reserve the final aspect ratio before lazy images arrive.
  document.querySelectorAll('.doc-preview img').forEach(img=>{
    const key=decodeURI(img.getAttribute('src')||''),size=dimensions[key];
    if(size){
      if(!img.hasAttribute('width'))img.setAttribute('width',size[0]);
      if(!img.hasAttribute('height'))img.setAttribute('height',size[1]);
      const frame=img.closest('.doc-preview');
      frame.style.setProperty('--source-width',size[0]+'px');
      frame.style.setProperty('--source-ratio',String(size[0]/size[1]));
    }
  });
  let session=null,frame=0,viewerClosedAt=-Infinity;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||$('#motion-toggle')?.getAttribute('aria-pressed')==='true';
  function targetY(target){
    let top;
    if(target.id==='entrance')top=0;
    else if(target.id==='profile'&&innerWidth>1100){
      const intro=$('.intro');top=intro.offsetTop+Math.max(1,intro.offsetHeight-innerHeight)*.58;
    }else{
      const header=$('.site-nav').getBoundingClientRect().height;
      // offsetTop is immune to the short entrance transform on reveal targets.
      let y=0,node=target;
      while(node){y+=node.offsetTop;node=node.offsetParent;}
      top=y-header-20;
      if(target.id==='contact'&&target.offsetHeight<=innerHeight-header+1)top=document.documentElement.scrollHeight-innerHeight;
    }
    return Math.max(0,Math.min(top,document.documentElement.scrollHeight-innerHeight));
  }
  function cancel(){
    if(!session)return;
    session=null;cancelAnimationFrame(frame);frame=0;
    document.body.dataset.navState='cancelled';
  }
  function tick(now){
    if(!session)return;
    const s=session,desired=targetY(s.target);
    if(Math.abs(desired-s.lastTarget)>1){s.lastChange=now;s.lastTarget=desired;}
    const progress=s.duration?Math.min(1,(now-s.started)/s.duration):1;
    const y=progress<1?s.from+(desired-s.from)*(1-Math.pow(1-progress,4)):desired;
    if(Math.abs(scrollY-y)>.75){scrollTo({top:y,behavior:'instant'});if(progress===1)s.corrections++;}
    document.body.dataset.navState=progress<1?'animating':'settling';
    if(progress===1&&((document.readyState==='complete'&&now-s.lastChange>550)||now-s.started>8000)){
      document.body.dataset.navState='settled';
      document.body.dataset.navError=Math.abs(scrollY-desired).toFixed(2);
      document.body.dataset.navCorrections=String(s.corrections);session=null;frame=0;return;
    }
    frame=requestAnimationFrame(tick);
  }
  function navigate(target,link,options={}){
    cancel();
    if($('#viewer')?.open)return;
    const now=performance.now();
    session={target,started:now,lastChange:now,lastTarget:targetY(target),from:scrollY,
      duration:options.instant||reduced()?0:600,corrections:0};
    document.body.dataset.navTarget=target.id;
    if(link)history.replaceState(null,'',link.getAttribute('href'));
    frame=requestAnimationFrame(tick);
  }
  window.portfolioNavigate=navigate;
  ['wheel','touchstart','pointerdown'].forEach(type=>addEventListener(type,cancel,{passive:true}));
  document.addEventListener('click',event=>{if(event.target.closest('[data-open]'))cancel();},true);
  addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Tab','Escape'].includes(e.key))cancel();},true);
  $('#viewer')?.addEventListener('close',()=>{viewerClosedAt=performance.now();});
  function followHash(event){
    if(event?.oldURL?.includes('#viewer='))return;
    if(!location.hash||location.hash.startsWith('#viewer=')||performance.now()-viewerClosedAt<500)return;
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    const target=document.getElementById(id);if(target)navigate(target,null,{instant:true});
  }
  addEventListener('hashchange',followHash);
  addEventListener('pageshow',followHash);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',followHash,{once:true});
  else followHash();
  document.body.dataset.layoutVersion='1.1.3';
})();
