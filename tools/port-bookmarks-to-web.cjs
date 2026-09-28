// 将书签模块从桌面版移植到网页版（基于 git HEAD 的合并前版本重建）
const fs = require('fs');
const webPath = 'D:/workspace/password-vault/办公密码保险库.html';
const prePath = 'D:/workspace/password-vault/tools/web-pre-merge.html';
const deskPath = 'D:/workspace/password-vault/desktop/ui/index.html';
let web = fs.readFileSync(prePath, 'utf8').replace(/\r\n/g, '\n');
const desk = fs.readFileSync(deskPath, 'utf8').replace(/\r\n/g, '\n');
const fails = [];
const rep = (oldS, newS, label) => {
  if (!web.includes(oldS)) { fails.push(label + ' 未找到'); return; }
  web = web.replace(oldS, newS);
};

/* ---------- 1. 提取桌面版书签模块并替换 IO 层 ---------- */
const modStart = desk.lastIndexOf('/* ==', desk.indexOf('书签模块（合并自书签保险箱）'));
const modEnd = desk.lastIndexOf('/* ==', desk.indexOf(' * 启动', modStart));
if (modStart < 0 || modEnd < 0) { console.error('桌面版模块定位失败'); process.exit(1); }
let bmmod = desk.slice(modStart, modEnd);
const bmioStart = bmmod.indexOf('const BMIO={');
const bmioEnd = bmmod.indexOf('};', bmmod.indexOf('openExternal(url)')) + 2;
const webBMIO = `const BMIO={
  async readImportFile(){ return await pickWebFile('.html,.htm'); },
  async saveHtml(suggested, text){ downloadBlob(suggested, text, 'text/html'); return true; },
  async openStoreFile(){ const f = await pickWebFile('.json,.bmark'); return f ? {path:null, text:f.text} : null; },
  openExternal(url){ window.open(url, '_blank'); }
};
function downloadBlob(name, text, mime){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text], {type:mime+';charset=utf-8'}));
  a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}
function pickWebFile(accept){
  return new Promise(res=>{
    const inp=document.createElement('input');
    inp.type='file'; inp.accept=accept; inp.style.cssText='position:fixed;top:-999px';
    document.body.appendChild(inp);
    inp.onchange=async()=>{ const f=inp.files[0]; res(f?{name:f.name, text:await f.text()}:null); inp.remove(); };
    inp.click();
  });
};`;
bmmod = bmmod.slice(0, bmioStart) + webBMIO + bmmod.slice(bmioEnd);

/* ---------- 2. 网页版各处小改动 ---------- */
rep(`.chip.grp{background:rgba(65,211,146,.1);color:var(--ok)}`,
`.chip.grp{background:rgba(65,211,146,.1);color:var(--ok)}
/* 类型页签（密码 | 书签） */
.type-tabs{display:flex;gap:6px;padding:12px 14px 0;flex:none}
.type-tabs button{flex:1;padding:8px;border-radius:10px;border:1px solid var(--line2);background:var(--bg2);
  color:var(--tx1);font-size:13px;font-weight:600;transition:all .15s}
.type-tabs button.active{background:var(--accSoft);border-color:var(--acc);color:var(--acc)}
.type-tabs button:hover{color:var(--tx0)}
/* 书签文件夹树 */
.tree-item{display:flex;align-items:center;gap:6px;width:100%;padding:6px 12px;border-radius:9px;border:none;
  background:none;color:var(--tx1);font-size:12.5px;text-align:left;cursor:pointer}
.tree-item:hover{background:var(--bg3);color:var(--tx0)}
.tree-item.active{background:var(--accSoft);color:var(--acc);font-weight:600}
.tree-item .tw{width:13px;flex:none;display:inline-flex;justify-content:center;color:var(--tx2)}
.tree-item .tw .ic{width:11px;height:11px;transition:transform .15s}
.tree-item .tw.open .ic{transform:rotate(90deg)}
.tree-item .tw.empty{visibility:hidden}
.tree-item .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tree-item .cnt{font-size:11px;color:var(--tx2)}
/* 书签上下文条 */
.bm-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;row-gap:7px;padding:2px 14px 8px;font-size:12px;color:var(--tx1);flex:none}
.bm-bar .pth{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:45%}
.bm-bar .sp{margin-left:auto;display:flex;gap:6px}`, 'css');

rep(`  refresh:I('<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
  restore:I('<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'),`,
`  refresh:I('<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
  restore:I('<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'),
  open:I('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>'),
  bmark:I('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  chev:I('<polyline points="9 18 15 12 9 6"/>'),`, 'icons');

rep(`    <button class="nav-item active" id="navAll"><span class="n-ic"></span>全部条目 <span class="cnt" id="cntAll">0</span></button>
    <button class="nav-item" id="navFav"><span class="n-ic"></span>收藏 <span class="cnt" id="cntFav">0</span></button>
    <button class="nav-item" id="navTrash"><span class="n-ic"></span>回收站 <span class="cnt" id="cntTrash">0</span></button>
    <div class="nav-label">分组</div>
    <div id="navGroups"></div>
    <div class="nav-label">标签</div>
    <div id="navTags"></div>`,
`    <button class="nav-item active" id="navAll"><span class="n-ic"></span><span id="navAllTxt">全部条目</span> <span class="cnt" id="cntAll">0</span></button>
    <button class="nav-item" id="navFav"><span class="n-ic"></span>收藏 <span class="cnt" id="cntFav">0</span></button>
    <button class="nav-item" id="navTrash"><span class="n-ic"></span>回收站 <span class="cnt" id="cntTrash">0</span></button>
    <div id="navPw">
      <div class="nav-label">分组</div>
      <div id="navGroups"></div>
      <div class="nav-label">标签</div>
      <div id="navTags"></div>
    </div>
    <div id="navBm" class="hidden"></div>`, 'sidebar html');

rep(`  <section class="list-pane">
    <div class="list-head">`,
`  <section class="list-pane">
    <div class="type-tabs">
      <button id="tabPw" class="active" type="button">密码</button>
      <button id="tabBm" type="button">书签</button>
    </div>
    <div class="list-head">`, 'listpane tabs');

rep(`    <div id="batchBar" class="batch-bar hidden"></div>
    <div class="entry-list" id="entryList"></div>`,
`    <div id="bmBar" class="bm-bar hidden"></div>
    <div id="batchBar" class="batch-bar hidden"></div>
    <div class="entry-list" id="entryList"></div>`, 'bmbar html');

rep(`const state={
  unlocked:false, key:null, vault:null, blob:null,
  saltB64:null, iter:ITERATIONS,
  filter:{view:'all', tag:null, q:''},
  selectedId:null,
  batchMode:false, selectedIds:new Set()
};`,
`const state={
  unlocked:false, key:null, vault:null, blob:null,
  saltB64:null, iter:ITERATIONS,
  type:'pw',
  filter:{view:'all', tag:null, q:''},
  bm:{view:'all', tag:null, folderId:null, q:'', collapsed:new Set()},
  selectedId:null,
  batchMode:false, selectedIds:new Set()
};`, 'state');

rep(`function renderSidebar(){
  const active=state.vault.entries.filter(e=>!e.deletedAt);`,
`function renderSidebar(){
  const pw=state.type==='pw';
  $('#navPw').classList.toggle('hidden',!pw);
  $('#navBm').classList.toggle('hidden',pw);
  if(!pw) return renderBmSidebar();
  $('#navAllTxt').textContent='全部条目';
  const active=state.vault.entries.filter(e=>!e.deletedAt);`, 'renderSidebar dispatch');

rep(`function renderList(){
  const arr=visibleEntries();`,
`function renderList(){ if(state.type==='bm') return renderBmList(); renderPwList(); }
function renderPwList(){
  const arr=visibleEntries();`, 'renderList dispatch');

rep(`function renderDetail(){
  const pane=$('#detailPane');`,
`function renderDetail(){ if(state.type==='bm') return renderBmDetail(); renderPwDetail(); }
function renderPwDetail(){
  const pane=$('#detailPane');`, 'renderDetail dispatch');

rep(`function renderAll(){ renderSidebar(); renderBatchBar(); renderList(); renderDetail(); }`,
`function renderAll(){
  renderSidebar();
  renderBatchBar();
  const bm=state.type==='bm';
  $('#bmBar').classList.toggle('hidden',!bm);
  if(bm) renderBmBar();
  renderList();
  renderDetail();
}`, 'renderAll');

rep(`$('#navAll').onclick=()=>{ state.filter.view='all'; state.filter.tag=null; state.filter.q=''; $('#searchInput').value=''; renderAll(); };
$('#navFav').onclick=()=>{ state.filter.view='fav'; state.filter.tag=null; state.filter.q=''; $('#searchInput').value=''; renderAll(); };
$('#navTrash').onclick=()=>{ state.filter={view:'trash',tag:null,q:''}; $('#searchInput').value=''; state.selectedId=null; renderAll(); };`,
`$('#navAll').onclick=()=>{ if(state.type==='bm') return bmSetView('all'); state.filter.view='all'; state.filter.tag=null; state.filter.q=''; $('#searchInput').value=''; renderAll(); };
$('#navFav').onclick=()=>{ if(state.type==='bm') return bmSetView('fav'); state.filter.view='fav'; state.filter.tag=null; state.filter.q=''; $('#searchInput').value=''; renderAll(); };
$('#navTrash').onclick=()=>{ if(state.type==='bm') return bmSetView('trash'); state.filter={view:'trash',tag:null,q:''}; $('#searchInput').value=''; state.selectedId=null; renderAll(); };`, 'nav handlers');

rep(`$('#searchInput').addEventListener('input', function(){ state.filter.q=this.value; renderList(); });`,
`$('#searchInput').addEventListener('input', function(){
  if(state.type==='bm') state.bm.q=this.value; else state.filter.q=this.value;
  renderList();
});`, 'search dispatch');

rep(`$('#entryList').addEventListener('click', e=>{
  const row=e.target.closest('[data-row]');`,
`$('#entryList').addEventListener('click', e=>{
  if(state.type==='bm') return bmListClick(e);
  const row=e.target.closest('[data-row]');`, 'entryList dispatch');

rep(`$('#btnNew').onclick=()=>openEntryModal(null);`,
`$('#btnNew').onclick=()=>{ if(state.type==='bm') return openBmModal(null); openEntryModal(null); };`, 'btnNew');

rep(`$('#btnBatch').onclick=()=>{
  state.batchMode=!state.batchMode;
  state.selectedIds.clear();
  state.selectedId=null;
  renderAll();
  if(state.batchMode) toast('批量模式：勾选条目后可批量删除或设置分组/标签，可配合搜索/筛选', 3600);
};
function renderBatchBar(){`,
`$('#btnBatch').onclick=()=>{
  state.batchMode=!state.batchMode;
  state.selectedIds.clear();
  state.selectedId=null;
  renderAll();
  if(state.batchMode) toast(state.type==='bm'
    ?'批量模式：勾选书签后可删除/移动/恢复，可配合搜索/文件夹筛选'
    :'批量模式：勾选条目后可批量删除或设置分组/标签，可配合搜索/筛选', 3600);
};
function renderBatchBar(){
  if(state.type==='bm') return renderBmBatchBar();`, 'btnBatch + batchbar dispatch');

rep(`async function batchDelete(){
  const n=state.selectedIds.size;`,
`async function batchDelete(){
  if(state.type==='bm') return bmBatchDelete();
  const n=state.selectedIds.size;`, 'batchDelete dispatch');

rep(`    state.vault=JSON.parse(dec.decode(plain));
    state.key=key; state.saltB64=env.salt; state.iter=env.kdf.iterations;`,
`    state.vault=JSON.parse(dec.decode(plain));
    /* vault v2：合并书签库 */
    if(!state.vault.bookmarks || !state.vault.bookmarks.roots) state.vault.bookmarks=newBookmarkStore();
    if(state.vault.v!==2){ state.vault.v=2; state.upgraded=true; }
    state.key=key; state.saltB64=env.salt; state.iter=env.kdf.iterations;`, 'doUnlock v2');

rep(`    state.vault={ v:1, entries:[], settings:{autoLockMin:5, clipClearSec:30}, meta:{createdAt:new Date().toISOString()} };`,
`    state.vault={ v:2, entries:[], bookmarks:newBookmarkStore(), settings:{autoLockMin:5, clipClearSec:30}, meta:{createdAt:new Date().toISOString()} };`, 'doCreate v2');

rep(`  if(purged){ persist().catch(()=>{}); }
  renderAll();
  resetLockTimer();`,
`  if(purged){ persist().catch(()=>{}); }
  if(state.upgraded){ state.upgraded=false; persist().catch(()=>{}); toast('保险库已升级到 v2：新增书签区，可在顶部页签切换', 5000); }
  renderAll();
  resetLockTimer();`, 'enterApp upgraded');

rep(`  state.batchMode=false; state.selectedIds.clear();
  $('#searchInput').value='';
  /* 关键：锁定时必须关掉所有弹窗，否则残留的表单会在无数据状态下静默失败 */`,
`  state.batchMode=false; state.selectedIds.clear();
  state.bm={view:'all', tag:null, folderId:null, q:'', collapsed:new Set()};
  $('#searchInput').value='';
  /* 关键：锁定时必须关掉所有弹窗，否则残留的表单会在无数据状态下静默失败 */`, 'lockNow bm reset');

rep(`        '<div class="set-row"><div class="set-info"><div class="set-label">导入浏览器密码</div><div class="set-desc">支持 Chrome / Edge 导出的密码 CSV（浏览器设置 → 密码管理 → 导出密码）。导入后请删除该明文 CSV</div></div>'+
          '<button class="btn small" id="btnImportCsv">'+ICONS.up+'从 CSV 导入…</button></div>'+`,
`        '<div class="set-row"><div class="set-info"><div class="set-label">导入浏览器密码</div><div class="set-desc">支持 Chrome / Edge 导出的密码 CSV（浏览器设置 → 密码管理 → 导出密码）。导入后请删除该明文 CSV</div></div>'+
          '<button class="btn small" id="btnImportCsv">'+ICONS.up+'从 CSV 导入…</button></div>'+
        '<div class="set-row"><div class="set-info"><div class="set-label">导入旧书签库</div><div class="set-desc">把「书签管理器」的书签库 JSON（如 我的书签库.json）合并进书签区，网址重复的自动跳过</div></div>'+
          '<button class="btn small" id="btnMigrateBm">'+ICONS.folder+'选择书签库文件…</button></div>'+`, 'settings row');

rep(`  ov.querySelector('#btnImportCsv').onclick=importChromeCsvViaFile;`,
`  ov.querySelector('#btnImportCsv').onclick=importChromeCsvViaFile;
  ov.querySelector('#btnMigrateBm').onclick=openMigrateStore;`, 'settings binding');

rep(`<title>密码保险库 · 离线版</title>`, `<title>办公保险库</title>`, 'title');
rep(`<div class="brand-t"><b>密码保险库</b><span>OFFLINE VAULT</span></div>`,
`<div class="brand-t"><b>办公保险库</b><span>OFFICE VAULT</span></div>`, 'brand');
rep(`      '<h1>密码保险库</h1>'+`, `      '<h1>办公保险库</h1>'+`, 'lock h1');

/* ---------- 3. 注入书签模块（在 init 之前，仅注入一次） ---------- */
const webInit = web.indexOf('(async function init()');
const webIns = web.lastIndexOf('/* ==', webInit);
web = web.slice(0, webIns) + bmmod + web.slice(webIns);

fs.writeFileSync(webPath, web);
if (fails.length) { console.error('锚点失败: ' + JSON.stringify(fails)); process.exit(1); }
console.log('网页版合并完成');
