// 将响应式/移动端改造同步到网页版
const fs = require('fs');
const webPath = 'D:/workspace/password-vault/办公密码保险库.html';
let web = fs.readFileSync(webPath, 'utf8').replace(/\r\n/g, '\n');
const fails = [];
const rep = (oldS, newS, label) => {
  if (!web.includes(oldS)) { fails.push(label + ' 未找到'); return; }
  web = web.replace(oldS, newS);
};

/* 1. CSS 移动端块 */
rep(`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes toastOut{to{opacity:0;transform:translateY(10px)}}`,
`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes toastOut{to{opacity:0;transform:translateY(10px)}}

/* ============ 移动端 / 窄窗口响应式 ============ */
.mbar{display:none}
#drawerBackdrop{position:fixed;inset:0;background:rgba(5,7,11,.55);z-index:55;opacity:0;pointer-events:none;transition:opacity .2s}
.d-back{display:none}
@media (max-width:860px){
  .appview{display:flex;flex-direction:column;height:100vh;height:100dvh}
  .mbar{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg1);
    border-bottom:1px solid var(--line);flex:none;position:relative;z-index:50}
  .mbar .m-title{flex:1;font-size:14.5px;font-weight:700;letter-spacing:.03em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  #drawerBackdrop.show{opacity:1;pointer-events:auto}
  .sidebar{position:fixed;left:0;top:0;bottom:0;width:min(82vw,300px);z-index:60;
    transform:translateX(-105%);transition:transform .22s ease;box-shadow:var(--sh)}
  .sidebar.open{transform:none}
  .list-pane{flex:1;min-height:0;border-right:none;width:100%}
  .detail-pane{position:fixed;inset:0;z-index:70;background:var(--bg0);display:none;overflow-y:auto}
  .detail-pane.show{display:block}
  .d-back{display:inline-flex}
  .d-head{flex-wrap:wrap}
  .d-actions{flex-wrap:wrap}
  .d-actions .btn{padding:9px 13px}
  .d-actions .btn.primary{margin-left:auto}
  .type-tabs{padding-top:10px}
  .btn,.ibtn{min-height:34px}
  .entry-row{padding:10px}
  .frow{padding:13px 0}
  .set-row{flex-wrap:wrap}
  .set-row .btn,.set-row .input{flex:none}
}
@media (max-width:860px) and (hover:none){
  .entry-row:hover{background:transparent}
}`, 'css mobile');

/* 2. 图标 */
rep(`  chev:I('<polyline points="9 18 15 12 9 6"/>'),`,
`  chev:I('<polyline points="9 18 15 12 9 6"/>'),
  chevL:I('<polyline points="15 18 9 12 15 6"/>'),
  menu:I('<path d="M3 6h18M3 12h18M3 18h18"/>'),`, 'icons');

/* 3. mbar + sidebar id */
rep(`<div id="appView" class="appview hidden">
  <aside class="sidebar">`,
`<div id="appView" class="appview hidden">
  <div class="mbar">
    <button class="ibtn" id="btnMenu" title="菜单"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
    <div class="m-title">办公保险库</div>
    <button class="ibtn" id="btnMLock" title="立即锁定"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></button>
  </div>
  <aside class="sidebar" id="sidebar">`, 'mbar html');

/* 4. backdrop */
rep(`<div id="toastRoot"></div>`,
`<div id="toastRoot"></div>
<div id="drawerBackdrop"></div>`, 'backdrop');

/* 5. 密码详情返回按钮 */
rep(`  pane.innerHTML=
    banner+
    '<div class="d-head">'+
      '<div class="avatar big" style="'+avStyle(e.title)+'">'+esc(initial(e.title))+'</div>'+`,
`  pane.innerHTML=
    banner+
    '<div class="d-head">'+
      '<button class="ibtn d-back" id="dBack" title="返回">'+ICONS.chevL+'</button>'+
      '<div class="avatar big" style="'+avStyle(e.title)+'">'+esc(initial(e.title))+'</div>'+`, 'pw detail back');

rep(`    '</div>';
  const done=()=>{ state.selectedId=null; renderAll(); };`,
`    '</div>';
  pane.querySelector('#dBack').onclick=closeMobileDetail;
  const done=()=>{ state.selectedId=null; renderAll(); };`, 'pw detail back bind');

/* 6. 书签详情返回按钮 */
rep(`  pane.innerHTML=
    '<div class="d-head">'+
      '<div class="avatar big" style="'+avStyle(b.title||b.url)+'">'+esc(initial(b.title||hostOf(b.url)))+'</div>'+`,
`  pane.innerHTML=
    '<div class="d-head">'+
      '<button class="ibtn d-back" id="dBack" title="返回">'+ICONS.chevL+'</button>'+
      '<div class="avatar big" style="'+avStyle(b.title||b.url)+'">'+esc(initial(b.title||hostOf(b.url)))+'</div>'+`, 'bm detail back');

rep(`  pane.querySelector('#bDel').onclick=()=>{
    delBm(b.id);
  };
}`,
`  pane.querySelector('#bDel').onclick=()=>{
    delBm(b.id);
  };
  pane.querySelector('#dBack').onclick=closeMobileDetail;
}`, 'bm detail back bind');

/* 7. renderAll 关抽屉 */
rep(`function renderAll(){
  renderSidebar();`,
`function renderAll(){
  closeDrawer();
  renderSidebar();`, 'renderAll drawer');

/* 8. lockNow 关抽屉/详情 */
rep(`  $('#searchInput').value='';
  /* 关键：锁定时必须关掉所有弹窗，否则残留的表单会在无数据状态下静默失败 */
  closeModal();`,
`  $('#searchInput').value='';
  /* 关键：锁定时必须关掉所有弹窗，否则残留的表单会在无数据状态下静默失败 */
  closeDrawer(); closeMobileDetail();
  closeModal();`, 'lockNow close');

/* 9. setType 关详情 */
rep(`  $('#tabPw').classList.toggle('active',t==='pw');
  $('#tabBm').classList.toggle('active',t==='bm');
  renderAll();
}`,
`  $('#tabPw').classList.toggle('active',t==='pw');
  $('#tabBm').classList.toggle('active',t==='bm');
  closeMobileDetail();
  renderAll();
}

/* ---- 移动端：抽屉与全屏详情 ---- */
function isMobileLayout(){ return window.matchMedia('(max-width:860px)').matches; }
function closeDrawer(){ $('#sidebar').classList.remove('open'); $('#drawerBackdrop').classList.remove('show'); }
function toggleDrawer(){
  const open=!$('#sidebar').classList.contains('open');
  $('#sidebar').classList.toggle('open',open);
  $('#drawerBackdrop').classList.toggle('show',open);
}
function showMobileDetail(){ if(isMobileLayout()) $('#detailPane').classList.add('show'); }
function closeMobileDetail(){ $('#detailPane').classList.remove('show'); }
$('#btnMenu').onclick=toggleDrawer;
$('#drawerBackdrop').onclick=closeDrawer;
$('#btnMLock').onclick=()=>{ closeDrawer(); lockNow(); };
window.addEventListener('resize', ()=>{ if(!isMobileLayout()){ closeDrawer(); closeMobileDetail(); } });`, 'setType + mobile js');

/* 10. 列表点击后全屏详情 */
rep(`  state.selectedId=entry.id;
  renderList(); renderDetail();
});`,
`  state.selectedId=entry.id;
  renderList(); renderDetail();
  showMobileDetail();
});`, 'pw click detail');

rep(`  state.selectedId=id;
  renderBmList(); renderBmDetail();
}`,
`  state.selectedId=id;
  renderBmList(); renderBmDetail();
  showMobileDetail();
}`, 'bm click detail');

fs.writeFileSync(webPath, web);
if (fails.length) { console.error('锚点失败: ' + JSON.stringify(fails)); process.exit(1); }
console.log('网页版响应式同步完成');
