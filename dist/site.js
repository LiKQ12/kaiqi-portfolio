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
  article.innerHTML=`<div class="media-window"><video controls playsinline preload="metadata" poster="${item.poster}" data-cursor="播放"><source src="${item.src}"></video><span class="play-hint">▶</span></div><div class="media-copy"><span class="media-number">0${i+1} / 04</span><h3>${item.title}</h3><h4>${item.subtitle}</h4><p class="copy-lines">${copyLines(item.description)}</p><p class="role-tag">${item.role}</p></div>`;
  article.dataset.copyId=item.copyId; article.id='work-'+item.copyId; aigcList.append(article);
});

const trailers=$("#trailers");
content.trailers.forEach((item,i)=>{
  const article=document.createElement("article"); article.className=`trailer-card route-item ${i%2?"reverse":""}`; article.dataset.snap=""; article.style.setProperty("--tilt",i%2?"-1":"1");
  article.innerHTML=`<div class="media-window"><video controls playsinline preload="metadata" poster="${item.poster}" data-cursor="播放"><source src="${item.src}"></video><span class="play-hint">▶</span></div><div class="media-copy"><span class="media-number">0${i+1} / 06</span><h3>${item.title}</h3><h4>${item.subtitle}</h4><p class="copy-lines">${copyLines(item.description)}</p><p class="role-tag">${item.role}</p></div>`;
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
  v.addEventListener("error",()=>{const w=v.closest(".media-window"); if(w&&!w.querySelector(".media-error")){const d=document.createElement("div");d.className="media-error";d.innerHTML=`媒体暂时无法加载<br><button class="app-btn">重新加载</button>`;d.querySelector("button").onclick=()=>v.load();w.append(d);}});
});
const mediaObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.intersectionRatio<.08&&!e.target.paused)e.target.pause();}),{threshold:[0,.08,.35]});
allVideos().forEach(v=>mediaObserver.observe(v));

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
