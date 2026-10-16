/* Progressive interaction layer. Approved text, type, media and app logic are inherited. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const body=document.body, system=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover:hover) and (pointer:fine)');
  const reduced=()=>system.matches||$('#motion-toggle')?.getAttribute('aria-pressed')==='true';
  const ease='cubic-bezier(.22,1,.36,1)';
  const pending=new Map();
  function animateHeight(el,from,to,done){
    const previous=pending.get(el); pending.delete(el); previous?.cancel();
    if(reduced()||Math.abs(from-to)<1){el.classList.remove('is-animating');done?.();return;}
    el.classList.add('is-animating');
    const animation=el.animate([{height:from+'px'},{height:to+'px'}],{duration:280,easing:ease});
    pending.set(el,animation);
    animation.onfinish=()=>{
      if(pending.get(el)!==animation)return;
      pending.delete(el);el.classList.remove('is-animating');done?.();animation.cancel();
    };
    animation.oncancel=()=>{if(!pending.has(el))el.classList.remove('is-animating');};
  }
  function syncReduced(){
    body.classList.toggle('v112-reduced',reduced());
    if(reduced()){
      for(const [el,animation] of pending){animation.finish();}
      $$('.entry-card').forEach(el=>el.style.removeProperty('--pointer-tilt'));
    }
  }
  $('#motion-toggle')?.addEventListener('click',syncReduced);
  system.addEventListener('change',syncReduced); syncReduced();

  // One moving marker, plus aria-current for keyboard and mobile navigation.
  const nav=$('#main-navigation'), navLinks=$$('a',nav), marker=document.createElement('i');
  marker.className='v112-nav-marker';marker.setAttribute('aria-hidden','true');nav.append(marker);
  const destinations=navLinks.map(a=>({a,target:$(a.hash==='\x23experience-first'?'#experience':a.hash)})).filter(x=>x.target);
  let navFrame=0,active=null;
  function updateNav(){
    navFrame=0;const at=innerHeight*.32;
    let current=null;
    for(const item of destinations)if(item.target.getBoundingClientRect().top<=at)current=item;
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-3)current=destinations.at(-1);
    body.querySelector('.site-nav').classList.toggle('v112-scrolled',scrollY>24);
    if(current!==active){
      navLinks.forEach(a=>a.removeAttribute('aria-current')); current?.a.setAttribute('aria-current','location');active=current;
    }
    const show=!!current&&innerWidth>1100;
    marker.style.setProperty('--marker-opacity',show?'1':'0');
    if(show){marker.style.setProperty('--marker-x',current.a.offsetLeft+'px');marker.style.setProperty('--marker-width',current.a.offsetWidth+'px');}
  }
  const scheduleNav=()=>{if(!navFrame)navFrame=requestAnimationFrame(updateNav);};
  addEventListener('scroll',scheduleNav,{passive:true});addEventListener('resize',scheduleNav);
  new ResizeObserver(scheduleNav).observe(document.querySelector('main'));
  document.fonts.ready.then(scheduleNav);updateNav();

  // Tilt is local to each card; typography is never scaled.
  $$('.entry-card').forEach(card=>{
    let frame=0,x=0;
    card.addEventListener('pointermove',e=>{
      if(!fine.matches||reduced())return;
      const rect=card.getBoundingClientRect();x=Math.max(-1,Math.min(1,(e.clientX-rect.left)/rect.width*2-1));
      if(!frame)frame=requestAnimationFrame(()=>{card.style.setProperty('--pointer-tilt',(x*2).toFixed(2)+'deg');frame=0;});
    });
    card.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);frame=0;card.style.removeProperty('--pointer-tilt');});
  });

  // Keep the existing detail buttons and their original text rendering intact.
  $$('.work-detail').forEach(detail=>{
    const wrapper=document.createElement('div');wrapper.className='v112-work-reveal';
    detail.before(wrapper);wrapper.append(detail);
  });
  const beforeClick=new WeakMap();
  document.addEventListener('click',event=>{
    const card=event.target.closest('.work-card');if(!card)return;
    const detail=$('.work-detail',card.closest('.experience-item')),wrapper=detail.parentElement;
    beforeClick.set(card,wrapper.getBoundingClientRect().height);
  },true);
  document.addEventListener('click',event=>{
    const card=event.target.closest('.work-card');if(!card)return;
    const detail=$('.work-detail',card.closest('.experience-item')),wrapper=detail.parentElement;
    const opening=card.getAttribute('aria-expanded')==='true',from=beforeClick.get(card)||0;
    const prior=pending.get(wrapper);pending.delete(wrapper);prior?.cancel();
    if(reduced()){detail.hidden=!opening;return;}
    detail.hidden=false;
    const to=opening?wrapper.getBoundingClientRect().height:0;
    animateHeight(wrapper,from,to,()=>{detail.hidden=!opening;});
  });

  // Animate native details without replacing native summary keyboard behavior.
  $$('.experience-item details').forEach(details=>{
    const summary=$('summary',details);let wanted=details.open;
    summary.addEventListener('click',event=>{
      if(reduced())return;
      event.preventDefault();wanted=!wanted;
      const from=details.getBoundingClientRect().height;
      const old=pending.get(details);pending.delete(details);old?.cancel();
      details.open=true;
      const to=wanted?details.getBoundingClientRect().height:summary.getBoundingClientRect().height;
      animateHeight(details,from,to,()=>{details.open=wanted;});
    });
    details.addEventListener('toggle',()=>{if(!pending.has(details))wanted=details.open;});
  });

  // Actual media events drive the frame feedback. There is no additional copy.
  $$('.route-item video').forEach(video=>{
    const article=video.closest('.route-item');
    const sync=()=>article.classList.toggle('is-playing',!video.paused&&!video.ended);
    ['play','pause','ended','emptied'].forEach(type=>video.addEventListener(type,sync));sync();
  });
  const viewer=$('#viewer');
  let viewerOrigin=null,focusTimer=0;
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-open]');
    if(trigger){viewerOrigin=trigger;clearTimeout(focusTimer);}
  },true);
  viewer.addEventListener('close',()=>{
    clearTimeout(focusTimer);
    focusTimer=setTimeout(()=>{
      const focus=document.activeElement;
      if(!viewer.open&&viewerOrigin?.isConnected&&(focus===body||viewer.contains(focus)))viewerOrigin.focus({preventScroll:true});
    },reduced()?0:240);
  });
  $('#viewer-prev').addEventListener('click',()=>viewer.style.setProperty('--page-direction','-10px'),true);
  $('#viewer-next').addEventListener('click',()=>viewer.style.setProperty('--page-direction','10px'),true);
  document.addEventListener('keydown',event=>{
    if(viewer.open&&['ArrowLeft','ArrowRight'].includes(event.key))viewer.style.setProperty('--page-direction',event.key==='ArrowLeft'?'-10px':'10px');
  },true);
  const copy=$('#copy-email');let copyTimer;
  new MutationObserver(()=>{
    const confirmed=$('#copy-status').textContent==='已复制';copy.classList.toggle('is-confirmed',confirmed);
    clearTimeout(copyTimer);if(confirmed)copyTimer=setTimeout(()=>copy.classList.remove('is-confirmed'),1800);
  }).observe($('#copy-status'),{childList:true,characterData:true,subtree:true});
  body.dataset.interactionVersion='1.1.2';
})();
