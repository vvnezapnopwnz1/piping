const NAV = {
  projects: { label: 'Projects', parent: null },
  overview: { label: 'Overview', parent: null },
  fabrication: { label: 'Spools', parent: 'overview' },
  material: { label: 'Material', parent: 'overview' },
  nde: { label: 'Quality', parent: 'overview' },
  rft: { label: 'RFT', parent: 'overview' },
  testpack: { label: 'Test Packs', parent: 'overview' }
};

const DB = {
  projects: [
    { id: 'P-104', title: 'North process unit', owner: 'Industrial Works', contractor: 'Meridian', contract: 'NPU-04' },
    { id: 'P-207', title: 'Cooling water loop', owner: 'Global Chem', contractor: 'Other', contract: 'CWL-01' }
  ],
  P104: {
    stats: { total: 85, recorded: 63, issued: 19, rft: 1 },
    spools: [
      { id: 'SP-1001-A', iso: 'ISO-1001', rev: 'R0', location: 'Shop', stage: 'NDE',
        material: [
          { code: 'P-1', desc: 'Pipe 8"', qty: 1, trace: 'HT-4591' },
          { code: 'F-2', desc: 'Flange 8"', qty: 2, trace: 'HT-992' },
          { code: 'E-1', desc: 'Elbow 8"', qty: 1, trace: '' },
        ],
        nde: { weld: 'W-04', method: 'RT', status: 'Issued', batch: 'RT-006' },
        rft: { weldedBolted: true, supported: true, pwhtPending: 0, ndePending: 1 },
        fabrication: [
          { type: 'Fit-up', date: '2026-10-01', inspector: 'John D.', status: 'Accepted' },
          { type: 'Welding', date: '2026-10-02', inspector: 'Mike R.', status: 'Accepted' }
        ]
      },
      { id: 'SP-1002-B', iso: 'ISO-1001', rev: 'R0', location: 'Laydown', stage: 'Laydown', material: [], nde: null, rft: {}, fabrication: [] },
      { id: 'SP-1003-C', iso: 'ISO-1001', rev: 'R0', location: 'Laydown', stage: 'Laydown', material: [], nde: null, rft: {}, fabrication: [] },
      { id: 'SP-1004-D', iso: 'ISO-1002', rev: 'R1', location: 'Laydown', stage: 'Laydown', material: [], nde: null, rft: {}, fabrication: [] },
      { id: 'SP-1005-E', iso: 'ISO-1002', rev: 'R1', location: 'Laydown', stage: 'Laydown', material: [], nde: null, rft: {}, fabrication: [] },
      { id: 'SP-1006-F', iso: 'ISO-1003', rev: 'R0', location: 'Site', stage: 'RFT', material: [], nde: null, rft: {}, fabrication: [] },
    ],
    testPacks: [
      { id: 'TP-014', isos: ['ISO-1001'], state: 'Awaiting RFT', blindingDone: false }
    ]
  },
  P207: { stats: {total:0, recorded:0, issued:0, rft:0}, spools: [], testPacks: [] }
};

const state = {
  project: 'P-104',
  view: 'overview',
  spoolId: 'SP-1001-A',
  tpId: 'TP-014',
  searchQuery: '',
  tpSearchQuery: '',
  helpVisible: false,
  role: 'QC Engineer'
};

const UI = {
  root: document.getElementById('app-root'),
  projectCode: document.getElementById('current-project-code'),
  projectTitle: document.getElementById('current-project-title'),
  navButtons: document.querySelectorAll('.global-nav button'),
  spoolList: document.getElementById('spool-list'),
  opsTabs: document.querySelectorAll('.ops-tabs button'),
  spoolSearch: document.getElementById('spool-search'),
  clearSearchBtn: document.getElementById('clear-search'),
  tpSearch: document.getElementById('tp-search'),
  clearTpSearchBtn: document.getElementById('clear-tp-search'),
  coachMark: document.getElementById('coach-mark'),
  roleSelector: document.getElementById('role-selector')
};

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}

function updateURL() {
  const stateString = encodeURIComponent(JSON.stringify(state));
  const hash = `#${state.view}?s=${stateString}`;
  if (window.location.hash !== hash) {
    if (!state.isPopping) window.history.pushState(state, '', hash);
  }
}

function render() {
  UI.root.setAttribute('data-view', state.view);
  UI.projectCode.textContent = state.project;
  
  const currentProj = DB.projects.find(p => p.id === state.project);
  UI.projectTitle.textContent = currentProj ? currentProj.title : '';
  
  let activeNav = state.view;
  if (['fabrication', 'material', 'nde', 'rft'].includes(state.view)) activeNav = 'fabrication';
  if (state.view === 'nde') activeNav = 'nde';
  
  UI.navButtons.forEach(btn => {
    btn.setAttribute('data-active', btn.getAttribute('data-action') === activeNav ? 'true' : 'false');
  });

  if (state.view === 'projects') renderProjects();
  if (state.view === 'overview') renderOverview();
  
  if (['fabrication', 'material', 'nde', 'rft'].includes(state.view)) renderWorkbench();
  if (state.view === 'testpack') renderTestpack();
  
  renderHelp();
  updateURL();
}

function renderProjects() {
  const container = document.getElementById('view-projects');
  container.innerHTML = `
    <div class="overview-container">
      <div class="overview-identity" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h2>All Projects</h2>
          <div class="meta-details">Select a project to work on.</div>
        </div>
        <button class="btn btn-primary" data-action="return-project">Return to ${state.project}</button>
      </div>
      <div class="card-grid">
        ${DB.projects.map(p => `
          <div class="card" tabindex="0" role="button" aria-label="Project ${p.id}">
            <h3>${p.id}</h3>
            <p>${p.title}</p>
            <p style="font-size:12px; margin-top:4px; color:var(--muted);">${p.owner} | ${p.contract}</p>
            <div class="card-footer">
               ${p.id === state.project ? '<span style="color:var(--sage); font-weight:bold;">Current Project</span>' : '<span></span>'}
               <button class="btn btn-primary" style="padding:4px 12px; font-size:12px;" data-action="open-project" data-project="${p.id}">Open Project</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderOverview() {
  const container = document.getElementById('view-overview');
  const proj = DB.projects.find(p => p.id === state.project);
  const data = DB[state.project.replace('-', '')];
  
  if (state.project === 'P-207') {
    container.innerHTML = `
      <div class="overview-container">
        <div class="overview-identity">
          <h2>${proj.id} - ${proj.title}</h2>
          <div class="meta-details">
            <div>Owner: <span>${proj.owner}</span></div>
            <div>Contractor: <span>${proj.contractor}</span></div>
            <div>Contract: <span>${proj.contract}</span></div>
          </div>
        </div>
        <div class="empty-state">
           <h3>Empty Project</h3>
           <p>This project has no spools, test packs, or NDE records uploaded yet.</p>
           <button class="btn btn-primary" style="margin-top:16px;" data-action="projects">Switch Project</button>
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="overview-container">
      <div class="overview-identity">
        <h2>${proj.id} - ${proj.title}</h2>
        <div class="meta-details">
          <div>Owner: <span>${proj.owner}</span></div>
          <div>Contractor: <span>${proj.contractor}</span></div>
          <div>Contract: <span>${proj.contract}</span></div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">16</div>
          <div class="stat-label">Total Spools (4 Laydown, 25%)</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${data.stats.rft}</div>
          <div class="stat-label">RFT Achieved</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:var(--sage)">${data.stats.recorded}</div>
          <div class="stat-label">NDE Recorded (of ${data.stats.total})</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:var(--terracotta)">${data.stats.issued}</div>
          <div class="stat-label">NDE Issued (Pending)</div>
        </div>
      </div>
      
      <h3 style="margin: 0 0 16px 0;">Attention Required</h3>
      <div class="attention-grid">
        <div class="attention-card">
          <h4>NDE Obligation W-04 (RT)</h4>
          <p>Issued, awaiting result record.</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span class="monospace" style="font-size:12px; font-weight:bold;">SP-1001-A</span>
             <button class="btn btn-primary" style="font-size:12px; padding: 4px 12px;" data-action="nde" data-spool="SP-1001-A">Open NDE</button>
          </div>
        </div>
        <div class="attention-card">
          <h4>Material Trace Missing</h4>
          <p>1 component missing trace code.</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span class="monospace" style="font-size:12px; font-weight:bold;">SP-1001-A</span>
             <button class="btn" style="font-size:12px; padding: 4px 12px;" data-action="material" data-spool="SP-1001-A">Open Material</button>
          </div>
        </div>
        <div class="attention-card">
          <h4>Test Pack RFT Pending</h4>
          <p>Waiting for underlying spools.</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span class="monospace" style="font-size:12px; font-weight:bold;">TP-014</span>
             <button class="btn" style="font-size:12px; padding: 4px 12px;" data-action="testpack" data-tp="TP-014">View Test Pack</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWorkbenchSidebar() {
  const projectData = DB[state.project.replace('-', '')];
  let spools = projectData.spools;
  
  if (state.searchQuery) {
    spools = spools.filter(s => 
      s.id.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
      s.iso.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    UI.clearSearchBtn.style.display = 'block';
  } else {
    UI.clearSearchBtn.style.display = 'none';
  }
  
  if (spools.length === 0) {
    if (state.searchQuery) { UI.spoolList.innerHTML = `<li class="object-item" style="cursor:default; text-align:center; padding: 22px 12px; color:var(--muted);">No matches found for "${escapeHTML(state.searchQuery)}"</li>`; } else { UI.spoolList.innerHTML = `<li class="object-item" style="cursor:default; text-align:center; padding: 22px 12px; color:var(--muted);">Project has no spools</li>`; }
  } else {
    UI.spoolList.innerHTML = `<li style="font-size:11px; padding:8px; color:var(--muted); text-align:center; background:var(--bg); border-bottom:1px solid var(--line);">6 illustrative rows from 16</li>` + spools.map(s => `
      <li class="object-item" data-id="${s.id}" data-action="select-spool" data-selected="${s.id === state.spoolId}" tabindex="0" role="button" aria-label="Select spool ${s.id}">
        <div class="object-id">${s.id}</div>
        <div class="object-meta">
           ISO: ${s.iso} | Loc: ${s.location}<br>
           Stage: <span style="font-weight:600; color:var(--ink);">${s.stage}</span>
        </div>
      </li>
    `).join('');
  }
}

function renderWorkbench() {
  UI.opsTabs.forEach(btn => {
    btn.setAttribute('data-active', btn.getAttribute('data-action') === state.view ? 'true' : 'false');
  });

  renderWorkbenchSidebar();

  const projectData = DB[state.project.replace('-', '')];
  const spool = projectData.spools.find(s => s.id === state.spoolId);
  const header = document.querySelector('#view-workbench .object-header h2');
  const meta = document.querySelector('#view-workbench .object-header .meta');
  
  if (spool) {
    header.textContent = spool.id;
    meta.textContent = `${spool.iso} · Rev ${spool.rev} · Loc: ${spool.location}`;
    
    if (state.view === 'fabrication') renderFabrication(spool);
    if (state.view === 'material') renderMaterial(spool);
    if (state.view === 'nde') renderNDE(spool);
    if (state.view === 'rft') renderRFT(spool);
    
    renderTimeline(spool);
  } else {
    header.textContent = 'No object selected';
    meta.textContent = 'Please select a spool from the list.';
    document.getElementById('ops-content-container').innerHTML = '';
    document.getElementById('spool-timeline').innerHTML = '';
  }
}

function renderFabrication(spool) {
  const container = document.getElementById('ops-content-container');
  if (!spool.fabrication || spool.fabrication.length === 0) {
    container.innerHTML = `<div style="padding:22px; color:var(--muted);">No fabrication records found for this spool.</div>`;
    return;
  }
  
  container.innerHTML = `
    <h3 style="margin-top:0;">Fabrication Evidence</h3>
    <table>
      <thead><tr><th>Operation</th><th>Date</th><th>Inspector</th><th>Status</th></tr></thead>
      <tbody>
        ${spool.fabrication.map(f => `
          <tr>
            <td>${f.type}</td>
            <td>${f.date}</td>
            <td>${f.inspector}</td>
            <td style="color:var(--sage); font-weight:600;">${f.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderMaterial(spool) {
  const container = document.getElementById('ops-content-container');
  if (!spool.material || spool.material.length === 0) {
    container.innerHTML = `<div style="padding:22px; color:var(--muted);">No material data.</div>`;
    return;
  }
  
  let allFilled = spool.material.every(m => m.trace && m.trace.trim() !== '');
  const isReader = state.role === 'Reader';
  
  container.innerHTML = `
    ${isReader ? `<div class="alert-banner info">Read-only access. You cannot modify material traces.</div>` : ''}
    <div class="alert-banner" style="${allFilled ? 'background:rgba(114,129,87,0.1); border-color:var(--sage); color:var(--charcoal);' : ''}">
      ${allFilled ? 'Material check complete.' : 'Missing trace codes. Material check pending.'}
    </div>
    <table>
      <thead><tr><th>Item Code</th><th>Description</th><th>Qty</th><th>Heat/Trace</th></tr></thead>
      <tbody>
        ${spool.material.map((m, i) => `
          <tr>
            <td class="monospace">${m.code}</td>
            <td>${m.desc}</td>
            <td>${m.qty}</td>
            <td>
              <input type="text" class="form-input trace-input" data-index="${i}" value="${m.trace}" placeholder="Enter trace..." aria-label="Trace code for ${m.code}" ${isReader ? 'disabled' : ''}>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${!isReader ? `
    <div style="margin-top: 16px; display:flex; align-items:center;">
      <button class="btn btn-primary" data-action="simulate-save" data-target="material">Simulate save traces</button>
      <span class="object-meta" style="margin-left:12px; color:var(--terracotta);" id="material-msg"></span>
    </div>
    ` : ''}
  `;
}

function renderNDE(spool) {
  const container = document.getElementById('ops-content-container');
  if (!spool.nde) {
    container.innerHTML = `<div style="padding:22px; color:var(--muted);">No NDE obligations.</div>`;
    return;
  }
  
  if (spool.nde.status === 'Accepted') {
    container.innerHTML = `
      <h3 style="margin-top:0;">Weld ${spool.nde.weld} · ${spool.nde.method} Obligation</h3>
      <div class="alert-banner" style="background:rgba(114,129,87,0.1); border-color:var(--sage); margin-top:16px;">
         Status: <strong>Accepted</strong> (Batch: ${spool.nde.batch})
      </div>
    `;
    return;
  }
  
  const isReader = state.role === 'Reader';
  
  container.innerHTML = `
    <h3 style="margin-top:0;">Weld ${spool.nde.weld} · ${spool.nde.method} Obligation</h3>
    <p style="font-size:14px; color:var(--muted);">Batch: <span class="monospace">${spool.nde.batch}</span> | Status: <span style="font-weight:600; color:var(--terracotta)">${spool.nde.status}</span></p>
    
    ${isReader ? `<div class="alert-banner info">Read-only access. You cannot record NDE results.</div>` : `
    <div style="border:1px solid var(--line); padding: 16px; background:#fff; margin-top:22px; border-radius:4px;">
      <h4 style="margin:0 0 16px 0;">Record Result</h4>
      
      <div style="margin-bottom: 12px; display:flex; gap:16px;">
        <div style="flex:1;">
          <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:bold; color:var(--muted);">Report Number *</label>
          <input type="text" class="form-input" id="nde-report" value="REP-001" aria-label="Report Number">
        </div>
        <div style="flex:1;">
          <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:bold; color:var(--muted);">Examination Date *</label>
          <input type="date" class="form-input" id="nde-date" value="2026-10-06" aria-label="Examination Date">
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:bold; color:var(--muted);">Outcome *</label>
        <select class="form-input" id="nde-outcome" aria-label="Outcome">
          <option value="" disabled selected>Select an outcome...</option>
          <option value="Accepted">Accepted</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      
      <div style="margin-bottom: 16px; display:none;" id="nde-defect-container">
        <label style="display:block; font-size:12px; margin-bottom:4px; font-weight:bold; color:var(--terracotta);">Defect Code (Required for Rejected)</label>
        <input type="text" class="form-input" id="nde-defect" aria-label="Defect Code">
      </div>
      
      <div style="display:flex; align-items:center;">
        <button class="btn btn-primary" data-action="simulate-save" data-target="nde">Simulate save result</button>
        <span class="object-meta" style="margin-left:12px; color:var(--terracotta);" id="nde-msg"></span>
      </div>
    </div>
    `}
  `;
  
  if (!isReader) {
    const outcome = document.getElementById('nde-outcome');
    const defect = document.getElementById('nde-defect-container');
    if (outcome && defect) {
      outcome.addEventListener('change', () => {
        defect.style.display = outcome.value === 'Rejected' ? 'block' : 'none';
      });
    }
  }
}

function renderRFT(spool) {
  const container = document.getElementById('ops-content-container');
  if (!spool.rft || Object.keys(spool.rft).length === 0) {
    container.innerHTML = `<div style="padding:22px; color:var(--muted);">Not applicable for this spool.</div>`;
    return;
  }
  
  let isRFT = spool.rft.weldedBolted && spool.rft.supported && spool.rft.ndePending === 0 && spool.rft.pwhtPending === 0;
  
  container.innerHTML = `
    <div class="alert-banner" style="${isRFT ? 'background:rgba(114, 129, 87, 0.1); border-color:var(--sage); color:var(--charcoal);' : ''}">
      ${isRFT ? 'Spool is Ready for Test' : 'Spool is NOT Ready for Test'}
    </div>
    <ul style="list-style:none; padding:0; line-height:2.5; font-size:14px;">
      <li style="display:flex; align-items:center; gap:8px;">
        <span style="color:var(--sage); font-weight:bold; display:inline-block; width:16px;">✓</span> Welded / Bolted recorded
      </li>
      <li style="display:flex; align-items:center; gap:8px;">
        <span style="color:var(--sage); font-weight:bold; display:inline-block; width:16px;">✓</span> Supported recorded
      </li>
      <li style="display:flex; align-items:center; gap:8px;">
        <span style="color:${spool.rft.pwhtPending === 0 ? 'var(--sage)' : 'var(--terracotta)'}; font-weight:bold; display:inline-block; width:16px;">
          ${spool.rft.pwhtPending === 0 ? '✓' : '✗'}
        </span> 
        PWHT (${spool.rft.pwhtPending} pending)
      </li>
      <li style="display:flex; align-items:center; gap:8px;">
        <span style="color:${spool.rft.ndePending === 0 ? 'var(--sage)' : 'var(--terracotta)'}; font-weight:bold; display:inline-block; width:16px;">
          ${spool.rft.ndePending === 0 ? '✓' : '✗'}
        </span> 
        NDE (${spool.rft.ndePending} pending)
        ${spool.rft.ndePending > 0 ? '<button class="btn" style="padding:4px 12px; font-size:12px; margin-left:auto;" data-action="nde">Go to NDE</button>' : ''}
      </li>
    </ul>
  `;
}

function renderTimeline(spool) {
  const container = document.getElementById('spool-timeline');
  if (!container) return;
  
  let isRFT = spool.rft && spool.rft.weldedBolted && spool.rft.supported && spool.rft.ndePending === 0 && spool.rft.pwhtPending === 0;
  let hasMaterial = spool.material && spool.material.length > 0 && spool.material.every(m => m.trace && m.trace.trim() !== '');
  
  container.innerHTML = `
    <div class="timeline-item ${hasMaterial ? 'done' : 'blocked'}">
      <div class="timeline-content"><strong>Material Trace</strong><br>Requires 100% trace codes.</div>
    </div>
    <div class="timeline-item ${spool.rft && spool.rft.weldedBolted ? 'done' : ''}">
      <div class="timeline-content"><strong>Welded & Supported</strong><br>Visual acceptance.</div>
    </div>
    <div class="timeline-item ${spool.nde && spool.nde.status === 'Accepted' ? 'done' : (spool.nde ? 'blocked' : '')}">
      <div class="timeline-content"><strong>NDE Validated</strong><br>${spool.nde ? (spool.nde.status === 'Accepted' ? 'All clear.' : 'Blocker: '+spool.nde.method+' pending.') : 'N/A'}</div>
    </div>
    <div class="timeline-item ${isRFT ? 'done' : ''}">
      <div class="timeline-content"><strong>Ready for Test</strong><br>Target: <a href="#" data-action="testpack" data-tp="TP-014" style="color:var(--ocean); text-decoration:underline;">TP-014</a></div>
    </div>
  `;
}

function renderTestpackSidebar() {
  const projectData = DB[state.project.replace('-', '')];
  let testPacks = projectData.testPacks || [];
  const list = document.getElementById('tp-list');
  
  if (state.tpSearchQuery) {
    testPacks = testPacks.filter(t => t.id.toLowerCase().includes(state.tpSearchQuery.toLowerCase()));
    UI.clearTpSearchBtn.style.display = 'block';
  } else {
    UI.clearTpSearchBtn.style.display = 'none';
  }
  
  if (testPacks.length === 0) {
    if (state.tpSearchQuery) { list.innerHTML = `<li class="object-item" style="cursor:default; text-align:center; padding: 22px 12px; color:var(--muted);">No matches found for "${escapeHTML(state.tpSearchQuery)}"</li>`; } else { list.innerHTML = `<li class="object-item" style="cursor:default; text-align:center; padding: 22px 12px; color:var(--muted);">Project has no test packs</li>`; }
  } else {
    list.innerHTML = `<li style="font-size:11px; padding:8px; color:var(--muted); text-align:center; background:var(--bg); border-bottom:1px solid var(--line);">1 illustrative row from 4</li>` + testPacks.map(t => `
      <li class="object-item" data-id="${t.id}" data-action="select-tp" data-selected="${t.id === state.tpId}" tabindex="0" role="button">
        <div class="object-id">${t.id}</div>
        <div class="object-meta">State: <span style="font-weight:600; color:var(--ink);">${getComputedTPState(t)}</span></div>
      </li>
    `).join('');
  }
}

function getComputedTPState(tp) {
  if (state.project === 'P-104') {
    const sp = DB.P104.spools.find(s => s.id === 'SP-1001-A');
    let isRFT = sp.rft.weldedBolted && sp.rft.supported && sp.rft.ndePending === 0 && sp.rft.pwhtPending === 0;
    if (isRFT) {
      if (tp.state === 'Tested') return 'Tested';
      return tp.blindingDone ? 'Start testing' : 'Ready for blinding';
    }
  }
  return tp.state;
}

function renderTestpack() {
  renderTestpackSidebar();
  
  const projectData = DB[state.project.replace('-', '')];
  const tp = (projectData.testPacks || []).find(t => t.id === state.tpId);
  const container = document.getElementById('tp-content');
  const header = document.getElementById('tp-header-id');
  
  if (!tp) {
    header.textContent = 'No Test Pack selected';
    container.innerHTML = `<div style="padding:22px; color:var(--muted);">Please select a test pack.</div>`;
    document.getElementById('tp-timeline').innerHTML = '';
    return;
  }
  
  header.textContent = tp.id;
  
  const currentState = getComputedTPState(tp);
  const isReader = state.role === 'Reader';
  
  container.innerHTML = `
    ${isReader ? `<div class="alert-banner info" style="margin-bottom:16px;">Read-only access. You cannot record workflows.</div>` : ''}
    <div style="border:1px solid var(--line); padding: 22px; background:#fff; margin-bottom: 22px; border-radius:4px;">
      <h4 style="margin:0 0 16px 0; font-size:16px;">Workflow State: <span style="color:var(--sage);">${currentState}</span></h4>
      <p style="color:var(--muted); font-size:14px; margin-bottom:22px;">Membership: <span class="monospace">${tp.isos.join(', ')}</span></p>
      
      ${!isReader ? `
      <div style="display:flex; align-items:center; gap:12px;">
        ${currentState === 'Ready for blinding' ? `<button class="btn btn-primary" data-action="simulate-save" data-target="tp-blind">Simulate blinding</button>` : ''}
        ${currentState === 'Start testing' ? `<button class="btn btn-primary" data-action="simulate-save" data-target="tp-test">Simulate start testing</button>` : ''}
        ${['Awaiting RFT', 'Tested'].includes(currentState) ? `<div style="color:var(--muted); font-size:13px;">No actions available at this stage.</div>` : ''}
        <span class="object-meta" style="color:var(--terracotta);" id="tp-msg"></span>
      </div>
      ` : ''}
    </div>
  `;
  
  document.getElementById('tp-timeline').innerHTML = `
     <div class="timeline-item done"><div class="timeline-content">Formed</div></div>
     <div class="timeline-item ${currentState !== 'Awaiting RFT' ? 'done' : 'blocked'}"><div class="timeline-content">RFT Achieved</div></div>
     <div class="timeline-item ${['Start testing', 'Tested'].includes(currentState) ? 'done' : ''}"><div class="timeline-content">Blinding</div></div>
     <div class="timeline-item ${currentState === 'Tested' ? 'done' : ''}"><div class="timeline-content">Pressure Test</div></div>
  `;
}

function renderHelp() {
  const coachMark = UI.coachMark;
  if (!state.helpVisible || localStorage.getItem('pipeqc_ux_c_help_disabled') === 'true') {
    coachMark.classList.add('hidden');
    return;
  }
  
  let target = null;
  let title = '';
  let text = '';
  
  if (state.view === 'overview') {
    target = document.querySelector('#view-overview .attention-card [data-action="nde"]'); 
    title = 'Work Queue Navigation';
    text = 'Directly opens the specific NDE task, preserving object context.';
  } else if (state.view === 'nde') {
    target = document.querySelector('#view-workbench #nde-outcome');
    title = 'Record Result';
    text = 'Selecting "Rejected" will require a defect code. Local counts will update on success.';
  } else if (state.view === 'rft') {
    target = document.querySelector('#view-workbench .ops-content button[data-action="nde"]');
    if (!target) target = document.querySelector('.ops-content');
    title = 'NDE Blocker';
    text = 'This spool cannot achieve RFT until the pending NDE obligation is accepted.';
  } else if (state.view === 'material') {
    target = document.querySelector('#view-workbench .trace-input[value=""]');
    if (!target) target = document.querySelector('.trace-input');
    title = 'Trace Code Required';
    text = 'Enter the heat or trace code to complete the material check.';
  } else if (state.view === 'testpack') {
    target = document.querySelector('#view-testpack-workbench [data-action="simulate-save"][data-target="tp-blind"], #view-testpack-workbench [data-action="simulate-save"][data-target="tp-test"]');
    if (!target) target = document.querySelector('#view-testpack-workbench #tp-header-id');
    title = 'Workflow Action';
    text = 'Actions are revealed contextually only when the previous stage is complete.';
  }
  
  if (target) {
    
    const rect = target.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX;
    
    // Clamp to viewport
    if (left + 260 > window.innerWidth) {
      left = window.innerWidth - 270;
    }
    if (left < 10) left = 10;
    
    coachMark.style.top = top + 'px';
    coachMark.style.left = left + 'px';

    coachMark.querySelector('h4').textContent = title;
    coachMark.querySelector('p').textContent = text;
    coachMark.classList.remove('hidden');
  } else {
    coachMark.classList.add('hidden');
  }
}

// Event Listeners
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  const action = btn.getAttribute('data-action');
  
  if (['projects', 'overview', 'fabrication', 'material', 'nde', 'rft', 'testpack'].includes(action)) {
    state.view = action;
    const spoolOverride = btn.getAttribute('data-spool');
    if (spoolOverride) state.spoolId = spoolOverride;
    const tpOverride = btn.getAttribute('data-tp');
    if (tpOverride) state.tpId = tpOverride;
    render();
  }
  
  if (action === 'open-project') {
    const newProj = btn.getAttribute('data-project');
    if (state.project !== newProj) {
      state.project = newProj;
      state.spoolId = state.project === 'P-104' ? 'SP-1001-A' : null;
      state.tpId = state.project === 'P-104' ? 'TP-014' : null;
      state.searchQuery = '';
      state.tpSearchQuery = '';
      UI.spoolSearch.value = '';
      UI.tpSearch.value = '';
    }
    state.view = 'overview';
    state.helpVisible = false;
    renderHelp();
  }

  if (action === 'return-project') {
    state.view = 'overview';
    render();
  }
  
  if (action === 'select-spool') {
    state.spoolId = btn.getAttribute('data-id');
    render();
  }

  if (action === 'select-tp') {
    state.tpId = btn.getAttribute('data-id');
    render();
  }
  
  if (action === 'help') {
    if (localStorage.getItem('pipeqc_ux_c_help_disabled') === 'true') {
       localStorage.removeItem('pipeqc_ux_c_help_disabled'); 
    }
    state.helpVisible = !state.helpVisible;
    renderHelp();
  }
  
  if (action === 'close-help') {
    state.helpVisible = false;
    renderHelp();
  }

  if (action === 'disable-help') {
    localStorage.setItem('pipeqc_ux_c_help_disabled', 'true');
    state.helpVisible = false;
    renderHelp();
  }
  
  if (action === 'simulate-save') {
    if (state.role === 'Reader' || state.project === 'P-207') return;
    const target = btn.getAttribute('data-target');
    const spool = DB.P104.spools.find(s => s.id === 'SP-1001-A');
    let hasError = false;
    
    if (target === 'material') {
      const inputs = document.querySelectorAll('.trace-input');
      let allFilled = true;
      inputs.forEach(inp => { if (!inp.value.trim()) allFilled = false; });
      if (!allFilled) {
        document.getElementById('material-msg').textContent = 'Please provide all trace codes.';
        hasError = true;
      } else {
        inputs.forEach(inp => { spool.material[inp.getAttribute('data-index')].trace = inp.value; });
        document.getElementById('material-msg').textContent = 'Prototype only — no project data was saved';
      }
    }
    
    if (target === 'nde') {
      const outcomeSelect = document.getElementById('nde-outcome');
      const dateInput = document.getElementById('nde-date');
      const reportInput = document.getElementById('nde-report');
      const defectInput = document.getElementById('nde-defect');
      const msgEl = document.getElementById('nde-msg');
      
      if (!outcomeSelect.value) {
        msgEl.textContent = 'Outcome is required.';
        hasError = true;
      } else if (outcomeSelect.value === 'Rejected' && !defectInput.value.trim()) {
        msgEl.textContent = 'Defect Code is required for Rejected.';
        hasError = true;
      } else if (!dateInput.value || !reportInput.value.trim()) {
        msgEl.textContent = 'Report Number and Date are required.';
        hasError = true;
      } else {
        if (outcomeSelect.value === 'Accepted') {
          if (spool.nde.status !== 'Accepted') {
            spool.nde.status = 'Accepted';
            spool.rft.ndePending = 0;
            DB.P104.stats.recorded++;
            DB.P104.stats.issued--;
            DB.P104.stats.rft++;
          }
        } else {
           spool.nde.status = 'Rejected';
           spool.nde.report = reportInput.value;
           spool.nde.date = dateInput.value;
           spool.nde.defect = defectInput.value;
           msgEl.textContent = 'Rejected recorded. Blocker remains.';
        }
      }
      
      if (!hasError && outcomeSelect.value === 'Accepted') {
         msgEl.textContent = 'Prototype only — no project data was saved';
      }
    }
    
    if (target === 'tp-blind') {
      DB.P104.testPacks[0].blindingDone = true;
      document.getElementById('tp-msg').textContent = 'Prototype only — no project data was saved';
    }
    
    if (target === 'tp-test') {
      DB.P104.testPacks[0].state = 'Tested';
      document.getElementById('tp-msg').textContent = 'Prototype only — no project data was saved';
    }
    
    if (!hasError) {
      const oldMsg = { material: document.getElementById('material-msg')?.textContent, nde: document.getElementById('nde-msg')?.textContent, tp: document.getElementById('tp-msg')?.textContent };
      render();
      if (oldMsg.material && document.getElementById('material-msg')) document.getElementById('material-msg').textContent = oldMsg.material;
      if (oldMsg.nde && document.getElementById('nde-msg')) document.getElementById('nde-msg').textContent = oldMsg.nde;
      if (oldMsg.tp && document.getElementById('tp-msg')) document.getElementById('tp-msg').textContent = oldMsg.tp;
    }
  }
});

// Keyboard support for objects
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.helpVisible) {
    state.helpVisible = false;
    renderHelp();
  }
  
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) {
    e.preventDefault();
    e.target.click();
  }
});

// Search handling without replacing full DOM on every keystroke
UI.spoolSearch.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderWorkbenchSidebar(); // Only re-render sidebar
});

UI.clearSearchBtn.addEventListener('click', () => {
  state.searchQuery = '';
  UI.spoolSearch.value = '';
  renderWorkbenchSidebar();
});

UI.tpSearch.addEventListener('input', (e) => {
  state.tpSearchQuery = e.target.value;
  renderTestpackSidebar();
});

UI.clearTpSearchBtn.addEventListener('click', () => {
  state.tpSearchQuery = '';
  UI.tpSearch.value = '';
  renderTestpackSidebar();
});

UI.roleSelector.addEventListener('change', (e) => {
  state.role = e.target.value;
  render();
});

// History / Back Forward
window.addEventListener('popstate', (e) => {
  if (e.state) {
    state.isPopping = true;
    Object.assign(state, e.state);
    state.helpVisible = false; // no help leak
    render();
    state.isPopping = false;
  }
});

// Init
if (window.location.hash.includes('?s=')) {
  try {
    const s = JSON.parse(decodeURIComponent(window.location.hash.split('?s=')[1]));
    Object.assign(state, s);
    state.helpVisible = false;
  } catch(e){}
}
const stateStringInit = encodeURIComponent(JSON.stringify(state));
window.history.replaceState(state, '', `#${state.view}?s=${stateStringInit}`);

render();

