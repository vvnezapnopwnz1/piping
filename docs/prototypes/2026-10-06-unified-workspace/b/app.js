const NAV_REGISTRY = [
  { id: 'overview', label: 'Overview', type: 'rail', entryRoute: 'overview' },
  { id: 'fabrication', label: 'Fabrication', type: 'rail', entryRoute: 'fabrication', desc: 'Shop record for each spool', sub: [
    { id: 'fabrication', label: 'Dashboard', route: 'fabrication' },
    { id: 'material', label: 'Material Check', route: 'material' },
    { id: 'weld', label: 'Shop Welds', disabled: true, scope: 'Outside this prototype' },
    { id: 'qc', label: 'QC Release', disabled: true, scope: 'Outside this prototype' }
  ]},
  { id: 'erection', label: 'Erection', type: 'rail', entryRoute: 'rft', desc: 'Site record', sub: [
    { id: 'erection', label: 'Dashboard', disabled: true, scope: 'Outside this prototype' },
    { id: 'weld-site', label: 'Field Welds', disabled: true, scope: 'Outside this prototype' },
    { id: 'rft', label: 'Ready for Test', route: 'rft' }
  ]},
  { id: 'testpack', label: 'Test Packs', type: 'rail', entryRoute: 'testpack', desc: 'Pressure testing workflow', sub: [
    { id: 'explorer', label: 'Explorer', disabled: true, scope: 'Outside this prototype' },
    { id: 'testpack', label: 'Pressure Test', route: 'testpack' }
  ]},
  { id: 'nde', label: 'NDE', type: 'service', entryRoute: 'nde', desc: 'Non-destructive examination', sub: [] }
];

const HELP_CONTENT = {
  'project-identity': { title: 'Project Context', desc: 'Your current project and role are always visible. Use "All projects" to switch context safely.' },
  'process-map': { title: 'Process Navigator', desc: 'Click any active node to jump to that stage. Blocked items queue shows actionable tasks.' },
  'fabrication-table': { title: 'Fabrication List', desc: 'Search and filter spools. Only SP-1001-A is fully interactive in this prototype.' },
  'mat-save-btn': { title: 'Material Traceability', desc: 'Provide heat numbers for all pending components. This removes the material gate for welding.' },
  'nde-form': { title: 'Record NDE', desc: 'Enter the report details. If rejected, a defect code is strictly required.' },
  'rft-panel': { title: 'RFT Criteria', desc: 'Test pack allocation is blocked until all preceding checks, including NDE and PWHT, are passed.' },
  'tp-workflow': { title: 'Test Pack Workflow', desc: 'Once RFT is achieved, you can record blinding and proceed to Start Testing.' }
};

const DEFAULT_P104 = {
  spools: [
    { id: 'SP-1001-A', iso: 'ISO-1001 R0', loc: 'Shop A', stage: 'Material Check', nde: '1 Open', pwht: '0', action: 'material' },
    { id: 'SP-1002-B', iso: 'ISO-1001 R0', loc: 'Shop A', stage: 'Weld', nde: 'Clear', pwht: '0', action: null },
    { id: 'SP-1003-C', iso: 'ISO-1002 R1', loc: 'Laydown', stage: 'Laydown', nde: 'Clear', pwht: 'Clear', action: null },
    { id: 'SP-1004-A', iso: 'ISO-1003 R0', loc: 'Laydown', stage: 'Laydown', nde: 'Clear', pwht: 'Clear', action: null },
    { id: 'SP-1004-B', iso: 'ISO-1003 R0', loc: 'Laydown', stage: 'Laydown', nde: 'Clear', pwht: 'Clear', action: null },
    { id: 'SP-1005-A', iso: 'ISO-1004 R0', loc: 'Shop B', stage: 'PWHT', nde: 'Clear', pwht: '1 Open', action: null }
  ],
  materialComplete: false,
  ndeComplete: false,
  ndeOutcome: null,
  tpBlinded: false
};

const state = {
  project: 'P-104',
  view: 'overview',
  spool: null,
  role: 'qc',
  searchQuery: '',
  data: {
    'P-104': JSON.parse(JSON.stringify(DEFAULT_P104))
  }
};

const dom = {
  main: document.getElementById('main-content'),
  identTitle: document.getElementById('ident-project-title'),
  identContract: document.getElementById('ident-project-contract'),
  roleSelect: document.getElementById('role-select'),
  rail: document.getElementById('stage-rail'),
  localNav: document.getElementById('local-nav'),
  
  processMap: document.getElementById('process-map'),
  queueList: document.getElementById('queue-list'),
  projectCards: document.getElementById('project-cards'),
  returnProjectBtn: document.getElementById('return-project-btn'),
  
  spoolSearch: document.getElementById('spool-search'),
  clearSearch: document.getElementById('clear-search'),
  emptyClearSearch: document.getElementById('empty-clear-search'),
  spoolList: document.getElementById('spool-list'),
  noSpoolsMsg: document.getElementById('no-spools-msg'),
  emptyProjectMsg: document.getElementById('empty-project-msg'),
  
  matTraceList: document.getElementById('material-trace-list'),
  matGateReason: document.getElementById('material-gate-reason'),
  matSaveBtn: document.getElementById('mat-save-btn'),
  
  ndeQueueList: document.getElementById('nde-queue-list'),
  ndeReport: document.getElementById('nde-report'),
  ndeDate: document.getElementById('nde-date'),
  ndeOutcome: document.getElementById('nde-outcome'),
  defectGroup: document.getElementById('defect-group'),
  ndeDefect: document.getElementById('nde-defect'),
  ndeError: document.getElementById('nde-error'),
  ndeSaveBtn: document.getElementById('nde-save-btn'),
  
  rftTitle: document.getElementById('rft-title'),
  rftCriteria: document.getElementById('rft-criteria'),
  rftBanner: document.getElementById('rft-banner'),
  
  tpState: document.getElementById('tp-state'),
  tpMessage: document.getElementById('tp-message'),
  tpActionBtn: document.getElementById('tp-action-btn'),
  
  coachMark: document.getElementById('coach-mark'),
  coachTitle: document.getElementById('coach-title'),
  coachDesc: document.getElementById('coach-desc'),
  coachDontShow: document.getElementById('coach-dont-show'),
  toast: document.getElementById('toast'),
};

function init() {
  window.addEventListener('hashchange', handleHashChange);
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);
  
  dom.roleSelect.addEventListener('change', (e) => {
    state.role = e.target.value;
    document.body.className = `role-${state.role}`;
    render();
  });
  
  dom.spoolSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderFabrication();
  });
  
  dom.clearSearch.addEventListener('click', clearSearch);
  dom.emptyClearSearch.addEventListener('click', clearSearch);
  
  dom.ndeOutcome.addEventListener('change', (e) => {
    dom.defectGroup.style.display = e.target.value === 'Rejected' ? 'flex' : 'none';
    dom.ndeError.style.display = 'none';
  });
  
  if (!window.location.hash) {
    navigate('overview');
  } else {
    handleHashChange();
  }
}

function parseHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return {
    project: params.get('project') || 'P-104',
    view: params.get('view') || 'overview',
    spool: params.get('spool') || null
  };
}

function stringifyHash(project, view, spool) {
  const params = new URLSearchParams();
  params.set('project', project);
  params.set('view', view);
  if (spool) params.set('spool', spool);
  return `#${params.toString()}`;
}

function handleHashChange() {
  const parsed = parseHash();
  
  if (parsed.project !== state.project) {
    state.project = parsed.project;
    state.searchQuery = '';
    closeHelp();
    resetForms();
  }
  
  const supportedViews = ['overview', 'projects', 'fabrication', 'material', 'nde', 'rft', 'testpack'];
  state.view = supportedViews.includes(parsed.view) ? parsed.view : 'overview';
  state.spool = parsed.spool;
  
  render();
}

function navigate(view, spool = null) {
  window.location.hash = stringifyHash(state.project, view, spool);
}

function clearSearch() {
  dom.spoolSearch.value = '';
  state.searchQuery = '';
  renderFabrication();
}

function resetForms() {
  dom.ndeReport.value = '';
  dom.ndeDate.value = '';
  dom.ndeOutcome.value = '';
  dom.ndeDefect.value = '';
  dom.defectGroup.style.display = 'none';
  dom.ndeError.style.display = 'none';
}

function handleClick(e) {
  const actionBtn = e.target.closest('[data-action]');
  if (!actionBtn) return;
  if (actionBtn.hasAttribute('disabled')) return;

  const action = actionBtn.getAttribute('data-action');
  
  switch(action) {
    case 'go-projects':
      navigate('projects');
      break;
    case 'return-project':
      navigate('overview');
      break;
    case 'open-project':
      const newProj = actionBtn.getAttribute('data-project');
      window.location.hash = stringifyHash(newProj, 'overview');
      break;
    case 'nav-view':
      navigate(actionBtn.getAttribute('data-view'));
      break;
    case 'nav-spool':
      navigate(actionBtn.getAttribute('data-view'), actionBtn.getAttribute('data-spool'));
      break;
    case 'back-fabrication':
      navigate('fabrication');
      break;
    case 'simulate-save':
      if (state.role !== 'reader') {
        simulateSave(actionBtn.getAttribute('data-target'));
      }
      break;
    case 'help':
      toggleHelp(actionBtn);
      break;
    case 'close-help':
      closeHelp();
      break;
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && dom.coachMark.style.display === 'block') {
    closeHelp();
  }
}

function simulateSave(target) {
  if (state.project !== 'P-104') return;
  const projectData = state.data['P-104'];
  
  if (target === 'material') {
    const inputs = document.querySelectorAll('.trace-input');
    let valid = true;
    let heatTrace = '';
    inputs.forEach(i => { 
      if (!i.value.trim()) valid = false; 
      else heatTrace = i.value.trim();
    });
    if (!valid) {
      alert("Please enter a heat trace value (e.g. HT-123). Empty values are not allowed.");
      return;
    }
    
    projectData.materialComplete = true;
    projectData.heatTrace = heatTrace;
    showToast('Material check complete');
    renderMaterial();
    
  } else if (target === 'nde') {
    const report = dom.ndeReport.value.trim();
    const date = dom.ndeDate.value;
    const outcome = dom.ndeOutcome.value;
    const defect = dom.ndeDefect.value.trim();
    
    if (!report || !date || !outcome) {
      showNdeError("Report Number, Date, and Outcome are required.");
      return;
    }
    if (outcome === 'Rejected' && !defect) {
      showNdeError("Defect Code is required when outcome is Rejected.");
      return;
    }
    
    dom.ndeError.style.display = 'none';
    
    if (outcome === 'Accepted') {
      projectData.ndeComplete = true;
      projectData.ndeOutcome = 'Accepted';
      showToast('NDE Result Accepted. Blocker removed.');
      navigate('rft', state.spool || 'SP-1001-A');
    } else {
      projectData.ndeOutcome = 'Rejected';
      showToast('NDE Result Rejected. Blocker remains.');
      renderNDE();
    }
    
  } else if (target === 'tp') {
    if (!projectData.tpBlinded) {
      projectData.tpBlinded = true;
      showToast('Blinding recorded');
    } else {
      showToast('Testing started');
    }
    renderTestpack();
  }
  applyRoleState();
}

function showNdeError(msg) {
  dom.ndeError.textContent = msg;
  dom.ndeError.style.display = 'block';
}

function toggleHelp(btn) {
  const targetId = btn.getAttribute('data-target');
  const content = HELP_CONTENT[targetId];
  if (!content) return;
  
  const prefKey = `pipeqc_b_help_${targetId}`;
  
  if (dom.coachMark.style.display === 'block' && dom.coachMark.getAttribute('data-current-target') === targetId) {
    closeHelp();
    return;
  }

  const targetEl = document.getElementById(targetId) || btn;
  const rect = targetEl.getBoundingClientRect();
  
  // Position clamping for mobile
  let leftPos = rect.left + window.scrollX;
  if (window.innerWidth < 400 && leftPos > 50) {
    leftPos = 20; 
  }
  
  dom.coachMark.style.top = (rect.bottom + 12 + window.scrollY) + 'px';
  dom.coachMark.style.left = leftPos + 'px';
  
  dom.coachTitle.textContent = content.title;
  dom.coachDesc.textContent = content.desc;
  dom.coachMark.setAttribute('data-current-target', targetId);
  dom.coachDontShow.checked = localStorage.getItem(prefKey) === 'true';
  
  dom.coachMark.style.display = 'block';
  dom.coachMark.focus();
}

function closeHelp() {
  const currentTarget = dom.coachMark.getAttribute('data-current-target');
  if (currentTarget) {
    const prefKey = `pipeqc_b_help_${currentTarget}`;
    if (dom.coachDontShow.checked) {
      localStorage.setItem(prefKey, 'true');
    } else {
      localStorage.removeItem(prefKey);
    }
  }
  dom.coachMark.style.display = 'none';
  dom.coachMark.removeAttribute('data-current-target');
}

function showToast(msg = 'Prototype only — no project data was saved') {
  dom.toast.textContent = msg;
  dom.toast.style.display = 'block';
  setTimeout(() => {
    dom.toast.style.display = 'none';
  }, 3000);
}

function render() {
  dom.main.setAttribute('data-view', state.view);

  renderIdentity();
  renderNav();

  switch(state.view) {
    case 'overview': renderOverview(); break;
    case 'projects': renderProjects(); break;
    case 'fabrication': renderFabrication(); break;
    case 'material': renderMaterial(); break;
    case 'nde': renderNDE(); break;
    case 'rft': renderRFT(); break;
    case 'testpack': renderTestpack(); break;
  }
  applyRoleState();
}

// Write controls are enabled only when role is not Reader AND the stage allows the action.
function isWriteStageValid(target) {
  if (state.project !== 'P-104') return false;
  const pData = state.data['P-104'];
  if (target === 'material') return state.spool === 'SP-1001-A' && !pData.materialComplete;
  if (target === 'nde') return !pData.ndeComplete;
  if (target === 'tp') return pData.ndeComplete;
  return false;
}

function applyRoleState() {
  const isReader = state.role === 'reader';

  document.querySelectorAll('[data-action="simulate-save"]').forEach(btn => {
    const valid = isWriteStageValid(btn.getAttribute('data-target'));
    if (isReader || !valid) btn.setAttribute('disabled', 'true');
    else btn.removeAttribute('disabled');

    let note = btn.previousElementSibling;
    if (note && !note.classList.contains('reader-note')) note = null;
    if (isReader && !note) {
      note = document.createElement('div');
      note.className = 'reader-note';
      note.textContent = 'Read-only: the Reader role can view this record but cannot save changes.';
      btn.parentNode.insertBefore(note, btn);
    } else if (!isReader && note) {
      note.remove();
    }
  });

  const writeFields = [
    ...document.querySelectorAll('#material-trace-list .trace-input'),
    dom.ndeReport, dom.ndeDate, dom.ndeOutcome, dom.ndeDefect
  ];
  writeFields.forEach(f => {
    f.disabled = isReader;
    f.readOnly = isReader;
  });
}

function renderIdentity() {
  if (state.project === 'P-104') {
    dom.identTitle.textContent = 'P-104 North process unit';
    dom.identContract.textContent = 'Contract: NPU-04 | Meridian / Industrial Works';
  } else {
    dom.identTitle.textContent = 'P-207 Cooling water loop';
    dom.identContract.textContent = 'Contract: CWL-99 | Apex / WaterCo';
  }
}

function getActiveRailId() {
  for (const item of NAV_REGISTRY) {
    if (item.id === state.view) return item.id;
    if (item.sub) {
      if (item.sub.find(s => s.route === state.view)) return item.id;
    }
  }
  return null;
}

function renderNav() {
  const activeRailId = getActiveRailId();
  
  // Render Rail
  dom.rail.innerHTML = '';
  const railItems = NAV_REGISTRY.filter(item => item.type === 'rail');
  railItems.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.className = `rail-item ${activeRailId === item.id ? 'active' : ''}`;
    btn.textContent = item.label;
    btn.setAttribute('data-action', 'nav-view');
    btn.setAttribute('data-view', item.entryRoute);
    dom.rail.appendChild(btn);
    
    if (index < railItems.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'rail-separator';
      dom.rail.appendChild(sep);
    }
  });
  
  const services = NAV_REGISTRY.filter(item => item.type === 'service');
  if (services.length > 0) {
    const srvContainer = document.createElement('div');
    srvContainer.className = 'shared-services';
    services.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `rail-item service ${activeRailId === item.id ? 'active' : ''}`;
      btn.textContent = item.label;
      btn.setAttribute('data-action', 'nav-view');
      btn.setAttribute('data-view', item.entryRoute);
      srvContainer.appendChild(btn);
    });
    dom.rail.appendChild(srvContainer);
  }

  // Render Local Nav
  dom.localNav.innerHTML = '';
  const activeRailNode = NAV_REGISTRY.find(n => n.id === activeRailId);
  if (activeRailNode && activeRailNode.sub && activeRailNode.sub.length > 0) {
    activeRailNode.sub.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = `local-nav-item ${state.view === sub.route ? 'active' : ''}`;
      btn.textContent = sub.label;
      if (sub.disabled) {
        btn.setAttribute('disabled', 'true');
        btn.title = sub.scope;
      } else {
        btn.setAttribute('data-action', 'nav-view');
        btn.setAttribute('data-view', sub.route);
      }
      dom.localNav.appendChild(btn);
    });
    dom.localNav.style.display = 'flex';
  } else {
    dom.localNav.style.display = 'none';
  }
}

function renderOverview() {
  dom.processMap.innerHTML = '';
  
  let pData = null;
  if (state.project === 'P-104') pData = state.data['P-104'];

  const railItems = NAV_REGISTRY.filter(item => item.type === 'rail' && item.id !== 'overview');
  
  railItems.forEach((item, index) => {
    const node = document.createElement('div');
    node.className = 'map-node';
    node.setAttribute('data-action', 'nav-view');
    node.setAttribute('data-view', item.entryRoute);
    
    let countersHtml = '';
    if (state.project === 'P-104') {
      if (item.id === 'fabrication') {
        countersHtml = `<div class="counters">
          <span class="counter">Spools <span class="val">16</span></span>
          <span class="counter">At Laydown <span class="val">4</span></span>
        </div>`;
      } else if (item.id === 'erection') {
        countersHtml = `<div class="counters">
          <span class="counter">Ready for Test <span class="val">${pData.ndeComplete ? '2' : '1'}</span></span>
        </div>`;
      }
    } else {
      countersHtml = `<div class="counters"><span class="counter">Empty</span></div>`;
    }
    
    node.innerHTML = `<h3>${item.label}</h3><p>${item.desc}</p>${countersHtml}`;
    dom.processMap.appendChild(node);
    
    if (index < railItems.length - 1) {
      const conn = document.createElement('div');
      conn.innerHTML = `<svg class="map-connector" viewBox="0 0 40 20"><path d="M0,10 L40,10 M30,5 L40,10 L30,15" stroke="currentColor" fill="none" stroke-width="2"/></svg>`;
      dom.processMap.appendChild(conn.firstElementChild);
    }
  });

  const ndeNode = NAV_REGISTRY.find(item => item.id === 'nde');
  const shared = document.createElement('div');
  shared.className = 'map-shared';
  shared.setAttribute('data-action', 'nav-view');
  shared.setAttribute('data-view', ndeNode.entryRoute);
  
  let ndeCounters = '';
  if (state.project === 'P-104') {
    ndeCounters = `<div class="counters">
      <span class="counter">Obligations <span class="val">85</span></span>
      <span class="counter">Recorded <span class="val">${pData.ndeComplete ? '64' : '63'}</span></span>
      <span class="counter">Awaiting <span class="val">${pData.ndeComplete ? '18' : '19'}</span></span>
    </div>`;
  } else {
    ndeCounters = `<div class="counters"><span class="counter">Empty</span></div>`;
  }
  
  shared.innerHTML = `<h3>${ndeNode.label} Service</h3>${ndeCounters}`;
  dom.processMap.appendChild(shared);

  // Render blocked queue
  dom.queueList.innerHTML = '';
  if (state.project === 'P-104') {
    if (!pData.materialComplete) {
      dom.queueList.innerHTML += `
        <div class="queue-task">
          <div class="queue-task-title">SP-1001-A Material Check</div>
          <div class="queue-task-desc">Missing heat traces for ELB-90</div>
          <button class="btn small" data-action="nav-spool" data-view="material" data-spool="SP-1001-A">Resolve</button>
        </div>
      `;
    }
    if (!pData.ndeComplete) {
      dom.queueList.innerHTML += `
        <div class="queue-task">
          <div class="queue-task-title">RT-006 (SP-1001-A)</div>
          <div class="queue-task-desc">NDE result pending</div>
          <button class="btn small" data-action="nav-spool" data-view="nde" data-spool="SP-1001-A">Record Result</button>
        </div>
      `;
    }
    if (pData.materialComplete && pData.ndeComplete) {
      dom.queueList.innerHTML = '<div class="empty-state" style="padding: 16px;">All clear! No blocked objects.</div>';
    }
  } else {
    dom.queueList.innerHTML = '<div class="empty-state" style="padding: 16px;">Queue is empty.</div>';
  }
}

function renderProjects() {
  dom.returnProjectBtn.style.display = 'block';
  dom.projectCards.innerHTML = `
    <div class="project-card ${state.project === 'P-104' ? 'active' : ''}">
      <h3>P-104 North process unit</h3>
      <p>Contractor: Meridian<br>Owner: Industrial Works</p>
      <p>16 spools, 63 NDE records</p>
      <button class="btn primary" data-action="open-project" data-project="P-104">${state.project === 'P-104' ? 'Current Project' : 'Open Project'}</button>
    </div>
    <div class="project-card ${state.project === 'P-207' ? 'active' : ''}">
      <h3>P-207 Cooling water loop</h3>
      <p>Contractor: Apex<br>Owner: WaterCo</p>
      <p>0 spools, 0 NDE records</p>
      <button class="btn primary" data-action="open-project" data-project="P-207">${state.project === 'P-207' ? 'Current Project' : 'Open Project'}</button>
    </div>
  `;
}

function renderFabrication() {
  if (state.project === 'P-207') {
    dom.spoolList.innerHTML = '';
    dom.noSpoolsMsg.style.display = 'none';
    dom.emptyProjectMsg.style.display = 'block';
    return;
  }
  dom.emptyProjectMsg.style.display = 'none';
  
  const pData = state.data['P-104'];
  const rows = pData.spools;
  
  const filtered = rows.filter(r => r.id.toLowerCase().includes(state.searchQuery) || r.iso.toLowerCase().includes(state.searchQuery) || r.loc.toLowerCase().includes(state.searchQuery));
  
  dom.spoolList.innerHTML = '';
  if (filtered.length === 0) {
    dom.noSpoolsMsg.style.display = 'block';
  } else {
    dom.noSpoolsMsg.style.display = 'none';
    filtered.forEach(r => {
      let stageDisplay = r.stage;
      if (r.id === 'SP-1001-A' && pData.materialComplete) stageDisplay = 'Weld';
      
      let ndeDisplay = r.nde;
      if (r.id === 'SP-1001-A' && pData.ndeComplete) ndeDisplay = 'Clear';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="ident">${r.id}</span></td>
        <td>${r.iso}</td>
        <td>${r.loc}</td>
        <td>${stageDisplay}</td>
        <td>${ndeDisplay}</td>
        <td>${r.pwht}</td>
        <td><button class="btn small" ${r.action ? `data-action="nav-spool" data-view="${r.action}" data-spool="${r.id}"` : 'disabled'}>${r.action ? 'Open' : 'Locked'}</button></td>
      `;
      dom.spoolList.appendChild(tr);
    });
  }
}

function renderMaterial() {
  const pData = state.project === 'P-104' ? state.data['P-104'] : null;
  const isTargetSpool = state.spool === 'SP-1001-A' && pData;
  
  if (!isTargetSpool) {
    dom.matTraceList.innerHTML = '<div class="empty-state">Select a valid spool from Fabrication.</div>';
    dom.matSaveBtn.style.display = 'none';
    dom.matGateReason.style.display = 'none';
    return;
  }

  dom.matSaveBtn.style.display = 'block';
  dom.matGateReason.style.display = 'block';

  if (pData.materialComplete) {
    const traceVal = pData.heatTrace || 'HT-NEW';
    dom.matTraceList.innerHTML = `
      <div class="trace-item complete"><span class="ident">PIPE-10</span> <span>10m</span> <span>HT-991</span></div>
      <div class="trace-item complete"><span class="ident">FLG-04</span> <span>2pcs</span> <span>HT-421</span></div>
      <div class="trace-item complete"><span class="ident">ELB-90</span> <span>1pcs</span> <span>${traceVal}</span></div>
    `;
    dom.matSaveBtn.setAttribute('disabled', 'true');
    dom.matGateReason.textContent = 'Material check complete. Spool released for welding.';
    dom.matGateReason.style.color = 'var(--color-sage-dark)';
  } else {
    dom.matTraceList.innerHTML = `
      <div class="trace-item complete"><span class="ident">PIPE-10</span> <span>10m</span> <span>HT-991</span></div>
      <div class="trace-item complete"><span class="ident">FLG-04</span> <span>2pcs</span> <span>HT-421</span></div>
      <div class="trace-item pending"><span class="ident">ELB-90</span> <span>1pcs</span> <input type="text" placeholder="Enter heat trace..." class="trace-input" aria-label="Heat trace for ELB-90"></div>
    `;
    dom.matSaveBtn.removeAttribute('disabled');
    dom.matGateReason.textContent = 'All traces must be filled to complete material check.';
    dom.matGateReason.style.color = 'var(--color-terracotta)';
  }
}

function renderNDE() {
  const pData = state.project === 'P-104' ? state.data['P-104'] : null;
  
  if (!pData) {
    dom.ndeQueueList.innerHTML = '<h3>Awaiting Results (0)</h3><div class="empty-state">No pending items.</div>';
    resetForms();
    dom.ndeSaveBtn.setAttribute('disabled', 'true');
    return;
  }
  
  dom.ndeQueueList.innerHTML = `<h3>Awaiting Results (${pData.ndeComplete ? 18 : 19})</h3>`;
  if (!pData.ndeComplete) {
    dom.ndeQueueList.innerHTML += `
      <div class="queue-item active">
        <strong>RT-006</strong>
        <span class="ident">SP-1001-A | W-04</span>
      </div>
    `;
  }
  
  dom.ndeQueueList.innerHTML += `
    <div class="queue-item" style="opacity:0.6; pointer-events:none;">
      <strong>UT-042</strong>
      <span class="ident">SP-1005-A | W-01</span>
    </div>
  `;

  if (!pData.ndeComplete) {
    dom.ndeSaveBtn.removeAttribute('disabled');
  } else {
    resetForms();
    dom.ndeSaveBtn.setAttribute('disabled', 'true');
  }
}

function renderRFT() {
  const pData = state.project === 'P-104' ? state.data['P-104'] : null;
  if (!pData || state.spool !== 'SP-1001-A') {
    dom.rftCriteria.innerHTML = '<div class="empty-state">No data available for this selection.</div>';
    dom.rftBanner.style.display = 'none';
    return;
  }
  
  dom.rftBanner.style.display = 'block';

  let ndeLi = `<li class="criteria fail">1 NDE obligation open <button class="btn small" data-action="nav-spool" data-view="nde" data-spool="SP-1001-A">Resolve</button></li>`;
  if (pData.ndeComplete) {
    ndeLi = `<li class="criteria pass">0 NDE obligations open</li>`;
  }
  
  dom.rftCriteria.innerHTML = `
    <li class="criteria pass">Welded / Bolted recorded</li>
    <li class="criteria pass">Supported recorded</li>
    <li class="criteria pass">PWHT: 0 required</li>
    ${ndeLi}
  `;
  
  if (pData.ndeComplete) {
    dom.rftBanner.className = 'status-banner ready';
    dom.rftBanner.textContent = 'Ready for Test Pack Allocation';
  } else {
    dom.rftBanner.className = 'status-banner blocked';
    dom.rftBanner.textContent = 'Blocked by NDE';
  }
}

function renderTestpack() {
  const pData = state.project === 'P-104' ? state.data['P-104'] : null;
  if (!pData) {
    dom.tpMessage.textContent = 'Test pack not found or empty project.';
    dom.tpState.textContent = 'Empty';
    dom.tpActionBtn.style.display = 'none';
    return;
  }
  
  dom.tpActionBtn.style.display = 'inline-block';
  
  if (!pData.ndeComplete) {
    dom.tpState.textContent = 'Awaiting RFT';
    dom.tpMessage.textContent = 'Test pack is waiting for spools to clear RFT (Ready for Test).';
    dom.tpActionBtn.setAttribute('disabled', 'true');
    dom.tpActionBtn.textContent = 'Record Blinding';
  } else if (!pData.tpBlinded) {
    dom.tpState.textContent = 'Ready for Blinding';
    dom.tpMessage.textContent = 'All spools are RFT. Ready to record blinding installation.';
    dom.tpActionBtn.removeAttribute('disabled');
    dom.tpActionBtn.textContent = 'Record Blinding';
  } else {
    dom.tpState.textContent = 'Ready for Testing';
    dom.tpMessage.textContent = 'Blinding installed. System is ready for pressure test execution.';
    dom.tpActionBtn.removeAttribute('disabled');
    dom.tpActionBtn.textContent = 'Start Testing';
  }
}

init();

