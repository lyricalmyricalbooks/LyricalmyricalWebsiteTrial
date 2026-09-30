// Same-origin iframe bridge. Unsaved design stays in iframe memory.
export const PREVIEW_BRIDGE_SOURCE = String.raw`(function(){
  if(window.__studioBridge){parent.postMessage({type:'PREVIEW_READY'},location.origin);return;}
  window.__studioBridge=true;
  var O=location.origin,selected=null,block=null,mode='edit',copyMap=[],editing=null;
  var SEC='[data-fm-section],[data-section-id]',BLK='[data-fm-block],[data-block-id]',TGT='[data-studio-target]',menu=null,menuAt=0;
  function closest(n,s){return n&&n.closest?n.closest(s):null;}
  function sid(n){return n&&(n.getAttribute('data-fm-section')||n.getAttribute('data-section-id'));}
  function bid(n){return n&&(n.getAttribute('data-fm-block')||n.getAttribute('data-block-id'));}
  function send(d){parent.postMessage(d,O);}
  function find(sel,id,read,root){return Array.from((root||document).querySelectorAll(sel)).find(function(n){return read(n)===id;});}
  function box(color){var n=document.createElement('div');n.setAttribute('data-studio-overlay','');
    n.style.cssText='position:fixed;pointer-events:none;display:none;z-index:99999;border:2px solid '+color+';box-sizing:border-box;';
    var label=document.createElement('span');label.style.cssText='position:absolute;left:0;top:0;background:'+color+';color:white;padding:3px 6px;font:11px sans-serif;';n.appendChild(label);document.body.appendChild(n);return n;}
  var hover=box('#2563eb'),selection=box('#059669');
  function place(b,n,label){if(mode!=='edit'||!n){b.style.display='none';return;}
    var r=n.getBoundingClientRect();b.style.display='block';b.style.top=r.top+'px';b.style.left=r.left+'px';b.style.width=r.width+'px';b.style.height=r.height+'px';b.firstChild.textContent=label||'Section';}
  function selectedNode(){var s=find(SEC,selected,sid);return block&&s?find(BLK,block,bid,s)||s:s;}
  function draw(){place(selection,selectedNode(),block?'Selected block':'Selected section');}
  var scheduled=false;
  function redraw(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;draw();});}
  function route(){send({type:'STUDIO_ROUTE',href:location.pathname+location.search});send({type:'PREVIEW_READY'});}
  ['pushState','replaceState'].forEach(function(method){var original=history[method];history[method]=function(state,title,url){
    if(url!=null){var next=new URL(url,location.href);if(next.origin===O){next.searchParams.set('preview','true');url=next.href;}}
    var result=original.call(history,state,title,url);setTimeout(route,0);return result;};});
  window.addEventListener('popstate',route);window.addEventListener('scroll',redraw,true);window.addEventListener('resize',redraw);
  var observer=new MutationObserver(function(records){if(records.some(function(r){return !closest(r.target,'[data-studio-overlay]');}))redraw();});
  observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('pagehide',function(){observer.disconnect();});
  window.addEventListener('message',function(e){if(e.origin!==O||e.source!==parent||!e.data)return;var d=e.data;
    if(d.type==='THEME_UPDATE'&&d.design&&typeof d.design==='object')window.__studioPreviewDesign=d.design;
    if(d.type==='STUDIO_MODE'&&(d.mode==='edit'||d.mode==='browse')){closeMenu();if(editing)editing();mode=d.mode;document.documentElement.dataset.studioMode=mode;place(hover,null);draw();window.dispatchEvent(new CustomEvent('studio:mode',{detail:mode}));}
    if(d.type==='HIGHLIGHT_SECTION'){selected=typeof d.instanceId==='string'?d.instanceId:null;block=typeof d.blockId==='string'?d.blockId:null;
      window.dispatchEvent(new CustomEvent('studio:selection',{detail:{sectionId:selected,blockId:block}}));
      requestAnimationFrame(function(){draw();var n=selectedNode();if(n&&d.scroll)n.scrollIntoView({behavior:'smooth',block:'center'});});}
    if(d.type==='SET_COPY_MAP'&&Array.isArray(d.items))copyMap=d.items;
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
    if(b||sec){place(hover,b||sec,b?'Block · click to edit':'Section · click to edit');return;}
    var t=closest(e.target,TGT);place(hover,t,t?(t.getAttribute('data-studio-label')||'Element')+' · click to edit':'');},true);
  document.addEventListener('mouseout',function(){place(hover,null);},true);
  document.addEventListener('click',function(e){var link=closest(e.target,'a[href]');
    if(mode==='browse'){if(link){var url=new URL(link.href,location.href);if(url.origin===O){url.searchParams.set('preview','true');link.href=url.href;}else{link.target='_blank';link.rel='noopener noreferrer';}}return;}
    if(closest(e.target,'[contenteditable]'))return;
    if(closest(e.target,'[data-studio-overlay]'))return;
    closeMenu();
    var section=closest(e.target,SEC);
    if(!section){var t=closest(e.target,TGT);if(!t)return;e.preventDefault();e.stopPropagation();
      var list=(t.getAttribute('data-studio-target')||'').split('|').filter(Boolean),label=t.getAttribute('data-studio-label')||'Element';
      if(list.length===1)send({type:'STUDIO_TARGET',target:list[0],label:label});else if(list.length>1)openMenu(list,label,e.clientX,e.clientY);
      return;}e.preventDefault();e.stopPropagation();selected=sid(section);block=bid(closest(e.target,BLK));draw();send({type:'SECTION_SELECT',instanceId:selected,blockId:block});
  },true);
  function norm(t){return String(t||'').replace(/\s+/g,' ').trim().toLowerCase();}
  document.addEventListener('dblclick',function(e){if(mode!=='edit')return;var field=closest(e.target,'[data-theme-field]'),section=closest(e.target,SEC);
    if(!field||!section){for(var n=e.target,level=0;n&&n!==document.body&&level<4;n=n.parentElement,level++){
      var text=norm(n.textContent);var found=copyMap.find(function(c){return c.text&&norm(c.text)===text;});if(found){e.preventDefault();e.stopPropagation();send({type:'COPY_SELECT',key:found.key});return;}}return;}
    e.preventDefault();e.stopPropagation();if(editing)editing();var original=field.textContent||'',key=field.getAttribute('data-theme-field'),sectionId=sid(section),blockId=bid(closest(field,BLK));
    send({type:'TEXT_EDIT_START'});field.setAttribute('contenteditable','plaintext-only');field.focus();
    function emit(value){send({type:'TEXT_EDIT',sectionId:sectionId,blockId:blockId,settingKey:key,value:value});}
    function input(){emit(field.textContent||'');}
    function keydown(ev){if(ev.key==='Escape'){ev.preventDefault();field.textContent=original;emit(original);done();field.blur();}}
    function done(){field.removeAttribute('contenteditable');field.removeEventListener('input',input);field.removeEventListener('keydown',keydown);field.removeEventListener('blur',done);editing=null;send({type:'TEXT_EDIT_END'});}
    editing=done;field.addEventListener('input',input);field.addEventListener('keydown',keydown);field.addEventListener('blur',done);
  },true);
  var style=document.createElement('style');style.textContent='html[data-studio-mode="edit"] [data-theme-field]:hover{outline:1px dashed #2563eb;outline-offset:2px;cursor:text}';document.head.appendChild(style);document.documentElement.dataset.studioMode=mode;send({type:'PREVIEW_READY'});
})();`;
