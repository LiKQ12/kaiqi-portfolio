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
