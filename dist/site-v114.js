/* V1.1.4: no media request before an intentional play; no external player. */
window.initPortfolioMedia=function(videos){
  'use strict';
  const states=new WeakMap();
  const posterObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){
      const v=entry.target;if(v.dataset.poster)v.poster=v.dataset.poster;
      posterObserver.unobserve(v);
    }
  },{rootMargin:'300px 0px'}):null;
  function feedback(v,text,retry=false){
    const s=states.get(v);s.message.textContent=text;s.retry.hidden=!retry;
    s.status.hidden=!text;v.dataset.mediaState=retry?'slow':text?'loading':v.paused?'paused':'playing';
  }
  function clearTimer(v){const s=states.get(v);clearTimeout(s.timer);s.timer=0;}
  function waiting(v){
    const s=states.get(v);if(!s.wanted)return;
    feedback(v,'正在加载视频…');clearTimer(v);
    s.timer=setTimeout(()=>{if(s.wanted&&v.paused!==true&&v.readyState<3)feedback(v,'加载较慢，可稍候或重试',true);
      else if(s.wanted&&v.readyState<3)feedback(v,'加载较慢，可稍候或重试',true);},12000);
  }
  function start(v,retry=false){
    const s=states.get(v);s.wanted=true;s.start.hidden=true;v.controls=true;
    for(const other of videos)if(other!==v&&!other.paused)other.pause();
    if(v.dataset.poster)v.poster=v.dataset.poster;
    const elapsedAt=performance.now();s.clickedAt=elapsedAt;
    v.dataset.firstFrameMs='';v.dataset.playStartedAt=String(elapsedAt);
    if(retry||!v.getAttribute('src')){
      const resume=retry?v.currentTime:0;
      if(resume>0)v.addEventListener('loadedmetadata',()=>{if(resume<v.duration)v.currentTime=resume;},{once:true});
      v.src=v.dataset.src;v.preload='auto';v.load();
    }
    waiting(v);
    if('requestVideoFrameCallback' in v)v.requestVideoFrameCallback(()=>{
      if(s.clickedAt===elapsedAt)v.dataset.firstFrameMs=String(Math.round(performance.now()-elapsedAt));
    });
    const promise=v.play();
    promise?.catch(error=>{
      if(error.name==='AbortError')return;
      clearTimer(v);s.start.hidden=error.name!=='NotAllowedError';s.wanted=false;
      feedback(v,error.name==='NotAllowedError'?'请点击播放':'视频暂时无法加载',error.name!=='NotAllowedError');
    });
  }
  for(const v of videos){
    const frame=v.closest('.media-window');if(!frame||!v.dataset.src)continue;
    const startButton=frame.querySelector('.video-start');
    const status=document.createElement('div');status.className='media-status';status.hidden=true;
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const message=document.createElement('span');
    const retry=document.createElement('button');retry.type='button';retry.textContent='重新加载';retry.hidden=true;
    status.append(message,retry);frame.append(status);
    states.set(v,{start:startButton,status,message,retry,timer:0,wanted:false,clickedAt:0});
    v.dataset.mediaState='idle';v.setAttribute('aria-label',frame.nextElementSibling?.querySelector('h3')?.textContent||'作品视频');
    if(posterObserver)posterObserver.observe(v);else if(v.dataset.poster)v.poster=v.dataset.poster;
    startButton.addEventListener('click',()=>start(v));retry.addEventListener('click',()=>start(v,true));
    // Native controls are disabled without a source; the poster is the first-play entry.
    v.addEventListener('click',()=>{if(!v.getAttribute('src'))start(v);});
    v.addEventListener('keydown',event=>{
      if(!v.getAttribute('src')&&[' ','Enter'].includes(event.key)){event.preventDefault();start(v);}
    });
    v.addEventListener('play',()=>{const s=states.get(v);s.wanted=true;s.start.hidden=true;});
    v.addEventListener('playing',()=>{clearTimer(v);feedback(v,'');});
    v.addEventListener('waiting',()=>waiting(v));
    v.addEventListener('pause',()=>{const s=states.get(v);clearTimer(v);s.wanted=false;
      if(v.error||!s.retry.hidden)return;
      s.start.hidden=false;feedback(v,'');});
    v.addEventListener('ended',()=>{const s=states.get(v);clearTimer(v);s.wanted=false;s.start.hidden=false;feedback(v,'');});
    v.addEventListener('error',()=>{const s=states.get(v);if(!v.getAttribute('src'))return;
      clearTimer(v);s.wanted=false;s.start.hidden=true;feedback(v,'视频暂时无法加载',true);});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const v of videos)v.pause();});
};

;
/* source: site.js */
(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const reducedSystem=matchMedia("(prefers-reduced-motion: reduce)");
const finePointer=matchMedia("(pointer:fine)");
let manualReduced=false, scrollTick=false;

// Shared content rendering
const content=window.CONTENT||{aigc:[],trailers:[],comics:[],docs:[]};
const escapeCopy=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const copyLines=value=>String(value??'').split(/\n/).filter(Boolean).map(line=>`<span class="copy-sentence">${escapeCopy(line)}</span>`).join('');
const aigcList=$("#aigc-list");
content.aigc.forEach((item,i)=>{
  const article=document.createElement("article");
  article.className=`aigc-item route-item ${i%2?"reverse":""}`;
  article.style.setProperty("--tilt",i%2?"-1":"1");
  article.dataset.snap="";
  article.innerHTML=`<div class="media-window"><video playsinline tabindex="0" preload="none" data-poster="${item.poster}" data-src="${item.src}" data-cursor="播放"></video><button type="button" class="play-hint video-start" aria-label="播放${item.title}">▶</button></div><div class="media-copy"><span class="media-number">0${i+1} / 04</span><h3>${item.title}</h3><h4>${item.subtitle}</h4><p class="copy-lines">${copyLines(item.description)}</p><p class="role-tag">${item.role}</p></div>`;
  article.dataset.copyId=item.copyId; article.id='work-'+item.copyId; aigcList.append(article);
});

const trailers=$("#trailers");
content.trailers.forEach((item,i)=>{
  const article=document.createElement("article"); article.className=`trailer-card route-item ${i%2?"reverse":""}`; article.dataset.snap=""; article.style.setProperty("--tilt",i%2?"-1":"1");
  article.innerHTML=`<div class="media-window"><video playsinline tabindex="0" preload="none" data-poster="${item.poster}" data-src="${item.src}" data-cursor="播放"></video><button type="button" class="play-hint video-start" aria-label="播放${item.title}">▶</button></div><div class="media-copy"><span class="media-number">0${i+1} / 06</span><h3>${item.title}</h3><h4>${item.subtitle}</h4><p class="copy-lines">${copyLines(item.description)}</p><p class="role-tag">${item.role}</p></div>`;
  article.dataset.copyId=item.copyId; article.id='work-'+item.copyId; trailers.append(article);
});

const representatives=["E01_P01","E02_P01","E03_P01","E04_P01","E05_P01","E06_P01"].map(id=>content.comics.find(x=>x.id===id)).filter(Boolean);
const comicPreview=$("#comic-preview");
representatives.forEach((item,i)=>{
  const b=document.createElement("button"); b.className="comic-sheet motion-item"; b.dataset.open="comics"; b.dataset.index=String(content.comics.indexOf(item)); b.dataset.cursor="翻阅"; b.style.setProperty("--comic-r",String([-2,1,-1.2,1.5,-1.5,2][i]));
  b.innerHTML=`<img src="${item.poster}" alt="${item.title}" loading="lazy"><span>EP. ${String(i+1).padStart(2,"0")}</span>`; comicPreview.append(b);
});

const documents=$("#documents");
content.docs.forEach(doc=>{
  const article=document.createElement("article"); article.className="document-card motion-item";
  const format=doc.kind||"PDF";
  article.innerHTML=`<div class="doc-copy"><p class="doc-meta">${escapeCopy(doc.displayMeta||`${doc.count}页 · ${format} · ${doc.status}`)}</p><h3>${doc.title}</h3>${doc.subtitle?`<h4>${escapeCopy(doc.subtitle)}</h4>`:""}<p class="copy-lines">${copyLines(doc.role)}</p>${doc.originalTitle?`<p class="original-title">原作品名：${escapeCopy(doc.originalTitle)}</p>`:""}<div class="doc-actions"><button class="pill liquid-glass" data-open="doc:${doc.id}" data-cursor="翻阅">逐页翻阅 ↗</button><a class="text-link" href="${doc.pdf}" target="_blank" rel="noopener">完整 ${format} ↗</a></div></div><button class="doc-preview" data-open="doc:${doc.id}" data-cursor="翻阅" aria-label="翻阅${doc.title}"><img src="${doc.poster}" alt="${doc.title}封面" loading="lazy"></button>`;
  article.dataset.copyId=doc.copyId; documents.append(article);
});

// Draw only between video frames, using layout geometry. Resize may change the route;
// scrolling does not trigger a recalculation.
function drawVideoRoute(sectionSelector,listSelector,routeSelector){
  const section=$(sectionSelector),list=$(listSelector),route=$(routeSelector);
  if(!section||!list||!route)return;
  const svg=$('svg',route),path=$('path',svg),frames=$$('.media-window',list);
  if(frames.length<2)return;
  const base=section.getBoundingClientRect();
  const width=section.clientWidth,height=section.offsetHeight;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  route.style.height=`${height}px`;
  const segments=[];
  for(let i=0;i<frames.length-1;i++){
    const a=frames[i].getBoundingClientRect(),b=frames[i+1].getBoundingClientRect();
    const x1=a.left+a.width/2-base.left,y1=a.bottom-base.top;
    const x2=b.left+b.width/2-base.left,y2=b.top-base.top;
    const gap=Math.max(1,y2-y1),turn=y1+gap*.5;
    if(innerWidth<=900){
      const rail=Math.max(8,parseFloat(getComputedStyle(section).paddingLeft)/2);
      const exit=y1+Math.min(12,gap*.1),entry=y2-Math.min(12,gap*.1);
      segments.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x1.toFixed(1)} ${exit.toFixed(1)} L ${rail.toFixed(1)} ${exit.toFixed(1)} L ${rail.toFixed(1)} ${entry.toFixed(1)} L ${x2.toFixed(1)} ${entry.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }else{
      segments.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${turn.toFixed(1)}, ${x2.toFixed(1)} ${turn.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
  }
  path.setAttribute('d',segments.join(' '));
}
let routeFrame=0;
function updateVideoRoutes(){
  cancelAnimationFrame(routeFrame);
  routeFrame=requestAnimationFrame(()=>{
    drawVideoRoute('#motion','#aigc-list','#aigc-route');
    drawVideoRoute('#screening','#trailers','.trailer-route');
  });
}
if('ResizeObserver' in window){
  const routeObserver=new ResizeObserver(updateVideoRoutes);
  ['#aigc-list','#trailers'].forEach(selector=>routeObserver.observe($(selector)));
}
addEventListener('resize',updateVideoRoutes);
addEventListener('portfolio:media-layout',updateVideoRoutes);
addEventListener('load',updateVideoRoutes,{once:true});
updateVideoRoutes();

const navToggle=$('#nav-menu-toggle'),mainNav=$('#main-navigation');
if(navToggle&&mainNav){
  navToggle.addEventListener('click',()=>{
    const open=navToggle.getAttribute('aria-expanded')!=='true';
    navToggle.setAttribute('aria-expanded',String(open));
    navToggle.setAttribute('aria-label',open?'收起菜单':'展开菜单');
    mainNav.classList.toggle('is-open',open);
  });
  mainNav.addEventListener('click',event=>{
    if(event.target.closest('a')){
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded','false');
      navToggle.setAttribute('aria-label','展开菜单');
    }
  });
}

// Keep the current viewing position readable while content enters and leaves.
$$('.section-heading,.tool-intro,.group-marker,.experience-item,.tool-story article,.comic-spread,.comic-action,.document-card,.contact-grid').forEach(el=>el.classList.add('motion-item'));
$$('#profile,.experience-item,.tool-intro,.section-heading,.aigc-item,.trailer-card,.comic-spread,.document-card,.contact-grid').forEach(el=>el.dataset.snap='');

// Media coordination
const allVideos=()=>$$('video');
allVideos().forEach(v=>{
  v.addEventListener("play",()=>allVideos().forEach(o=>{if(o!==v)o.pause();}));
});
const mediaObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.intersectionRatio<.08&&!e.target.paused)e.target.pause();}),{threshold:[0,.08,.35]});
allVideos().forEach(v=>mediaObserver.observe(v));
window.initPortfolioMedia(allVideos());

// Details affordance
$$('.experience-item').forEach(item=>{
  const details=$('details',item), paragraphs=details?$$('.detail-copy p',details):[];
  const jobs=paragraphs.length?paragraphs.map(p=>({title:$('b',p)?.textContent||item.querySelector('h3')?.textContent||'项目工作',body:p.textContent.replace($('b',p)?.textContent||'','').trim(),cardTitle:p.dataset.cardTitle||$('b',p)?.textContent||'',brief:p.dataset.brief||'',copyId:p.dataset.copyId||''})):[{title:item.querySelector('h3')?.textContent||'项目工作',body:item.querySelector('.summary')?.textContent||''}];
  if(!jobs.length)return;
  const cards=document.createElement('div');cards.className='work-cards';
  const detail=document.createElement('div');detail.className='work-detail';detail.hidden=true;
  jobs.forEach((job,i)=>{
    const button=document.createElement('button');button.type='button';button.className='work-card';button.setAttribute('aria-expanded','false');
    const label=document.createElement('b');label.textContent=job.cardTitle||job.title; button.dataset.copyId=job.copyId;
    const brief=document.createElement('span');brief.textContent=job.brief||job.body;
    button.append(label,brief);
    button.addEventListener('click',()=>{
      const active=button.getAttribute('aria-expanded')==='true';
      $$('.work-card',cards).forEach(b=>b.setAttribute('aria-expanded','false'));
      if(active){detail.hidden=true;return}
      button.setAttribute('aria-expanded','true');detail.hidden=false;detail.replaceChildren();
      const heading=document.createElement('h4');heading.textContent=job.title;
      const body=document.createElement('p');body.textContent=job.body;
      detail.append(heading,body);
    });cards.append(button);
  });
  (details||item.querySelector('.award')||item.lastElementChild).before(cards,detail);
});
$$('details').forEach(d=>d.addEventListener('toggle',()=>{const s=$('summary span',d);if(s)s.textContent=d.open?'×':'＋';}));

// Low-cost scroll state: reveal once, update page progress in a single animation frame.
const revealTargets=$$('.motion-item,.aigc-item,.trailer-card');
if('IntersectionObserver' in window&&!isReduced()){
  document.body.classList.add('motion-ready');
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('is-inview');revealObserver.unobserve(entry.target);}
  }),{rootMargin:'0px 0px -8% 0px',threshold:.04});
  revealTargets.forEach(el=>{el.classList.add('reveal-on');revealObserver.observe(el);});
}
function updateIntro(){
 if(innerWidth<=1100||isReduced())return;
 const intro=$('.intro');if(!intro)return;
 const p=clamp(scrollY/Math.max(1,intro.offsetHeight-innerHeight));
 const sFade=clamp((p-.24)/.22),pIn=clamp((p-.34)/.22),pOut=clamp((p-.96)/.08);
 document.documentElement.style.setProperty('--statement-opacity',String(1-sFade));
 document.documentElement.style.setProperty('--statement-y',`${-sFade*24}px`);
 document.documentElement.style.setProperty('--profile-opacity',String(pIn*(1-pOut*.18)));
 document.documentElement.style.setProperty('--profile-y',`${(1-pIn)*24-pOut*8}px`);
 document.documentElement.style.setProperty('--profile-events',pIn>.72?'auto':'none');
 const caption=p<.36?'向下探索 · 从想法开始':p<.78?'个人档案 · 继续向下':'进入现场记录 ↓';
 const node=$('#intro-caption');if(node&&node.textContent!==caption)node.textContent=caption;
}
function updateScroll(){
 scrollTick=false;
 const max=document.documentElement.scrollHeight-innerHeight;
 document.documentElement.style.setProperty('--page-progress',`${max>0?clamp(scrollY/max)*100:0}%`);
 updateIntro();
}
function updateExperienceKind(){
 const items=$$('.experience-item');if(!items.length)return;
 const target=innerHeight*.45;let best=null,dist=Infinity;
 items.forEach(el=>{const d=Math.abs(el.getBoundingClientRect().top-target);if(d<dist){dist=d;best=el;}});
 if(!best)return;const label=$('#experience-kind'),next=best.dataset.group;
 if(label&&label.textContent!==next){const box=label.parentElement;box.classList.add('switching');setTimeout(()=>{label.textContent=next;box.classList.remove('switching');},150);}
}
if('IntersectionObserver' in window){const experienceObserver=new IntersectionObserver(()=>updateExperienceKind(),{rootMargin:'-42% 0px -48% 0px',threshold:0});$$('.experience-item').forEach(el=>experienceObserver.observe(el));}
function isReduced(){return manualReduced||reducedSystem.matches}
function profileTarget(el){if(innerWidth>1100&&el.id==='profile'){const intro=$('.intro'),range=Math.max(1,intro.offsetHeight-innerHeight);return intro.offsetTop+range*.58;}return scrollY+el.getBoundingClientRect().top-76;}
addEventListener('scroll',()=>{if(!scrollTick){scrollTick=true;requestAnimationFrame(updateScroll);}},{passive:true});
addEventListener('resize',()=>{updateScroll();updateExperienceKind();});
updateScroll();updateExperienceKind();

// Cursor and glass reflections
if(finePointer.matches&&!reducedSystem.matches){document.body.classList.add("cursor-ready","cursor-capable");const dot=$(".cursor-dot"),ring=$(".cursor-ring");addEventListener("pointermove",e=>{dot.style.transform=`translate(${e.clientX-2}px,${e.clientY-2}px)`;ring.style.transform=`translate(${e.clientX-13}px,${e.clientY-13}px)`;const t=e.target.closest("[data-cursor],a,button,summary");ring.classList.toggle("context",!!t);});addEventListener("pointerdown",()=>ring.classList.add("down"));addEventListener("pointerup",()=>ring.classList.remove("down"));addEventListener("keydown",e=>{if(e.key==="Tab")document.body.classList.remove("cursor-ready")});addEventListener("pointermove",()=>document.body.classList.add("cursor-ready"),{once:true});}

// Gallery for comics and documents
const viewer=$("#viewer");let viewerItems=[],viewerIndex=0,viewerMode="",viewerDoc=null,lastTrigger=null,returnY=0;
function openViewer(mode,index=0,trigger=null){lastTrigger=trigger;returnY=scrollY;viewerMode=mode;viewerDoc=null;if(mode==="comics")viewerItems=content.comics;else{viewerDoc=content.docs.find(d=>d.id===mode.replace("doc:",""));viewerItems=viewerDoc.pages;}viewerIndex=clamp(index,0,viewerItems.length-1);renderViewer();if(!viewer.open)viewer.showModal();document.body.classList.add("viewer-open");history.pushState({viewer:mode,index:viewerIndex},"",`#viewer=${encodeURIComponent(mode)}&item=${viewerItems[viewerIndex].id}`);}
function renderViewer(){const item=viewerItems[viewerIndex];$("#viewer-type").textContent=viewerMode==="comics"?"03 / 改编台":"05 / 资料架";$("#viewer-title").textContent=viewerMode==="comics"?"短剧改编漫画":viewerDoc.title;$("#viewer-count").textContent=`${viewerIndex+1} / ${viewerItems.length}`;$("#viewer-caption").textContent=item.title;const current=$("#viewer-current");current.classList.remove("zoomed");current.innerHTML=`<img src="${item.src}" alt="${item.title}" loading="eager">`;$("#viewer-prev").disabled=viewerIndex===0;$("#viewer-next").disabled=viewerIndex===viewerItems.length-1;$("#full-pdf").hidden=!viewerDoc;$("#episode-control").hidden=viewerMode!=="comics";$("#zoom-toggle").hidden=false;if(viewerDoc){const kind=viewerDoc.kind||'PDF';$("#full-pdf").href=viewerDoc.pdf;$("#full-pdf").textContent=`完整 ${kind} ↗`;}renderThumbs();renderReader();if(viewerMode==="comics")renderEpisodes();}
function renderThumbs(){const nav=$("#viewer-thumbs");nav.innerHTML="";viewerItems.forEach((x,i)=>{const b=document.createElement("button");b.setAttribute("aria-current",String(i===viewerIndex));b.innerHTML=`<span>${i+1}</span>`;if(Math.abs(i-viewerIndex)<=3){const thumb=document.createElement('img');thumb.src=x.poster;thumb.alt='';thumb.loading='lazy';b.prepend(thumb)}b.onclick=()=>{viewerIndex=i;renderViewer();};nav.append(b);});nav.children[viewerIndex]?.scrollIntoView({inline:"center",block:"nearest"});}
function renderReader(){const reader=$("#continuous-reader");const comicMode=viewerMode==="comics"&&innerWidth<=760;viewer.classList.toggle("reader-mode",comicMode);reader.innerHTML=comicMode?viewerItems.map(x=>`<figure class="reader-page"><img src="${x.src}" alt="${x.title}" loading="lazy"><figcaption>${x.title}</figcaption></figure>`).join(""):'';}
function renderEpisodes(){const s=$("#episode-select"),eps=[...new Set(content.comics.map(x=>x.episode))];s.innerHTML=eps.map(e=>`<option value="${e}" ${viewerItems[viewerIndex].episode===e?"selected":""}>${e.replace("E","")}</option>`).join("");}
function closeViewer(fromPop=false){if(!viewer.open)return;viewer.close();document.body.classList.remove("viewer-open");scrollTo(0,returnY);lastTrigger?.focus();if(!fromPop&&location.hash.startsWith("#viewer="))history.back();}
document.addEventListener("click",e=>{const open=e.target.closest("[data-open]");if(open){e.preventDefault();openViewer(open.dataset.open,+(open.dataset.index||0),open);}});
$("#viewer-close").onclick=()=>closeViewer();$("#viewer-prev").onclick=()=>{if(viewerIndex>0){viewerIndex--;renderViewer();}};$("#viewer-next").onclick=()=>{if(viewerIndex<viewerItems.length-1){viewerIndex++;renderViewer();}};$("#zoom-toggle").onclick=()=>{const c=$("#viewer-current"),on=c.classList.toggle("zoomed");$("#zoom-toggle").setAttribute("aria-pressed",String(on));$("#zoom-toggle").textContent=on?"恢复大小 −":"放大阅读 ＋";};$("#episode-select").onchange=e=>{const i=viewerItems.findIndex(x=>x.episode===e.target.value);if(i>=0){viewerIndex=i;renderViewer();}};
viewer.addEventListener("click",e=>{if(e.target===viewer)closeViewer();});addEventListener("keydown",e=>{if(!viewer.open)return;if(e.key==="Escape")closeViewer();if(e.key==="ArrowLeft"&&viewerIndex>0){viewerIndex--;renderViewer();}if(e.key==="ArrowRight"&&viewerIndex<viewerItems.length-1){viewerIndex++;renderViewer();}});addEventListener("popstate",()=>{if(viewer.open)closeViewer(true);});
viewer.addEventListener("cancel",e=>{e.preventDefault();closeViewer();});

// Contact and reduced motion
$("#copy-email").onclick=async()=>{try{await navigator.clipboard.writeText("li13070148925@163.com");$("#copy-status").textContent="已复制";}catch{$("#copy-status").textContent="请手动复制";}setTimeout(()=>$("#copy-status").textContent="",1800);};
$("#motion-toggle").onclick=()=>{manualReduced=!manualReduced;document.body.classList.toggle("reduced",manualReduced);$("#motion-toggle").setAttribute("aria-pressed",String(manualReduced));$("#motion-toggle").textContent=manualReduced?"恢复动效":"减少动效";updateScroll();};

// Smooth anchor navigation with focus-safe offset
document.addEventListener("click",e=>{const a=e.target.closest('a[href^="#"]');if(!a||a.getAttribute("href")==="#"||a.hasAttribute("data-open"))return;const t=$(a.getAttribute("href"));if(t){e.preventDefault();if(window.portfolioNavigate){window.portfolioNavigate(t,a);return;}if(t.id==="profile")scrollTo({top:profileTarget(t),behavior:isReduced()?"auto":"smooth"});else t.scrollIntoView({behavior:isReduced()?"auto":"smooth",block:"start"});history.replaceState(null,"",a.getAttribute("href"));}});
})();

;
;
/* source: tool-v8.js */
(()=>{
"use strict";
const root=document.querySelector('#tool-panel'),status=document.querySelector('#tool-status');
if(!root)return;
const sampleFiles=[
  {name:'第01集_长素材.mp4',seconds:1122},
  {name:'第02集_长素材.mp4',seconds:1268},
  {name:'花絮补充素材.mp4',seconds:576}
];
const state={tab:'cut',project:false,projectName:'示例项目',files:[],target:50,duration:30,tail:5,generated:false,segments:['selected','selected','backup','selected','excluded','selected'],cut:48,mode:'uniform',uniform:'项目成片',suffix:'',start:1,separator:'_',canvas:'1080×1920',scale:'50%',modal:'',exported:false,renameFiles:[],titles:'重回故地\n真相出现\n最后的选择',renameMode:'bulk',renamePreview:false,renameDone:false,renameConflict:false,renameAppend:false,notes:'',savedNotes:''};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>`00:${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}.000`;
const btn=(label,action,disabled=false,primary=false)=>`<button type="button" class="mj-btn ${primary?'primary':''}" data-mj="${action}" ${disabled?'disabled':''}>${label}</button>`;
const field=(label,id,value,min=0,max=999)=>`<label class="mj-field">${label}<input id="${id}" type="number" min="${min}" max="${max}" value="${esc(value)}"></label>`;
const checked=(value,option)=>value===option?'checked':'';
function setStatus(message){status.textContent=message}
function modal(){
 if(!state.modal)return '';
 if(state.modal==='new'||state.modal==='open')return `<div class="mj-modal-shade"><div class="mj-modal" role="dialog" aria-modal="true" aria-label="${state.modal==='new'?'新建项目':'打开项目'}"><h3>${state.modal==='new'?'新建项目':'打开示例项目'}</h3><p>网页仅使用内置示例数据。</p><label>项目名称<input id="mj-project-name" value="${esc(state.projectName)}"></label><div class="mj-modal-actions">${btn('取消','modal-cancel')}${btn(state.modal==='new'?'建立示例项目':'打开示例项目','modal-confirm',false,true)}</div></div></div>`;
 return `<div class="mj-modal-shade"><div class="mj-modal mj-export-modal" role="dialog" aria-modal="true" aria-label="导出设置"><h3>导出设置</h3><p>已选片段按当前命名规则生成以下结果预览。</p><div class="mj-export-files">${outputNames().map((name,i)=>`<div><span>${esc(name)}</span><small>${30+i*2} 秒</small></div>`).join('')}</div><div class="mj-export-options"><label><input type="checkbox" checked> 视频</label><label><input type="checkbox"> 普通命名 Excel</label><label><input type="checkbox" checked> 番茄上传 Excel</label><label><input type="checkbox" checked> JSON / CSV 记录</label></div><div class="mj-modal-actions">${btn('取消','modal-cancel')}${btn('确认模拟导出','export-confirm',false,true)}</div></div></div>`;
}
function titlesList(){return state.titles.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)}
function namedFile(i,mode,append=false){
 const base=mode==='uniform'?(state.uniform||'项目成片'):(titlesList()[i]||'未命名');
 const serial=mode==='uniform'||append?state.separator+String(state.start+i).padStart(3,'0'):'';
 return base+serial+state.suffix+'.mp4';
}
function outputNames(){return [0,1,2].map(i=>namedFile(i,state.mode))}
function namingInput(mode,scope){
 if(mode==='uniform')return `<label class="mj-wide">统一名称<input id="${scope==='cut'?'mj-uniform':'mj-rename-uniform'}" value="${esc(state.uniform)}" placeholder="输入统一名称，输出时自动追加三位序号"></label>`;
 return `<label class="mj-wide mj-bulk-title">批量标题<textarea id="${scope==='cut'?'mj-cut-titles':'mj-titles'}" placeholder="每行一个标题，按照视频或片段顺序分配">${esc(state.titles)}</textarea></label><div class="mj-inline">${btn('导入TXT',scope==='cut'?'cut-import':'rename-import')}${btn('导入CSV',scope==='cut'?'cut-import':'rename-import')}<span>标题 ${titlesList().length} 条</span></div>`;
}
function sourceRows(){return state.files.length?state.files.map((f,i)=>`<tr draggable="true" data-source-index="${i}" title="拖动调整素材顺序"><td>${esc(f.name)}</td><td>${fmt(f.seconds)}</td><td>${state.tail} 秒</td><td>${fmt(f.seconds-state.tail)}</td><td>× 1.00</td><td>${Math.floor((f.seconds-state.tail)/state.duration)}</td></tr>`).join(''):`<tr class="mj-empty-row"><td colspan="6"></td></tr>`}
function segmentRows(){return state.generated?state.segments.map((s,i)=>`<tr data-segment="${i}" class="mj-segment-row"><td><button class="mj-state ${s}" data-mj="segment" data-index="${i}">${s==='selected'?'√':s==='backup'?'−':'×'}</button></td><td>${s==='selected'?String(i+1).padStart(3,'0'):'—'}</td><td>${esc(state.files[i%state.files.length]?.name||'')}</td><td>${fmt(i*state.duration)}</td><td>${fmt((i+1)*state.duration)}</td><td>${state.duration} 秒</td><td>${i===2?'已调整':'—'}</td></tr>`).join(''):`<tr class="mj-empty-row"><td colspan="7"></td></tr>`}
function cut(){
 const selected=state.generated?state.segments.filter(s=>s==='selected').length:0;
 return `<div class="mj-projectbar">${btn('新建项目','new',false,true)}${btn('打开项目','open',false,true)}${btn('保存项目','save',!state.project,true)}<b>${state.project?esc(state.projectName):'尚未打开项目'}</b></div>
 <fieldset class="mj-params" ${!state.project?'disabled':''}><legend>项目参数</legend>${field('目标数量','mj-target',state.target,1,999)}${btn('20条','target-20')}${btn('50条','target-50')}${field('单条时长','mj-duration',state.duration,1,600)}${field('结尾删除时长','mj-tail',state.tail,0,120)}${btn('应用尾删到全部','apply-tail')}${btn('生成 / 重建切分','generate',!state.files.length,true)}</fieldset>
 <div class="mj-cut-grid">
 <fieldset class="mj-sources" ${!state.project?'disabled':''}><legend>素材队列（支持多选或直接拖入视频，不接收文件夹）</legend><div class="mj-table-scroll"><table><thead><tr><th>素材文件</th><th>原时长</th><th>尾删</th><th>有效时长</th><th>缩放</th><th>预计产量</th></tr></thead><tbody>${sourceRows()}</tbody></table></div><div class="mj-inline">${btn('添加素材','add',false,true)}${btn('移除','remove',!state.files.length)}${btn('全部清空','clear',!state.files.length)}</div></fieldset>
 <fieldset class="mj-naming" ${!state.project?'disabled':''}><legend>导出命名</legend><div class="mj-radio"><label><input type="radio" name="mj-cut-mode" value="uniform" ${checked(state.mode,'uniform')}> 统一命名</label><label><input type="radio" name="mj-cut-mode" value="bulk" ${checked(state.mode,'bulk')}> 批量命名</label></div>${namingInput(state.mode,'cut')}<label class="mj-wide">统一后缀<input id="mj-suffix" value="${esc(state.suffix)}" placeholder="可选统一后缀"></label><div class="mj-inline">${field('起始序号','mj-start',state.start,1,9999)}<label>分隔符<input id="mj-separator" value="${esc(state.separator)}"></label></div></fieldset>
 <fieldset class="mj-preview"><legend>画面预览</legend><div class="mj-preview-screen"><div class="mj-video-placeholder"></div></div><div class="mj-preview-slider"><input type="range" min="0" max="100" value="${state.generated?state.cut:0}" aria-label="示例画面时间位置"><span>${state.generated?'00:00:15.000':'00:00:00.000'}<br>/ ${state.generated?'00:00:30.000':'00:00:00.000'}</span></div><div class="mj-inline mj-preview-buttons">${btn('播放','play',!state.generated)}${btn('播放最后5秒','play-last',!state.generated)}${btn('◀ 一帧','cut-back',!state.generated)}${btn('一帧 ▶','cut-next',!state.generated)}</div><div class="mj-inline mj-preview-settings"><label><span>素材<br>缩放</span><select id="mj-scale"><option ${state.scale==='50%'?'selected':''}>50%</option><option>75%</option><option>100%</option></select></label><label><span>输出<br>画布</span><select id="mj-canvas"><option ${state.canvas==='1080×1920'?'selected':''}>1080×1920</option><option>1920×1080</option></select></label></div></fieldset>
 <fieldset class="mj-timeline" ${!state.project?'disabled':''}><legend>剪切片段（√选中 −备用 ×排除）</legend><div class="mj-timeline-visual"><div>素材总队列（拖动排序）</div>${state.generated?`<div class="mj-track">${state.segments.map((s,i)=>`<button data-mj="segment" data-index="${i}" class="${s}">${i+1}</button>`).join('')}<i style="left:${state.cut}%"></i></div>`:'<p>导入素材后显示总时间轴</p>'}<div>剪切序列（单击播放，双击在选中与备用间切换）</div></div><div class="mj-table-scroll"><table><thead><tr><th>状态</th><th>导出序号</th><th>素材</th><th>开始</th><th>结束</th><th>时长</th><th>手动调整</th></tr></thead><tbody>${segmentRows()}</tbody></table></div><div class="mj-inline mj-timeline-actions"><small>同一素材的相邻片段之间可拖动切刀；松开后试听前一片段最后5秒</small>${btn('重置当前切刀','reset-cut',!state.generated)}${btn('撤销','undo',!state.generated)}</div></fieldset></div>
 <fieldset class="mj-stats"><legend>项目统计</legend><span>素材总时长 <b>${fmt(state.files.reduce((a,f)=>a+f.seconds,0))}</b></span><span>有效时长 <b>${fmt(state.files.reduce((a,f)=>a+f.seconds-state.tail,0))}</b></span><span>可用片段 <b>${state.generated?state.segments.length:0} 条</b></span><span>已选片段 <b>${selected} 条</b></span><span>目标数量 <b>${state.target} 条</b></span><span>数量差额 <b>${selected-state.target} 条</b></span><span>${state.files.length?'示例素材已载入':'尚未导入素材'}</span><strong>已选 ${selected}/${state.target} 条</strong>${btn('导出','export',!selected,true)}</fieldset>${state.exported?'<p class="mj-success">示例导出完成：结果仅在当前页面显示，没有处理或保存视频。</p>':''}${modal()}`;
}
function rename(){
 const titles=state.titles.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),names=state.renameFiles;
 const preview=state.renamePreview?names.map((old,i)=>`<tr><td>${i+1}</td><td>${state.renameConflict&&i===1?'阻止':'改名'}</td><td>${esc(old)}</td><td>${esc(namedFile(i,state.renameMode,state.renameAppend))}</td><td>—</td><td>${state.renameConflict&&i===1?'重复标题':'就绪'}</td></tr>`).join(''):'<tr class="mj-empty-row"><td colspan="6"></td></tr>';
 return `<div class="mj-rename-top"><h3>批量命名</h3><p>命名方式与视频剪切模块保持一致；执行前必须核对全部文件预览</p><div class="mj-inline"><input aria-label="示例文件夹" value="${names.length?'内置示例文件夹':''}" readonly>${btn('选择视频文件夹','rename-load',false,true)}${btn('重新扫描','rename-scan',!names.length,true)}<span>${names.length?'已选择示例文件夹':'尚未选择文件夹'}</span></div></div><div class="mj-rename-grid"><div><fieldset><legend>命名内容</legend><div class="mj-radio"><label><input type="radio" name="mj-rename-mode" value="uniform" ${checked(state.renameMode,'uniform')}> 统一命名</label><label><input type="radio" name="mj-rename-mode" value="bulk" ${checked(state.renameMode,'bulk')}> 批量命名</label></div>${namingInput(state.renameMode,'rename')}<label class="mj-wide">统一后缀<input id="mj-rename-suffix" value="${esc(state.suffix)}" placeholder="可选统一后缀"></label><div class="mj-inline">${field('起始序号','mj-rename-start',state.start,1,9999)}<label>分隔符<input id="mj-rename-separator" value="${esc(state.separator)}"></label></div><label><input id="mj-rename-append" type="checkbox" ${state.renameAppend?'checked':''}> 批量命名追加三位序号</label></fieldset><fieldset><legend>重命名专用选项</legend><label><input type="checkbox"> 额外生成纯标题副本</label><label>副本文件夹<input placeholder="留空时在原文件夹旁创建纯标题文件夹"></label><div class="mj-inline"><label>标题长度<input type="number" value="1"></label><label>至 <input type="number" value="30"></label>个汉字</div><label><input type="checkbox" checked> 每个标题恰好一个中文逗号</label></fieldset><fieldset><legend>记录与上传适配</legend><label><input type="checkbox"> 生成JSON与CSV恢复记录</label><label><input type="checkbox"> 生成普通命名对照表</label><label><input type="checkbox"> 生成 fanqiemoban（待上传版）.xlsx 番茄上传表</label><label>作者声明 <select><option>是</option><option>否</option><option>空</option></select></label></fieldset></div><fieldset class="mj-rename-preview"><legend>完整原文件名—新文件名预览</legend><p>${state.renamePreview?'核对每项操作后再执行':'设置已变化，请重新生成完整预览'}</p><div class="mj-table-scroll"><table><thead><tr><th>序号</th><th>动作</th><th>原文件名</th><th>新文件名</th><th>纯标题副本</th><th>状态</th></tr></thead><tbody>${preview}</tbody></table></div></fieldset></div><div class="mj-rename-bottom">${btn('根据JSON恢复原名','rename-restore',!state.renameDone)}${btn('命名转译','rename-transliterate',!names.length)}<span></span>${btn('生成重命名预览','rename-preview',!names.length,true)}${btn('确认执行','rename-execute',!state.renamePreview||state.renameConflict||state.renameDone,true)}</div>${state.renameDone?'<p class="mj-success">示例改名已完成；仅更新网页中的示例文件名。</p>':''}${modal()}`;
}
function notes(){return `<div class="mj-notes"><h3>文本管理</h3><p>自由记录剧目简介、标题和工作备注；网页示例内容仅保留在当前页面</p><div class="mj-inline">${btn('导入文本','notes-import',false,true)}${btn('保存文本','notes-save',false,true)}${btn('清空','notes-clear')}</div><textarea id="mj-notes" placeholder="在这里自由编辑文字，也可导入 .txt 或 .doc 文件……">${esc(state.notes)}</textarea><div class="mj-notes-bottom"><span>${state.savedNotes?'示例文字已保存于当前页面':'示例文字只保留在当前页面'}</span><span>${state.notes.length} 字</span></div></div>${modal()}`}
function render(){document.querySelectorAll('[data-tool-tab]').forEach(b=>{const active=b.dataset.toolTab===state.tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});root.innerHTML=state.tab==='cut'?cut():state.tab==='rename'?rename():notes();if(state.tab==='rename'){const field=root.querySelector('.mj-rename-grid>div fieldset:nth-child(2)');const input=field?.querySelector('input[placeholder*="纯标题文件夹"]');if(input){const choose=document.createElement('button');choose.type='button';choose.className='mj-btn';choose.dataset.mj='rename-copy-choose';choose.textContent='选择…';input.parentElement.classList.add('mj-copy-path');input.parentElement.append(choose)}}}

function fitPreview(){
 const screen=root.querySelector('.mj-preview-screen'),frame=root.querySelector('.mj-video-placeholder');
 if(!screen||!frame)return;
 const ratio=state.canvas==='1920×1080'?16/9:9/16;
 const width=Math.min(screen.clientWidth,screen.clientHeight*ratio);
 frame.style.setProperty('--preview-width',width+'px');
 frame.style.setProperty('--preview-height',(width/ratio)+'px');
 frame.style.setProperty('--canvas-ratio',String(ratio));
}
addEventListener('resize',()=>requestAnimationFrame(fitPreview));
new MutationObserver(()=>requestAnimationFrame(fitPreview)).observe(root,{childList:true});
document.querySelector('.app-tabs').addEventListener('click',e=>{const tab=e.target.closest('[data-tool-tab]');if(!tab)return;state.tab=tab.dataset.toolTab;state.modal='';render();setStatus(tab.textContent+' · 内置示例')});
root.addEventListener('input',e=>{const el=e.target;const ids={'mj-target':'target','mj-duration':'duration','mj-tail':'tail','mj-start':'start','mj-uniform':'uniform','mj-suffix':'suffix','mj-separator':'separator','mj-titles':'titles','mj-cut-titles':'titles','mj-rename-uniform':'uniform','mj-rename-start':'start','mj-rename-suffix':'suffix','mj-rename-separator':'separator','mj-notes':'notes'};if(ids[el.id]){state[ids[el.id]]=el.type==='number'?Number(el.value):el.value;if(el.id==='mj-titles'||el.id==='mj-rename-suffix')state.renamePreview=false}if(el.name==='mj-cut-mode')state.mode=el.value;if(el.name==='mj-rename-mode'){state.renameMode=el.value;state.renamePreview=false}if(el.id==='mj-notes')document.querySelector('.mj-notes-bottom span:last-child').textContent=state.notes.length+' 字'});
root.addEventListener('change',e=>{if(e.target.id==='mj-canvas'){state.canvas=e.target.value;requestAnimationFrame(fitPreview);}if(e.target.id==='mj-scale')state.scale=e.target.value;if(e.target.id==='mj-rename-append'){state.renameAppend=e.target.checked;state.renamePreview=false;render()}if(e.target.name==='mj-rename-mode'||e.target.name==='mj-cut-mode')render()});
let dragSource=-1;
root.addEventListener('dragstart',e=>{const row=e.target.closest('[data-source-index]');if(row)dragSource=Number(row.dataset.sourceIndex)});
root.addEventListener('dragover',e=>{if(e.target.closest('[data-source-index]'))e.preventDefault()});
root.addEventListener('drop',e=>{const row=e.target.closest('[data-source-index]');if(!row||dragSource<0)return;e.preventDefault();const target=Number(row.dataset.sourceIndex);if(target!==dragSource){const [file]=state.files.splice(dragSource,1);state.files.splice(target,0,file);state.generated=false;setStatus('示例素材顺序已调整');render()}dragSource=-1});
root.addEventListener('pointerdown',e=>{const mark=e.target.closest('.mj-track i');if(!mark)return;const track=mark.parentElement;mark.setPointerCapture(e.pointerId);const move=event=>{const box=track.getBoundingClientRect();state.cut=Math.max(5,Math.min(95,Math.round((event.clientX-box.left)/box.width*100)));mark.style.left=state.cut+'%'};const done=()=>{mark.removeEventListener('pointermove',move);mark.removeEventListener('pointerup',done);setStatus('示例切刀位置已调整');render()};mark.addEventListener('pointermove',move);mark.addEventListener('pointerup',done)});
root.addEventListener('click',e=>{const b=e.target.closest('[data-mj]');if(!b)return;const a=b.dataset.mj;
 if(a==='new'||a==='open'||a==='export'){state.modal=a;render();root.querySelector('.mj-modal input')?.focus();return}
 if(a==='modal-cancel'){state.modal='';render();return}
 if(a==='modal-confirm'){state.projectName=root.querySelector('#mj-project-name')?.value||'示例项目';state.project=true;state.modal='';state.files=[];state.generated=false;state.exported=false;setStatus('已打开示例项目');render();return}
 if(a==='save'){setStatus('示例项目状态已保存于当前页面');return}
 if(a==='add'){state.files=sampleFiles.map(x=>({...x}));state.generated=false;setStatus('已加入 3 条内置示例素材');render();return}
 if(a==='remove'){state.files.pop();state.generated=false;setStatus('已移除最后一条示例素材');render();return}
 if(a==='clear'){state.files=[];state.generated=false;setStatus('素材队列已清空');render();return}
 if(a==='target-20'||a==='target-50'){state.target=a==='target-20'?20:50;render();return}
 if(a==='apply-tail'){setStatus('尾删时长已应用到全部示例素材');render();return}
 if(a==='generate'){state.generated=true;state.exported=false;setStatus('已生成示例切分与时间轴');render();return}
 if(a==='segment'){const i=+b.dataset.index,seq=['selected','backup','excluded'];state.segments[i]=seq[(seq.indexOf(state.segments[i])+1)%3];setStatus('片段状态已更新');render();return}
 if(a==='cut-back'||a==='cut-next'){state.cut=Math.max(5,Math.min(95,state.cut+(a==='cut-back'?-2:2)));setStatus('当前切刀已移动一帧');render();return}
 if(a==='reset-cut'||a==='undo'){state.cut=48;setStatus('切刀已恢复到示例位置');render();return}
 if(a==='play'||a==='play-last'){setStatus(a==='play'?'正在查看示例画面位置':'正在查看最后 5 秒的示例位置');return}
 if(a==='export-confirm'){state.modal='';state.exported=true;setStatus('示例导出完成');render();return}
 if(a==='rename-load'||a==='rename-scan'){state.renameFiles=['片段001.mp4','片段002.mp4','片段003.mp4'];state.renameDone=false;state.renamePreview=false;setStatus('已扫描内置示例文件夹');render();return}
 if(a==='rename-import'||a==='cut-import'){state.titles='重回故地\n真相出现\n最后的选择';state.renamePreview=false;setStatus('已导入内置标题示例');render();return}
 if(a==='rename-preview'){const titles=state.titles.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const outputs=state.renameFiles.map((_,i)=>namedFile(i,state.renameMode,state.renameAppend));state.renameConflict=new Set(outputs).size!==outputs.length;state.renamePreview=true;setStatus(state.renameConflict?'发现重复标题，请修改后重新预览':'完整重命名预览已生成');render();return}
 if(a==='rename-execute'){state.renameFiles=state.renameFiles.map((_,i)=>namedFile(i,state.renameMode,state.renameAppend));state.renameDone=true;state.renamePreview=false;setStatus('示例文件名已更新');render();return}
 if(a==='rename-restore'){state.renameFiles=['片段001.mp4','片段002.mp4','片段003.mp4'];state.renameDone=false;state.renamePreview=false;setStatus('示例原名已恢复');render();return}
 if(a==='rename-transliterate'){state.titles='重回故地\n真相出现\n最后的选择';setStatus('已展示示例命名转译');render();return}
 if(a==='rename-copy-choose'){setStatus('纯标题副本使用内置示例位置');return}
 if(a==='notes-import'){state.notes='导入示例：今日完成 12 条内容，3 条需要复核。';setStatus('已导入内置文本示例');render();return}
 if(a==='notes-save'){state.savedNotes=state.notes;setStatus('示例文字已保存于当前页面');render();return}
 if(a==='notes-clear'){state.notes='';setStatus('示例文字已清空');render();return}
});
render();requestAnimationFrame(fitPreview);
})();

;
;
/* source: site-adjustments.js */
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

;
;
/* source: site-v100.js */
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

;
;
/* source: site-v112.js */
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

;
;
/* source: media-dimensions.js */
window.PORTFOLIO_MEDIA_DIMENSIONS={"assets/docs/prd/page-1.webp":[596,842],"assets/docs/competitor/page-1.webp":[1500,844],"assets/docs/marketing-case-v81/page-1.webp":[1440,810],"assets/docs/marketing-phenomenon/page-1.webp":[1152,648]};

;
;
/* source: site-v113.js */
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
  document.body.dataset.layoutVersion='1.1.4';
})();

;