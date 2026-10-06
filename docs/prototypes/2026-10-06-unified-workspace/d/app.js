(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var STORE_KEY = 'pipeqc-ux-d.help.v1';
  var ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
    tool: '<path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-9 9a2 2 0 0 1-2.8-2.8l9-9z"/><path d="M14.5 6.5l2-2"/>',
    hardhat: '<path d="M4 17h16"/><path d="M5 17a7 7 0 0 1 14 0"/><path d="M10 10V6h4v4"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    pencil: '<path d="M4 20l4-1 11-11-3-3L5 16z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    circle: '<circle cx="12" cy="12" r="7"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };
  function icon(n) {
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[n] + '</svg>';
  }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }
  function badge(kind, text) { return '<span class="badge b-' + kind + '">' + esc(text) + '</span>'; }

  /* ---------- registry: one NAV drives rail, map, tabs, active state ---------- */
  var NAV = [
    { id: 'engineering', label: 'Engineering', kind: 'stage', step: '01', icon: 'pencil', disabled: true, views: [] },
    { id: 'fabrication', label: 'Fabrication', kind: 'stage', step: '02', icon: 'tool', home: 'fabrication', views: ['fabrication', 'material'] },
    { id: 'erection', label: 'Erection', kind: 'stage', step: '03', icon: 'hardhat', home: 'rft', views: ['rft'] },
    { id: 'testpack', label: 'Test Packs', kind: 'stage', step: '04', icon: 'flask', home: 'testpack', views: ['testpack'] },
    { id: 'nde', label: 'NDE', kind: 'service', step: 'Shared service', icon: 'scan', home: 'nde', views: ['nde'] },
    { id: 'tracking', label: 'Tracking', kind: 'service', step: 'Shared service', icon: 'pin', disabled: true, views: [] }
  ];
  var VIEW_LABELS = {
    overview: 'Overview', projects: 'Projects', fabrication: 'Spool list', material: 'Material check',
    nde: 'NDE results', rft: 'RFT readiness', testpack: 'Test pack'
  };
  var WORK = { fabrication: 1, material: 1, nde: 1, rft: 1, testpack: 1 };
  function navFor(view) {
    for (var i = 0; i < NAV.length; i++) if (NAV[i].views.indexOf(view) >= 0) return NAV[i];
    return null;
  }

  /* ---------- synthetic data ---------- */
  var PROJECTS = {
    'P-104': {
      code: 'P-104', title: 'North process unit', epc: 'Meridian', owner: 'Industrial Works', contract: 'NPU-04',
      desc: 'Main process unit with shop fabrication, site erection and pressure testing in progress.',
      summary: '16 spools · 85 NDE obligations · 2 test packs'
    },
    'P-207': {
      code: 'P-207', title: 'Cooling water loop', epc: 'Meridian', owner: 'Industrial Works', contract: 'CWL-02',
      desc: 'New project. No spools have been loaded yet.',
      summary: '0 spools · 0 NDE records · 0 test packs'
    }
  };
  var SPOOLS = [
    { id: 'SP-1001-A', iso: 'ISO-1001', rev: 'R0', loc: 'Pipe rack PR-2', stage: 'Erection', welded: '2026-09-28', supported: '2026-09-30', nde: 1, pwht: 0 },
    { id: 'SP-1002-A', iso: 'ISO-1002', rev: 'R1', loc: 'Shop bay 3', stage: 'Fabrication', welded: null, supported: null, nde: 2, pwht: 1 },
    { id: 'SP-1003-A', iso: 'ISO-1003', rev: 'R0', loc: 'Laydown L-1', stage: 'Fabrication', welded: null, supported: null, nde: 0, pwht: 0 },
    { id: 'SP-1005-A', iso: 'ISO-1005', rev: 'R0', loc: 'Unit 2 rack', stage: 'Erection', welded: '2026-09-22', supported: '2026-09-25', nde: 0, pwht: 0 },
    { id: 'SP-1006-A', iso: 'ISO-1006', rev: 'R2', loc: 'Shop bay 1', stage: 'Fabrication', welded: null, supported: null, nde: 1, pwht: 0 },
    { id: 'SP-1007-A', iso: 'ISO-1007', rev: 'R0', loc: 'Laydown L-2', stage: 'Fabrication', welded: null, supported: null, nde: 0, pwht: 0 }
  ];
  var IDENTS = [
    { id: 'IC-2104', desc: 'Pipe 6" SCH40 A106-B seamless', qty: '12 m', trace: 'HT-48213' },
    { id: 'IC-3310', desc: 'Elbow 90° LR 6" SCH40 A234-WPB', qty: '4 ea', trace: 'HT-48220' },
    { id: 'IC-5527', desc: 'Flange WN 6" 150# RF A105', qty: '2 ea', trace: '' }
  ];
  var TPS = [
    { id: 'TP-014', iso: 'ISO-1001', rev: 'R0', spool: 'SP-1001-A' },
    { id: 'TP-015', iso: 'ISO-1002', rev: 'R1', spool: 'SP-1002-A' }
  ];
  var DEFECTS = [
    ['DC-01', 'Lack of fusion'], ['DC-02', 'Porosity'], ['DC-03', 'Crack'],
    ['DC-04', 'Incomplete penetration'], ['DC-05', 'Undercut']
  ];
  function spoolById(id) {
    for (var i = 0; i < SPOOLS.length; i++) if (SPOOLS[i].id === id) return SPOOLS[i];
    return SPOOLS[0];
  }
  function tpById(id) {
    for (var i = 0; i < TPS.length; i++) if (TPS[i].id === id) return TPS[i];
    return TPS[0];
  }

  /* ---------- state: business, draft (unsaved), ui, help kept apart ---------- */
  var S = {
    project: 'P-104', view: 'overview', spool: 'SP-1001-A', tp: 'TP-014', from: null,
    role: 'QC Engineer', query: '', filter: 'all',
    traces: {}, nde: null, blinded: false, testing: false,
    draft: null, errors: { traces: {}, nde: {} }, feedback: null,
    help: { open: false }
  };
  var seenHelp = {};
  var prefs = loadPrefs();

  function freshBusiness() {
    S.traces = {};
    IDENTS.forEach(function (i) { S.traces[i.id] = i.trace; });
    S.nde = { status: 'issued', report: '', date: '', outcome: '', defect: '' };
    S.blinded = false;
    S.testing = false;
  }
  function freshDraft() {
    var t = {};
    IDENTS.forEach(function (i) { t[i.id] = S.traces[i.id]; });
    return { traces: t, report: '', date: '', outcome: '', defect: '' };
  }
  function resetTransient() {
    S.query = '';
    S.filter = 'all';
    S.draft = freshDraft();
    S.errors = { traces: {}, nde: {} };
    S.feedback = null;
    S.from = null;
  }
  freshBusiness();
  S.draft = freshDraft();

  function loadPrefs() {
    try {
      var v = JSON.parse(window.localStorage.getItem(STORE_KEY));
      if (v && typeof v === 'object') return v;
    } catch (e) { /* storage unavailable */ }
    return { suppress: false };
  }
  function savePrefs() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }

  /* ---------- derived state ---------- */
  function isDemo() { return S.project === 'P-104'; }
  function canWrite() { return S.role === 'QC Engineer' && isDemo(); }
  function accepted() { return S.nde.status === 'accepted'; }
  function eff(s) {
    var open = s.nde - (accepted() && s.id === 'SP-1001-A' ? 1 : 0);
    var rft = !!(s.welded && s.supported) && open === 0 && s.pwht === 0;
    return { nde: open, pwht: s.pwht, rft: rft };
  }
  function status(s) {
    var e = eff(s);
    if (e.rft) return { kind: 'ok', label: 'Ready for Test' };
    if (e.nde > 0 && e.pwht > 0) return { kind: 'block', label: 'Blocked · NDE + PWHT' };
    if (e.nde > 0) return { kind: 'block', label: 'Blocked · NDE' };
    if (e.pwht > 0) return { kind: 'block', label: 'Blocked · PWHT' };
    if (s.loc.indexOf('Laydown') === 0) return { kind: 'neutral', label: 'At Laydown' };
    return { kind: 'info', label: 'In progress' };
  }
  function filled() {
    var n = 0;
    IDENTS.forEach(function (i) { if (String(S.traces[i.id] || '').trim()) n++; });
    return n;
  }
  function counts() {
    if (!isDemo()) return { spools: 0, laydown: 0, rft: 0, obligations: 0, recorded: 0, issued: 0 };
    var a = accepted() ? 1 : 0;
    var r = (S.nde.status === 'accepted' || S.nde.status === 'rejected') ? 1 : 0;
    return { spools: 16, laydown: 4, rft: 1 + a, obligations: 85, recorded: 63 + r, issued: 19 - r };
  }
  function tpStage(tpId) {
    if (tpId !== 'TP-014') return 'awaiting_rft';
    if (!eff(spoolById('SP-1001-A')).rft) return 'awaiting_rft';
    if (!S.blinded) return 'blinding';
    if (!S.testing) return 'ready_test';
    return 'testing';
  }
  var TP_LABEL = { awaiting_rft: 'Awaiting RFT', blinding: 'Ready for blinding', ready_test: 'Ready for testing', testing: 'Testing started' };
  var TP_ORDER = ['awaiting_rft', 'blinding', 'ready_test', 'testing'];

  function navMeta(id) {
    var c = counts();
    var a = eff(spoolById('SP-1001-A'));
    var m = { value: '', sub: '', rail: '', blocked: false, chip: null };
    if (id === 'engineering' || id === 'tracking') {
      m.value = 'Outside this prototype'; m.sub = 'Not available here'; m.rail = 'Outside this prototype';
    } else if (!isDemo()) {
      if (id === 'fabrication') { m.value = '0 spools'; m.sub = 'No Laydown spools'; m.rail = '0 spools'; }
      if (id === 'erection') { m.value = '0 Ready for Test'; m.sub = 'No spools yet'; m.rail = '0 RFT'; }
      if (id === 'testpack') { m.value = '0 test packs'; m.sub = 'Nothing to test'; m.rail = '0 packs'; }
      if (id === 'nde') { m.value = '0 / 0 results recorded'; m.sub = '0 NDE records'; m.rail = '0 issued'; }
    } else if (id === 'fabrication') {
      m.value = c.spools + ' spools'; m.sub = c.laydown + ' at Laydown · 25% (not QC release)'; m.rail = c.spools + ' spools';
      m.chip = filled() < 3 ? { kind: 'block', text: 'Heat/trace ' + filled() + ' of 3' } : { kind: 'ok', text: 'Material traces complete' };
    } else if (id === 'erection') {
      m.value = c.rft + ' Ready for Test'; m.rail = c.rft + ' RFT'; m.blocked = !a.rft;
      m.sub = a.rft ? 'SP-1001-A is Ready for Test' : 'SP-1001-A blocked by NDE';
    } else if (id === 'testpack') {
      m.value = 'TP-014'; m.sub = TP_LABEL[tpStage('TP-014')]; m.rail = 'TP-014';
    } else if (id === 'nde') {
      m.value = c.recorded + ' / ' + c.obligations + ' results recorded'; m.sub = c.issued + ' issued, awaiting result'; m.rail = c.issued + ' issued';
    }
    return m;
  }

  /* ---------- routing ---------- */
  function norm(r) {
    if (!PROJECTS[r.project]) r.project = 'P-104';
    if (!VIEW_LABELS[r.view]) r.view = 'overview';
    if (r.project === 'P-104') {
      var okS = false;
      SPOOLS.forEach(function (s) { if (s.id === r.spool) okS = true; });
      if (!okS) r.spool = 'SP-1001-A';
      var okT = false;
      TPS.forEach(function (t) { if (t.id === r.tp) okT = true; });
      if (!okT) r.tp = 'TP-014';
    } else { r.spool = null; r.tp = null; }
    if (r.view !== 'nde' || !VIEW_LABELS[r.from] || r.from === 'nde' || r.from === 'projects') r.from = null;
    return r;
  }
  function buildHash(r) {
    var h = '#/' + r.project + '/' + r.view;
    var q = [];
    if (r.project === 'P-104' && WORK[r.view]) {
      q.push('spool=' + encodeURIComponent(r.spool));
      if (r.view === 'testpack') q.push('tp=' + encodeURIComponent(r.tp));
      if (r.view === 'nde' && r.from) q.push('from=' + encodeURIComponent(r.from));
    }
    return q.length ? h + '?' + q.join('&') : h;
  }
  function parseHash() {
    var raw = (window.location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('?');
    var seg = parts[0].split('/');
    var r = { project: seg[0], view: seg[1], spool: S.spool, tp: S.tp, from: null };
    (parts[1] || '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      var v;
      try { v = decodeURIComponent(p[1] || ''); } catch (e) { v = ''; }
      if (p[0] === 'spool') r.spool = v;
      if (p[0] === 'tp') r.tp = v;
      if (p[0] === 'from') r.from = v;
    });
    return norm(r);
  }
  function curRoute() { return { project: S.project, view: S.view, spool: S.spool, tp: S.tp, from: S.from }; }

  function applyRoute(r, scroll) {
    var projChanged = r.project !== S.project;
    var viewChanged = r.view !== S.view;
    var objChanged = r.spool !== S.spool || r.tp !== S.tp;
    if (projChanged) resetTransient();
    if (projChanged || viewChanged || objChanged) closeHelp(false);
    if (projChanged || viewChanged) { S.feedback = null; S.errors = { traces: {}, nde: {} }; }
    S.project = r.project; S.view = r.view; S.spool = r.spool; S.tp = r.tp; S.from = r.from;
    render();
    if (scroll && (viewChanged || projChanged)) {
      window.scrollTo(0, 0);
      $('screen').focus({ preventScroll: true });
    }
  }
  function go(patch) {
    var r = curRoute();
    Object.keys(patch).forEach(function (k) { if (patch[k] !== undefined) r[k] = patch[k]; });
    if (!('from' in patch)) r.from = (r.view === 'nde' && S.view === 'nde') ? S.from : null;
    r = norm(r);
    var h = buildHash(r);
    if (h !== window.location.hash) window.history.pushState(null, '', h);
    applyRoute(r, true);
  }
  function openProject(code) {
    if (code === S.project) { go({ view: 'overview' }); return; }
    go({ project: code, view: 'overview', spool: null, tp: null, from: null });
  }

  /* ---------- shared view pieces ---------- */
  function head(view, title, lede, extra) {
    var nav = navFor(view);
    var crumbs = '<nav class="crumbs" aria-label="Breadcrumb"><span class="mono">' + esc(S.project) + '</span>';
    if (nav) crumbs += '<span class="sep">›</span><span>' + esc(nav.label) + '</span>';
    crumbs += '<span class="sep">›</span><span>' + esc(VIEW_LABELS[view]) + '</span></nav>';
    var chip = '';
    if (isDemo() && WORK[view]) {
      if (view === 'testpack') {
        chip = '<span class="obj-chip">' + icon('flask') + '<span class="mono">' + esc(S.tp) + '</span></span>';
      } else {
        var s = spoolById(S.spool);
        chip = '<span class="obj-chip">' + icon('pin') + '<span class="mono">' + esc(s.id) + '</span><span class="muted">' + esc(s.iso + ' ' + s.rev) + '</span></span>';
      }
    }
    var back = '';
    if (view === 'nde' && S.from) {
      back = '<button type="button" class="btn btn-secondary btn-small" data-action="' + esc(S.from) + '" data-from="">' +
        icon('back') + '<span>Back to ' + esc(VIEW_LABELS[S.from]) + '</span></button>';
    }
    var tabs = '';
    if (nav && nav.views.length > 1) {
      tabs = '<div class="tabs" role="group" aria-label="' + esc(nav.label) + ' screens">';
      nav.views.forEach(function (v) {
        tabs += '<button type="button" class="tab" data-action="' + v + '"' + (v === view ? ' aria-current="page"' : '') + '>' + esc(VIEW_LABELS[v]) + '</button>';
      });
      tabs += '</div>';
    }
    return '<div class="page-head">' + crumbs +
      '<div class="head-row"><div class="head-left"><h1>' + esc(title) + '</h1>' + chip + '</div>' + back + '</div>' +
      (lede ? '<p class="lede">' + lede + '</p>' : '') + (extra || '') + tabs + '</div>';
  }
  function readerNote() {
    if (S.role !== 'Reader') return '';
    return '<p class="access-note" role="note">' + icon('eye') + '<span><strong>Reader access.</strong> This screen is read-only: you can inspect state and follow links, but fields and save commands are unavailable.</span></p>';
  }
  function emptyProject(view) {
    var t = {
      fabrication: 'No spools in ' + S.project, material: 'No spools to check', rft: 'No spools to assess',
      nde: 'No NDE records', testpack: 'No test packs'
    }[view];
    return head(view, VIEW_LABELS[view], '') +
      '<div class="empty" data-help-target="' + esc(HELP[view].target) + '">' + icon('info') +
      '<h3>' + esc(t) + '</h3>' +
      '<p class="muted">' + esc(PROJECTS[S.project].title) + ' has 0 spools and 0 NDE records. Loading data is outside this prototype.</p>' +
      '<div class="actions"><button type="button" class="btn" data-action="open-project" data-project="P-104">Open P-104 to see the workflow</button>' +
      '<button type="button" class="btn btn-secondary" data-action="projects">All projects</button></div></div>';
  }
  function outsidePath(what) {
    return '<section class="panel"><div class="empty">' + icon('info') + '<h3>Outside the demo path</h3>' +
      '<p class="muted">' + esc(what) + ' for ' + esc(S.spool) + ' is not part of this demonstration. The linked scenario runs on SP-1001-A.</p>' +
      '<div class="actions"><button type="button" class="btn" data-action="select-spool" data-spool="SP-1001-A">Select SP-1001-A</button></div></div></section>';
  }
  function spoolPicker() {
    var h = '<section><h2 id="pick-h">Spools</h2><div class="picker" role="group" aria-labelledby="pick-h" data-help-target="picker">';
    SPOOLS.forEach(function (s) {
      var st = status(s);
      h += '<button type="button" class="pick" data-action="select-spool" data-spool="' + s.id + '"' + (s.id === S.spool ? ' aria-current="true"' : '') + '>' +
        '<span class="pick-top"><span class="mono">' + s.id + '</span>' + badge(st.kind, st.label) + '</span>' +
        '<span class="pick-sub">' + esc(s.iso + ' ' + s.rev + ' · ' + s.loc) + '</span></button>';
    });
    return h + '</div></section>';
  }
  function workbench(list, main, evidence) {
    return '<div class="wb"><div class="stack">' + list + '</div><div class="stack">' + main + '</div><aside class="stack evidence" aria-label="Evidence">' + evidence + '</aside></div>';
  }
  function criteria(s, compact) {
    var e = eff(s);
    var rows = [];
    rows.push({ k: s.welded ? 'ok' : 'bad', n: 'Welded / Bolted', d: s.welded ? 'Recorded ' + s.welded : 'Not recorded' });
    rows.push({ k: s.supported ? 'ok' : 'bad', n: 'Supported', d: s.supported ? 'Recorded ' + s.supported : 'Not recorded' });
    var nd = 'None open';
    if (e.nde > 0) {
      nd = e.nde + ' open';
      if (s.id === 'SP-1001-A') nd = S.nde.status === 'rejected' ? '1 open — W-04 rejected, repair and re-examination pending' : '1 open — W-04 (RT, batch RT-006) has no result';
    }
    rows.push({ k: e.nde === 0 ? 'ok' : 'bad', n: 'NDE obligations', d: nd });
    rows.push({ k: e.pwht === 0 ? 'ok' : 'bad', n: 'PWHT', d: e.pwht === 0 ? '0 pending' : e.pwht + ' pending' });
    if (s.id === 'SP-1001-A') {
      rows.push({ k: 'info', n: 'Material check', d: filled() + ' of 3 heat/trace recorded · not an RFT criterion, informs the RFT date' });
    }
    var h = '<div class="crit' + (compact ? ' compact' : '') + '">';
    rows.forEach(function (r) {
      h += '<div class="crit-row ' + r.k + '">' + icon(r.k === 'ok' ? 'check' : r.k === 'bad' ? 'alert' : 'circle') +
        '<div><div class="crit-name">' + r.n + '</div><div class="crit-detail">' + esc(r.d) + '</div></div>' +
        '<span class="badge b-' + (r.k === 'ok' ? 'ok' : r.k === 'bad' ? 'block' : 'neutral') + '">' + (r.k === 'ok' ? 'Met' : r.k === 'bad' ? 'Open' : 'Info') + '</span></div>';
    });
    return h + '</div>';
  }
  function dis() { return canWrite() ? '' : ' disabled'; }

  /* ---------- views ---------- */
  function stageCard(it) {
    var m = navMeta(it.id);
    if (it.disabled) {
      return '<button type="button" class="stage-card" disabled><span class="sc-top"><span class="rail-step">' + esc(it.step) + '</span>' + icon('lock') + '</span>' +
        '<span class="sc-title">' + esc(it.label) + '</span><span class="sc-sub">Outside this prototype</span></button>';
    }
    return '<button type="button" class="stage-card' + (m.blocked ? ' is-blocked' : '') + '" data-action="' + it.home + '" data-nav="' + it.id + '">' +
      '<span class="sc-top"><span class="rail-step">' + esc(it.step) + '</span>' + icon(it.icon) + '</span>' +
      '<span class="sc-title">' + esc(it.label) + '</span>' +
      '<span class="sc-value">' + esc(m.value) + '</span><span class="sc-sub">' + esc(m.sub) + '</span>' +
      (m.chip ? '<span class="sc-chip">' + badge(m.chip.kind, m.chip.text) + '</span>' : '') + '</button>';
  }
  function queueItem(ok, title, detail, action, label, spool, from) {
    return '<li class="q-item' + (ok ? ' is-ok' : '') + '">' + icon(ok ? 'check' : 'alert') + '<div><p class="q-title">' + esc(title) + '</p><p class="q-detail">' + esc(detail) + '</p>' +
      '<button type="button" class="btn btn-secondary btn-small" data-action="' + action + '"' + (spool ? ' data-spool="' + spool + '"' : '') + (from ? ' data-from="' + from + '"' : '') + '>' + esc(label) + icon('arrow') + '</button></div></li>';
  }
  function viewOverview() {
    var p = PROJECTS[S.project];
    var h = head('overview', 'Project state', esc(p.title + ' · EPC ' + p.epc + ' · owner ' + p.owner + ' · contract ' + p.contract));
    var stages = NAV.filter(function (n) { return n.kind === 'stage'; });
    var svcs = NAV.filter(function (n) { return n.kind === 'service'; });
    var map = '<section class="panel map" aria-label="Process map"><div class="map-grid">';
    stages.forEach(function (n) { map += '<div class="cell">' + stageCard(n) + '</div>'; });
    map += '</div><div class="map-links" aria-hidden="true"><span></span><span class="lk"></span><span class="lk"></span><span></span></div><div class="map-svc">';
    svcs.forEach(function (n) { map += '<div class="svc-' + n.id + '">' + stageCard(n) + '</div>'; });
    map += '</div></section>';

    var q = '<section class="panel" data-help-target="queue"><div class="panel-head"><h2>Needs attention</h2></div>';
    if (!isDemo()) {
      q += '<div class="empty">' + icon('info') + '<h3>Nothing to work on yet</h3><p class="muted">' + esc(p.code) + ' has no spools or NDE records. Loading data is outside this prototype.</p>' +
        '<div class="actions"><button type="button" class="btn" data-action="open-project" data-project="P-104">Open P-104</button></div></div>';
    } else {
      var items = '';
      var a = eff(spoolById('SP-1001-A'));
      if (!a.rft) {
        items += queueItem(false, 'SP-1001-A is blocked by NDE',
          S.nde.status === 'rejected' ? 'W-04 was rejected; repair and re-examination are pending.' : 'W-04 (RT, batch RT-006) has no result recorded.',
          'nde', 'Record NDE result', 'SP-1001-A', 'overview');
      } else {
        items += queueItem(true, 'SP-1001-A is Ready for Test', 'All four RFT criteria are met in the local demo state.', 'rft', 'Open RFT readiness', 'SP-1001-A');
      }
      if (filled() < 3) {
        items += queueItem(false, 'Material check incomplete', 'SP-1001-A: ' + filled() + ' of 3 heat/trace values recorded.', 'material', 'Open material check', 'SP-1001-A');
      }
      var st = tpStage('TP-014');
      var tpT = { awaiting_rft: 'TP-014 is Awaiting RFT', blinding: 'TP-014 is ready for blinding', ready_test: 'TP-014 is ready for testing', testing: 'TP-014 testing started (simulated)' }[st];
      var tpD = { awaiting_rft: 'Waits for SP-1001-A to become Ready for Test.', blinding: 'Next step: simulate blinding.', ready_test: 'Next step: simulate start of testing.', testing: 'Later steps are outside this prototype.' }[st];
      items += queueItem(st === 'testing', tpT, tpD, 'testpack', 'Open test pack', null, null).replace('<button', '<button data-tp="TP-014"');
      q += '<ul class="queue-list">' + items + '</ul>';
    }
    q += '</section>';
    return h + '<div class="ov">' + map + q + '</div>';
  }

  function viewProjects() {
    var h = head('projects', 'Projects', 'Choose a project to work in. Opening a different project clears the previous selection, search and unsaved forms.');
    h += '<div class="cards">';
    Object.keys(PROJECTS).forEach(function (k) {
      var p = PROJECTS[k];
      var cur = k === S.project;
      h += '<article class="panel pcard' + (cur ? ' is-current' : '') + '"' + (cur ? ' data-help-target="current-project"' : '') + '>' +
        '<div class="panel-head"><span class="mono">' + p.code + '</span>' + (cur ? badge('ok', 'Current project') : badge('neutral', 'Not open')) + '</div>' +
        '<h3>' + esc(p.title) + '</h3><p class="muted">' + esc(p.desc) + '</p>' +
        '<dl class="facts"><dt>EPC contractor</dt><dd>' + esc(p.epc) + '</dd><dt>Owner</dt><dd>' + esc(p.owner) + '</dd><dt>Contract</dt><dd class="mono">' + esc(p.contract) + '</dd><dt>Contents</dt><dd>' + esc(p.summary) + '</dd></dl>' +
        '<div class="actions">' + (cur
          ? '<button type="button" class="btn" data-action="overview">Return to current project</button>'
          : '<button type="button" class="btn btn-secondary" data-action="open-project" data-project="' + k + '">Open project</button>') +
        '</div></article>';
    });
    return h + '</div>';
  }

  function filteredSpools() {
    var q = S.query.trim().toLowerCase();
    return SPOOLS.filter(function (s) {
      var st = status(s), e = eff(s);
      if (S.filter === 'laydown' && s.loc.indexOf('Laydown') !== 0) return false;
      if (S.filter === 'nde' && e.nde === 0) return false;
      if (S.filter === 'rft' && !e.rft) return false;
      if (!q) return true;
      return (s.id + ' ' + s.iso + ' ' + s.rev + ' ' + s.loc + ' ' + s.stage + ' ' + st.label).toLowerCase().indexOf(q) >= 0;
    });
  }
  function fabResults() {
    var rows = filteredSpools();
    var c = counts();
    var h = '<p class="stats" aria-live="polite">Showing <strong>' + rows.length + '</strong> of ' + SPOOLS.length + ' illustrative rows · project total <strong>' + c.spools + ' spools</strong> · <strong>' + c.laydown + '</strong> at Laydown (25%, not QC release) · <strong>' + c.rft + '</strong> Ready for Test</p>';
    if (!rows.length) {
      return h + '<div class="empty">' + icon('info') + '<h3>No matches</h3><p class="muted">No spool matches ' +
        (S.query.trim() ? '“' + esc(S.query.trim()) + '”' : 'this filter') + '. The project itself is not empty.</p>' +
        '<div class="actions"><button type="button" class="btn btn-secondary" data-action="clear-search">Clear search and filter</button></div></div>';
    }
    h += '<div class="table-wrap" role="region" aria-label="Spools table" tabindex="0"><table class="data"><thead><tr><th>Spool</th><th>ISO · Rev</th><th>Location</th><th>Stage</th><th>NDE open</th><th>PWHT open</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(function (s) {
      var e = eff(s), st = status(s), sel = s.id === S.spool;
      h += '<tr data-spool="' + s.id + '"' + (sel ? ' aria-selected="true"' : '') + '><td><button type="button" class="row-pick" data-action="select-spool" data-spool="' + s.id + '"' + (sel ? ' aria-current="true"' : '') + '>' + s.id + '</button></td>' +
        '<td class="mono">' + s.iso + ' ' + s.rev + '</td><td>' + esc(s.loc) + '</td><td>' + s.stage + '</td><td>' + e.nde + '</td><td>' + e.pwht + '</td><td>' + badge(st.kind, st.label) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function viewFabrication() {
    if (!isDemo()) return emptyProject('fabrication');
    var s = spoolById(S.spool), st = status(s);
    var h = head('fabrication', 'Fabrication', '');
    h += '<div class="toolbar"><div class="grow" data-help-target="search"><label class="sr-only" for="q">Search spools</label><input type="search" id="q" data-field="query" placeholder="Search spool, ISO, location" autocomplete="off" value="' + esc(S.query) + '"></div>' +
      '<label class="sr-only" for="flt">Filter</label><select id="flt" data-field="filter">' +
      [['all', 'All spools'], ['laydown', 'At Laydown'], ['nde', 'Blocked by NDE'], ['rft', 'Ready for Test']].map(function (o) {
        return '<option value="' + o[0] + '"' + (S.filter === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>';
    h += '<div id="fab-results">' + fabResults() + '</div>';
    var cta = s.id === 'SP-1001-A'
      ? '<button type="button" class="btn" data-action="material" data-spool="' + s.id + '">Open material check' + icon('arrow') + '</button>'
      : '<button type="button" class="btn" data-action="rft" data-spool="' + s.id + '">Open RFT readiness' + icon('arrow') + '</button>';
    h += '<div class="selbar"><div><span class="mono"><strong>' + s.id + '</strong></span> · ' + esc(s.iso + ' ' + s.rev + ' · ' + s.loc) + ' ' + badge(st.kind, st.label) + '</div>' + cta + '</div>';
    return h;
  }

  function viewMaterial() {
    if (!isDemo()) return emptyProject('material');
    var s = spoolById(S.spool);
    var h = head('material', 'Material check', 'Heat/trace numbers for the ident codes of the selected spool.');
    var main;
    if (s.id !== 'SP-1001-A') {
      main = outsidePath('Material lines');
    } else {
      var n = filled();
      var ok = n === 3;
      main = '<section class="panel"><div class="panel-head"><h2>Ident codes · ' + s.id + '</h2>' + (ok ? badge('ok', 'Complete · 3 of 3') : badge('block', 'Incomplete · ' + n + ' of 3')) + '</div>' +
        readerNote() +
        '<form id="trace-form" novalidate>';
      IDENTS.forEach(function (i, idx) {
        var err = S.errors.traces[i.id] || '';
        main += '<div class="trace-row"' + (idx === 2 ? ' data-help-target="trace"' : '') + '><div><div class="mono"><strong>' + i.id + '</strong></div><div class="trace-desc">' + esc(i.desc) + '</div></div>' +
          '<div class="qty">' + esc(i.qty) + '</div>' +
          '<div class="field"><label for="tr-' + i.id + '">Heat/trace</label><input type="text" id="tr-' + i.id + '" aria-label="Heat/trace for ' + i.id + '" data-field="trace" data-id="' + i.id + '" autocomplete="off" value="' + esc(S.draft.traces[i.id]) + '" aria-describedby="trerr-' + i.id + '"' + (err ? ' aria-invalid="true"' : '') + dis() + '>' +
          '<div class="field-err" id="trerr-' + i.id + '">' + esc(err) + '</div></div></div>';
      });
      main += '<p class="rule">' + icon('info') + '<span>Required: every ident code needs a heat/trace number. An empty field is not saved; saved values stay until you change them.</span></p>' +
        '<div class="actions"><button type="submit" class="btn" data-action="simulate-save" data-target="traces"' + dis() + '>Simulate save traces</button>' +
        (!canWrite() ? '<span class="hint">Unavailable: ' + (S.role === 'Reader' ? 'Reader access is read-only.' : 'no project data.') + '</span>' : '') +
        (ok && !accepted() ? '<button type="button" class="btn btn-secondary" data-action="nde" data-spool="SP-1001-A" data-from="material">Continue to NDE · W-04' + icon('arrow') + '</button>' : '') +
        '</div></form></section>';
    }
    var ev = '<section class="panel"><div class="panel-head"><h2>Readiness · ' + s.id + '</h2></div>' + criteria(s, true) +
      '<div class="actions"><button type="button" class="btn btn-secondary btn-small" data-action="rft" data-spool="' + s.id + '">Open RFT readiness</button></div></section>';
    return h + workbench(spoolPicker(), main, ev);
  }

  function viewNde() {
    if (!isDemo()) return emptyProject('nde');
    var s = spoolById(S.spool);
    var h = head('nde', 'NDE results', '');
    var list = '<section><h2 id="batch-h">Batch RT-006</h2><div class="picker" role="group" aria-labelledby="batch-h">' +
      '<button type="button" class="pick" data-action="select-spool" data-spool="SP-1001-A"' + (s.id === 'SP-1001-A' ? ' aria-current="true"' : '') + '><span class="pick-top"><span class="mono">W-04</span>' +
      (S.nde.status === 'accepted' ? badge('ok', 'Accepted') : S.nde.status === 'rejected' ? badge('block', 'Rejected') : badge('info', 'Issued')) + '</span><span class="pick-sub">SP-1001-A · RT</span></button>' +
      '<div class="static-row"><span class="mono">W-11</span> · SP-1002-A · issued<br>Other spool, outside demo path</div>' +
      '<div class="static-row"><span class="mono">W-12</span> · SP-1002-A · issued<br>Other spool, outside demo path</div></div></section>';
    var main, ev;
    if (s.id !== 'SP-1001-A') {
      main = outsidePath('NDE obligations');
      ev = '<section class="panel"><div class="panel-head"><h2>Project counters</h2></div>' + ndeCounters() + '</section>';
      return h + workbench(list, main, ev);
    }
    var n = S.nde, d = S.draft, er = S.errors.nde, closed = accepted();
    var stBadge = closed ? badge('ok', 'Accepted · closed') : n.status === 'rejected' ? badge('block', 'Rejected · repair pending') : badge('info', 'Issued · awaiting result');
    main = '<section class="panel"><div class="panel-head"><h2>Obligation · W-04</h2>' + stBadge + '</div>' +
      '<dl class="facts"><dt>Method</dt><dd>RT · radiographic testing</dd><dt>Weld</dt><dd class="mono">W-04</dd><dt>Batch</dt><dd class="mono">RT-006</dd><dt>Spool</dt><dd class="mono">SP-1001-A · ISO-1001 R0</dd></dl></section>';
    var off = (!canWrite() || closed) ? ' disabled' : '';
    main += '<section class="panel"><div class="panel-head"><h2>Record result</h2></div>' + readerNote() +
      '<form id="nde-form" novalidate><div class="form-grid">' +
      '<div class="field"><label for="nde-report">Report number</label><input type="text" id="nde-report" data-field="report" autocomplete="off" value="' + esc(d.report) + '" aria-describedby="nde-err-report"' + (er.report ? ' aria-invalid="true"' : '') + off + '><div class="field-err" id="nde-err-report">' + esc(er.report || '') + '</div></div>' +
      '<div class="field"><label for="nde-date">Examination date</label><input type="date" id="nde-date" data-field="date" value="' + esc(d.date) + '" aria-describedby="nde-err-date"' + (er.date ? ' aria-invalid="true"' : '') + off + '><div class="field-err" id="nde-err-date">' + esc(er.date || '') + '</div></div></div>' +
      '<fieldset class="field" style="margin-top:12px" data-help-target="outcome" aria-describedby="nde-rule nde-err-outcome"><legend>Outcome</legend><div class="radios">' +
      ['Accepted', 'Rejected'].map(function (o) {
        return '<label class="radio"><input type="radio" name="outcome" data-field="outcome" value="' + o + '"' + (d.outcome === o ? ' checked' : '') + off + '><span>' + o + '</span></label>';
      }).join('') + '</div><div class="field-err" id="nde-err-outcome">' + esc(er.outcome || '') + '</div></fieldset>' +
      '<div class="field" id="defect-field" style="margin-top:12px"' + (d.outcome === 'Rejected' ? '' : ' hidden') + '><label for="nde-defect">Defect code (required for Rejected)</label>' +
      '<select id="nde-defect" data-field="defect" aria-describedby="nde-err-defect"' + (er.defect ? ' aria-invalid="true"' : '') + off + '><option value="">Select defect code</option>' +
      DEFECTS.map(function (x) { return '<option value="' + x[0] + '"' + (d.defect === x[0] ? ' selected' : '') + '>' + x[0] + ' · ' + x[1] + '</option>'; }).join('') +
      '</select><div class="field-err" id="nde-err-defect">' + esc(er.defect || '') + '</div></div>' +
      '<p class="rule" id="nde-rule" style="margin-top:12px">' + icon('info') + '<span>Required: report number, examination date and outcome. A Rejected outcome also requires a defect code and keeps the blocker open.</span></p>' +
      '<div class="actions"><button type="submit" class="btn" data-action="simulate-save" data-target="nde"' + off + '>Simulate save result</button>' +
      (!canWrite() ? '<span class="hint">Unavailable: Reader access is read-only.</span>' : closed ? '<span class="hint">Result already recorded — nothing more to save.</span>' : '') +
      (closed ? '<button type="button" class="btn btn-secondary" data-action="rft" data-spool="SP-1001-A">Open RFT readiness' + icon('arrow') + '</button>' : '') +
      '</div></form></section>';
    ev = '<section class="panel"><div class="panel-head"><h2>Result data</h2></div><dl class="facts"><dt>Method</dt><dd>RT</dd><dt>Report</dt><dd class="mono">' + esc(n.status === 'issued' ? '—' : n.report) + '</dd><dt>Date</dt><dd>' + esc(n.status === 'issued' ? '—' : n.date) + '</dd><dt>Outcome</dt><dd>' + esc(n.status === 'issued' ? 'No result yet' : n.outcome) + '</dd>' +
      (n.status === 'rejected' ? '<dt>Defect</dt><dd class="mono">' + esc(n.defect) + '</dd>' : '') + '</dl>' +
      (n.status === 'rejected' ? '<p class="hint" style="margin-top:8px">Rejected evidence is kept locally. The obligation stays open until a re-examination is accepted.</p>' : '') + '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Effect on RFT</h2></div><p>SP-1001-A NDE open: <strong>' + eff(s).nde + '</strong>' + (eff(s).rft ? ' · Ready for Test' : ' · still blocked') + '</p>' +
      '<div class="actions"><button type="button" class="btn btn-secondary btn-small" data-action="rft" data-spool="SP-1001-A">Open RFT readiness</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Project counters</h2></div>' + ndeCounters() + '</section>';
    return h + workbench(list, main, ev);
  }
  function ndeCounters() {
    var c = counts();
    return '<dl class="facts"><dt>Obligations</dt><dd>' + c.obligations + '</dd><dt>Result recorded</dt><dd>' + c.recorded + '</dd><dt>Issued, awaiting</dt><dd>' + c.issued + '</dd></dl>' +
      '<p class="hint" style="margin-top:6px">“Recorded” counts results of any outcome. It is not an acceptance rate.</p>';
  }

  function viewRft() {
    if (!isDemo()) return emptyProject('rft');
    var s = spoolById(S.spool), e = eff(s), st = status(s);
    var h = head('rft', 'RFT readiness', '');
    var main = '<section class="panel"><div class="panel-head"><h2>Ready for Test · ' + s.id + '</h2>' + badge(st.kind, st.label) + '</div>' + criteria(s, false) + '<div data-help-target="rft-action" style="margin-top:12px">';
    if (e.rft) {
      main += '<div class="blocker okbox"><div class="blocker-text">' + icon('check') + '<span>All criteria are met in the local demo state. This is not a real QC release.</span></div>' +
        (s.id === 'SP-1001-A' ? '<button type="button" class="btn" data-action="testpack" data-spool="SP-1001-A" data-tp="TP-014">Open test pack TP-014' + icon('arrow') + '</button>' : '<span class="hint">Not in a demo test pack.</span>') + '</div>';
    } else if (s.id === 'SP-1001-A' && e.nde > 0) {
      main += '<div class="blocker"><div class="blocker-text">' + icon('alert') + '<span><strong>Blocked by NDE.</strong> ' + (S.nde.status === 'rejected' ? 'W-04 was rejected; a repair and an accepted re-examination are needed.' : 'W-04 (RT, batch RT-006) has no result.') + '</span></div>' +
        '<button type="button" class="btn" data-action="nde" data-spool="SP-1001-A" data-from="rft">Resolve NDE blocker' + icon('arrow') + '</button></div>';
    } else {
      main += '<div class="blocker"><div class="blocker-text">' + icon('alert') + '<span><strong>Blocked.</strong> Resolving the open criteria for ' + esc(s.id) + ' is outside the demo path.</span></div>' +
        '<button type="button" class="btn btn-secondary" data-action="select-spool" data-spool="SP-1001-A">Select SP-1001-A</button></div>';
    }
    main += '</div></section>';
    var tp = null;
    TPS.forEach(function (t) { if (t.spool === s.id) tp = t; });
    var rftDate = e.rft ? (s.welded > s.supported ? s.welded : s.supported) : '—';
    var ev = '<section class="panel"><div class="panel-head"><h2>Downstream</h2></div><dl class="facts"><dt>RFT date</dt><dd>' + rftDate + '</dd><dt>Test pack</dt><dd>' +
      (tp ? '<span class="mono">' + tp.id + '</span> · ' + TP_LABEL[tpStage(tp.id)] : 'None') + '</dd><dt>RFT spools</dt><dd>' + counts().rft + ' of 16</dd></dl>' +
      (tp ? '<div class="actions"><button type="button" class="btn btn-secondary btn-small" data-action="testpack" data-tp="' + tp.id + '" data-spool="' + s.id + '">View ' + tp.id + '</button></div>' : '') + '</section>';
    return h + workbench(spoolPicker(), main, ev);
  }

  function viewTestpack() {
    if (!isDemo()) return emptyProject('testpack');
    var t = tpById(S.tp), stg = tpStage(t.id), idx = TP_ORDER.indexOf(stg);
    var sp = spoolById(t.spool), e = eff(sp);
    var h = head('testpack', 'Test pack', 'Membership, current workflow state and the one action valid right now.');
    var list = '<section><h2 id="tp-h">Test packs</h2><div class="picker" role="group" aria-labelledby="tp-h">';
    TPS.forEach(function (x) {
      list += '<button type="button" class="pick" data-action="select-tp" data-tp="' + x.id + '"' + (x.id === t.id ? ' aria-current="true"' : '') + '><span class="pick-top"><span class="mono">' + x.id + '</span></span><span class="pick-sub">' + TP_LABEL[tpStage(x.id)] + ' · ' + x.iso + '</span></button>';
    });
    list += '</div></section>';
    var main = '<section class="panel"><div class="panel-head"><h2 id="tp-header-id" class="mono">' + t.id + '</h2>' + badge(idx > 0 ? 'ok' : 'block', TP_LABEL[stg]) + '</div><div class="steps" aria-label="Workflow state">';
    TP_ORDER.forEach(function (k, i) {
      main += '<div class="step' + (i < idx ? ' done' : i === idx ? ' now' : '') + '"' + (i === idx ? ' aria-current="step"' : '') + '><strong>' + TP_LABEL[k] + '</strong>' + (i < idx ? 'Done' : i === idx ? 'Current' : 'Later') + '</div>';
    });
    main += '</div></section><section class="panel"><div class="panel-head"><h2>Membership</h2></div><div class="table-wrap"><table class="data" style="min-width:420px"><thead><tr><th>ISO</th><th>Spool</th><th>RFT</th></tr></thead><tbody><tr><td class="mono">' + t.iso + ' ' + t.rev + '</td><td class="mono">' + sp.id + (sp.id === S.spool ? ' (selected)' : '') + '</td><td>' + badge(e.rft ? 'ok' : 'block', e.rft ? 'Ready for Test' : 'Not ready') + '</td></tr></tbody></table></div></section>';
    main += '<section class="panel">' + readerNote() + '<div data-help-target="tp-action">';
    var off = canWrite() ? '' : ' disabled';
    if (t.id !== 'TP-014') {
      main += '<div class="blocker"><div class="blocker-text">' + icon('alert') + '<span><strong>Awaiting RFT.</strong> ' + sp.id + ' has open NDE and PWHT items that are outside the demo path.</span></div><button type="button" class="btn btn-secondary" data-action="rft" data-spool="' + sp.id + '">View RFT readiness</button></div>';
    } else if (stg === 'awaiting_rft') {
      main += '<div class="blocker"><div class="blocker-text">' + icon('alert') + '<span><strong>Blinding cannot start.</strong> SP-1001-A is not Ready for Test: NDE W-04 ' + (S.nde.status === 'rejected' ? 'was rejected and is still open.' : 'has no accepted result.') + '</span></div>' +
        '<button type="button" class="btn" data-action="nde" data-spool="SP-1001-A" data-from="testpack">Resolve NDE blocker' + icon('arrow') + '</button></div>' +
        '<div class="actions"><button type="button" class="btn btn-secondary btn-small" data-action="rft" data-spool="SP-1001-A">View RFT readiness</button></div>';
    } else if (stg === 'blinding') {
      main += '<div class="blocker okbox"><div class="blocker-text">' + icon('check') + '<span>Member spools are Ready for Test. Next step: blinding.</span></div><button type="submit" class="btn" data-action="simulate-save" data-target="tp-blind"' + off + '>Simulate blinding</button></div>';
    } else if (stg === 'ready_test') {
      main += '<div class="blocker okbox"><div class="blocker-text">' + icon('check') + '<span>Blinding recorded locally. Next step: start testing.</span></div><button type="submit" class="btn" data-action="simulate-save" data-target="tp-start"' + off + '>Simulate start testing</button></div>';
    } else {
      main += '<div class="blocker okbox"><div class="blocker-text">' + icon('check') + '<span>Testing started (simulated). Recording the test result and later steps are outside this prototype.</span></div></div>';
    }
    if (t.id === 'TP-014' && (stg === 'blinding' || stg === 'ready_test') && !canWrite()) main += '<p class="hint" style="margin-top:8px">Unavailable: Reader access is read-only.</p>';
    main += '</div></section>';
    var ev = '<section class="panel"><div class="panel-head"><h2>Evidence</h2></div><dl class="facts"><dt>Membership</dt><dd>1 ISO · 1 spool</dd><dt>Spool</dt><dd class="mono">' + sp.id + '</dd><dt>NDE open</dt><dd>' + e.nde + '</dd><dt>PWHT open</dt><dd>' + e.pwht + '</dd></dl>' +
      '<p class="hint" style="margin-top:8px">Blinding opens only after the pack’s spools are Ready for Test.</p></section>';
    return h + workbench(list, main, ev);
  }

  var VIEWS = { overview: viewOverview, projects: viewProjects, fabrication: viewFabrication, material: viewMaterial, nde: viewNde, rft: viewRft, testpack: viewTestpack };

  /* ---------- chrome ---------- */
  function railItem(it) {
    if (it.disabled) {
      return '<button type="button" class="rail-item' + (it.kind === 'service' ? ' is-service' : '') + '" disabled><span class="rail-text"><span class="rail-label">' + esc(it.label) + '</span><span class="rail-sub">Outside this prototype</span></span></button>';
    }
    var m = navMeta(it.id);
    var cur = navFor(S.view) === it;
    return '<button type="button" class="rail-item' + (it.kind === 'service' ? ' is-service' : '') + '" data-action="' + it.home + '" data-nav="' + it.id + '"' + (cur ? ' aria-current="page"' : '') + '>' +
      icon(it.icon) + '<span class="rail-text"><span class="rail-label">' + esc(it.label) + '</span><span class="rail-sub">' + esc(m.rail) + '</span></span></button>';
  }
  function renderRail() {
    var rail = $('rail');
    var show = WORK[S.view];
    rail.hidden = !show;
    if (!show) { rail.innerHTML = ''; return; }
    var h = '<div class="rail-track">';
    NAV.filter(function (n) { return n.kind === 'stage'; }).forEach(function (n, i) {
      if (i) h += '<span class="rail-arrow" aria-hidden="true">' + icon('arrow') + '</span>';
      h += railItem(n);
    });
    h += '<span class="rail-sep" aria-hidden="true"></span>';
    NAV.filter(function (n) { return n.kind === 'service'; }).forEach(function (n) { h += railItem(n); });
    rail.innerHTML = h + '</div>';
  }
  function renderChrome() {
    var p = PROJECTS[S.project];
    $('ident').innerHTML = '<span class="ident-code">' + esc(p.code) + '</span><span class="ident-title">' + esc(p.title) + '</span>';
    var bp = $('btn-projects'), bo = $('btn-overview');
    if (S.view === 'projects') bp.setAttribute('aria-current', 'page'); else bp.removeAttribute('aria-current');
    if (S.view === 'overview') bo.setAttribute('aria-current', 'page'); else bo.removeAttribute('aria-current');
    $('role').value = S.role;
    $('help-dot').hidden = prefs.suppress || !!seenHelp[S.view];
    document.title = VIEW_LABELS[S.view] + ' · ' + p.code + ' · PipeQC prototype D';
    renderRail();
  }
  function renderFeedback() {
    var f = S.feedback;
    $('feedback').innerHTML = f ? '<div class="fb fb-' + f.kind + '">' + icon(f.kind === 'ok' ? 'check' : f.kind === 'error' ? 'alert' : 'info') + '<div>' + esc(f.text) + '</div></div>' : '';
  }
  function setFeedback(kind, text) { S.feedback = { kind: kind, text: text }; }
  function render() {
    var scr = $('screen');
    scr.setAttribute('data-view', S.view);
    scr.innerHTML = VIEWS[S.view]();
    renderChrome();
    renderFeedback();
    if (S.help.open) { markTarget(); placeCoach(); }
  }

  /* ---------- help: separate from business state, never re-renders forms ---------- */
  var HELP = {
    overview: { target: 'queue', title: 'Start from the queue', body: 'Each row names a blocker and jumps to the screen where it is resolved. The map cards use the same navigation as the stage rail on other screens.' },
    projects: { target: 'current-project', title: 'Open or return', body: 'Return to current project keeps you where you were. Opening a different project clears the old selection, search and unsaved forms.' },
    fabrication: { target: 'search', title: 'Find a spool', body: 'Search filters the illustrative rows. Pick a row to carry that spool into Material check, NDE and RFT.' },
    material: { target: 'trace', title: 'Heat / trace', body: 'Every ident code needs a heat/trace number before the check is complete. Help never fills a field for you.' },
    nde: { target: 'outcome', title: 'Outcome', body: 'Accepted closes the local obligation once. Rejected needs a defect code and keeps the blocker open.' },
    rft: { target: 'rft-action', title: 'Blocker jump', body: 'The open criterion links to where it is resolved and returns here with the same spool.' },
    testpack: { target: 'tp-action', title: 'Current step', body: 'Only the action valid for the pack’s current state is offered. Later steps are outside this prototype.' }
  };
  function helpTarget() {
    var scr = $('screen');
    var t = scr.querySelector('[data-help-target="' + HELP[S.view].target + '"]');
    return t || $('btn-help');
  }
  function markTarget() {
    var old = document.querySelectorAll('.help-target');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('help-target');
    helpTarget().classList.add('help-target');
  }
  function openHelp() {
    var h = HELP[S.view];
    S.help.open = true;
    seenHelp[S.view] = true;
    $('coach-title').textContent = h.title;
    $('coach-body').textContent = h.body;
    var c = $('coach');
    c.hidden = false;
    $('btn-help').setAttribute('aria-expanded', 'true');
    var t = helpTarget();
    var r = t.getBoundingClientRect();
    var hb = $('top').getBoundingClientRect().bottom;
    if (r.top < hb + 8 || r.bottom > window.innerHeight - 8) t.scrollIntoView({ block: 'center' });
    markTarget();
    placeCoach();
    $('help-dot').hidden = true;
    var closeBtn = c.querySelector('[data-action="close-help"]');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }
  function closeHelp(restoreFocus) {
    var was = S.help.open;
    S.help.open = false;
    $('coach').hidden = true;
    $('btn-help').setAttribute('aria-expanded', 'false');
    var old = document.querySelectorAll('.help-target');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('help-target');
    if (was && restoreFocus) $('btn-help').focus({ preventScroll: true });
  }
  function placeCoach() {
    var c = $('coach');
    if (c.hidden) return;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var hb = $('top').getBoundingClientRect().bottom;
    var t = helpTarget();
    var r = t.getBoundingClientRect();
    var w = c.offsetWidth, h = c.offsetHeight;
    var below = vh - r.bottom - 12;
    var above = r.top - hb - 12;
    var place = (below >= h + 8 || below >= above) ? 'below' : 'above';
    var top = place === 'below' ? r.bottom + 10 : r.top - h - 10;
    top = clamp(top, hb + 8, Math.max(hb + 8, vh - h - 8));
    var left = clamp(r.left + r.width / 2 - w / 2, 8, Math.max(8, vw - w - 8));
    var cx = clamp(r.left + r.width / 2 - left - 7, 12, Math.max(12, w - 26));
    c.style.left = left + 'px';
    c.style.top = top + 'px';
    c.setAttribute('data-place', place);
    $('coach-caret').style.left = cx + 'px';
  }

  /* ---------- actions ---------- */
  function guardWrite() {
    if (canWrite()) return true;
    setFeedback('warn', S.role === 'Reader' ? 'Reader access is read-only. No change was made.' : 'This project has no objects to change.');
    renderFeedback();
    return false;
  }
  var SAVED_NOTE = ' Prototype only — no project data was saved.';
  function saveTraces() {
    if (!guardWrite()) return;
    var errs = {}, n = 0;
    IDENTS.forEach(function (i) {
      if (!String(S.draft.traces[i.id] || '').trim()) { errs[i.id] = 'Heat/trace is required.'; n++; }
    });
    if (n) {
      S.errors.traces = errs;
      setFeedback('error', 'Traces not saved: ' + n + ' ident code' + (n > 1 ? 's have' : ' has') + ' no heat/trace. Nothing was changed.');
      render();
      var bad = document.querySelector('#screen [aria-invalid="true"]');
      if (bad) bad.focus();
      return;
    }
    S.errors.traces = {};
    IDENTS.forEach(function (i) { S.traces[i.id] = String(S.draft.traces[i.id]).trim(); S.draft.traces[i.id] = S.traces[i.id]; });
    setFeedback('ok', 'Simulated: all 3 heat/trace values saved locally.' + SAVED_NOTE);
    render();
  }
  function saveNde() {
    if (!guardWrite()) return;
    if (accepted()) { setFeedback('warn', 'W-04 is already closed. No change was made.'); render(); return; }
    var d = S.draft, er = {}, n = 0;
    if (!d.report.trim()) { er.report = 'Report number is required.'; n++; }
    if (!d.date) { er.date = 'Examination date is required.'; n++; }
    if (!d.outcome) { er.outcome = 'Choose an outcome.'; n++; }
    else if (d.outcome === 'Rejected' && !d.defect) { er.defect = 'Defect code is required when the outcome is Rejected.'; n++; }
    if (n) {
      S.errors.nde = er;
      setFeedback('error', 'Result not saved: ' + n + ' required item' + (n > 1 ? 's' : '') + ' missing. W-04 stays open.');
      render();
      var bad = document.querySelector('#screen [aria-invalid="true"]');
      if (bad) bad.focus();
      return;
    }
    S.errors.nde = {};
    S.nde = { status: d.outcome === 'Accepted' ? 'accepted' : 'rejected', report: d.report.trim(), date: d.date, outcome: d.outcome, defect: d.outcome === 'Rejected' ? d.defect : '' };
    if (d.outcome === 'Accepted') {
      setFeedback('ok', 'Simulated: Accepted recorded locally. W-04 closed, SP-1001-A is Ready for Test and TP-014 is ready for blinding.' + SAVED_NOTE);
    } else {
      setFeedback('ok', 'Simulated: Rejected evidence recorded locally (' + d.defect + '). The NDE blocker stays open; SP-1001-A is not Ready for Test.' + SAVED_NOTE);
    }
    render();
  }
  function saveTp(kind) {
    if (!guardWrite()) return;
    var stg = tpStage('TP-014');
    if (kind === 'tp-blind') {
      if (stg !== 'blinding') { setFeedback('warn', 'Blinding is not available in the current state. No change was made.'); render(); return; }
      S.blinded = true;
      setFeedback('ok', 'Simulated: blinding recorded locally. TP-014 is ready for testing.' + SAVED_NOTE);
    } else {
      if (stg !== 'ready_test') { setFeedback('warn', 'Start testing is not available in the current state. No change was made.'); render(); return; }
      S.testing = true;
      setFeedback('ok', 'Simulated: testing started locally. The test result is outside this prototype.' + SAVED_NOTE);
    }
    render();
  }
  function selectSpool(id) {
    if (!id || id === S.spool) return;
    go({ spool: id });
  }
  function refreshResults() {
    var r = $('fab-results');
    if (r) r.innerHTML = fabResults();
    if (S.help.open) placeCoach();
  }

  var ACTIONS = {
    projects: function () { go({ view: 'projects' }); },
    overview: function () { go({ view: 'overview' }); },
    'open-project': function (el) { openProject(el.getAttribute('data-project')); },
    'select-spool': function (el) { selectSpool(el.getAttribute('data-spool')); },
    'select-tp': function (el) { var id = el.getAttribute('data-tp'); if (id && id !== S.tp) go({ tp: id }); },
    'clear-search': function () { S.query = ''; S.filter = 'all'; render(); var q = $('q'); if (q) q.focus(); },
    'simulate-save': function (el) {
      var t = el.getAttribute('data-target');
      if (t === 'traces') saveTraces();
      else if (t === 'nde') saveNde();
      else saveTp(t);
    },
    help: function () { if (S.help.open) closeHelp(true); else openHelp(); },
    'close-help': function () { closeHelp(true); },
    'help-never': function () { prefs.suppress = true; savePrefs(); closeHelp(true); renderChrome(); },
    'reset-demo': function () {
      freshBusiness(); resetTransient(); closeHelp(false);
      setFeedback('ok', 'Demo data reset to its initial illustrative state.');
      render();
    }
  };
  ['fabrication', 'material', 'nde', 'rft', 'testpack'].forEach(function (v) {
    ACTIONS[v] = function (el) {
      var patch = { view: v };
      var sp = el.getAttribute('data-spool'), tp = el.getAttribute('data-tp');
      if (sp) patch.spool = sp;
      if (tp) patch.tp = tp;
      if (el.hasAttribute('data-from')) patch.from = el.getAttribute('data-from') || null;
      go(patch);
    };
  });

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) {
      var tr = e.target.closest('tr[data-spool]');
      if (tr) selectSpool(tr.getAttribute('data-spool'));
      return;
    }
    if (el.disabled) return;
    if (el.type === 'submit') e.preventDefault();
    var fn = ACTIONS[el.getAttribute('data-action')];
    if (fn) fn(el);
  });
  document.addEventListener('submit', function (e) { e.preventDefault(); });
  document.addEventListener('input', function (e) {
    var t = e.target;
    var f = t.getAttribute && t.getAttribute('data-field');
    if (!f) return;
    if (f === 'query') { S.query = t.value; refreshResults(); return; }
    if (!canWrite()) return;
    if (f === 'trace') {
      var id = t.getAttribute('data-id');
      S.draft.traces[id] = t.value;
      delete S.errors.traces[id];
      t.removeAttribute('aria-invalid');
      var te = $('trerr-' + id); if (te) te.textContent = '';
    } else if (f === 'report' || f === 'date') {
      S.draft[f] = t.value;
      delete S.errors.nde[f];
      t.removeAttribute('aria-invalid');
      var ne = $('nde-err-' + f); if (ne) ne.textContent = '';
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    var f = t.getAttribute && t.getAttribute('data-field');
    if (!f) return;
    if (f === 'role') { S.role = t.value; S.feedback = null; render(); return; }
    if (f === 'filter') { S.filter = t.value; refreshResults(); return; }
    if (!canWrite()) return;
    if (f === 'outcome') {
      S.draft.outcome = t.value;
      delete S.errors.nde.outcome;
      var oe = $('nde-err-outcome'); if (oe) oe.textContent = '';
      var df = $('defect-field'); if (df) df.hidden = t.value !== 'Rejected';
    } else if (f === 'defect') {
      S.draft.defect = t.value;
      delete S.errors.nde.defect;
      t.removeAttribute('aria-invalid');
      var de = $('nde-err-defect'); if (de) de.textContent = '';
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.help.open) { e.preventDefault(); closeHelp(true); }
  });
  window.addEventListener('popstate', function () { applyRoute(parseHash(), true); });
  window.addEventListener('resize', function () { if (S.help.open) placeCoach(); });
  window.addEventListener('scroll', function () { if (S.help.open) placeCoach(); }, { passive: true });

  /* ---------- init ---------- */
  var first = parseHash();
  var hash = buildHash(first);
  if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  S.project = first.project; S.view = first.view; S.spool = first.spool; S.tp = first.tp; S.from = first.from;
  S.draft = freshDraft();
  render();
})();

