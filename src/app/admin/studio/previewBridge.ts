// Script injected into the same-origin storefront preview iframe. It adds
// hover outlines, click-to-select (sections + blocks), double-click text
// editing on [data-theme-field] nodes, and a persistent selection outline.
// Messages to the editor: PREVIEW_READY, SECTION_SELECT, TEXT_EDIT.
// Messages from the editor: THEME_UPDATE (handled by MainSite), HIGHLIGHT_SECTION, SET_COPY_MAP.
// Double-clicking any other storefront text (footer, cart drawer, account, checkout…) is matched
// against the editable copy strings and reported as COPY_SELECT {key} so the editor can jump to it.

export const PREVIEW_BRIDGE_SOURCE = `(function(){
  if (window.__studioBridge) return; window.__studioBridge = true;
  var O = window.location.origin, selected = null;
  function q(el, sel){ return el && el.closest ? el.closest(sel) : null; }
  var SEC = '[data-fm-section],[data-section-id]', BLK = '[data-fm-block],[data-block-id]';
  function secId(n){ return n && (n.getAttribute('data-fm-section') || n.getAttribute('data-section-id')); }
  function blkId(n){ return n && (n.getAttribute('data-fm-block') || n.getAttribute('data-block-id')); }
  function box(color, fill, z){ var b=document.createElement('div');
    b.style.cssText='position:fixed;pointer-events:none;display:none;z-index:'+z+';border:2px solid '+color+';background:'+fill+';transition:all .1s';
    document.body.appendChild(b); return b; }
  var hov = box('rgba(37,99,235,.85)','rgba(37,99,235,.06)',99999);
  var sel = box('rgba(16,185,129,.95)','rgba(16,185,129,.05)',99998);
  function place(b, n){ if(!n){ b.style.display='none'; return; } var r=n.getBoundingClientRect();
    b.style.display='block'; b.style.top=r.top+'px'; b.style.left=r.left+'px'; b.style.width=r.width+'px'; b.style.height=r.height+'px'; }
  function drawSel(){ place(sel, selected ? document.querySelector('[data-fm-section="'+selected+'"],[data-section-id="'+selected+'"]') : null); }
  window.addEventListener('message', function(e){
    if (e.origin !== O || !e.data) return;
    if (e.data.type === 'HIGHLIGHT_SECTION') {
      selected = e.data.instanceId || null; drawSel();
      var n = selected && document.querySelector('[data-fm-section="'+selected+'"],[data-section-id="'+selected+'"]');
      if (n && e.data.scroll) n.scrollIntoView({behavior:'smooth', block:'center'});
    }
  });
  var copyMap = [];
  function norm(t){ return String(t||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function esc(t){ return t.replace(/[.*+?^$()|\\[\\]\\\\{}]/g,'\\\\$&'); }
  function findCopy(el){
    for (var n = el, i = 0; n && n !== document.body && i < 4; n = n.parentElement, i++) {
      var t = norm(n.textContent); if (!t || t.length > 400) continue;
      for (var k = 0; k < copyMap.length; k++) {
        var c = copyMap[k]; if (!c.text) continue;
        if (c.re ? c.re.test(t) : norm(c.text) === t) return c.key;
      }
    }
    return null;
  }
  window.addEventListener('message', function(e){
    if (e.origin !== O || !e.data || e.data.type !== 'SET_COPY_MAP') return;
    copyMap = (e.data.items || []).map(function(it){
      var s = norm(it.text), hasVar = /\{\w+\}/.test(s);
      return { key: it.key, text: it.text, re: hasVar ? new RegExp('^' + esc(s).replace(/\\\{\w+\\\}/g, '.+') + '$') : null };
    });
  });
  window.addEventListener('scroll', drawSel, true); window.addEventListener('resize', drawSel);
  new MutationObserver(function(){ requestAnimationFrame(drawSel); }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('mouseover', function(e){ place(hov, q(e.target,BLK) || q(e.target,SEC)); }, true);
  document.addEventListener('mouseout', function(){ hov.style.display='none'; }, true);
  document.addEventListener('click', function(e){
    var s = q(e.target,SEC); if (!s) return;
    var b = q(e.target,BLK);
    e.preventDefault(); e.stopPropagation();
    selected = secId(s); drawSel();
    parent.postMessage({type:'SECTION_SELECT', instanceId: selected, blockId: blkId(b)}, O);
  }, true);
  document.addEventListener('dblclick', function(e){
    var f = q(e.target,'[data-theme-field]'), s = q(e.target,SEC);
    if (!f || !s) {
      var ck = findCopy(e.target);
      if (ck) { e.preventDefault(); e.stopPropagation(); parent.postMessage({type:'COPY_SELECT', key: ck}, O); }
      return;
    }
    e.preventDefault(); e.stopPropagation();
    var orig = f.textContent || ''; f.setAttribute('contenteditable','true'); f.focus();
    var key = f.getAttribute('data-theme-field'), sid = secId(s), b = q(f,BLK);
    function emit(v){ parent.postMessage({type:'TEXT_EDIT', sectionId:sid, settingKey:key, value:v, blockId:blkId(b)}, O); }
    function done(){ f.removeAttribute('contenteditable'); f.removeEventListener('input', onIn); f.removeEventListener('keydown', onKey); }
    function onIn(){ emit(f.textContent || ''); }
    function onKey(ke){ if (ke.key==='Escape'){ ke.preventDefault(); f.textContent = orig; emit(orig); done(); f.blur(); } }
    f.addEventListener('input', onIn); f.addEventListener('keydown', onKey);
    f.addEventListener('blur', done, {once:true});
  }, true);
  var st = document.createElement('style');
  st.textContent = '[data-theme-field]:hover{outline:1px dashed rgba(37,99,235,.6);outline-offset:2px;cursor:text}';
  document.head.appendChild(st);
  parent.postMessage({type:'PREVIEW_READY'}, O);
})();`;
