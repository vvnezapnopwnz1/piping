(function() {
  const SPOOLS_DB = [
    { id: 'SP-1001-A', iso: 'ISO-1001', location: 'Unit 1', stage: 'Erection', ndeBlockers: 1, pwhtBlockers: 0 },
    { id: 'SP-1002-B', iso: 'ISO-1001', location: 'Unit 1', stage: 'Laydown', ndeBlockers: 0, pwhtBlockers: 0 },
    { id: 'SP-1003-C', iso: 'ISO-1002', location: 'Unit 2', stage: 'Fabrication', ndeBlockers: 2, pwhtBlockers: 1 },
    { id: 'SP-1004-D', iso: 'ISO-1002', location: 'Unit 2', stage: 'Erection', ndeBlockers: 0, pwhtBlockers: 0 },
    { id: 'SP-1005-E', iso: 'ISO-1003', location: 'Unit 3', stage: 'Test Pack', ndeBlockers: 0, pwhtBlockers: 0 }
  ];

  let state = {
    project: 'P-104',
    view: 'overview',
    spool: null,
    searchQuery: '',
    role: 'engineer',
    helpVisible: false,
    helpDismissed: localStorage.getItem('pipeqc-ux-a-help-dismissed') === 'true',
    p104: getInitialP104State()
  };

  function getInitialP104State() {
    return {
      spools: JSON.parse(JSON.stringify(SPOOLS_DB)),
      materialTraces: { 'VLV-300': '' },
      materialReady: false,
      ndeRecords: [
        { report: 'RT-REP-099', spool: 'SP-1001-A', weld: 'W-04', method: 'RT', status: 'Issued' }
      ],
      ndeResolved: false,
      tpBlinded: false
    };
  }

  const UI = {
    views: document.querySelectorAll('.view-container'),
    navItems: document.querySelectorAll('.nav-item'),
    headerProjCode: document.getElementById('header-project-code'),
    headerProjName: document.getElementById('header-project-name'),
    headerProjMeta: document.getElementById('header-project-meta'),
    badgeP104: document.getElementById('badge-p104'),
    badgeP207: document.getElementById('badge-p207'),
    roleSelect: document.getElementById('role-select'),
    readerNotice: document.getElementById('reader-notice'),
    overviewContent: document.getElementById('overview-content'),
    overviewEmpty: document.getElementById('overview-empty'),
    fabTbody: document.getElementById('fabrication-tbody'),
    fabEmptySearch: document.getElementById('fabrication-empty-search'),
    fabEmpty: document.getElementById('fabrication-empty'),
    fabContent: document.getElementById('fabrication-content'),
    spoolSearch: document.getElementById('spool-search'),
    matContent: document.getElementById('material-content'),
    matEmpty: document.getElementById('material-empty'),
    valveTrace: document.getElementById('valve-trace'),
    matGateStatus: document.getElementById('material-gate-status'),
    ndeContent: document.getElementById('nde-content'),
    ndeEmpty: document.getElementById('nde-empty'),
    ndeTbody: document.getElementById('nde-tbody'),
    ndeForm: document.getElementById('nde-form-section'),
    ndeOutcomeSelect: document.getElementById('nde-outcome-select'),
    defectCodeGroup: document.getElementById('defect-code-group'),
    ndeDefectCode: document.getElementById('nde-defect-code'),
    rftContent: document.getElementById('rft-content'),
    rftEmpty: document.getElementById('rft-empty'),
    rftNdeCriterion: document.getElementById('rft-nde-criterion'),
    tpContent: document.getElementById('testpack-content'),
    tpEmpty: document.getElementById('testpack-empty'),
    tpState: document.getElementById('tp-state'),
    tpActions: document.getElementById('tp-actions'),
    coachMark: document.getElementById('coach-mark'),
    toast: document.getElementById('toast'),
    
    crumbFab: document.getElementById('crumb-fab-proj'),
    crumbMat: document.getElementById('crumb-mat-proj'),
    crumbNde: document.getElementById('crumb-nde-proj'),
    crumbRft: document.getElementById('crumb-rft-proj'),
    crumbTp: document.getElementById('crumb-tp-proj')
  };

  function init() {
    setupEventListeners();
    handleHashChange();
  }

  function setupEventListeners() {
    document.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      
      const action = actionEl.getAttribute('data-action');
      const target = actionEl.getAttribute('data-target');
      const spool = actionEl.getAttribute('data-spool');

      switch(action) {
        case 'navigate':
          navigate(target, spool);
          break;
        case 'select-project':
          selectProject(target);
          break;
        case 'clear-search':
          UI.spoolSearch.value = '';
          state.searchQuery = '';
          render();
          break;
        case 'open-nde-form':
          if (UI.ndeForm) {
            UI.ndeForm.style.display = 'block';
            UI.ndeForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          break;
        case 'simulate-save-material':
          saveMaterial();
          break;
        case 'simulate-save-nde':
          saveNde();
          break;
        case 'simulate-save-tp':
          saveTestPack();
          break;
        case 'help':
          toggleHelp();
          break;
        case 'close-help':
          closeHelp();
          break;
        case 'dismiss-help':
          dismissHelp();
          break;
      }
    });

    UI.spoolSearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase();
      render();
    });

    UI.roleSelect.addEventListener('change', (e) => {
      state.role = e.target.value;
      render();
    });

    UI.valveTrace.addEventListener('input', (e) => {
      if(state.project === 'P-104') {
        state.p104.materialTraces['VLV-300'] = e.target.value;
        renderMaterialGate();
      }
    });

    UI.ndeOutcomeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'Rejected') {
        UI.defectCodeGroup.style.display = 'block';
        if (UI.ndeDefectCode) UI.ndeDefectCode.focus();
      } else {
        UI.defectCodeGroup.style.display = 'none';
      }
    });

    window.addEventListener('hashchange', handleHashChange);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.helpVisible) {
        closeHelp();
      }
    });
  }

  function handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) {
      navigate('overview', null, true);
      return;
    }
    const parts = hash.split('/');
    const proj = parts[0];
    const view = parts[1] || 'overview';
    const spool = parts[2] || null;

    if (proj !== state.project) {
      if (proj === 'P-104' || proj === 'P-207') {
        state.project = proj;
        state.p104 = getInitialP104State(); // reset objects/forms/metrics on project switch
        state.searchQuery = '';
        UI.spoolSearch.value = '';
        UI.valveTrace.value = '';
        UI.ndeOutcomeSelect.value = '';
        UI.ndeDefectCode.value = '';
        if (UI.defectCodeGroup) UI.defectCodeGroup.style.display = 'none';
        if (UI.ndeForm) UI.ndeForm.style.display = 'none';
        const reportEl = document.getElementById('nde-report');
        if (reportEl) reportEl.value = 'RT-REP-099';
        const dateEl = document.getElementById('nde-date');
        if (dateEl) dateEl.value = '2026-10-06';
        closeHelp();
      } else {
        navigate('overview', null, true);
        return;
      }
    }
    
    state.view = view;
    state.spool = spool;
    render();
  }

  function navigate(view, spool = null, replace = false) {
    let hash = `#${state.project}/${view}`;
    if (spool) hash += `/${spool}`;
    
    if (replace) {
      window.location.replace(hash);
    } else {
      window.location.hash = hash;
    }
    closeHelp();
  }

  function selectProject(projectId) {
    if (state.project !== projectId) {
      state.project = projectId;
      state.p104 = getInitialP104State();
      state.searchQuery = '';
      UI.spoolSearch.value = '';
      UI.valveTrace.value = '';
      UI.ndeOutcomeSelect.value = '';
      UI.ndeDefectCode.value = '';
      if (UI.defectCodeGroup) UI.defectCodeGroup.style.display = 'none';
      if (UI.ndeForm) UI.ndeForm.style.display = 'none';
      const reportEl = document.getElementById('nde-report');
      if (reportEl) reportEl.value = 'RT-REP-099';
      const dateEl = document.getElementById('nde-date');
      if (dateEl) dateEl.value = '2026-10-06';
      closeHelp();
    }
    navigate('overview');
  }

  function saveMaterial() {
    if (state.role === 'reader' || state.project !== 'P-104') return;
    const trace = state.p104.materialTraces['VLV-300'];
    if (!trace || trace.trim() === '') {
      showToast('Error: Empty trace records do not pass Readiness Gate.');
      return;
    }
    state.p104.materialReady = true;
    showToast('Prototype only \u2014 no project data was saved');
    render();
  }

  function saveNde() {
    if (state.role === 'reader' || state.project !== 'P-104') return;
    const reportEl = document.getElementById('nde-report');
    const dateEl = document.getElementById('nde-date');
    const report = reportEl ? reportEl.value.trim() : '';
    const date = dateEl ? dateEl.value.trim() : '';
    const val = UI.ndeOutcomeSelect.value;
    const code = UI.ndeDefectCode.value.trim();
    
    if (!report) {
      showToast('Report number is required');
      if (reportEl) reportEl.focus();
      return;
    }
    if (!date) {
      showToast('Examination date is required');
      if (dateEl) dateEl.focus();
      return;
    }
    if (!val) {
      showToast('Please select an outcome');
      UI.ndeOutcomeSelect.focus();
      return;
    }
    if (val === 'Rejected' && !code) {
      showToast('Defect code is required for rejected welds');
      UI.ndeDefectCode.focus();
      return;
    }
    
    showToast('Prototype only \u2014 result simulated');
    if (val === 'Accepted') {
      state.p104.ndeResolved = true;
      const s = state.p104.spools.find(s => s.id === 'SP-1001-A');
      if (s) s.ndeBlockers = 0;
      state.p104.ndeRecords[0].status = 'Accepted';
      navigate('rft', 'SP-1001-A');
    } else {
      state.p104.ndeResolved = false;
      const s = state.p104.spools.find(s => s.id === 'SP-1001-A');
      if (s) s.ndeBlockers = 1;
      state.p104.ndeRecords[0].status = 'Rejected (' + code + ')';
      render();
    }
  }

  function saveTestPack() {
    if (state.role === 'reader' || state.project !== 'P-104') return;
    state.p104.tpBlinded = true;
    showToast('Prototype only \u2014 no project data was saved');
    render();
  }

  function toggleHelp() {
    if (state.helpVisible) {
      closeHelp();
      return;
    }
    if (state.helpDismissed) {
      showToast('Help suggestions are disabled.');
      return;
    }

    state.helpVisible = true;
    UI.coachMark.classList.remove('hidden');

    let targetEl = null;
    let text = 'Help text goes here.';
    
    // Determine anchor based on view
    if (state.view === 'overview') {
      if (state.project === 'P-104') {
        targetEl = document.querySelector('[data-target="nde"]');
        text = 'Directly accesses priority workloads and queues.';
      }
    } else if (state.view === 'projects') {
      targetEl = document.querySelector('[data-target="P-207"]');
      text = 'Projects scope data entirely. Switching resets metrics and active queues.';
    } else if (state.view === 'fabrication') {
      targetEl = UI.spoolSearch;
      text = 'Find spools directly by ID or location.';
    } else if (state.view === 'material') {
      targetEl = document.getElementById('btn-mat-save');
      text = 'Empty trace records block QC release until fully provided.';
    } else if (state.view === 'nde') {
      targetEl = UI.ndeOutcomeSelect;
      text = 'Rejections mandate a defect code and maintain the blocker state.';
    } else if (state.view === 'rft') {
      targetEl = UI.rftNdeCriterion;
      text = 'Criteria update synchronously upon NDE recording.';
    } else if (state.view === 'testpack') {
      targetEl = document.getElementById('tp-actions');
      text = 'Workflow state transitions unlock subsequent stage actions.';
    }

    if (!targetEl) {
      targetEl = document.querySelector('.main-nav');
      text = 'Navigate to different sections using the sidebar.';
    }

    const textEl = document.getElementById('coach-mark-text');
    textEl.textContent = text;
    
    const rect = targetEl.getBoundingClientRect();
    let topPos = rect.bottom + 12;
    let leftPos = rect.left - 140 + (rect.width / 2);
    
    // Clamp
    if (leftPos < 16) leftPos = 16;
    if (leftPos + 280 > window.innerWidth) leftPos = window.innerWidth - 296;

    UI.coachMark.style.top = topPos + 'px';
    UI.coachMark.style.left = leftPos + 'px';
    
    const arrow = UI.coachMark.querySelector('.coach-mark-arrow');
    const relativeArrowLeft = rect.left + (rect.width / 2) - leftPos - 6;
    arrow.style.top = '-7px';
    arrow.style.left = Math.max(10, Math.min(260, relativeArrowLeft)) + 'px';
    
    if (window.innerWidth <= 768) {
      arrow.style.display = 'none';
      UI.coachMark.style.left = '16px';
      UI.coachMark.style.width = 'calc(100vw - 32px)';
    } else {
      arrow.style.display = 'block';
      UI.coachMark.style.width = '280px';
    }
  }

  function closeHelp() {
    state.helpVisible = false;
    UI.coachMark.classList.add('hidden');
  }

  function dismissHelp() {
    state.helpDismissed = true;
    localStorage.setItem('pipeqc-ux-a-help-dismissed', 'true');
    closeHelp();
    showToast('Help suggestions disabled');
  }

  function showToast(msg) {
    UI.toast.textContent = msg;
    UI.toast.classList.remove('hidden');
    setTimeout(() => {
      UI.toast.classList.add('hidden');
    }, 3000);
  }

  function render() {
    applyRoleRestrictions();
    
    // Header & Badges
    if (state.project === 'P-104') {
      UI.headerProjCode.textContent = 'P-104';
      UI.headerProjName.textContent = 'North process unit';
      UI.headerProjMeta.textContent = 'EPC contractor Meridian, owner Industrial Works, contract NPU-04';
      UI.badgeP104.style.display = 'inline-block';
      UI.badgeP207.style.display = 'none';
    } else {
      UI.headerProjCode.textContent = 'P-207';
      UI.headerProjName.textContent = 'Cooling water loop';
      UI.headerProjMeta.textContent = '0 spool, 0 NDE records';
      UI.badgeP104.style.display = 'none';
      UI.badgeP207.style.display = 'inline-block';
    }
    
    // Update breadcrumb project labels
    [UI.crumbFab, UI.crumbMat, UI.crumbNde, UI.crumbRft, UI.crumbTp].forEach(el => {
      if(el) el.textContent = state.project;
    });

    // Active View Container
    UI.views.forEach(v => {
      if (v.getAttribute('data-view') === state.view) {
        v.classList.add('active');
      } else {
        v.classList.remove('active');
      }
    });

    // Active Nav Item
    UI.navItems.forEach(n => {
      const mapping = {
        'overview': 'overview',
        'projects': '',
        'fabrication': 'fabrication',
        'material': 'fabrication',
        'nde': 'nde',
        'rft': 'rft',
        'testpack': 'testpack'
      };
      const activeNavTarget = mapping[state.view];
      
      if (n.getAttribute('data-target') === activeNavTarget) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });

    // View specific renders
    if (state.view === 'overview') renderOverview();
    if (state.view === 'fabrication') renderFabrication();
    if (state.view === 'material') renderMaterial();
    if (state.view === 'nde') renderNde();
    if (state.view === 'rft') renderRft();
    if (state.view === 'testpack') renderTestPack();
  }

  function applyRoleRestrictions() {
    if (state.role === 'reader') {
      UI.readerNotice.style.display = 'flex';
      document.querySelectorAll('.restrict-input').forEach(el => {
        el.disabled = true;
      });
      document.querySelectorAll('.restrict-btn').forEach(el => {
        el.disabled = true;
      });
    } else {
      UI.readerNotice.style.display = 'none';
      document.querySelectorAll('.restrict-input').forEach(el => {
        el.disabled = false;
      });
      document.querySelectorAll('.restrict-btn').forEach(el => {
        el.disabled = false;
      });
    }
  }

  function renderOverview() {
    if (state.project === 'P-104') {
      UI.overviewContent.style.display = 'grid';
      UI.overviewEmpty.style.display = 'none';
      
      const rft = state.p104.ndeResolved ? 2 : 1;
      const rec = state.p104.ndeResolved ? 64 : 63;
      const iss = state.p104.ndeResolved ? 18 : 19;
      
      document.getElementById('overview-rft-count').textContent = rft;
      document.getElementById('overview-nde-recorded').textContent = rec;
      document.getElementById('overview-nde-issued').textContent = iss;
      
      const issEl = document.getElementById('overview-nde-issued');
      if (state.p104.ndeResolved) {
        issEl.classList.remove('terracotta');
      } else {
        issEl.classList.add('terracotta');
      }
      
      const tpBadge = document.getElementById('overview-tp-badge');
      if (state.p104.ndeResolved) {
        if(state.p104.tpBlinded) {
          tpBadge.textContent = 'Blinded';
          tpBadge.className = 'badge sage-badge';
        } else {
          tpBadge.textContent = 'Ready for blinding';
          tpBadge.className = 'badge sage-badge';
        }
      } else {
        tpBadge.textContent = 'Awaiting RFT';
        tpBadge.className = 'badge warning-badge';
      }

      const ndeBadge = document.getElementById('overview-nde-badge');
      if (ndeBadge) {
        if (state.p104.ndeResolved) {
          ndeBadge.textContent = 'Clear';
          ndeBadge.className = 'badge sage-badge';
        } else {
          ndeBadge.textContent = '1 Open Blocker';
          ndeBadge.className = 'badge warning-badge';
        }
      }
      
    } else {
      UI.overviewContent.style.display = 'none';
      UI.overviewEmpty.style.display = 'block';
    }
  }

  function renderFabrication() {
    if (state.project !== 'P-104') {
      UI.fabContent.style.display = 'none';
      UI.fabEmpty.style.display = 'block';
      return;
    }
    UI.fabContent.style.display = 'block';
    UI.fabEmpty.style.display = 'none';

    UI.fabTbody.innerHTML = '';
    const filtered = state.p104.spools.filter(s => s.id.toLowerCase().includes(state.searchQuery));
    
    if (filtered.length === 0) {
      UI.fabTbody.parentElement.style.display = 'none';
      UI.fabEmptySearch.style.display = 'block';
    } else {
      UI.fabTbody.parentElement.style.display = 'table';
      UI.fabEmptySearch.style.display = 'none';
      
      filtered.forEach(s => {
        const tr = document.createElement('tr');
        const ndeText = s.ndeBlockers > 0 ? s.ndeBlockers + ' Open' : 'Clear';
        const pwhtText = s.pwhtBlockers > 0 ? s.pwhtBlockers + ' Open' : 'Clear';
        tr.innerHTML = `
          <td><span class="mono">${s.id}</span></td>
          <td>${s.iso}</td>
          <td>${s.location}</td>
          <td>${s.stage}</td>
          <td class="${s.ndeBlockers > 0 ? 'terracotta' : ''}">${ndeText}</td>
          <td>${pwhtText}</td>
          <td>
            ${s.id === 'SP-1001-A' ? '<button class="btn btn-secondary btn-sm" data-action="navigate" data-target="material" data-spool="SP-1001-A">View Material</button>' : '<button class="btn btn-ghost btn-sm" disabled>Outside this prototype</button>'}
          </td>
        `;
        UI.fabTbody.appendChild(tr);
      });
    }
  }

  function renderMaterial() {
    if (state.project !== 'P-104') {
      UI.matContent.style.display = 'none';
      UI.matEmpty.style.display = 'block';
      UI.valveTrace.value = '';
      return;
    }
    UI.matContent.style.display = 'flex';
    UI.matEmpty.style.display = 'none';
    
    UI.valveTrace.value = state.p104.materialTraces['VLV-300'] || '';
    renderMaterialGate();
  }
  
  function renderMaterialGate() {
    const trace = state.p104.materialTraces['VLV-300'];
    if (state.p104.materialReady && trace && trace.trim() !== '') {
      UI.matGateStatus.className = 'gate-status success';
      UI.matGateStatus.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span>All trace records filled (3 of 3)</span>
      `;
    } else {
      UI.matGateStatus.className = 'gate-status pending';
      UI.matGateStatus.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>Incomplete trace records (2 of 3 filled)</span>
      `;
    }
  }

  function renderNde() {
    if (state.project !== 'P-104') {
      UI.ndeContent.style.display = 'none';
      UI.ndeEmpty.style.display = 'block';
      if (UI.ndeForm) UI.ndeForm.style.display = 'none';
      return;
    }
    UI.ndeContent.style.display = 'block';
    UI.ndeEmpty.style.display = 'none';
    
    UI.ndeTbody.innerHTML = '';
    state.p104.ndeRecords.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="mono">${r.report}</span></td>
        <td><span class="mono">${r.spool}</span></td>
        <td><span class="mono">${r.weld}</span></td>
        <td>${r.method}</td>
        <td class="${r.status.startsWith('Rejected') ? 'terracotta' : (r.status === 'Accepted' ? 'sage-dark' : '')}">
          ${r.status}
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" data-action="open-nde-form">View Record</button>
        </td>
      `;
      UI.ndeTbody.appendChild(tr);
    });
  }

  function renderRft() {
    if (state.project !== 'P-104') {
      UI.rftContent.style.display = 'none';
      UI.rftEmpty.style.display = 'block';
      return;
    }
    UI.rftContent.style.display = 'block';
    UI.rftEmpty.style.display = 'none';
    
    if (state.p104.ndeResolved) {
      UI.rftNdeCriterion.classList.remove('incomplete');
      UI.rftNdeCriterion.classList.add('complete');
      UI.rftNdeCriterion.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <div class="criterion-text">NDE clear <span class="muted" style="font-weight:normal; font-size:13px; margin-left:8px;">0 open obligations</span></div>
      `;
    } else {
      UI.rftNdeCriterion.classList.add('incomplete');
      UI.rftNdeCriterion.classList.remove('complete');
      UI.rftNdeCriterion.innerHTML = `
        <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
        <div class="criterion-text">NDE clear <span class="error-text">1 open obligation</span></div>
        <button class="btn btn-secondary btn-sm ml-auto" data-action="navigate" data-target="nde">Resolve NDE</button>
      `;
    }
  }

  function renderTestPack() {
    if (state.project !== 'P-104') {
      UI.tpContent.style.display = 'none';
      UI.tpEmpty.style.display = 'block';
      return;
    }
    UI.tpContent.style.display = 'block';
    UI.tpEmpty.style.display = 'none';
    
    if (state.p104.tpBlinded) {
      UI.tpState.innerHTML = `
        <div class="state-badge success">Start Testing</div>
        <p class="state-desc mt-2">Test pack is blinded. Testing phase can begin.</p>
      `;
      UI.tpActions.innerHTML = `
        <button class="btn btn-primary restrict-btn" disabled>Testing Sequence</button>
      `;
    } else if (state.p104.ndeResolved) {
      UI.tpState.innerHTML = `
        <div class="state-badge success">Ready for blinding</div>
        <p class="state-desc mt-2">All member spools are Ready for Test. Blinding can commence.</p>
      `;
      UI.tpActions.innerHTML = `
        <button class="btn btn-primary restrict-btn" data-action="simulate-save-tp">Simulate Mark Blinded</button>
      `;
    } else {
      UI.tpState.innerHTML = `
        <div class="state-badge warning">Awaiting RFT</div>
        <p class="state-desc mt-2">Cannot proceed until all member spools are Ready for Test.</p>
      `;
      UI.tpActions.innerHTML = `
        <button class="btn btn-secondary restrict-btn" disabled>Simulate Mark Blinded</button>
      `;
    }
    
    // Re-apply restrictions after changing HTML inside actions
    applyRoleRestrictions();
  }

  // start app
  init();

})();

