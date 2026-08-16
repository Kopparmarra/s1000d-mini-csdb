const state={items:window.BIKE_DATA||[],filtered:[],selected:null,selectedIcn:null,system:'All',kind:'All',tab:'content',query:'',role:'Author',library:'objects'};
function pickDefaultDM(){
  return state.items.find(x => x.kind==='DM' && x.title==='Brake system — Manual test')
      || state.items.find(x => x.kind==='DM' && /manual test/i.test(x.title||''))
      || state.items.find(x => x.kind==='DM' && /procedural/i.test(x.schema||''))
      || state.items.find(x => x.kind==='DM')
      || state.items[0]
      || null;
}

state.selected=pickDefaultDM();
const WF_KEY='s1000d-mini-csdb-workflow-v4';
const ASSET_FILES=["ICN-81205-S1000D0400-001-01.PNG", "ICN-B6865-GHS02-001-01.SVG", "ICN-B6865-GHS07-001-01.SVG", "ICN-B6865-S1000D0726-001-01.PNG", "ICN-C0419-S1000D0360-001-01.PNG", "ICN-C0419-S1000D0360-001-01.SVG", "ICN-C0419-S1000D0363-001-01.JPG", "ICN-C0419-S1000D0364-001-01.JPG", "ICN-C0419-S1000D0370-001-01.PNG", "ICN-C0419-S1000D0371-001-01.JPG", "ICN-C0419-S1000D0372-001-01.JPG", "ICN-C0419-S1000D0373-001-01.JPG", "ICN-C0419-S1000D0374-001-01.JPG", "ICN-C0419-S1000D0384-001-01.GIF", "ICN-FAPE3-S1000D0101-001-01.JPG", "ICN-FAPE3-S1000D0102-001-01.JPG", "ICN-S3627-S1000D0619-001-01.PNG"];

const workflow=JSON.parse(localStorage.getItem(WF_KEY)||'{}');
function saveWorkflow(){localStorage.setItem(WF_KEY,JSON.stringify(workflow))}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sysOf(x){if(x.kind!=='DM')return x.kind;const m=x.code.match(/^DMC-[^-]+-[^-]+-([^-]+)/);return m?m[1]:'Other'}
function typeLabel(x){const map={proced:'Procedural',descript:'Descriptive',frontmatter:'Front matter',schedul:'Maintenance planning',crew:'Crew',brex:'BREX',comrep:'Common repository',ipd:'Illustrated parts data',learning:'Learning',fault:'Fault isolation',wrngdata:'Wiring data',wrngflds:'Wiring fields',appliccrossreftable:'Applicability cross-reference',condcrossreftable:'Conditions cross-reference',prdcrossreftable:'Product cross-reference',process:'Process',sb:'Service bulletin',brdoc:'Business rules',checklist:'Checklist'};return map[x.schema]||x.schema||x.kind}
function wf(x){if(!workflow[x.code])workflow[x.code]={status:'Issued',checkedOut:false,author:'',draftTitle:'',draftContent:'',draftNote:'',history:[],issueHistory:[]};const w=workflow[x.code];if(!Array.isArray(w.history))w.history=[];if(!Array.isArray(w.issueHistory))w.issueHistory=[];return w}
function logEvent(x,action,detail=''){const w=wf(x);w.history.unshift({ts:new Date().toISOString(),role:state.role,action,detail});w.history=w.history.slice(0,30);saveWorkflow()}
function statusClass(s){return 'st-'+String(s).toLowerCase().replace(/\s+/g,'-')}
function icnStem(f){return f.replace(/\.(JPG|JPEG|PNG|GIF|SVG|CGM|TIF|TIFF)$/i,'')}
function icnLibrary(){const m=new Map();for(const x of state.items){for(const ref of (x.icns||[])){if(!m.has(ref))m.set(ref,{ref,file:assetFor(ref),usedBy:[]});m.get(ref).usedBy.push(x)}}for(const f of ASSET_FILES){const ref=icnStem(f);if(!m.has(ref))m.set(ref,{ref,file:f,usedBy:[]});else if(!m.get(ref).file)m.get(ref).file=f}return [...m.values()].sort((a,b)=>a.ref.localeCompare(b.ref))}
function incomingRefs(target){if(!target)return [];return state.items.filter(src=>(src.refs||[]).some(r=>{const y=findByCode(r);return y===target||r===target.code||target.code.startsWith(r)||r.startsWith(target.code)}))}
function nextIssueNumber(n){const v=parseInt(n||'0',10);return String((Number.isFinite(v)?v:0)+1).padStart(Math.max(3,String(n||'').length), '0')}
function currentIssue(x){const h=wf(x).issueHistory;return h.length?h[0].issue:(x.issueNumber||'—')}
function recentWorkflow(){const rows=[];for(const x of state.items){for(const h of wf(x).history||[])rows.push({...h,x})}return rows.sort((a,b)=>String(b.ts).localeCompare(String(a.ts))).slice(0,8)}
function dashboardStats(){const dms=state.items.filter(x=>x.kind==='DM');const statuses={Issued:0,'In Work':0,'In Review':0,'Awaiting Approval':0};for(const x of dms){const s=wf(x).status;if(Object.prototype.hasOwnProperty.call(statuses,s))statuses[s]++}return {objects:state.items.length,dms:dms.length,icns:icnLibrary().length,pms:state.items.filter(x=>x.kind==='PM').length,statuses}}

function ensureSelectedVisible(){
  if(!state.selected) return;
  const exists = state.filtered.some(x => x.file===state.selected.file || x.key===state.selected.key);
  if(!exists){
    state.system='All';
    state.kind='All';
    state.query='';
    state.filtered=[...state.items];
  }
}

function apply(){ensureSelectedVisible();if(state.library==='icn'){const q=state.query.trim().toLowerCase();state.filtered=icnLibrary().filter(i=>!q||(i.ref+' '+(i.file||'')+' '+i.usedBy.map(x=>x.title).join(' ')).toLowerCase().includes(q));renderTable();renderCount();return}let a=state.items;if(state.system!=='All')a=a.filter(x=>sysOf(x)===state.system);if(state.kind!=='All')a=a.filter(x=>x.kind===state.kind);const q=state.query.trim().toLowerCase();if(q)a=a.filter(x=>(x.code+' '+(wf(x).draftTitle||x.title)+' '+x.filename+' '+x.schema).toLowerCase().includes(q));state.filtered=a;renderTable();renderCount()}
function render(){document.querySelector('#app').innerHTML=`<div class="shell"><div class="top"><div class="brand">S1000D Mini-CSDB</div><span class="badge">Bike · Issue 6 R2</span><span class="badge">Educational emulator · v1.5</span><div class="spacer"></div><label class="role">Role <select id="role"><option>Author</option><option>Reviewer</option><option>Approver</option></select></label><button id="loadBtn">Import XML folder</button></div><div class="toolbar"><input id="search" placeholder="Search DMC, title, filename…"><select id="kind"><option>All</option><option>DM</option><option>PM</option><option>DML</option><option>DDN</option><option>UPF</option></select><button id="reset">Reset</button><span class="count" id="count"></span></div><div class="main" id="main"><aside class="pane left"><h3>System / object</h3><div class="tree" id="tree"></div><h3>Workflow</h3><div class="legend"><span class="status st-issued">Issued</span><span class="status st-in-work">In Work</span><span class="status st-in-review">In Review</span><span class="status st-awaiting-approval">Awaiting Approval</span></div><button class="secondary wide" id="clearWf">Reset demo workflow</button><div class="drop"><b>Local import</b><br>Choose an extracted S1000D folder. XML is parsed only in your browser.<input id="folder" type="file" webkitdirectory multiple accept=".xml,.XML" hidden></div><h3>About</h3><div class="notice">Browser-based CSDB simulator for exploring S1000D objects and a simplified authoring workflow. Not a production or compliant CSDB.</div></aside><section class="pane"><div class="table-wrap"><table><thead id="thead"><tr><th>Type</th><th>Key / DMC</th><th>Title</th><th>Issue</th><th>Workflow</th></tr></thead><tbody id="rows"></tbody></table></div></section><section class="pane detail" id="detail"></section></div></div>`;
 document.querySelector('#search').oninput=e=>{state.query=e.target.value;apply()};document.querySelector('#kind').onchange=e=>{state.kind=e.target.value;apply()};document.querySelector('#role').value=state.role;document.querySelector('#role').onchange=e=>{state.role=e.target.value;renderDetail()};document.querySelector('#reset').onclick=()=>{state.query='';state.kind='All';state.system='All';state.library='objects';state.selected=pickDefaultDM();state.selectedIcn=null;document.querySelector('#search').value='';document.querySelector('#kind').value='All';renderTree();apply()};document.querySelector('#loadBtn').onclick=()=>document.querySelector('#folder').click();document.querySelector('#folder').onchange=importFiles;document.querySelector('#clearWf').onclick=()=>{if(confirm('Reset all simulated workflow states and audit history?')){localStorage.removeItem(WF_KEY);Object.keys(workflow).forEach(k=>delete workflow[k]);apply();renderDetail()}};renderTree();apply();}
function renderTree(){const systems=[...new Set(state.items.map(sysOf))].sort();const counts=s=>state.items.filter(x=>sysOf(x)===s).length;const icns=icnLibrary();document.querySelector('#tree').innerHTML=`<button class="${state.library==='objects'&&state.system==='All'?'active':''}" data-s="All">All objects <span class="n">${state.items.length}</span></button>`+systems.map(s=>`<button class="${state.library==='objects'&&state.system===s?'active':''}" data-s="${esc(s)}">${esc(s)} <span class="n">${counts(s)}</span></button>`).join('')+`<div class="tree-sep"></div><button class="${state.library==='icn'?'active':''}" data-s="__ICN__">ICN Library <span class="n">${icns.length}</span></button>`;document.querySelectorAll('#tree button').forEach(b=>b.onclick=()=>{if(b.dataset.s==='__ICN__'){state.library='icn';state.selected=null;state.selectedIcn=icns[0]||null}else{state.library='objects';state.system=b.dataset.s;state.selectedIcn=null}renderTree();apply();renderDetail()})}
function renderTable(){const tb=document.querySelector('#rows'),th=document.querySelector('#thead'),main=document.querySelector('#main'),tableWrap=document.querySelector('.table-wrap');main?.classList.remove('dashboard-mode');if(!document.querySelector('#rows')){tableWrap.innerHTML='<table><thead id="thead"></thead><tbody id="rows"></tbody></table>'}const tb2=document.querySelector('#rows'),th2=document.querySelector('#thead');if(state.library==='icn'){th2.innerHTML='<tr><th>Preview</th><th>ICN</th><th>Format</th><th>Referenced by</th></tr>';tb2.innerHTML=state.filtered.map((i,n)=>`<tr data-icn="${n}" class="${state.selectedIcn&&state.selectedIcn.ref===i.ref?'sel':''}"><td class="icn-thumb">${i.file?`<img src="assets/${encodeURI(i.file)}" alt="">`:'<span>—</span>'}</td><td class="code">${esc(i.ref)}</td><td>${esc(i.file?(i.file.split('.').pop()||'').toUpperCase():'Referenced')}</td><td>${i.usedBy.length}</td></tr>`).join('');tb2.querySelectorAll('tr').forEach(r=>r.onclick=()=>{state.selectedIcn=state.filtered[+r.dataset.icn];renderTable();renderDetail()});return}th2.innerHTML='<tr><th>Type</th><th>Key / DMC</th><th>Title</th><th>Issue</th><th>Workflow</th></tr>';tb2.innerHTML=state.filtered.map(x=>{const w=wf(x),title=w.draftTitle||x.title;return `<tr data-i="${state.items.indexOf(x)}" class="${state.selected===x?'sel':''}"><td><span class="pill">${esc(typeLabel(x))}</span></td><td class="code">${esc(x.code)}${w.checkedOut?'<span class="lock">● checked out</span>':''}</td><td>${esc(title||'—')}</td><td>${esc(x.issueNumber||'—')}</td><td><span class="status ${statusClass(w.status)}">${esc(w.status)}</span></td></tr>`}).join('');tb2.querySelectorAll('tr').forEach(r=>r.onclick=()=>selectItem(state.items[+r.dataset.i]))}
function renderCount(){document.querySelector('#count').textContent=state.library==='dashboard'?'Bike CSDB overview':state.library==='icn'?`${state.filtered.length} ICNs`:`${state.filtered.length} of ${state.items.length} objects`}
function selectItem(x){state.library='objects';state.selected=x;state.selectedIcn=null;renderTree();renderTable();renderDetail()}
function allowedActions(x){const w=wf(x),r=state.role,a=[];if(x.kind!=='DM')return a;if(r==='Author'&&w.status==='Issued')a.push(['checkout','Check out']);if(r==='Author'&&w.status==='In Work'&&w.checkedOut)a.push(['edit','Open in Authoring Editor'],['review','Submit for review'],['discard','Discard changes']);if(r==='Reviewer'&&w.status==='In Review')a.push(['changes','Request changes'],['approvegate','Send for approval']);if(r==='Approver'&&w.status==='Awaiting Approval')a.push(['reject','Return to author'],['issue','Approve & issue']);return a}
function renderDashboard(target){const d=target||document.querySelector('#detail'),st=dashboardStats(),recent=recentWorkflow();d.innerHTML=`<div class="dashboard"><div class="dash-hero"><span class="eyebrow">S1000D Bike · Issue 6 R2</span><h1>Mini-CSDB Dashboard</h1><p>Explore managed information objects, follow reuse relationships, inspect issue history, and simulate the author → review → approval lifecycle.</p><div class="tryflow"><b>Try this:</b> Data Module → Check out → Open in Authoring Editor → Submit for review → Approve & issue</div></div><div class="stats-grid"><button data-dash="objects"><strong>${st.objects}</strong><span>Managed objects</span></button><button data-dash="dm"><strong>${st.dms}</strong><span>Data Modules</span></button><button data-dash="icn"><strong>${st.icns}</strong><span>ICN objects</span></button><button data-dash="pm"><strong>${st.pms}</strong><span>Publication Modules</span></button></div><h3 class="section-title">Workflow snapshot</h3><div class="status-grid"><div><span class="status st-issued">Issued</span><strong>${st.statuses.Issued}</strong></div><div><span class="status st-in-work">In Work</span><strong>${st.statuses['In Work']}</strong></div><div><span class="status st-in-review">In Review</span><strong>${st.statuses['In Review']}</strong></div><div><span class="status st-awaiting-approval">Awaiting Approval</span><strong>${st.statuses['Awaiting Approval']}</strong></div></div><h3 class="section-title">Recently changed</h3>${recent.length?`<div class="recent-list">${recent.map(r=>`<button data-code="${esc(r.x.code)}"><time>${new Date(r.ts).toLocaleString()}</time><b>${esc(r.action)}</b><span>${esc(r.x.code)}</span></button>`).join('')}</div>`:'<p class="muted">No simulated changes yet. Start by checking out a Data Module.</p>'}<div class="source-note"><b>Portfolio demo:</b> This is an educational CSDB emulator built around the S1000D Bike sample dataset. It demonstrates information-management concepts and does not claim production CSDB compliance.</div></div>`;d.querySelectorAll('[data-code]').forEach(b=>b.onclick=()=>{const x=findByCode(b.dataset.code);if(x)selectItem(x)});d.querySelectorAll('[data-dash]').forEach(b=>b.onclick=()=>{const v=b.dataset.dash;if(v==='icn'){state.library='icn';state.selectedIcn=icnLibrary()[0]||null;renderTree();apply();renderDetail();return}state.library='objects';state.system='All';state.kind=v==='dm'?'DM':v==='pm'?'PM':'All';document.querySelector('#kind').value=state.kind;renderTree();apply();if(state.filtered[0])selectItem(state.filtered[0])})}
function renderIcnDetail(){const d=document.querySelector('#detail'),i=state.selectedIcn;if(!i){d.innerHTML='<div class="empty">Select an ICN</div>';return}const ext=i.file?(i.file.split('.').pop()||'').toUpperCase():'Referenced asset';d.innerHTML=`<div class="detail-head"><div class="detail-titleline"><h2>Information Control Number</h2><span class="pill">ICN</span></div><div class="detail-code">${esc(i.ref)}</div><div class="meta"><div><b>Format</b>${esc(ext)}</div><div><b>Preview asset</b>${i.file?'Available':'Not bundled / CGM'}</div><div><b>Where used</b>${i.usedBy.length} object${i.usedBy.length===1?'':'s'}</div></div></div><div class="tabs"><button class="active">Preview & where used</button></div><div class="tabbody"><div class="icn-large">${i.file?`<img src="assets/${encodeURI(i.file)}" alt="${esc(i.ref)}">`:'<div class="media-missing">Browser preview unavailable<br><small>The source Bike dataset may reference CGM or another non-bundled graphic.</small></div>'}</div><h3 class="section-title">Where used</h3>${i.usedBy.length?`<div class="refs">${i.usedBy.map(x=>`<button data-code="${esc(x.code)}"><b>${esc(x.code)}</b><br><span>${esc(x.title||'')}</span></button>`).join('')}</div>`:'<p class="muted">No Data Module reference was found in the parsed dataset.</p>'}<div class="source-note"><b>CSDB concept:</b> the ICN is managed as a reusable information object and Data Modules reference it rather than embedding an unmanaged image copy.</div></div>`;d.querySelectorAll('[data-code]').forEach(b=>b.onclick=()=>{const x=findByCode(b.dataset.code);if(x){state.tab='media';selectItem(x)}})}
function renderDetail(){if(state.library==='icn'){renderIcnDetail();return}const x=state.selected,d=document.querySelector('#detail');if(!x){d.innerHTML='<div class="empty">Select an object</div>';return}const w=wf(x),actions=allowedActions(x),title=w.draftTitle||x.title;d.innerHTML=`<div class="detail-head"><div class="detail-titleline"><h2>${esc(title||x.code)}</h2><span class="status ${statusClass(w.status)}">${esc(w.status)}</span></div><div class="detail-code">${esc(x.code)}</div><div class="meta"><div><b>Object</b>${esc(x.kind)}</div><div><b>Schema</b>${esc(typeLabel(x))}</div><div><b>Issue</b>${esc(currentIssue(x))} / ${esc(x.inWork||'—')}</div><div><b>Issue date</b>${esc(x.issueDate||'—')}</div><div><b>Language</b>${esc(x.language||'—')}</div><div><b>Security</b>${esc(x.security||'—')}</div></div>${x.kind==='DM'?`<div class="workflowbar"><div><b>Simulated workflow</b><span>${w.checkedOut?'Checked out by Author':'Repository copy'}</span></div><div class="actions">${actions.map(([id,label])=>`<button data-a="${id}" class="${id==='issue'?'primary':''}">${label}</button>`).join('')||'<span class="muted">No action available for this role/status.</span>'}</div></div>`:''}</div><div class="tabs"><button data-t="content">Content</button><button data-t="refs">References (${x.refs.length})</button><button data-t="whereused">Where used (${incomingRefs(x).length})</button><button data-t="pm">Structure</button><button data-t="media">Media (${x.icns.length})</button><button data-t="brex">BREX checks</button><button data-t="workflow">Workflow</button><button data-t="history">Issue history</button><button data-t="xml">XML</button></div><div class="tabbody" id="tabbody"></div>`;d.querySelectorAll('.tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.t===state.tab);b.onclick=()=>{state.tab=b.dataset.t;renderDetail()}});d.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>doAction(x,b.dataset.a));renderTab(x)}
function doAction(x,a){const w=wf(x);if(a==='checkout'){w.status='In Work';w.checkedOut=true;logEvent(x,'Checked out','Working copy created');}
 if(a==='edit'){openAuthoringEditor(x);return;}
 if(a==='review'){w.status='In Review';w.checkedOut=false;logEvent(x,'Submitted for review',w.draftNote||'Author submitted working copy');}
 if(a==='discard'){w.status='Issued';w.checkedOut=false;w.draftTitle='';w.draftContent='';w.draftNote='';logEvent(x,'Changes discarded','Working copy removed');}
 if(a==='changes'){w.status='In Work';w.checkedOut=true;logEvent(x,'Changes requested','Reviewer returned module to author');}
 if(a==='approvegate'){w.status='Awaiting Approval';logEvent(x,'Review passed','Reviewer sent module for approval');}
 if(a==='reject'){w.status='In Work';w.checkedOut=true;logEvent(x,'Approval rejected','Approver returned module to author');}
 if(a==='issue'){const previous=currentIssue(x);const next=nextIssueNumber(previous==='—'?x.issueNumber:previous);w.issueHistory.unshift({issue:next,inWork:'00',ts:new Date().toISOString(),note:w.draftNote||'Approved simulated revision',role:state.role});w.status='Issued';w.checkedOut=false;logEvent(x,'Approved and issued',`Simulated issue ${next} released`);}
 saveWorkflow();apply();renderDetail()}

function authoringHtml(x){
 const html=semanticContentHtml(x);if(!html)return `<p>${esc(semanticPlainText(x)||procedurePlainText(x)||(x.paras||[]).slice(0,35).join(' '))}</p>`;
 const tmp=document.createElement('div');tmp.innerHTML=html;tmp.querySelectorAll('.source-note').forEach(n=>n.remove());
 return tmp.innerHTML;
}
function openAuthoringEditor(x){
 const w=wf(x);if(x.kind!=='DM'||!w.checkedOut)return;
 const existing=document.querySelector('#authoring-overlay');if(existing)existing.remove();
 const authorHtml=w.draftHtml||authoringHtml(x);
 const overlay=document.createElement('div');overlay.id='authoring-overlay';overlay.className='authoring-overlay';
 overlay.innerHTML=`<div class="authoring-window">
   <div class="authoring-topbar"><div><b>Authoring Editor</b><span>External XML editor simulation · working copy</span></div><div class="authoring-actions"><button data-ed="close">Return to CSDB</button><button class="primary" data-ed="save">Save working copy</button></div></div>
   <div class="authoring-menubar"><span>File</span><span>Edit</span><span class="active-mode">Author</span><span>Validate</span><span>Review</span><span>Tools</span><span>Help</span></div>
   <div class="authoring-layout">
    <aside class="authoring-tree"><h3>Document structure</h3><div class="xml-tree"><b>dmodule</b><span>identAndStatusSection</span><span>content</span><span class="indent">${esc(x.schema||'data module content')}</span><span class="indent">structured author view</span></div><div class="editor-note"><b>Simulation</b><br>Author view is styled from the S1000D XML hierarchy, similar in concept to an Author mode in Oxygen or Arbortext. Bold is reserved for headings, parent steps, labels and semantic emphasis — not ordinary body text.</div></aside>
    <main class="authoring-main"><div class="editor-path">${esc(x.filename||x.code)}</div><label>Data module title<input id="ed-title" value="${esc(w.draftTitle||x.title||'')}"></label><div class="authoring-field-label">Structured content <span>Author view · click text to edit</span></div><div id="ed-content" class="authoring-canvas" contenteditable="true" spellcheck="true">${authorHtml}</div><label class="change-note">Change note<input id="ed-note" value="${esc(w.draftNote||'')}"></label></main>
    <aside class="authoring-props"><h3>DM properties</h3><dl><dt>DMC</dt><dd>${esc(x.code)}</dd><dt>Issue</dt><dd>${esc(x.issueNumber||'—')} / ${esc(x.inWork||'—')}</dd><dt>Schema</dt><dd>${esc(typeLabel(x))}</dd><dt>Language</dt><dd>${esc(x.language||'—')}</dd><dt>Status</dt><dd>In Work</dd></dl><button class="secondary wide" data-ed="validate">Validate working copy</button><div id="ed-validation" class="validation-box">Not validated in this editing session.</div></aside>
   </div>
 </div>`;
 document.body.appendChild(overlay);
 overlay.querySelector('[data-ed="close"]').onclick=()=>overlay.remove();
 overlay.querySelector('[data-ed="save"]').onclick=()=>{const canvas=overlay.querySelector('#ed-content');w.draftTitle=overlay.querySelector('#ed-title').value.trim()||x.title;w.draftHtml=canvas.innerHTML;w.draftContent=canvas.innerText.trim();w.draftNote=overlay.querySelector('#ed-note').value.trim();logEvent(x,'Working copy saved in authoring editor',w.draftNote||'Authoring changes saved locally');saveWorkflow();overlay.remove();apply();renderDetail();};
 overlay.querySelector('[data-ed="validate"]').onclick=()=>{const checks=brexChecks(x),box=overlay.querySelector('#ed-validation');const passed=checks.filter(c=>c.pass).length;box.innerHTML=checks.length?`<b>${passed}/${checks.length} supported BREX checks passed.</b><br><span>This demo validates the source DM against the supported Bike BREX subset.</span>`:'<b>No supported checks available.</b>';};
}

function assetFor(ref){return ASSET_FILES.find(f=>f===ref)||ASSET_FILES.find(f=>f.startsWith(ref+'-')||f.startsWith(ref+'.'))||''}
function parseRaw(raw){if(!raw)return null;const d=new DOMParser().parseFromString(raw,'application/xml');return d.querySelector('parsererror')?null:d}
function directChildren(el,name){return [...(el?.children||[])].filter(c=>c.localName===name)}
function firstDirect(el,name){return directChildren(el,name)[0]||null}
function byXmlId(root,id){return [...root.getElementsByTagName('*')].find(e=>e.getAttribute('id')===id)||null}
function resolvedInternalRef(ref,root){
 const id=ref?.getAttribute('internalRefId')||'';
 if(!id)return '';
 const target=byXmlId(root,id);
 if(!target)return id;
 const name=q(target,'name');
 const title=q(target,'title');
 return text(name)||text(title)||id;
}
function inlineParaHtml(para,root){
 if(!para)return '';
 let out='';
 const walk=node=>{
  if(node.nodeType===Node.TEXT_NODE){out+=node.nodeValue||'';return}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  const n=node.localName;
  if(n==='randomList'||n==='sequentialList')return;
  if(n==='internalRef'){
   const label=resolvedInternalRef(node,root);
   const id=node.getAttribute('internalRefId')||'';
   out+=`<span class="internal-ref" title="Internal reference ${esc(id)}">${esc(label)}</span>`;
   return;
  }
  if(n==='dmRef'){
   const dc=q(node,'dmCode');
   const code=dc?reconstructDmCode(dc):text(node);
   out+=`<span class="internal-ref">${esc(code)}</span>`;
   return;
  }
  [...node.childNodes].forEach(walk);
 };
 [...para.childNodes].forEach(walk);
 return out.replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();
}
function nearestAncestor(el,name){let p=el?.parentElement||null;while(p){if(p.localName===name)return p;p=p.parentElement}return null}
function renderEmbeddedLists(para,root){
 const lists=[...para.getElementsByTagName('*')].filter(e=>['randomList','sequentialList'].includes(e.localName)&&nearestAncestor(e,'para')===para);
 return lists.map(list=>{
  const ordered=list.localName==='sequentialList';
  const tag=ordered?'ol':'ul';
  const items=directChildren(list,'listItem').map(li=>{
   const p=firstDirect(li,'para')||q(li,'para');
   return `<li>${inlineParaHtml(p,root)||esc(text(p))}</li>`;
  }).join('');
  return items?`<${tag} class="proc-list">${items}</${tag}>`:'';
 }).join('');
}
function procedureRequirements(root){
 const pre=q(root,'preliminaryRqmts');
 if(!pre)return [];
 const rows=[];
 for(const el of [...pre.getElementsByTagName('*')]){
  if(!['supportEquipDescr','supplyDescr','spareDescr'].includes(el.localName))continue;
  const name=text(q(el,'name'));
  if(!name)continue;
  const part=text(q(el,'partNumber'));
  const qty=text(q(el,'reqQuantity'));
  const kind=el.localName==='supportEquipDescr'?'Support equipment':el.localName==='supplyDescr'?'Supply':'Spare';
  rows.push({id:el.getAttribute('id')||'',kind,name,part,qty});
 }
 return rows;
}
function renderProcedureRequirements(root){
 const rows=procedureRequirements(root);
 if(!rows.length)return '';
 return `<details class="proc-req"><summary>Preliminary requirements (${rows.length})</summary><div class="proc-req-grid">${rows.map(r=>`<div><span>${esc(r.kind)}</span><b>${esc(r.name)}</b>${r.part?`<small>Part: ${esc(r.part)}</small>`:''}${r.qty?`<small>Qty: ${esc(r.qty)}</small>`:''}</div>`).join('')}</div></details>`;
}
function renderProcedureStep(step,root,path=[]){
 const titleEl=firstDirect(step,'title');
 const paras=directChildren(step,'para');
 const number=path.join('.');
 const children=directChildren(step,'proceduralStep');
 const titleHtml=titleEl?esc(text(titleEl)):'';
 let copy='';
 if(titleHtml) copy+=`<p class="proc-title">${titleHtml}</p>`;
 paras.forEach((para,idx)=>{
  const label=inlineParaHtml(para,root)||esc(text(para));
  const lists=renderEmbeddedLists(para,root);
  // If there is no explicit title, the first paragraph is the step instruction.
  copy+=`<p${!titleHtml&&idx===0?' class="proc-instruction"':''}>${label}</p>${lists}`;
 });
 // A structurally empty grouping step should not render a blank line/number.
 const hasOwnContent=!!(titleHtml||paras.length);
 const classes=`proc-step level-${Math.min(path.length,4)}${children.length?' has-children':''}${titleHtml?' has-title':''}${!hasOwnContent?' empty-group':''}`;
 const line=hasOwnContent?`<div class="proc-line"><span class="proc-num">${esc(number)}</span><div class="proc-copy">${copy}</div></div>`:'';
 return `<div class="${classes}">${line}${children.map((c,i)=>renderProcedureStep(c,root,[...path,i+1])).join('')}</div>`;
}
function structuredProcedureHtml(x){
 if(x.kind!=='DM'||!x.raw)return '';
 const doc=parseRaw(x.raw);if(!doc)return '';
 const root=doc.documentElement;
 const main=q(root,'mainProcedure');
 if(!main)return '';
 const steps=directChildren(main,'proceduralStep');
 if(!steps.length)return '';
 return `<div class="structured-content"><div class="source-note"><b>Structured procedure.</b> Step hierarchy, lists and internal references are rendered from the S1000D XML rather than flattened text.</div>${renderProcedureRequirements(root)}<div class="procedure">${steps.map((s,i)=>renderProcedureStep(s,root,[i+1])).join('')}</div></div>`;
}
function procedurePlainText(x){
 if(x.kind!=='DM'||!x.raw)return '';
 const doc=parseRaw(x.raw);if(!doc)return '';
 const root=doc.documentElement,main=q(root,'mainProcedure');if(!main)return '';
 const lines=[];
 const walk=(step,path)=>{
  const titleEl=firstDirect(step,'title');
  const paras=directChildren(step,'para');
  const prefix=path.join('.');
  if(titleEl) lines.push(`${prefix} ${text(titleEl)}`.trim());
  paras.forEach((para,idx)=>{
   const tmp=document.createElement('div');tmp.innerHTML=inlineParaHtml(para,root);
   const paraPrefix=titleEl?'   ':((idx===0)?`${prefix} `:'   ');
   lines.push(`${paraPrefix}${tmp.textContent}`.trimEnd());
   const lists=[...para.getElementsByTagName('*')].filter(e=>['randomList','sequentialList'].includes(e.localName)&&nearestAncestor(e,'para')===para);
   for(const list of lists)for(const li of directChildren(list,'listItem')){const lp=firstDirect(li,'para')||q(li,'para');lines.push(`   - ${text(lp)}`)}
  });
  directChildren(step,'proceduralStep').forEach((c,i)=>walk(c,[...path,i+1]));
 };
 directChildren(main,'proceduralStep').forEach((st,i)=>walk(st,[i+1]));
 return lines.join('\n');
}

/* v1.0 semantic S1000D content renderers ---------------------------------- */
function directTextHtml(el,root){
 if(!el)return '';
 let out='';
 const block=new Set(['levelledPara','brLevelledPara','sbTopic','randomList','sequentialList','table','figure','proceduralStep','warning','caution','note']);
 const walk=node=>{
  if(node.nodeType===Node.TEXT_NODE){out+=node.nodeValue||'';return}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  const n=node.localName;
  if(block.has(n))return;
  if(n==='internalRef'){
   const label=resolvedInternalRef(node,root),id=node.getAttribute('internalRefId')||'';
   out+=`<span class="internal-ref" title="Internal reference ${esc(id)}">${esc(label)}</span>`;return;
  }
  if(n==='dmRef'){
   const dc=q(node,'dmCode'),code=dc?reconstructDmCode(dc):text(node);
   out+=`<span class="internal-ref">${esc(code)}</span>`;return;
  }
  if(n==='externalPubRef'){
   const label=text(q(node,'externalPubTitle'))||text(node)||'External publication';
   out+=`<span class="internal-ref">${esc(label)}</span>`;return;
  }
  if(n==='emphasis'){out+='<em>';[...node.childNodes].forEach(walk);out+='</em>';return}
  if(n==='superScript'){out+='<sup>';[...node.childNodes].forEach(walk);out+='</sup>';return}
  if(n==='subScript'){out+='<sub>';[...node.childNodes].forEach(walk);out+='</sub>';return}
  [...node.childNodes].forEach(walk);
 };
 [...el.childNodes].forEach(walk);
 return out.replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();
}
function renderXmlList(list,root){
 const tag=list.localName==='sequentialList'?'ol':'ul';
 const items=directChildren(list,'listItem').map(li=>{
  const chunks=[];
  for(const c of [...li.children]){
   if(['para','simplePara','reducedPara','paraBasic'].includes(c.localName))chunks.push(directTextHtml(c,root));
   else if(['randomList','sequentialList'].includes(c.localName))chunks.push(renderXmlList(c,root));
   else chunks.push(renderSemanticNode(c,root,1));
  }
  return `<li>${chunks.filter(Boolean).join('')}</li>`;
 }).join('');
 return items?`<${tag} class="semantic-list">${items}</${tag}>`:'';
}
function renderXmlTable(table,root){
 const title=firstDirect(table,'title');
 const rows=qAll(table,'row').map(row=>directChildren(row,'entry').map(e=>directTextHtml(e,root)||esc(text(e))));
 if(!rows.length)return '';
 const head=rows[0],body=rows.slice(1);
 return `<div class="semantic-table-wrap">${title?`<h4>${directTextHtml(title,root)}</h4>`:''}<table class="semantic-table"><thead><tr>${head.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderFigure(fig,root){
 const title=directTextHtml(firstDirect(fig,'title'),root)||'Illustration';
 const refs=qAll(fig,'graphic').map(g=>g.getAttribute('infoEntityIdent')||g.getAttribute('boardno')||'').filter(Boolean);
 return `<div class="semantic-figure"><b>${title}</b>${refs.length?`<span>${refs.map(esc).join(', ')}</span>`:''}</div>`;
}
function renderLevelled(el,root,depth=1){
 const title=firstDirect(el,'title');
 const heading=title?directTextHtml(title,root):'';
 const kids=[...el.children].filter(c=>c!==title);
 return `<section class="semantic-section level-${Math.min(depth,4)}">${heading?`<h${Math.min(depth+2,6)}>${heading}</h${Math.min(depth+2,6)}>`:''}${kids.map(c=>renderSemanticNode(c,root,depth+1)).join('')}</section>`;
}
function renderSemanticNode(el,root,depth=1){
 if(!el)return '';
 const n=el.localName;
 if(['refs','referencedApplicGroup','referencedApplicGroupRef'].includes(n))return '';
 if(['levelledPara','brLevelledPara'].includes(n))return renderLevelled(el,root,depth);
 if(n==='sbTopic')return renderLevelled(el,root,depth);
 if(n==='title')return `<h${Math.min(depth+2,6)}>${directTextHtml(el,root)}</h${Math.min(depth+2,6)}>`;
 if(['para','simplePara','reducedPara','paraBasic','brPara'].includes(n)){
  const txt=directTextHtml(el,root),lists=[...el.children].filter(c=>['randomList','sequentialList'].includes(c.localName));
  return `${txt?`<p>${txt}</p>`:''}${lists.map(l=>renderXmlList(l,root)).join('')}`;
 }
 if(['randomList','sequentialList'].includes(n))return renderXmlList(el,root);
 if(n==='table')return renderXmlTable(el,root);
 if(n==='figure')return renderFigure(el,root);
 if(['warning','caution','note'].includes(n)){
  const txt=[...el.children].map(c=>renderSemanticNode(c,root,depth+1)).join('')||esc(text(el));
  return `<div class="semantic-alert ${n}"><b>${n[0].toUpperCase()+n.slice(1)}</b>${txt}</div>`;
 }
 if(n==='proceduralStep'){
  const p=firstDirect(el,'para'),txt=directTextHtml(p,root);
  return `<div class="semantic-step">${txt?`<p>${txt}</p>`:''}${[...el.children].filter(c=>c!==p).map(c=>renderSemanticNode(c,root,depth+1)).join('')}</div>`;
 }
 // For structural wrappers, recurse over direct children only. This prevents duplicate parent/child text.
 const children=[...el.children];
 if(children.length)return children.map(c=>renderSemanticNode(c,root,depth)).join('');
 return '';
}
function renderDescriptiveContent(root){
 const desc=q(root,'description')||q(root,'descrCrew');if(!desc)return '';
 return `<div class="structured-content"><div class="source-note"><b>Structured descriptive content.</b> Titles, paragraphs, lists, tables, figures and internal references are rendered from the XML hierarchy.</div>${[...desc.children].map(c=>renderSemanticNode(c,root,1)).join('')}</div>`;
}
function renderChecklistContent(root){
 const list=q(root,'checkList');if(!list)return '';
 const pre=q(list,'preliminaryRqmts');
 const steps=qAll(list,'checkListStep');
 return `<div class="structured-content"><div class="source-note"><b>Structured checklist.</b> Conditions, actions and remedies are kept as separate checklist elements.</div>${pre?renderProcedureRequirements(root):''}<div class="checklist-items">${steps.map((st,i)=>{
  const cond=text(q(st,'condition'))||text(q(st,'malfunction'))||'';
  const paras=directChildren(st,'para').map(p=>directTextHtml(p,root));
  const actions=qAll(st,'actionGroup').flatMap(a=>qAll(a,'para').map(p=>directTextHtml(p,root)));
  const remedies=qAll(st,'remedyAction').flatMap(a=>qAll(a,'para').map(p=>directTextHtml(p,root)));
  return `<article class="check-item"><span>${i+1}</span><div>${cond?`<h4>${esc(cond)}</h4>`:''}${paras.map(p=>`<p>${p}</p>`).join('')}${actions.length?`<b>Action</b>${actions.map(p=>`<p>${p}</p>`).join('')}`:''}${remedies.length?`<b>Remedy</b>${remedies.map(p=>`<p>${p}</p>`).join('')}`:''}</div></article>`;
 }).join('')}</div></div>`;
}
function renderFaultContent(root){
 const fr=q(root,'faultReporting');if(!fr)return '';
 const faults=[...fr.children].filter(e=>['detectedFault','isolatedFault'].includes(e.localName));
 return `<div class="structured-content"><div class="source-note"><b>Structured fault data.</b> Fault description, detection/isolation and repair information are grouped by fault.</div>${faults.map((f,i)=>{
  const descr=text(q(f,'faultDescr'))||text(q(f,'descr'))||`Fault ${i+1}`;
  return `<article class="semantic-card"><h3>${esc(descr)}</h3>${[...f.children].filter(c=>!['faultDescr'].includes(c.localName)).map(c=>renderSemanticNode(c,root,1)).join('')}</article>`;
 }).join('')}</div>`;
}
function renderLearningContent(root){
 const learning=q(root,'learning');if(!learning)return '';
 return `<div class="structured-content"><div class="source-note"><b>Structured learning content.</b> Learning sections, questions and response items are kept distinct.</div>${[...learning.children].map(c=>{
   const title=directTextHtml(firstDirect(c,'title'),root)||c.localName.replace(/^lc/,'');
   const qs=qAll(c,'lcQuestion').map(qn=>`<p class="learning-question"><b>Question:</b> ${esc(text(qn))}</p>`).join('');
   const pairs=qAll(c,'lcMatchingPair').map(p=>`<li>${esc(text(p))}</li>`).join('');
   const semantic=renderSemanticNode(c,root,1);
   return `<section class="semantic-card"><h3>${esc(title)}</h3>${qs}${pairs?`<ul class="semantic-list">${pairs}</ul>`:''}${semantic}</section>`;
 }).join('')}</div>`;
}
function renderBrexContent(root){
 const bx=q(root,'brex');if(!bx)return '';
 const common=q(bx,'commonInfo');const rules=qAll(bx,'structureObjectRule');const non=qAll(bx,'nonContextRule');
 return `<div class="structured-content"><div class="source-note"><b>BREX content overview.</b> Rules are summarized here; use the BREX checks tab for the supported validation demo.</div>${common?renderSemanticNode(common,root,1):''}<div class="semantic-summary"><strong>${rules.length}</strong><span>structure object rules</span><strong>${non.length}</strong><span>non-context rules</span></div><div class="rule-preview">${rules.slice(0,30).map(r=>`<article><code>${esc(text(q(r,'objectPath')))}</code><p>${esc(text(q(r,'objectUse')))}</p></article>`).join('')}</div>${rules.length>30?`<p class="muted">Showing 30 of ${rules.length} rules.</p>`:''}</div>`;
}
function renderCrossRefContent(root,schema){
 const labels={appliccrossreftable:'Applicability cross-reference table',condcrossreftable:'Condition cross-reference table',prdcrossreftable:'Product cross-reference table'};
 const main=q(root,schema==='appliccrossreftable'?'applicCrossRefTable':schema==='condcrossreftable'?'condCrossRefTable':'productCrossRefTable');if(!main)return '';
 const rows=[];
 if(schema==='appliccrossreftable')qAll(main,'productAttribute').forEach(a=>rows.push([a.getAttribute('id')||a.getAttribute('applicPropertyIdent')||'Attribute',text(q(a,'name')),text(q(a,'descr')),qAll(a,'enumeration').map(text).filter(Boolean).join(', ')]));
 if(schema==='condcrossreftable')qAll(main,'cond').forEach(a=>rows.push([a.getAttribute('id')||a.getAttribute('condIdent')||'Condition',text(q(a,'name')),text(q(a,'descr')),qAll(a,'enumeration').map(text).filter(Boolean).join(', ')]));
 if(schema==='prdcrossreftable')qAll(main,'product').forEach((a,i)=>rows.push([a.getAttribute('id')||`Product ${i+1}`,'',qAll(a,'assign').map(x=>`${x.getAttribute('applicPropertyIdent')||x.getAttribute('applicPropertyType')||'property'}=${x.getAttribute('applicPropertyValue')||text(x)}`).join('; '),'']));
 return `<div class="structured-content"><div class="source-note"><b>${labels[schema]}.</b> Entries are shown as managed applicability data rather than flattened XML text.</div><table class="semantic-table"><thead><tr><th>ID</th><th>Name</th><th>Description / assignments</th><th>Values</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderRepositoryContent(root){
 const cr=q(root,'commonRepository');if(!cr)return '';
 const repo=[...cr.children][0];if(!repo)return '';
 const entries=[...repo.children];
 return `<div class="structured-content"><div class="source-note"><b>Common repository.</b> ${esc(repo.localName)} entries are shown as reusable CSDB records.</div><div class="repo-grid">${entries.slice(0,100).map((e,i)=>{
  const name=text(q(e,'name'))||text(q(e,'descrForPart'))||text(q(e,'descr'))||text(q(e,'zoneName'))||e.getAttribute('id')||`${e.localName} ${i+1}`;
  const pn=text(q(e,'partNumber')),mfc=text(q(e,'manufacturerCode'));
  return `<article class="semantic-card"><h4>${esc(name)}</h4><code>${esc(e.getAttribute('id')||e.localName)}</code>${pn?`<p>Part number: ${esc(pn)}</p>`:''}${mfc?`<p>Manufacturer: ${esc(mfc)}</p>`:''}</article>`;
 }).join('')}</div>${entries.length>100?`<p class="muted">Showing 100 of ${entries.length} repository entries.</p>`:''}</div>`;
}
function renderIpdContent(root){
 const ipd=q(root,'illustratedPartsCatalog');if(!ipd)return '';
 const fig=firstDirect(ipd,'figure');const seq=directChildren(ipd,'catalogSeqNumber');
 return `<div class="structured-content"><div class="source-note"><b>Illustrated parts data.</b> Catalog sequence numbers and item records are grouped rather than flattened.</div>${fig?renderFigure(fig,root):''}<table class="semantic-table"><thead><tr><th>CSN</th><th>Item</th><th>Part</th><th>Qty</th><th>Description</th></tr></thead><tbody>${seq.flatMap((csn,ci)=>directChildren(csn,'itemSeqNumber').map((it,ii)=>{
  const pref=q(it,'partRef');const part=pref?.getAttribute('partNumberValue')||text(q(it,'partNumber'))||'';
  return `<tr><td>${esc(csn.getAttribute('catalogSeqNumberValue')||csn.getAttribute('catalogSeqNumber')||String(ci+1))}</td><td>${esc(it.getAttribute('itemSeqNumberValue')||String(ii+1))}</td><td>${esc(part)}</td><td>${esc(text(q(it,'quantityPerNextHigherAssy')))}</td><td>${esc(text(q(it,'descrForLocation'))||text(q(it,'reasonForSelection')))}</td></tr>`;
 })).join('')}</tbody></table></div>`;
}
function renderFrontMatterContent(root){
 const fm=q(root,'frontMatter');if(!fm)return '';
 const list=q(fm,'frontMatterList');
 if(list){const entries=qAll(list,'frontMatterDmEntry');return `<div class="structured-content"><div class="source-note"><b>Front matter list.</b> Publication entries are kept as discrete referenced objects.</div>${renderSemanticNode(list,root,1)}${entries.length?`<div class="refs">${entries.slice(0,100).map(e=>{const r=q(e,'dmRef'),dc=r&&q(r,'dmCode');const code=dc?reconstructDmCode(dc):text(e);return `<button>${esc(code)}</button>`}).join('')}</div>`:''}</div>`}
 return `<div class="structured-content"><div class="source-note"><b>Front matter.</b> Title-page and publication metadata are presented from the XML structure.</div>${renderSemanticNode(fm,root,1)}</div>`;
}
function renderScheduleContent(root){
 const mp=q(root,'maintPlanning');if(!mp)return '';
 const tasks=qAll(mp,'taskDefinition');
 if(tasks.length)return `<div class="structured-content"><div class="source-note"><b>Maintenance planning.</b> Task definitions are shown as separate planning records.</div><div class="repo-grid">${tasks.map((t,i)=>{const task=q(t,'task');const title=text(q(task,'taskName'))||text(q(task,'name'))||text(q(t,'title'))||`Task ${i+1}`;const interval=text(q(t,'limit'))||text(q(t,'threshold'));return `<article class="semantic-card"><h4>${esc(title)}</h4>${interval?`<p>${esc(interval)}</p>`:''}${renderProcedureRequirements(t)}</article>`}).join('')}</div></div>`;
 return `<div class="structured-content"><div class="source-note"><b>Maintenance planning.</b> Allocations, tools and remarks are shown by section.</div>${renderSemanticNode(mp,root,1)}</div>`;
}
function renderWiringFieldsContent(root){
 const wf=q(root,'wiringFields');if(!wf)return '';
 return `<div class="structured-content"><div class="source-note"><b>Wiring field definitions.</b> Field names and descriptions are paired instead of emitted as a text stream.</div>${[...wf.children].map(group=>`<section class="semantic-section"><h3>${esc(group.localName.replace(/^descr/,'').replace(/([A-Z])/g,' $1').trim())}</h3><dl class="field-list">${[...group.children].map(f=>`<div><dt>${esc(text(q(f,'fieldName'))||f.localName)}</dt><dd>${esc(text(q(f,'descr'))||text(f))}</dd></div>`).join('')}</dl></section>`).join('')}</div>`;
}
function renderWiringDataContent(root){
 const wd=q(root,'wiringData');if(!wd)return '';
 const main=[...wd.children][0];if(!main)return '';
 const entries=[...main.children];
 return `<div class="structured-content"><div class="source-note"><b>Wiring data.</b> ${esc(main.localName)} records are grouped as structured technical data.</div><div class="repo-grid">${entries.slice(0,100).map((e,i)=>{const fi=q(e,'functionalItemRef');const id=fi?.getAttribute('functionalItemNumber')||e.getAttribute('id')||`${e.localName} ${i+1}`;const part=text(q(e,'partNumber')),loc=text(q(e,'installationLocation'));return `<article class="semantic-card"><h4>${esc(id)}</h4>${part?`<p>Part: ${esc(part)}</p>`:''}${loc?`<p>Location: ${esc(loc)}</p>`:''}</article>`}).join('')}</div></div>`;
}
function renderProcessContent(root){
 const pr=q(root,'process');if(!pr)return '';
 const nodes=qAll(pr,'dmNode');
 return `<div class="structured-content"><div class="source-note"><b>Process data.</b> Decision/process nodes and prompts are represented as a flow-oriented list.</div><div class="process-flow">${nodes.map((n,i)=>{const title=directTextHtml(q(n,'title'),root)||`Node ${i+1}`;const prompts=qAll(n,'prompt').map(p=>text(p)).filter(Boolean);return `<article><span>${i+1}</span><div><h4>${esc(title)}</h4>${prompts.map(p=>`<p>${esc(p)}</p>`).join('')}${renderSemanticNode(n,root,1)}</div></article>`}).join('')}</div></div>`;
}
function renderServiceBulletinContent(root){const sb=q(root,'sb');if(!sb)return '';return `<div class="structured-content"><div class="source-note"><b>Service bulletin.</b> Bulletin topics and sections are preserved from the source hierarchy.</div>${[...sb.children].map(c=>`<section class="semantic-section"><h3>${esc(c.localName.replace(/^sb/,'').replace(/([A-Z])/g,' $1').trim())}</h3>${renderSemanticNode(c,root,1)}</section>`).join('')}</div>`}
function renderBusinessRulesContent(root){
 const doc=q(root,'brDoc');if(!doc)return '';
 const paras=directChildren(doc,'brLevelledPara');
 return `<div class="structured-content"><div class="source-note"><b>Business rules document.</b> Hierarchical rule sections are rendered from brLevelledPara structures. Large rule sets are intentionally compact.</div>${paras.map(p=>renderLevelled(p,root,1)).join('')}</div>`;
}
function semanticContentHtml(x){
 if(x.kind!=='DM'||!x.raw)return '';
 const doc=parseRaw(x.raw);if(!doc)return '';const root=doc.documentElement;
 if(x.schema==='proced')return structuredProcedureHtml(x);
 if(['descript','crew'].includes(x.schema))return renderDescriptiveContent(root)||(()=>{const c=q(root,'crew');return c?`<div class="structured-content">${renderSemanticNode(c,root,1)}</div>`:''})();
 if(x.schema==='checklist')return renderChecklistContent(root);
 if(x.schema==='fault')return renderFaultContent(root);
 if(x.schema==='learning')return renderLearningContent(root);
 if(x.schema==='brex')return renderBrexContent(root);
 if(['appliccrossreftable','condcrossreftable','prdcrossreftable'].includes(x.schema))return renderCrossRefContent(root,x.schema);
 if(x.schema==='comrep')return renderRepositoryContent(root);
 if(x.schema==='ipd')return renderIpdContent(root);
 if(x.schema==='frontmatter')return renderFrontMatterContent(root);
 if(x.schema==='schedul')return renderScheduleContent(root);
 if(x.schema==='wrngflds')return renderWiringFieldsContent(root);
 if(x.schema==='wrngdata')return renderWiringDataContent(root);
 if(x.schema==='process')return renderProcessContent(root);
 if(x.schema==='sb')return renderServiceBulletinContent(root);
 if(x.schema==='brdoc')return renderBusinessRulesContent(root);
 const content=q(root,'content');return content?`<div class="structured-content"><div class="source-note"><b>Structured XML content.</b> Direct XML hierarchy is rendered without parent/child text duplication.</div>${[...content.children].map(c=>renderSemanticNode(c,root,1)).join('')}</div>`:'';
}
function semanticPlainText(x){
 const html=semanticContentHtml(x);if(!html)return '';
 const tmp=document.createElement('div');tmp.innerHTML=html;tmp.querySelectorAll('.source-note').forEach(n=>n.remove());
 return tmp.innerText.replace(/\n{3,}/g,'\n\n').trim();
}

function brexRuleSet(){const bx=state.items.find(y=>y.schema==='brex'&&y.code.includes('S1000DBIKE'));if(!bx)return [];const doc=parseRaw(bx.raw);if(!doc)return [];return qAll(doc.documentElement,'structureObjectRule').map(r=>{const path=text(q(r,'objectPath')),use=text(q(r,'objectUse')),br=q(r,'brDecisionRef')?.getAttribute('brDecisionIdentNumber')||'BREX';const vals=qAll(r,'objectValue').map(v=>({form:v.getAttribute('valueForm')||'single',allowed:v.getAttribute('valueAllowed')||'',label:text(v)}));return {path,use,br,vals}})}
function valueInRange(value,expr){const [a,b]=expr.split('~');if(!a||!b)return false;if(/^\d+$/.test(a)&&/^\d+$/.test(value))return +value>=+a&&+value<=+b;return value>=a&&value<=b}
function brexChecks(x){if(x.kind!=='DM'||!x.raw)return [];const doc=parseRaw(x.raw);if(!doc)return [];const dm=q(doc.documentElement,'dmCode'),sec=q(doc.documentElement,'security');if(!dm)return [];const wanted={"//dmAddress/dmIdent/dmCode/@modelIdentCode":dm.getAttribute('modelIdentCode')||'',"//dmAddress/dmIdent/dmCode/@systemCode":dm.getAttribute('systemCode')||'',"//dmAddress/dmIdent/dmCode/@infoCode":dm.getAttribute('infoCode')||'',"//security/@securityClassification":sec?.getAttribute('securityClassification')||''};return brexRuleSet().filter(r=>Object.prototype.hasOwnProperty.call(wanted,r.path)).map(r=>{const actual=wanted[r.path];const pass=r.vals.some(v=>v.form==='range'?valueInRange(actual,v.allowed):actual===v.allowed);return {...r,actual,pass}})}
function renderMedia(x,b){if(!x.icns?.length){b.innerHTML='<div class="empty">No ICN references found in this object.</div>';return}b.innerHTML=`<div class="source-note">Illustrations are resolved from ICN references in the Bike XML. Browser-viewable JPG, PNG, GIF and SVG assets are previewed when included; some Bike illustrations are CGM and are listed without preview.</div><div class="media-grid">${x.icns.map(ref=>{const f=assetFor(ref);return `<article class="media-card"><div class="media-preview">${f?`<img src="assets/${encodeURI(f)}" alt="${esc(ref)}">`:'<div class="media-missing">Preview unavailable<br><small>likely CGM / source asset not bundled</small></div>'}</div><div class="media-meta"><b>${esc(ref)}</b>${f?`<span>${esc(f)}</span>`:'<span>Referenced ICN</span>'}</div></article>`}).join('')}</div>`}
function renderBrex(x,b){if(x.kind!=='DM'){b.innerHTML='<div class="empty">BREX checks are shown for Data Modules.</div>';return}const checks=brexChecks(x);if(!checks.length){b.innerHTML='<div class="empty">No supported Bike BREX checks could be evaluated for this object.</div>';return}const passed=checks.filter(c=>c.pass).length;b.innerHTML=`<div class="source-note"><b>BREX-informed validation demo.</b> These checks are read from the actual Bike BREX Data Module in this dataset. This is intentionally a small subset, not a complete BREX engine or S1000D conformance validator.</div><div class="validation-summary"><strong>${passed}/${checks.length}</strong><span>supported rules passed</span></div><div class="rule-list">${checks.map(c=>`<article class="rule ${c.pass?'pass':'fail'}"><div class="rule-result">${c.pass?'PASS':'FAIL'}</div><div><b>${esc(c.br)} · ${esc(c.use)}</b><code>${esc(c.path)}</code><p>Actual: <strong>${esc(c.actual||'—')}</strong></p><p>Allowed: ${esc(c.vals.map(v=>v.allowed).join(', '))}</p></div></article>`).join('')}</div>`}
function renderTab(x){const b=document.querySelector('#tabbody'),w=wf(x);if(state.tab==='whereused'){const used=incomingRefs(x);b.innerHTML=`<div class="source-note"><b>Where used</b> shows objects that reference this managed object. This is a core CSDB reuse/impact-analysis concept.</div>${used.length?`<div class="refs">${used.map(src=>`<button data-r="${esc(src.code)}"><b>${esc(src.code)}</b><br><span>${esc(src.title||typeLabel(src))}</span></button>`).join('')}</div>`:'<div class="empty">No incoming DM/PM references found in the parsed Bike dataset.</div>'}`;b.querySelectorAll('[data-r]').forEach(q=>q.onclick=()=>{const y=findByCode(q.dataset.r);if(y)selectItem(y)});return}if(state.tab==='history'){const h=w.issueHistory||[];b.innerHTML=`<div class="source-note"><b>Issue history.</b> The first row is the issue from the source Bike XML. Later rows are simulated releases created by this emulator workflow.</div><div class="issue-history">${h.map(e=>`<div class="issue-row simulated"><strong>${esc(e.issue)}-${esc(e.inWork||'00')}</strong><span>${new Date(e.ts).toLocaleString()}</span><b>Simulated release</b><p>${esc(e.note||'')}</p></div>`).join('')}<div class="issue-row source"><strong>${esc(x.issueNumber||'—')}-${esc(x.inWork||'—')}</strong><span>${esc(x.issueDate||'Source dataset')}</span><b>Source Bike XML</b><p>${esc(x.issueType||'Original managed object issue')}</p></div></div>`;return}if(state.tab==='media'){renderMedia(x,b);return}if(state.tab==='brex'){renderBrex(x,b);return}if(state.tab==='xml'){b.innerHTML=`<div class="source-note">Source XML from the imported Bike sample. Workflow edits are intentionally stored separately in localStorage and do not modify the source XML.</div><pre class="xml">${esc(x.raw||'Raw XML unavailable for imported object')}</pre>`;return}if(state.tab==='workflow'){if(x.kind!=='DM'){b.innerHTML='<div class="empty">Workflow simulation is enabled for Data Modules.</div>';return}b.innerHTML=`<div class="wf-card"><h3>Lifecycle simulation</h3><div class="flow"><span class="${w.status==='Issued'?'here':''}">Issued</span><i>→</i><span class="${w.status==='In Work'?'here':''}">In Work</span><i>→</i><span class="${w.status==='In Review'?'here':''}">In Review</span><i>→</i><span class="${w.status==='Awaiting Approval'?'here':''}">Awaiting Approval</span><i>→</i><span>Issued</span></div>${w.draftNote?`<p><b>Change note:</b> ${esc(w.draftNote)}</p>`:''}<h3>Audit trail</h3>${w.history.length?`<div class="audit">${w.history.map(h=>`<div><time>${new Date(h.ts).toLocaleString()}</time><b>${esc(h.action)}</b><span>${esc(h.role)}${h.detail?' · '+esc(h.detail):''}</span></div>`).join('')}</div>`:'<p class="muted">No simulated workflow activity yet. Switch to Author and check out the module to begin.</p>'}</div>`;return}if(state.tab==='refs'){if(!x.refs.length){b.innerHTML='<div class="empty">No dmRef references found.</div>';return}b.innerHTML='<div class="refs">'+x.refs.map(r=>`<button data-r="${esc(r)}">${esc(r)}${findByCode(r)?' ↗':''}</button>`).join('')+'</div>';b.querySelectorAll('button').forEach(q=>q.onclick=()=>{const y=findByCode(q.dataset.r);if(y)selectItem(y)});return}if(state.tab==='pm'){if(x.kind!=='PM'){b.innerHTML=`<div class="pm-tree"><b>Outgoing references</b>${x.refs.length?'<ul>'+x.refs.map(r=>`<li><button data-r="${esc(r)}">${esc(r)}</button></li>`).join('')+'</ul>':'<p>No referenced data modules.</p>'}</div>`;b.querySelectorAll('button').forEach(q=>q.onclick=()=>{const y=findByCode(q.dataset.r);if(y)selectItem(y)});return}b.innerHTML=`<div class="pm-tree"><b>Publication module references</b><ul>${x.refs.map(r=>`<li><button data-r="${esc(r)}">${esc(r)}</button></li>`).join('')}</ul></div>`;b.querySelectorAll('button').forEach(q=>q.onclick=()=>{const y=findByCode(q.dataset.r);if(y)selectItem(y)});return}const ps=(x.paras||[]).slice(0,35);const changed=w.draftTitle&&w.draftTitle!==x.title||w.draftContent||w.draftHtml;const banner=changed?`<div class="draft-banner"><b>Working copy from authoring editor</b> These simulated edits are stored locally. The source Bike XML remains unchanged.</div>`:'';const structured=!w.draftContent&&!w.draftHtml?semanticContentHtml(x):'';const body=w.draftHtml?`<div class="structured-content draft-structured">${w.draftHtml}</div>`:(w.draftContent?w.draftContent.split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join(''):(structured||(ps.length?ps.map(p=>`<p>${esc(p)}</p>`).join(''):`<p>${esc(x.contentText||'No content preview available for this object.')}</p>`)));b.innerHTML=banner+body}
function findByCode(c){return state.items.find(x=>x.code===c)||state.items.find(x=>x.code.startsWith(c)||c.startsWith(x.code))}
function reconstructDmCode(el){const a=n=>el.getAttribute(n)||'';return 'DMC-'+[a('modelIdentCode'),a('systemDiffCode'),a('systemCode'),a('subSystemCode')+a('subSubSystemCode'),a('assyCode'),a('disassyCode')+a('disassyCodeVariant'),a('infoCode')+a('infoCodeVariant'),a('itemLocationCode')].join('-')}
function q(root,name){return [...root.getElementsByTagName('*')].find(e=>e.localName===name)}function qAll(root,name){return [...root.getElementsByTagName('*')].filter(e=>e.localName===name)}function text(e){return e?[...e.childNodes].map(n=>n.textContent).join(' ').replace(/\s+/g,' ').trim():''}
async function importFiles(e){const files=[...e.target.files].filter(f=>/\.xml$/i.test(f.name));if(!files.length)return;const imported=[];for(const f of files){const raw=await f.text();const doc=new DOMParser().parseFromString(raw,'application/xml');if(doc.querySelector('parsererror'))continue;const root=doc.documentElement;const rt=root.localName;const schemaLoc=root.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance','noNamespaceSchemaLocation')||root.getAttribute('xsi:noNamespaceSchemaLocation')||'';const importedSchema=(schemaLoc.split('/').pop()||'').replace(/\.xsd$/i,'');let kind=rt==='dmodule'?'DM':rt==='pm'?'PM':rt==='dml'?'DML':rt==='ddn'?'DDN':'XML';let code=f.name.split('_')[0];if(kind==='DM'){const dc=q(root,'dmCode');if(dc)code=reconstructDmCode(dc)}const ti=q(root,'dmTitle'),tech=q(ti||root,'techName'),info=q(ti||root,'infoName');const title=[text(tech),text(info)].filter(Boolean).join(' — ')||text(q(root,'pmTitle'))||kind;const ii=q(root,'issueInfo'),lang=q(root,'language'),date=q(root,'issueDate'),stat=q(root,'dmStatus')||q(root,'pmStatus'),sec=q(root,'security');const refs=qAll(root,'dmRef').map(r=>{const dc=q(r,'dmCode');return dc?reconstructDmCode(dc):''}).filter(Boolean);const paras=qAll(root,'para').slice(0,80).map(text).filter(Boolean);imported.push({filename:f.name,kind,code,title,techName:text(tech),infoName:text(info),issueNumber:ii?.getAttribute('issueNumber')||'',inWork:ii?.getAttribute('inWork')||'',language:lang?`${lang.getAttribute('languageIsoCode')||''}-${lang.getAttribute('countryIsoCode')||''}`:'',issueDate:date?[date.getAttribute('year'),date.getAttribute('month'),date.getAttribute('day')].join('-'):'',issueType:stat?.getAttribute('issueType')||'',security:sec?.getAttribute('securityClassification')||'',schema:importedSchema,refs:[...new Set(refs)],icns:[],contentText:'',paras,raw});}state.items=imported;state.system='All';state.kind='All';state.query='';state.selected=null;state.selectedIcn=null;state.library='objects';renderTree();apply();if(imported[0])selectItem(imported[0]);alert(`Imported ${imported.length} XML objects locally.`)}
render();

/* v1.5 default landing */
if(!state.selected) state.selected=pickDefaultDM();
