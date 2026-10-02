import { CANVAS_TOOLS_SOURCE } from "./canvasBridge";
// Same-origin iframe bridge. Unsaved design stays in iframe memory.
export const PREVIEW_BRIDGE_SOURCE = String.raw`(function(){
  if(window.__studioBridge){parent.postMessage({type:'PREVIEW_READY'},location.origin);return;}
  window.__studioBridge=true;
  var O=location.origin,selected=null,block=null,mode='edit',copyMap=[],editMap=[],styleTextMap=[],editing=null,editingNode=null,textAttrs=new WeakMap();
  var SEC='[data-fm-section],[data-section-id]',BLK='[data-fm-block],[data-block-id]',TGT='[data-studio-target]',menu=null,menuAt=0;
  function closest(n,s){return n&&n.closest?n.closest(s):null;}
  function sid(n){return n&&(n.getAttribute('data-fm-section')||n.getAttribute('data-section-id'));}
  function bid(n){return n&&(n.getAttribute('data-fm-block')||n.getAttribute('data-block-id'));}
  function send(d){parent.postMessage(d,O);}
  function find(sel,id,read,root){return Array.from((root||document).querySelectorAll(sel)).find(function(n){return read(n)===id;});}
  function box(color,tools){var n=document.createElement('div');n.setAttribute('data-studio-overlay','');
    n.style.cssText='position:fixed;pointer-events:none;display:none;z-index:99999;border:2px solid '+color+';box-sizing:border-box;';
    var label=document.createElement('span');label.style.cssText='position:absolute;left:0;top:0;background:'+color+';color:white;padding:3px 6px;font:11px sans-serif;';n.appendChild(label);
    if(tools){var bar=document.createElement('span');bar.style.cssText='position:absolute;right:0;top:0;display:flex;pointer-events:auto;background:'+color;
      [['Edit',function(){send({type:'SECTION_SELECT',instanceId:selected,blockId:block});}],['+ Block',function(){send({type:'ADD_BLOCK',sectionId:selected});}]].forEach(function(x){var b=document.createElement('button');b.type='button';b.textContent=x[0];b.style.cssText='border:0;border-left:1px solid rgba(255,255,255,.5);background:transparent;color:white;padding:5px 8px;font:11px sans-serif;cursor:pointer;';b.onclick=function(e){e.preventDefault();e.stopPropagation();x[1]();};bar.appendChild(b);});n.appendChild(bar);}
    document.body.appendChild(n);return n;}
  var hover=box('#2563eb'),selection=box('#059669',false);
  function place(b,n,label){if(mode!=='edit'||!n){b.style.display='none';return;}
    var r=n.getBoundingClientRect();b.style.display='block';b.style.top=r.top+'px';b.style.left=r.left+'px';b.style.width=r.width+'px';b.style.height=r.height+'px';b.firstChild.textContent=label||'Section';}
  function selectedNode(){var s=find(SEC,selected,sid);return block&&s?find(BLK,block,bid,s)||s:s;}
  function draw(){place(selection,selectedNode(),block?'Selected block':'Selected section');drawCanvasTools();}
  var scheduled=false;
  function redraw(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;draw();});}
  function route(){send({type:'STUDIO_ROUTE',href:location.pathname+location.search});send({type:'PREVIEW_READY'});}
  ['pushState','replaceState'].forEach(function(method){var original=history[method];history[method]=function(state,title,url){
    if(url!=null){var next=new URL(url,location.href);if(next.origin===O){next.searchParams.set('preview','true');url=next.href;}}
    var result=original.call(history,state,title,url);setTimeout(route,0);return result;};});
  window.addEventListener('popstate',route);window.addEventListener('scroll',redraw,true);window.addEventListener('resize',redraw);
  var observer=new MutationObserver(function(records){if(editing&&editingNode&&!document.contains(editingNode))editing();if(records.some(function(r){if(closest(r.target,'[data-studio-overlay]'))return false;var nodes=Array.from(r.addedNodes).concat(Array.from(r.removedNodes));return !nodes.length||!nodes.every(function(n){return n.nodeType===1&&n.hasAttribute('data-studio-overlay');});})){refreshTextHints();Array.from(document.querySelectorAll(SEC+','+BLK)).forEach(function(n){n.draggable=mode==='edit';});redraw();}});
  observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('pagehide',function(){if(editing)editing();if(spacingSession)spacingSession.finish(true);observer.disconnect();});
  window.addEventListener('message',function(e){if(e.origin!==O||e.source!==parent||!e.data)return;var d=e.data;
    if((d.type==='THEME_UPDATE'||d.type==='STUDIO_PREVIEW_STATE')&&d.design&&typeof d.design==='object')window.__studioPreviewDesign=d.design;
    if(d.type==='STUDIO_MODE'&&(d.mode==='edit'||d.mode==='browse')){closeMenu();if(editing)editing();if(spacingSession)spacingSession.finish(true);mode=d.mode;document.documentElement.dataset.studioMode=mode;refreshTextHints();Array.from(document.querySelectorAll(SEC+','+BLK)).forEach(function(n){n.draggable=mode==='edit';});place(hover,null);draw();window.dispatchEvent(new CustomEvent('studio:mode',{detail:mode}));}
    if(d.type==='HIGHLIGHT_SECTION'){selected=typeof d.instanceId==='string'?d.instanceId:null;block=typeof d.blockId==='string'?d.blockId:null;
      window.dispatchEvent(new CustomEvent('studio:selection',{detail:{sectionId:selected,blockId:block}}));
      requestAnimationFrame(function(){draw();var n=selectedNode();if(n&&d.scroll)n.scrollIntoView({behavior:'smooth',block:'center'});});}
    if(d.type==='SET_CANVAS_MAP'&&Array.isArray(d.items)){canvasMap=d.items;canvasDevice=d.device||'desktop';draw();}
    if(d.type==='SET_COPY_MAP'&&Array.isArray(d.items)){copyMap=d.items;refreshTextHints();}
    if(d.type==='SET_EDIT_MAP'&&Array.isArray(d.items)){editMap=d.items;refreshTextHints();}
    if(d.type==='SET_STYLE_TEXT_MAP'&&Array.isArray(d.items)){styleTextMap=d.items;refreshTextHints();}
  });
  function kindLabel(t){var k=t.split(':')[0],r=t.split(':')[1]||'';
    if(k==='copy')return 'Edit words';if(k==='style')return 'Show, hide & style';
    if(k==='menus')return r==='categories'?'Shop categories':r==='header-order'?'Header bar order':'Menu links';
    if(k==='pages')return 'Pages';return t;}
  function closeMenu(){if(menu){menu.remove();menu=null;}}
  function openMenu(list,label,x,y){closeMenu();menuAt=Date.now();menu=document.createElement('div');menu.setAttribute('data-studio-overlay','');menu.setAttribute('role','menu');menu.setAttribute('aria-label',label);
    menu.style.cssText='position:fixed;z-index:100000;min-width:190px;background:#fff;color:#111;border:2px solid #111;box-shadow:4px 4px 0 #111;font:12px system-ui,sans-serif;padding:4px;';
    var h=document.createElement('div');h.textContent=label;h.style.cssText='padding:6px 8px;font-weight:700;border-bottom:1px solid #ddd;margin-bottom:4px;';menu.appendChild(h);
    list.forEach(function(t){var b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=kindLabel(t);
      b.style.cssText='display:block;width:100%;text-align:left;padding:8px;min-height:36px;background:none;border:0;cursor:pointer;font:inherit;color:inherit;';
      b.onmouseenter=function(){b.style.background='#f1ede3';};b.onmouseleave=function(){b.style.background='none';};
      b.onclick=function(ev){ev.preventDefault();ev.stopPropagation();send({type:'STUDIO_TARGET',target:t,label:label});closeMenu();};menu.appendChild(b);});
    document.body.appendChild(menu);var r=menu.getBoundingClientRect();
    menu.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';
    var first=menu.querySelector('button');if(first)first.focus();}
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu();},true);
  window.addEventListener('scroll',function(){if(menu&&Date.now()-menuAt>600)closeMenu();},true);
  document.addEventListener('mouseover',function(e){if(mode!=='edit'||closest(e.target,'[data-studio-overlay]'))return;var b=closest(e.target,BLK),sec=closest(e.target,SEC);
    var textTarget=resolveTextTarget(e.target);if(textTarget){place(hover,textTarget.node,textTarget.editable?'Text · double-click to type':'Formatted text · use inspector');return;}
    if(b||sec){place(hover,b||sec,b?'Block · click to edit':'Section · click to edit');return;}
    var t=closest(e.target,TGT);place(hover,t,t?(t.getAttribute('data-studio-label')||'Element')+' · click to edit':'');},true);
  document.addEventListener('mouseout',function(){place(hover,null);},true);
  var dragging=null,draggingBlock=null,dragSection=null;
  document.addEventListener('dragstart',function(e){if(mode!=='edit')return;if(editing||spacingSession||closest(e.target,'[contenteditable]')){e.preventDefault();return;}var section=closest(e.target,SEC),b=closest(e.target,BLK);if(!section)return;
    dragSection=sid(section);if(b){draggingBlock=bid(b);e.dataTransfer.setData('text/plain',draggingBlock);}else{dragging=dragSection;e.dataTransfer.setData('text/plain',dragging);}e.dataTransfer.effectAllowed='move';},true);
  document.addEventListener('dragover',function(e){if(mode!=='edit')return;var section=closest(e.target,SEC),b=closest(e.target,BLK);
    if(draggingBlock&&b&&bid(b)!==draggingBlock&&sid(section)===dragSection){e.preventDefault();e.dataTransfer.dropEffect='move';place(hover,b,'Drop block here');return;}
    if(dragging&&section&&sid(section)!==dragging){e.preventDefault();e.dataTransfer.dropEffect='move';place(hover,section,'Drop section here');}},true);
  document.addEventListener('drop',function(e){var section=closest(e.target,SEC),b=closest(e.target,BLK);
    if(draggingBlock&&b&&bid(b)!==draggingBlock&&sid(section)===dragSection){e.preventDefault();send({type:'BLOCK_MOVE',sectionId:dragSection,blockId:draggingBlock,beforeId:bid(b)});}
    else if(dragging){var before=section&&sid(section);if(before&&before!==dragging){e.preventDefault();send({type:'SECTION_MOVE',sectionId:dragging,beforeId:before});}}
    dragging=null;draggingBlock=null;dragSection=null;},true);
  document.addEventListener('dragend',function(){dragging=null;draggingBlock=null;dragSection=null;place(hover,null);},true);
  document.addEventListener('click',function(e){var link=closest(e.target,'a[href]');
    if(mode==='browse'){if(link){var url=new URL(link.href,location.href);if(url.origin===O){url.searchParams.set('preview','true');link.href=url.href;}else{link.target='_blank';link.rel='noopener noreferrer';}}return;}
    if(closest(e.target,'[contenteditable]')){e.stopPropagation();return;}
    if(editing&&editingNode&&e.detail===0&&e.target.contains&&e.target.contains(editingNode)){e.preventDefault();e.stopPropagation();return;}
    if(closest(e.target,'[data-studio-overlay]'))return;
    closeMenu();
    var section=closest(e.target,SEC),textTarget=resolveTextTarget(e.target);
    if(textTarget&&textTarget.editable){e.preventDefault();e.stopPropagation();if(section){selected=sid(section);block=bid(closest(e.target,BLK));send({type:'CANVAS_SELECT',sectionId:selected,blockId:block});draw();}return;}
    if(!section){var t=closest(e.target,TGT);if(!t)return;e.preventDefault();e.stopPropagation();
      var list=(t.getAttribute('data-studio-target')||'').split('|').filter(Boolean),label=t.getAttribute('data-studio-label')||'Element';
      if(list.length===1)send({type:'STUDIO_TARGET',target:list[0],label:label});else if(list.length>1)openMenu(list,label,e.clientX,e.clientY);
      return;}e.preventDefault();e.stopPropagation();selected=sid(section);block=bid(closest(e.target,BLK));draw();send({type:'SECTION_SELECT',instanceId:selected,blockId:block});
  },true);
${CANVAS_TOOLS_SOURCE}
  function norm(t){return String(t||'').replace(/\s+/g,' ').trim().toLowerCase();}
  // Resolve only schema-backed fields. Plain text never flattens a formatted field or a composite label.
  function resolveTextTarget(node){
    var copyNode=closest(node,'[data-studio-copy]'),styleNode=closest(node,'[data-studio-style-text]');
    if(copyNode){var c=copyMap.find(function(x){return x.key===copyNode.getAttribute('data-studio-copy');});if(c)return Object.assign({},c,{node:copyNode,kind:'copy'});}
    if(styleNode){var st=styleTextMap.find(function(x){return x.key===styleNode.getAttribute('data-studio-style-text');});if(st)return Object.assign({},st,{node:styleNode,kind:'style',text:styleNode.getAttribute('data-studio-edit-value')||styleNode.textContent||''});}
    var section=closest(node,SEC),blockId=bid(closest(node,BLK)),field=closest(node,'[data-theme-field]');
    if(section){
      var key=field&&field.getAttribute('data-theme-field');
      var explicit=key&&editMap.find(function(x){return x.sectionId===sid(section)&&x.blockId===blockId&&x.key===key;});
      if(explicit)return Object.assign({},explicit,{node:field,kind:'section'});
      if(field)return null;
      for(var m=node,depth=0;m&&m!==section&&depth<4;m=m.parentElement,depth++){
        if(m.querySelector&&m.querySelector('a,button,input,svg'))continue;
        var hits=editMap.filter(function(x){return x.sectionId===sid(section)&&x.blockId===blockId&&x.editable&&x.text&&norm(x.text)===norm(m.textContent);});
        if(hits.length===1)return Object.assign({},hits[0],{node:m,kind:'section'});
      }
      return null;
    }
    for(var n=node,level=0;n&&n!==document.body&&level<4;n=n.parentElement,level++){
      if(!n.textContent||n.querySelector&&n.querySelector('a,button,input,svg'))continue;
      var region=closest(n,TGT),targets=region&&(region.getAttribute('data-studio-target')||''),group=targets&&targets.split('|').find(function(t){return t.indexOf('copy:')===0;});
      var candidates=copyMap.filter(function(c){return c.editable&&c.text&&norm(c.text)===norm(n.textContent)&&(!group||c.group===group.slice(5));});
      if(candidates.length===1)return Object.assign({},candidates[0],{node:n,kind:'copy'});
    }
    return null;
  }
  function refreshTextHints(){Array.from(document.querySelectorAll('[data-theme-field],[data-studio-copy],[data-studio-style-text]')).forEach(function(n){
    var t=resolveTextTarget(n);if(!t)return;
    if(!textAttrs.has(n))textAttrs.set(n,{tabindex:n.getAttribute('tabindex'),title:n.getAttribute('title')});
    var attrs=textAttrs.get(n);
    if(mode==='browse'){
      n.removeAttribute('data-studio-text-editable');
      ['tabindex','title'].forEach(function(key){if(attrs[key]===null)n.removeAttribute(key);else n.setAttribute(key,attrs[key]);});return;
    }
    n.setAttribute('data-studio-text-editable',t.editable?'true':'false');n.setAttribute('tabindex','0');
    n.setAttribute('title',t.editable?'Double-click or press Enter to edit text':'Formatted text: double-click or press Enter to open the inspector');
  });}
  function plainText(n){
    var out='';Array.from(n.childNodes||[]).forEach(function(child){
      if(child.nodeType===3){out+=child.nodeValue||'';return;}
      if(child.nodeType!==1)return;
      if(child.tagName==='BR'){out+='\n';return;}
      if((child.tagName==='DIV'||child.tagName==='P')&&out&&out.slice(-1)!=='\n')out+='\n';
      out+=plainText(child);
    });return out;
  }
  function startTextEdit(target){
    if(!target)return;
    if(spacingSession)spacingSession.finish(true);
    if(!target.editable){send({type:'INLINE_TEXT_UNAVAILABLE',kind:target.kind,sectionId:target.sectionId,blockId:target.blockId,key:target.key});return;}
    closeMenu();if(editing)editing();
    var field=target.node,originalHtml=field.innerHTML,originalValue=target.format==='html'?field.innerHTML:target.kind==='style'?target.text:field.textContent||'';
    var toolbar=document.createElement('div');toolbar.setAttribute('data-studio-overlay','');toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Edit preview text');
    toolbar.style.cssText='flex-wrap:wrap;position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:100001;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);padding:10px;background:#fff;color:#111;border:2px solid #111;box-shadow:3px 3px 0 #111;font:12px system-ui;';
    var label=document.createElement('span');label.textContent=(target.label||'Text')+(target.shared?' · Linked block':target.kind!=='section'?' · All pages':'')+' · Draft only';label.style.cssText='min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';toolbar.appendChild(label);
    function finish(cancel){
      if(!editing)return;
      var value=target.format==='html'?field.innerHTML:plainText(field);editing=null;editingNode=null;
      field.removeAttribute('contenteditable');field.removeEventListener('keydown',keydown);field.removeEventListener('blur',blur);
      document.removeEventListener('focusin',focusOutside,true);if(richCleanup)richCleanup();toolbar.remove();
      field.innerHTML=originalHtml;
      if(!cancel&&value!==originalValue)send({type:'INLINE_TEXT_COMMIT',kind:target.kind,sectionId:target.sectionId,blockId:target.blockId,key:target.key,value:value,format:target.format});
      send({type:'TEXT_EDIT_END',cancelled:!!cancel});draw();
    }
    [['Done',function(){finish(false);}],['Cancel',function(){finish(true);}]].forEach(function(item){var button=document.createElement('button');button.type='button';button.textContent=item[0];button.style.cssText='min-height:36px;padding:6px 12px;border:1px solid #111;background:#fff;color:#111;font:inherit;cursor:pointer;';button.addEventListener('mousedown',function(e){e.preventDefault();});button.addEventListener('click',item[1]);toolbar.appendChild(button);});
    var richCleanup=target.format==='html'?addFormatting(toolbar,field):null;
    document.body.appendChild(toolbar);editingNode=field;editing=function(){finish(false);};
    send({type:'TEXT_EDIT_START',label:target.label||'Text'});draw();
    if(target.format!=='html')field.textContent=originalValue;field.setAttribute('contenteditable',target.format==='html'?'true':'plaintext-only');field.focus();
    var range=document.createRange();range.selectNodeContents(field);var selectionRange=window.getSelection();selectionRange.removeAllRanges();selectionRange.addRange(range);
    function keydown(ev){
      ev.stopPropagation();
      if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();finish(true);}
      else if(ev.key==='Enter'&&(!target.multiline||ev.ctrlKey||ev.metaKey)){ev.preventDefault();finish(false);}
    }
    function blur(ev){if(toolbar.contains(ev.relatedTarget))return;finish(false);}
    function focusOutside(ev){if(ev.target!==field&&!field.contains(ev.target)&&!toolbar.contains(ev.target))finish(false);}
    field.addEventListener('keydown',keydown);field.addEventListener('blur',blur);document.addEventListener('focusin',focusOutside,true);
  }
  document.addEventListener('dblclick',function(e){if(mode!=='edit'||closest(e.target,'[data-studio-overlay]'))return;var target=resolveTextTarget(e.target);if(!target)return;e.preventDefault();e.stopPropagation();startTextEdit(target);},true);
  document.addEventListener('keydown',function(e){if(mode!=='edit'||editing||e.key!=='Enter'||closest(e.target,'input,textarea,select,[data-studio-overlay]'))return;var target=resolveTextTarget(e.target);if(target){e.preventDefault();startTextEdit(target);}},true);
  var style=document.createElement('style');style.textContent='html[data-studio-mode="edit"] [data-studio-text-editable="true"]:is(:hover,:focus){outline:1px dashed #2563eb;outline-offset:2px;cursor:text}html[data-studio-mode="edit"] .animate-marquee:has([contenteditable]){animation-play-state:paused!important}html[data-studio-mode="edit"] [contenteditable]{outline:2px solid #2563eb;cursor:text}html[data-studio-mode="edit"] [data-fm-section],html[data-studio-mode="edit"] [data-fm-block]{cursor:grab}';document.head.appendChild(style);Array.from(document.querySelectorAll(SEC+','+BLK)).forEach(function(n){n.draggable=true;});document.documentElement.dataset.studioMode=mode;send({type:'PREVIEW_READY'});
})();`;
