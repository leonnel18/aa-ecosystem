/**
 * app.js — AktivAsia Team Portal
 */

const DATA_URL = '../data/dashboard_data.json';

const FLAG_URLS = {
  PH: 'https://flagcdn.com/w80/ph.png',
  PK: 'https://flagcdn.com/w80/pk.png',
  KR: 'https://flagcdn.com/w80/kr.png',
  ID: 'https://flagcdn.com/w80/id.png',
};

const PORTAL_META = {
  PH: { name: 'Philippines', flag: '🇵🇭' },
  PK: { name: 'Pakistan',    flag: '🇵🇰' },
  KR: { name: 'Korea',       flag: '🇰🇷' },
  ID: { name: 'Indonesia',   flag: '🇮🇩' },
};

const POST_LABELS = {
  what_went_well:            'What went well?',
  sum_up_learning:           'Key learning',
  action_plan:               'Action plan (3 months)',
  improvement_suggestion:    'Improvement suggestions',
  next_workshop_suggestion:  'Suggestions for next workshop',
  testimonial:               'Testimonial',
};

const IMPACT_LABELS = {
  training_influence:      'How has training influenced your campaigning?',
  used_training:           'Used training to improve campaigns?',
  done_more_campaigning:   'Done more campaigning?',
  raised_more_funds:       'Raised more funds?',
  built_connections:       'Built connections?',
  achieved_objectives:     'Achieved campaign objectives?',
  stayed_connected:        'Stayed connected with campaigners?',
  trained_others:          'Trained others?',
  shared_learnings:        'Shared learnings?',
  whats_alive:             "What's alive in your campaign work now?",
  testimonial:             'Testimonial',
  shared_with_how_many:    'Shared learnings with how many people?',
};

// ── Data loading ─────────────────────────────────────────────────────────────

let _data = null;

async function loadData() {
  if (_data) return _data;
  const resp = await fetch(DATA_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} loading ${DATA_URL}`);
  _data = await resp.json();
  return _data;
}

function getPortalParam() {
  return new URLSearchParams(window.location.search).get('country');
}

function showError(msg) {
  const main = document.querySelector('main') || document.body;
  main.innerHTML = `
    <div style="padding:60px 24px;text-align:center;color:#788099">
      <p style="font-size:1.1rem;margin-bottom:12px">⚠️ ${msg}</p>
      <p style="font-size:.9rem">Make sure to open the portal via a local server:<br>
      <code style="background:#f5f4ee;padding:4px 10px;border-radius:6px">python -m http.server 8000</code><br>
      then open <strong>http://localhost:8000/portal/index.html</strong></p>
      <a href="index.html" style="display:inline-block;margin-top:20px;color:#821545;font-weight:700">← Back to portal list</a>
    </div>`;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function initTabs(defaultTabId, onActivate) {
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.report-section');

  function activateTab(targetId) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === targetId));
    sections.forEach(s => s.classList.toggle('active', s.id === targetId));
    if (onActivate) onActivate(targetId);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      activateTab(tab.dataset.tab);
    });
  });

  const firstId = defaultTabId || tabs[0]?.dataset.tab;
  if (firstId) activateTab(firstId);
}

// ── Index page ────────────────────────────────────────────────────────────────

function renderIndexPlanVsActual(data) {
  const tabsEl  = document.getElementById('pva-index-tabs');
  const tableEl = document.getElementById('pva-index-table');
  const labelEl = document.getElementById('pva-year-label');
  if (!tabsEl || !tableEl) return;

  const PORTALS = ['PH', 'PK', 'KR', 'ID', 'backbone'];
  const FLAGS   = { PH: '🇵🇭', PK: '🇵🇰', KR: '🇰🇷', ID: '🇮🇩', backbone: '🌏' };
  const NAMES   = { PH: 'Philippines', PK: 'Pakistan', KR: 'Korea', ID: 'Indonesia', backbone: 'Regional' };
  const TAB_LABELS = { year_1: 'Year 1', year_2: 'Year 2', archive: 'Archive' };
  const YEAR_SUBTITLES = {
    year_1:  'Year 1: Sep 2025 – Aug 2026',
    year_2:  'Year 2: Sep 2026 – Aug 2027',
    archive: 'Archive: Before Sep 2025',
  };
  const TABS = ['year_1', 'year_2', 'archive'];

  function getPortalBucket(portalCode, bucketKey) {
    return ((data.portals[portalCode] || {}).training_plan_summary || {})[bucketKey] || {
      target_activities: 0, actual_activities: 0,
      target_participants: 0, actual_participants: 0, rows: []
    };
  }

  function renderTable(bucketKey) {
    if (labelEl) labelEl.textContent = YEAR_SUBTITLES[bucketKey];
    let totalTargetAct = 0, totalActualAct = 0, totalTargetPart = 0, totalActualPart = 0;

    const rows = PORTALS.map(code => {
      const b = getPortalBucket(code, bucketKey);
      totalTargetAct  += b.target_activities;
      totalActualAct  += b.actual_activities;
      totalTargetPart += b.target_participants;
      totalActualPart += b.actual_participants;

      const completedTitles = b.rows
        .filter(r => r.status === 'Completed' && r.actual_title)
        .map(r => `<span class="badge badge-completed">${r.actual_title}</span>`)
        .join(' ');
      const plannedTitles = b.rows
        .filter(r => r.status !== 'Completed' && r.plan_title)
        .map(r => `<span class="badge badge-${(r.status||'upcoming').toLowerCase()}">${r.plan_title}</span>`)
        .join(' ');

      return `<tr>
        <td><span style="font-size:1.4rem;margin-right:6px">${FLAGS[code]}</span>${NAMES[code]}</td>
        <td style="text-align:center">${b.target_activities}</td>
        <td style="text-align:center">${b.actual_activities}</td>
        <td style="text-align:center">${b.target_participants}</td>
        <td style="text-align:center">${b.actual_participants}</td>
        <td style="line-height:2">${completedTitles}${plannedTitles ? ' ' + plannedTitles : ''}</td>
      </tr>`;
    }).join('');

    tableEl.innerHTML = `<div class="table-wrap"><table>
      <thead>
        <tr>
          <th>Country</th>
          <th style="text-align:center">Target<br>Activities</th>
          <th style="text-align:center">Actual<br>Activities</th>
          <th style="text-align:center">Target<br>Participants</th>
          <th style="text-align:center">Actual<br>Participants</th>
          <th>Training Titles</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="pva-tfoot">
          <td><strong>Total</strong></td>
          <td style="text-align:center"><strong>${totalTargetAct}</strong></td>
          <td style="text-align:center"><strong>${totalActualAct}</strong></td>
          <td style="text-align:center"><strong>${totalTargetPart}</strong></td>
          <td style="text-align:center"><strong>${totalActualPart}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table></div>`;
  }

  TABS.forEach((key, i) => {
    const btn = document.createElement('button');
    btn.className = 'year-tab' + (i === 0 ? ' active' : '');
    btn.textContent = TAB_LABELS[key];
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('.year-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderTable(key);
    });
    tabsEl.appendChild(btn);
  });

  renderTable('year_1');
}

async function initIndex() {
  const data = await loadData();
  const grid = document.getElementById('country-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Grand totals across all 5 portals
  const allCodes = ['PH', 'PK', 'KR', 'ID', 'backbone'];
  let grandApplicants = 0, grandGraduates = 0, grandCommunity = 0, grandOrgs = 0;
  allCodes.forEach(code => {
    const r1 = data.portals[code]?.report_1_overview || {};
    grandApplicants  += r1.total_applicants    || 0;
    grandGraduates   += r1.total_graduates     || 0;
    grandCommunity   += r1.community_impact    || 0;
    grandOrgs        += r1.touched_organizations || 0;
  });

  setText('grand-applicants',     fmt(grandApplicants));
  setText('grand-graduates',      fmt(grandGraduates));
  setText('grand-community-impact', fmt(grandCommunity));
  setText('grand-touched-orgs',   fmt(grandOrgs));

  // Render backbone first (full width), then 4 country portals
  const RENDER_ORDER = ['backbone', 'PH', 'PK', 'KR', 'ID'];

  RENDER_ORDER.forEach(portal => {
    const isBackbone = portal === 'backbone';
    const r1 = data.portals[portal]?.report_1_overview || {};
    const href = isBackbone ? 'backbone.html' : `portal.html?country=${portal}`;

    const card = document.createElement('div');
    card.className = 'country-card';
    if (isBackbone) card.style.gridColumn = '1 / -1';

    let flagHtml;
    if (isBackbone) {
      flagHtml = `<div class="flag-circle" style="background:rgba(130,21,69,.12)">🌏</div>`;
    } else {
      const flagUrl = FLAG_URLS[portal];
      flagHtml = `<img src="${flagUrl}" class="country-flag" alt="${PORTAL_META[portal].name} flag" onerror="this.style.display='none'">`;
    }

    const name = isBackbone ? 'Backbone (Regional)' : PORTAL_META[portal].name;

    card.innerHTML = `
      ${flagHtml}
      <div class="country-name">${name}</div>
      <div class="stats">
        <div>
          <div class="stat-num">${fmt(r1.total_applicants)}</div>
          <div class="stat-lbl">Applicants</div>
        </div>
        <div>
          <div class="stat-num">${fmt(r1.total_graduates)}</div>
          <div class="stat-lbl">Graduates</div>
        </div>
      </div>
      <a class="btn-see-reports" href="${href}">See Reports →</a>`;
    grid.appendChild(card);
  });

  const tsEl = document.getElementById('generated-at');
  if (tsEl && data.generated_at) {
    tsEl.textContent = `Data as of ${data.generated_at.replace('T', ' ').slice(0, 16)} UTC`;
  }

  renderIndexPlanVsActual(data);
}

// ── Country portal page ───────────────────────────────────────────────────────

// Module-scope deferred r2 chart render function
let _renderR2Charts = null;

async function initPortal() {
  const code = getPortalParam();
  if (!code || !PORTAL_META[code]) {
    showError(`Unknown country "${code}". Please navigate from the portal list.`);
    return;
  }

  const data = await loadData();
  const portal = data.portals[code];
  if (!portal) {
    showError(`No data found for ${code}.`);
    return;
  }
  window._portalData = portal;

  const meta = PORTAL_META[code];
  document.title = `${meta.name} — AktivAsia Team Portal`;
  setText('portal-flag', meta.flag);
  setText('portal-name', `${meta.name} — Country Portal`);
  const r1 = portal.report_1_overview || {};
  setText('portal-subtitle',
    `${fmt(r1.total_applicants)} applicants · ${fmt(r1.total_graduates)} graduates`);

  initTabs('section-r1', (tabId) => {
    if (tabId === 'section-r2' && _renderR2Charts) {
      try { _renderR2Charts(); } catch(e) { console.warn('r2 deferred charts:', e); }
    }
  });

  tryRender('Report 1', () => renderReport1(r1));
  tryRender('Report 2', () => renderReport2(portal.report_2_training_plan || {}));
  tryRender('Organization Stats', () => renderReportOrgs(portal));
  tryRender('Report 3', () => renderReport3(portal.report_3_impact_qualitative || {}));
  tryRender('Training Forms', () => renderTrainingFormsTab(portal.report_2_training_plan || {}));
}

// ── Backbone page ─────────────────────────────────────────────────────────────

async function initBackbone() {
  const data = await loadData();
  const bb = data.portals.backbone;
  if (!bb) { showError('No backbone data found.'); return; }

  const bbR1 = bb.report_1_overview || {};

  initTabs('section-r1', (tabId) => {
    if (tabId === 'section-r2' && _renderR2Charts) {
      try { _renderR2Charts(); } catch(e) { console.warn('r2 deferred charts:', e); }
    }
  });

  tryRender('Report 1', () => renderReport1(bbR1));
  tryRender('Report 2', () => renderReport2(bb.report_2_training_plan || {}));
  tryRender('Organization Stats', () => renderReportOrgs(bb));
  tryRender('Report 3', () => renderReport3(bb.report_3_impact_qualitative || {}));
  tryRender('Training Forms', () => renderTrainingFormsTab(bb.report_2_training_plan || {}));
}

// ── tryRender: isolate errors per report ─────────────────────────────────────

function tryRender(name, fn) {
  try { fn(); }
  catch (e) { console.error(`[${name}] render error:`, e); }
}

// ── Report 1 — Overview ───────────────────────────────────────────────────────

function renderReport1(r1) {
  setText('r1-total-applicants', fmt(r1.total_applicants));
  setText('r1-total-graduates',  fmt(r1.total_graduates));
  setText('r1-total-ongoing',    fmt(r1.total_ongoing));
  setText('r1-community-impact', fmt(r1.community_impact));
  setText('r1-touched-orgs',     fmt(r1.touched_organizations));

  const funnel = r1.application_funnel || {};
  const max = funnel.total_applicants || 1;
  const gradPct = max ? Math.round((funnel.graduated || 0) / max * 100) : 0;
  setText('r1-grad-pct', `${gradPct}% graduation rate`);

  // Funnel bars with percentage labels
  setFunnelBar('bar-applicants', funnel.total_applicants, max, 'pct-applicants', 100);
  setFunnelBar('bar-attended',   funnel.attended_training, max, 'pct-attended',
    max ? Math.round((funnel.attended_training || 0) / max * 100) : 0);
  setFunnelBar('bar-graduated',  funnel.graduated, max, 'pct-graduated',
    max ? Math.round((funnel.graduated || 0) / max * 100) : 0);
  setFunnelBar('bar-6m', funnel.impact_evaluation_completed, max, 'pct-6m',
    max ? Math.round((funnel.impact_evaluation_completed || 0) / max * 100) : 0);

  const trend = r1.yoy_trend || [];
  if (window.Charts) {
    try { Charts.yoyBar('chart-yoy', trend || []); } catch(e) { console.warn('yoyBar:', e); }
  }

  // Training categories
  const cats = r1.training_categories || {};
  renderTrainingCategories('tc-completed', cats.completed || []);
  renderTrainingCategories('tc-ongoing',   cats.ongoing   || []);
  renderTrainingCategories('tc-upcoming',  cats.upcoming  || []);
}

function setFunnelBar(id, value, max, pctId, pctValue) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = max ? Math.max(Math.round((value || 0) / max * 100), 2) : 2;
  el.style.width = pct + '%';
  const span = el.querySelector('span');
  if (span) span.textContent = fmt(value);
  if (pctId) {
    const pEl = document.getElementById(pctId);
    if (pEl) pEl.textContent = pctValue + '%';
  }
}

function renderTrainingCategories(containerId, trainings) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!trainings.length) {
    el.innerHTML = '<div class="tc-item" style="color:var(--text-meta);font-size:.82rem">None</div>';
    return;
  }
  el.innerHTML = trainings.map(t => `
    <div class="tc-item">
      <div class="tc-name">${t.name}</div>
      <div class="tc-date">${t.type} · ${t.start_date || '?'} → ${t.end_date || '?'}</div>
      <div class="tc-date">${t.applicants} applicants · ${t.graduates} graduates</div>
    </div>`).join('');
}

// ── Report 2 — Training Report ────────────────────────────────────────────────

function renderReport2(r2) {
  const isExcluded = t => {
    if (!t) return false;
    const lower = t.toLowerCase();
    return lower.includes('feminist') || lower.includes('foundational');
  };
  
  const types = (r2.trainings_by_type || []).filter(t => !isExcluded(t.type));
  const trainings = r2.actual_trainings || [];
  
  const typesByYearRaw = r2.trainings_by_type_by_year || {};
  const typesByYear = {};
  for (const yr in typesByYearRaw) {
    typesByYear[yr] = typesByYearRaw[yr] || [];
  }

  // Gender / Age charts (demographics from r2)
  const demo = r2.demographics || {};
  if (window.Charts) {
    const genderData = { ...(demo.by_gender || {}) };
    const ageData = sortAge({ ...(demo.by_age_group || {}) });
    
    let unknownGender = 0, unknownAge = 0;
    
    Object.keys(genderData).forEach(k => {
      const clean = k.trim().toLowerCase();
      if (clean === 'unknown' || clean === 'not specified' || clean === '') {
        unknownGender += genderData[k];
        delete genderData[k];
      }
    });
    
    Object.keys(ageData).forEach(k => {
      const clean = k.trim().toLowerCase();
      if (clean === 'unknown' || clean === 'not specified' || clean === '') {
        unknownAge += ageData[k];
        delete ageData[k];
      }
    });

    try { Charts.pie('chart-gender', genderData); } catch(e) { console.warn('pie gender:', e); }
    try { Charts.bar('chart-age', ageData, 'Participants'); } catch(e) { console.warn('age bar:', e); }

    setText('r2-gender-note', `Note: ${fmt(unknownGender)} has no Gender from our system.`);
    setText('r2-age-note', `Note: ${fmt(unknownAge)} has no DOB from our system.`);
  }

  // Stacked bar deferred — set module-scope render fn
  const years = Object.keys(typesByYear).sort();
  _renderR2Charts = function() {
    if (years.length && window.Charts) {
      try { Charts.stackedBar('chart-type-year', typesByYear, years); } catch(e) { console.warn('stackedBar:', e); }
    }
  };
  // Also attempt immediate render in case tab is already active
  try { _renderR2Charts(); } catch(e) {}

  // Practice sessions with year filter
  const psEl = document.getElementById('r2-practice-sessions');
  const psYearFilter = document.getElementById('r2-ps-year-filter');
  const ps = r2.practice_sessions || { total_sessions: 0, sessions: [] };
  const allSessions = ps.sessions || [];

  if (psYearFilter) {
    const psYears = [...new Set(allSessions.map(s => (s.date || '').slice(0,4)).filter(Boolean))].sort().reverse();
    psYearFilter.innerHTML = '<option value="">All Years</option>' +
      psYears.map(y => `<option value="${y}">${y}</option>`).join('');
    psYearFilter.addEventListener('change', () => renderSessionsTable(psYearFilter.value));
  }

  function renderSessionsTable(filterYear) {
    if (!psEl) return;
    const filtered = filterYear ? allSessions.filter(s => (s.date || '').startsWith(filterYear)) : allSessions;
    if (!filtered.length) {
      psEl.innerHTML = '<div class="empty">No practice sessions recorded</div>';
    } else {
      psEl.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>Session Name</th><th>Date</th></tr></thead>
        <tbody id="r2-ps-body"></tbody>
      </table></div><div id="r2-ps-pg" class="pagination-controls"></div>`;
      renderPaginatedTable({
        tbodyEl: document.getElementById('r2-ps-body'),
        pgElId: 'r2-ps-pg',
        items: filtered,
        renderRowFn: s => `<tr><td>${s.name}</td><td>${s.date || '—'}</td></tr>`
      });
    }
  }
  renderSessionsTable('');

  // Plan vs Actual table (fiscal year tabs)
  (function renderPlanVsActual() {
    const tabsEl    = document.getElementById('r2-pva-tabs');
    const tableEl   = document.getElementById('r2-pva-table');
    const summaryEl = document.getElementById('r2-pva-summary');
    if (!tabsEl || !tableEl) return;

    const pva = (window._portalData || {}).training_plan_summary || {};

    const TABS = [
      { key: 'year_1',  label: 'Year 1'  },
      { key: 'year_2',  label: 'Year 2'  },
      { key: 'archive', label: 'Archive' },
    ];

    function fmtDate(start, end) {
      if (!start) return '—';
      const s = new Date(start + 'T00:00:00');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const sm = months[s.getMonth()];
      const sd = s.getDate();
      const sy = s.getFullYear();
      if (!end || end === start) return `${sm} ${sd}, ${sy}`;
      const e = new Date(end + 'T00:00:00');
      if (e.getMonth() === s.getMonth() && e.getFullYear() === s.getFullYear()) {
        return `${sm} ${sd}–${e.getDate()}, ${sy}`;
      }
      return `${sm} ${sd} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
    }

    function renderBucket(key) {
      const b = pva[key] || { target_activities: 0, actual_activities: 0,
                               target_participants: 0, actual_participants: 0, rows: [] };
      if (summaryEl) {
        summaryEl.innerHTML =
          `<span><strong>${b.actual_activities}</strong> Conducted</span>` +
          `<span><strong>${b.target_activities}</strong> Planned</span>`;
      }

      if (!b.rows.length) {
        tableEl.innerHTML = '<div class="empty" style="padding:16px;color:var(--text-meta)">No trainings in this period</div>';
        return;
      }

      const rowsHtml = b.rows.map(row => {
        const sClass = (row.status || '').toLowerCase().replace(/\s+/g, '-');
        return `<tr>
          <td>${row.plan_title || '—'}</td>
          <td>${fmtDate(row.plan_date, row.plan_end_date)}</td>
          <td style="text-align:center">${row.target_participants != null ? row.target_participants : '—'}</td>
          <td>${row.actual_title || '—'}</td>
          <td>${fmtDate(row.actual_date, row.actual_end_date)}</td>
          <td style="text-align:center">${row.actual_participants != null ? row.actual_participants : '—'}</td>
          <td><span class="badge badge-${sClass}">${row.status || '—'}</span></td>
        </tr>`;
      }).join('');

      tableEl.innerHTML = `<div class="table-wrap"><table>
        <thead>
          <tr class="pva-group-header">
            <th colspan="3">Training Plan</th>
            <th colspan="3">Actual Training</th>
            <th class="pva-status-header">Status</th>
          </tr>
          <tr>
            <th>Plan Title</th>
            <th>Planned Date</th>
            <th style="text-align:center">Target</th>
            <th>Actual Title</th>
            <th>Actual Date</th>
            <th style="text-align:center">Actual</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table></div>`;
    }

    TABS.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.className = 'year-tab' + (i === 0 ? ' active' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.year-tab').forEach(b => b.classList.toggle('active', b === btn));
        renderBucket(tab.key);
      });
      tabsEl.appendChild(btn);
    });

    renderBucket('year_1');
  })();

  // Training Plans list
  const plans = r2.training_plans || [];
  const planYearSel = document.getElementById('r2-plan-year');
  const planQtrSel = document.getElementById('r2-plan-quarter');
  const plansBody = document.getElementById('r2-plans-body');

  if (planYearSel) {
    const planYears = [...new Set(plans.map(p => (p.start_date || '').slice(0,4)).filter(Boolean))].sort();
    planYearSel.innerHTML = '<option value="">All Years</option>' +
      planYears.map(y => `<option value="${y}">${y}</option>`).join('');
  }

  function getQuarter(dateStr) {
    const m = parseInt((dateStr || '').slice(5,7));
    if (!m) return '';
    if (m <= 3) return 'Q1';
    if (m <= 6) return 'Q2';
    if (m <= 9) return 'Q3';
    return 'Q4';
  }

  function renderPlansTable() {
    if (!plansBody) return;
    const selYear = planYearSel ? planYearSel.value : '';
    const selQtr  = planQtrSel  ? planQtrSel.value  : '';
    const filtered = plans.filter(p => {
      if (selYear && (p.start_date || '').slice(0,4) !== selYear) return false;
      if (selQtr  && getQuarter(p.start_date) !== selQtr) return false;
      return true;
    });
    renderPaginatedTable({
      tbodyEl: plansBody,
      pgElId: 'pg-r2-plans',
      items: filtered,
      renderRowFn: p => {
        const sClass = (p.status||'').toLowerCase().replace(/\s+/g, '-');
        return `<tr>
          <td>${p.name}</td>
          <td>${p.type}</td>
          <td>${p.start_date || '—'}</td>
          <td>${p.end_date || '—'}</td>
          <td><span class="badge badge-${sClass}">${p.status || '—'}</span></td>
        </tr>`;
      }
    });
  }

  if (planYearSel) planYearSel.addEventListener('change', renderPlansTable);
  if (planQtrSel)  planQtrSel.addEventListener('change',  renderPlansTable);
  renderPlansTable();

  // Populate type filter dropdown
  const typeFilter = document.getElementById('r2-type-filter');
  if (typeFilter) {
    const uniqueTypes = [...new Set(trainings.map(t => t.type).filter(Boolean))].sort();
    typeFilter.innerHTML = '<option value="">All Types</option>' +
      uniqueTypes.map(ty => `<option value="${ty}">${ty}</option>`).join('');
  }

  // Year tabs for All Trainings
  const yearTabsEl = document.getElementById('r2-year-tabs');
  let activeYear = '';
  if (yearTabsEl && years.length) {
    const allTab = document.createElement('button');
    allTab.className = 'year-tab active';
    allTab.textContent = 'All Years';
    allTab.dataset.year = '';
    yearTabsEl.appendChild(allTab);

    years.forEach(yr => {
      const btn = document.createElement('button');
      btn.className = 'year-tab';
      btn.textContent = yr;
      btn.dataset.year = yr;
      yearTabsEl.appendChild(btn);
    });

    yearTabsEl.addEventListener('click', e => {
      const btn = e.target.closest('.year-tab');
      if (!btn) return;
      activeYear = btn.dataset.year;
      yearTabsEl.querySelectorAll('.year-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderTrainingsTable(trainings);
    });
  }

  // Filter change handlers
  const statusFilter = document.getElementById('r2-status-filter');
  if (typeFilter)   typeFilter.addEventListener('change',   () => renderTrainingsTable(trainings));
  if (statusFilter) statusFilter.addEventListener('change', () => renderTrainingsTable(trainings));

  function renderTrainingsTable(allTrainings) {
    const tbody = document.getElementById('r2-trainings-body');
    if (!tbody) return;

    const selType   = typeFilter   ? typeFilter.value   : '';
    const selStatus = statusFilter ? statusFilter.value : '';

    const filtered = allTrainings.filter(t => {
      if (selType   && t.type   !== selType)   return false;
      if (selStatus && t.status !== selStatus) return false;
      if (activeYear) {
        const yr = (t.date || '').slice(0, 4);
        if (yr !== activeYear) return false;
      }
      return true;
    });

    renderPaginatedTable({
      tbodyEl: tbody,
      pgElId: 'pg-r2-trainings',
      items: filtered,
      renderRowFn: t => {
        const sClass = (t.status||'').toLowerCase().replace(/\s+/g, '-');
        return `<tr>
          <td>${t.name}</td>
          <td>${t.type}</td>
          <td>${t.date || '—'}</td>
          <td>${t.end_date || '—'}</td>
          <td style="text-align:right">${t.applicants}</td>
          <td style="text-align:right">${t.graduates}</td>
          <td><span class="badge badge-${sClass}">${t.status || '—'}</span></td>
          <td>${t.id ? `<div style="display:flex;gap:6px;justify-content:center">
            <button class="btn-icon-edit" data-edit-id="${t.id}" data-edit-name="${(t.name||'').replace(/"/g,'&quot;')}" title="Edit Training Details">✏️</button>
            <a class="btn-icon-edit" href="admin.html?training_id=${t.id}&view=selection" title="Edit Participant Status">👥</a>
          </div>` : '—'}</td>
        </tr>`;
      }
    });
  }

  renderTrainingsTable(trainings);

  // Organizations list
  const orgs = r2.organizations || [];
  const orgYearSel     = document.getElementById('r2-org-year');
  const orgTrainingSel = document.getElementById('r2-org-training');
  const orgsBody       = document.getElementById('r2-orgs-body');

  const orgYears     = [...new Set(orgs.map(o => o.year).filter(Boolean))].sort();
  const orgTrainings = [...new Set(orgs.map(o => o.training).filter(Boolean))].sort();

  if (orgYearSel) {
    orgYearSel.innerHTML = '<option value="">All Years</option>' +
      orgYears.map(y => `<option value="${y}">${y}</option>`).join('');
  }
  if (orgTrainingSel) {
    orgTrainingSel.innerHTML = '<option value="">All Trainings</option>' +
      orgTrainings.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  function renderOrgsTable() {
    if (!orgsBody) return;
    const selYear     = orgYearSel     ? orgYearSel.value     : '';
    const selTraining = orgTrainingSel ? orgTrainingSel.value : '';
    const filtered = orgs.filter(o => {
      if (selYear     && o.year     !== selYear)     return false;
      if (selTraining && o.training !== selTraining) return false;
      return true;
    });
    orgsBody.innerHTML = filtered.length ? filtered.map(o => `<tr>
      <td>${o.name}</td>
      <td>${o.training || '—'}</td>
      <td>${o.year || '—'}</td>
    </tr>`).join('') : '<tr><td colspan="3" class="empty">No organizations match filters</td></tr>';
  }

  if (orgYearSel)     orgYearSel.addEventListener('change',     renderOrgsTable);
  if (orgTrainingSel) orgTrainingSel.addEventListener('change', renderOrgsTable);
  renderOrgsTable();
}

// ── Organization Stats (Tab 3) ────────────────────────────────────────────────

function renderReportOrgs(portal) {
  const r1 = portal.report_1_overview || {};
  const r2 = portal.report_2_training_plan || {};
  const r3 = portal.report_3_impact_qualitative || {};
  const orgs = r2.organizations || [];
  const unattribApplicants = r2.unattributed_applicants || 0;
  const unattribImpact     = r2.unattributed_impact     || 0;

  const touchedOrgsCnt = r1.touched_organizations || 0;
  setText('ro-total-orgs', fmt(touchedOrgsCnt));

  const trendYoY = {};
  orgs.forEach(o => {
    if (!o.year) return;
    trendYoY[o.year] = trendYoY[o.year] || new Set();
    trendYoY[o.year].add(o.name);
  });
  const trendData = Object.keys(trendYoY).sort().map(yr => ({
    year: yr,
    Total: trendYoY[yr].size
  }));
  
  if (window.Charts && trendData.length) {
    try { Charts.bar('chart-orgs-yoy', Object.fromEntries(trendData.map(d => [d.year, d.Total])), 'Organizations'); } catch(e) { console.warn('org trend:', e); }
  } else {
    const orgsCnv = document.getElementById('chart-orgs-yoy');
    if (orgsCnv) orgsCnv.parentNode.innerHTML = '<div class="empty">Trend data waiting on backend mapping</div>';
  }

  // ── Community Impact per Organization ────────────────────────────────────
  // Filters: Year tabs · Training Name (dependent on year)
  const impactYearTabsEl  = document.getElementById('ro-impact-year-tabs');
  const impactTrainingSel = document.getElementById('ro-impact-training');
  const impactTbody       = document.getElementById('ro-impact-body');

  const orgYears = [...new Set(orgs.map(o => o.year).filter(Boolean))].sort();

  if (impactYearTabsEl) {
    impactYearTabsEl.innerHTML =
      ['', ...orgYears].map(y =>
        `<button class="year-tab${y === '' ? ' active' : ''}" data-year="${y}">${y || 'All'}</button>`
      ).join('');
    impactYearTabsEl.addEventListener('click', e => {
      const btn = e.target.closest('.year-tab');
      if (!btn) return;
      impactYearTabsEl.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateImpactTrainingOptions();
      renderImpactTable();
    });
  }

  function updateImpactTrainingOptions() {
    if (!impactTrainingSel) return;
    const selYear = impactYearTabsEl ? (impactYearTabsEl.querySelector('.year-tab.active')?.dataset.year || '') : '';
    const names = [...new Set(
      orgs.filter(o => !selYear || o.year === selYear).map(o => o.training).filter(Boolean)
    )].sort();
    const prev = impactTrainingSel.value;
    impactTrainingSel.innerHTML = '<option value="">All Trainings</option>' +
      names.map(n => `<option${n === prev ? ' selected' : ''}>${n}</option>`).join('');
  }

  if (impactTrainingSel) impactTrainingSel.addEventListener('change', renderImpactTable);
  updateImpactTrainingOptions();

  function renderImpactTable() {
    const selYear     = impactYearTabsEl ? (impactYearTabsEl.querySelector('.year-tab.active')?.dataset.year || '') : '';
    const selTraining = impactTrainingSel ? impactTrainingSel.value : '';
    const filtered = orgs.filter(o =>
      (!selYear     || o.year     === selYear)     &&
      (!selTraining || o.training === selTraining)
    );
    const impactByOrg = {};
    filtered.forEach(o => {
      if (!o.name) return;
      impactByOrg[o.name] = (impactByOrg[o.name] || 0) + (o.total_impact || 0);
    });
    // Sort by impact desc; orgs with 0 at the bottom
    const impactRows = Object.entries(impactByOrg).sort((a, b) => b[1] - a[1]);
    renderPaginatedTable({
      tbodyEl: impactTbody,
      pgElId: 'pg-ro-impact',
      items: impactRows,
      renderRowFn: ([name, impact]) =>
        `<tr><td>${name}</td><td style="text-align:right">${fmt(impact)}</td></tr>`,
      emptyHtml: '<tr><td colspan="2" class="empty">No organizations found</td></tr>'
    });
  }

  renderImpactTable();

  // Note: unattributed shared learnings (deals with no org in CRM)
  const impactNoteEl = document.getElementById('pg-ro-impact');
  if (impactNoteEl && unattribImpact > 0) {
    let note = impactNoteEl.nextElementSibling;
    if (!note || !note.classList.contains('table-note')) {
      note = document.createElement('p');
      note.className = 'table-note';
      impactNoteEl.insertAdjacentElement('afterend', note);
    }
    note.textContent = `Note: ${fmt(unattribImpact)} shared learnings could not be attributed to any organization because ${fmt(unattribApplicants)} applicant${unattribApplicants !== 1 ? 's have' : ' has'} no organization assigned in the CRM.`;
  }

  // ── List of Organizations ─────────────────────────────────────────────────
  // Filters: Year tabs · Training Name (dependent on year)
  // Columns: Organization · Applicants · Total Graduates (%)
  const yearTabsEl  = document.getElementById('ro-year-tabs');
  const trainingSel = document.getElementById('ro-list-training');
  const orgsTbody   = document.getElementById('ro-list-body');

  if (yearTabsEl) {
    yearTabsEl.innerHTML =
      ['', ...orgYears].map(y =>
        `<button class="year-tab${y === '' ? ' active' : ''}" data-year="${y}">${y || 'All'}</button>`
      ).join('');
    yearTabsEl.addEventListener('click', e => {
      const btn = e.target.closest('.year-tab');
      if (!btn) return;
      yearTabsEl.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateListTrainingOptions();
      renderOrgsList();
    });
  }

  function updateListTrainingOptions() {
    if (!trainingSel) return;
    const selYear = yearTabsEl ? (yearTabsEl.querySelector('.year-tab.active')?.dataset.year || '') : '';
    const names = [...new Set(
      orgs.filter(o => !selYear || o.year === selYear).map(o => o.training).filter(Boolean)
    )].sort();
    const prev = trainingSel.value;
    trainingSel.innerHTML = '<option value="">All Trainings</option>' +
      names.map(n => `<option${n === prev ? ' selected' : ''}>${n}</option>`).join('');
  }

  if (trainingSel) trainingSel.addEventListener('change', renderOrgsList);
  updateListTrainingOptions();

  function renderOrgsList() {
    const selYear     = yearTabsEl  ? (yearTabsEl.querySelector('.year-tab.active')?.dataset.year || '') : '';
    const selTraining = trainingSel ? trainingSel.value : '';
    const filtered = orgs.filter(o =>
      (!selYear     || o.year     === selYear)     &&
      (!selTraining || o.training === selTraining)
    );
    const byOrg = {};
    filtered.forEach(o => {
      if (!o.name) return;
      if (!byOrg[o.name]) byOrg[o.name] = { applicants: 0, graduates: 0 };
      // fall back to 1/0 per entry when fields absent in older cached data
      byOrg[o.name].applicants += o.applicant_count != null ? o.applicant_count : 1;
      byOrg[o.name].graduates  += o.graduate_count  != null ? o.graduate_count  : 0;
    });
    const orgRows = Object.entries(byOrg).sort((a, b) => b[1].applicants - a[1].applicants);
    renderPaginatedTable({
      tbodyEl: orgsTbody,
      pgElId: 'pg-ro-list',
      items: orgRows,
      renderRowFn: ([name, d]) => {
        const pct = d.applicants > 0 ? Math.round((d.graduates / d.applicants) * 100) : 0;
        return `<tr>
          <td>${name}</td>
          <td style="text-align:right">${fmt(d.applicants)}</td>
          <td style="text-align:right">${fmt(d.graduates)} <span style="color:var(--text-meta);font-size:.8rem">(${pct}%)</span></td>
        </tr>`;
      },
      emptyHtml: '<tr><td colspan="3" class="empty">No organizations found</td></tr>'
    });
  }

  renderOrgsList();

  // Note: unattributed applicants (deals with no org in CRM)
  const listPgEl = document.getElementById('pg-ro-list');
  if (listPgEl && unattribApplicants > 0) {
    let note = listPgEl.nextElementSibling;
    if (!note || !note.classList.contains('table-note')) {
      note = document.createElement('p');
      note.className = 'table-note';
      listPgEl.insertAdjacentElement('afterend', note);
    }
    note.textContent = `Note: ${fmt(unattribApplicants)} applicant${unattribApplicants !== 1 ? 's are' : ' is'} not shown because they have no organization assigned in the CRM.`;
  }
}
// Qualitative Insights
// ── Report 3 — Qualitative Insights ──────────────────────────────────────────

function renderReport3(r3) {
  const filter   = document.getElementById('r3-training-filter');
  const cb6m     = document.getElementById('r3-has-6m');
  const cbPost   = document.getElementById('r3-has-post');
  const trainings = r3.likert_by_training || [];

  if (filter) {
    filter.innerHTML = '<option value="">All Trainings</option>' +
      trainings.map(t => `<option value="${t.training_name}">${t.training_name}</option>`).join('');
  }

  function rerender() {
    const filterVal  = filter  ? filter.value : '';
    const need6m     = cb6m    ? cb6m.checked  : false;
    const needPost   = cbPost  ? cbPost.checked : false;
    renderLikert(r3, filterVal, need6m, needPost);
  }

  if (filter)  filter.addEventListener('change', rerender);
  if (cb6m)    cb6m.addEventListener('change',   rerender);
  if (cbPost)  cbPost.addEventListener('change',  rerender);

  renderLikert(r3, '', false, false);

  // Post-Training Survey as single flat table
  const postEl = document.getElementById('r3-post-feedback');
  const postFilterSel = document.getElementById('r3-post-filter');
  if (postEl) {
    const allPost = [];
    (r3.post_survey_feedback || []).forEach(grp => {
      (grp.responses || []).forEach(resp => {
        allPost.push({...resp, _training: grp.training_name});
      });
    });
    const postTrainings = [...new Set(allPost.map(r => r._training))].sort();
    if (postFilterSel) {
      postFilterSel.innerHTML = '<option value="">All Trainings</option>' +
        postTrainings.map(t => `<option value="${t}">${t}</option>`).join('');
      postFilterSel.addEventListener('change', () => renderPostTable(postFilterSel.value));
    }

    function renderPostTable(filterVal) {
      const filtered = filterVal ? allPost.filter(r => r._training === filterVal) : allPost;
      if (!filtered.length) {
        postEl.innerHTML = '<div class="empty">No post-survey data available</div>';
        return;
      }
      postEl.innerHTML = `<div class="table-wrap"><table>
        <thead><tr>
          <th>Applicant</th><th>Training</th><th>What Went Well</th><th>Key Learning</th>
          <th>Action Plan</th><th>Improvement</th><th>Next Workshop</th><th>Testimonial</th>
        </tr></thead>
        <tbody id="r3-post-body"></tbody>
      </table></div><div id="r3-post-pg" class="pagination-controls"></div>`;
      
      renderPaginatedTable({
        tbodyEl: document.getElementById('r3-post-body'),
        pgElId: 'pg-r3-post',
        items: filtered,
        renderRowFn: r => `<tr>
          <td style="font-size:.82rem">${r.applicant_name || '—'}</td>
          <td style="font-size:.82rem">${r._training}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.what_went_well || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.sum_up_learning || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.action_plan || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.improvement_suggestion || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.next_workshop_suggestion || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.testimonial || '—'}</td>
        </tr>`
      });
    }
    renderPostTable('');
  }

  // 6M Impact Evaluation as single flat table
  const impactEl = document.getElementById('r3-impact-feedback');
  const impactFilterSel = document.getElementById('r3-impact-filter');
  if (impactEl) {
    const allImpact = [];
    (r3.impact_evaluation_feedback || []).forEach(grp => {
      (grp.responses || []).forEach(resp => {
        allImpact.push({...resp, _training: grp.training_name});
      });
    });
    const impactTrainings = [...new Set(allImpact.map(r => r._training))].sort();
    if (impactFilterSel) {
      impactFilterSel.innerHTML = '<option value="">All Trainings</option>' +
        impactTrainings.map(t => `<option value="${t}">${t}</option>`).join('');
      impactFilterSel.addEventListener('change', () => renderImpactTable(impactFilterSel.value));
    }

    function renderImpactTable(filterVal) {
      const filtered = filterVal ? allImpact.filter(r => r._training === filterVal) : allImpact;
      if (!filtered.length) {
        impactEl.innerHTML = '<div class="empty">No 6M impact data available</div>';
        const pg = document.getElementById('pg-r3-impact'); if(pg) pg.style.display = 'none';
        return;
      }
      impactEl.innerHTML = `<div class="table-wrap"><table>
        <thead><tr>
          <th>Applicant</th><th>Training</th><th>Training Influence</th><th>Used Training</th>
          <th>Done More Campaigning</th><th>Raised More Funds</th><th>Built Connections</th>
          <th>Achieved Objectives</th><th>What's Alive</th><th>Testimonial</th><th>Shared With How Many</th>
        </tr></thead>
        <tbody id="r3-impact-body"></tbody>
      </table></div><div id="r3-impact-pg" class="pagination-controls"></div>`;
      
      renderPaginatedTable({
        tbodyEl: document.getElementById('r3-impact-body'),
        pgElId: 'pg-r3-impact',
        items: filtered,
        renderRowFn: r => `<tr>
          <td style="font-size:.82rem">${r.applicant_name || '—'}</td>
          <td style="font-size:.82rem">${r._training}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.training_influence || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.used_training || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.done_more_campaigning || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.raised_more_funds || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.built_connections || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.achieved_objectives || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.whats_alive || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.testimonial || '—'}</td>
          <td style="font-size:.82rem;vertical-align:top">${r.shared_with_how_many || '—'}</td>
        </tr>`
      });
    }
    renderImpactTable('');
  }

  // Testimonials as single table
  const testEl = document.getElementById('r3-testimonials');
  const testFilterSel = document.getElementById('r3-test-filter');
  if (testEl) {
    const testimonials = r3.testimonials || [];
    const testTrainings = [...new Set(testimonials.map(t => t.training_name))].sort();
    if (testFilterSel) {
      testFilterSel.innerHTML = '<option value="">All Trainings</option>' +
        testTrainings.map(t => `<option value="${t}">${t}</option>`).join('');
      testFilterSel.addEventListener('change', () => renderTestimonialsTable(testFilterSel.value));
    }

    function renderTestimonialsTable(filterVal) {
      const filtered = filterVal ? testimonials.filter(t => t.training_name === filterVal) : testimonials;
      if (!filtered.length) {
        testEl.innerHTML = '<div class="empty">No testimonials available</div>';
        return;
      }
      testEl.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>Applicant</th><th>Training</th><th>Source</th><th>Testimonial</th></tr></thead>
        <tbody id="r3-test-body"></tbody>
      </table></div>`;
      
      renderPaginatedTable({
        tbodyEl: document.getElementById('r3-test-body'),
        pgElId: 'pg-r3-test',
        items: filtered,
        renderRowFn: t => `<tr>
          <td style="font-size:.82rem">${t.applicant_name || '—'}</td>
          <td style="font-size:.82rem">${t.training_name}</td>
          <td style="font-size:.82rem">${t.source}</td>
          <td style="font-size:.82rem;vertical-align:top">${t.testimonial}</td>
        </tr>`
      });
    }
    renderTestimonialsTable('');
  }
}

function renderLikert(r3, filterName, need6m, needPost) {
  const COMP = typeof COMPETENCY_LABELS !== 'undefined' ? COMPETENCY_LABELS : {};
  let rows = filterName
    ? (r3.likert_by_training || []).filter(t => t.training_name === filterName)
    : (r3.likert_by_training || []);

  // Checkbox filters: filter out trainings without the requested data
  if (need6m) {
    rows = rows.filter(t =>
      Object.values(t.likert || {}).some(v => v['6m'] != null)
    );
  }
  if (needPost) {
    rows = rows.filter(t =>
      Object.values(t.likert || {}).some(v => v.post != null)
    );
  }

  // Aggregate averages
  const agg = {};
  Object.keys(COMP).forEach(k => {
    const pre  = avg(rows.map(t => t.likert?.[k]?.pre).filter(v => v != null));
    const post = avg(rows.map(t => t.likert?.[k]?.post).filter(v => v != null));
    const sixm = avg(rows.map(t => t.likert?.[k]?.['6m']).filter(v => v != null));
    agg[k] = { pre, post, '6m': sixm };
  });

  const tbody = document.getElementById('r3-likert-body');
  if (tbody) {
    tbody.innerHTML = Object.entries(COMP).map(([key, label]) => {
      const v = agg[key] || {};
      const delta = (v.post != null && v.pre != null)
        ? (parseFloat(v.post) - parseFloat(v.pre)).toFixed(2) : null;
      const dClass = delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : '';
      const dStr = delta !== null
        ? `<span class="likert-delta ${dClass}">${delta > 0 ? '+' : ''}${delta}</span>` : '';

      // 6M change inline: 6m - post
      const sixm = agg[key]?.['6m'];
      const post = agg[key]?.post;
      const sixmDelta = (sixm != null && post != null) ? (parseFloat(sixm) - parseFloat(post)) : null;
      const sxClass = sixmDelta > 0 ? 'delta-pos' : sixmDelta < 0 ? 'delta-neg' : '';
      const sxStr = sixmDelta !== null ? `<span class="likert-delta ${sxClass}">${sixmDelta > 0 ? '+' : ''}${sixmDelta.toFixed(2)}</span>` : '';
      const sixmCell = sixm != null ? `${sixm.toFixed(2)} ${sxStr}` : '—';

      return `<tr>
        <td style="font-weight:700">${label}</td>
        <td class="likert-val">${v.pre  != null ? v.pre.toFixed(2)  : '—'}</td>
        <td class="likert-val">${v.post != null ? v.post.toFixed(2) : '—'} ${dStr}</td>
        <td class="likert-val">${sixmCell}</td>
      </tr>`;
    }).join('');
  }

  if (window.Charts) {
    try { Charts.likertBar('chart-likert', agg); } catch(e) { console.warn('likertBar:', e); }
  }
}

// ── Training Forms Tab ────────────────────────────────────────────────────────

function renderTrainingFormsTab(r2) {
  const container   = document.getElementById('training-forms-list');
  const yearFilter  = document.getElementById('forms-year-filter');
  const typeFilter  = document.getElementById('forms-type-filter');
  if (!container) return;

  const trainings = (r2.actual_trainings || []).filter(t =>
    t.pre_app_link || t.post_app_link
  );

  if (!trainings.length) {
    container.innerHTML = '<p style="color:var(--text-meta);padding:24px 0">No training forms available for this portal yet.</p>';
    return;
  }

  // Populate year filter
  const years = [...new Set(trainings.map(t => (t.date || '').slice(0,4)).filter(Boolean))].sort().reverse();
  if (yearFilter) {
    yearFilter.innerHTML = '<option value="">All Years</option>' +
      years.map(y => `<option value="${y}">${y}</option>`).join('');
  }

  // Populate type filter
  const types = [...new Set(trainings.map(t => t.type).filter(Boolean))].sort();
  if (typeFilter) {
    typeFilter.innerHTML = '<option value="">All Types</option>' +
      types.map(tp => `<option value="${tp}">${tp}</option>`).join('');
  }

  function renderCards() {
    const selYear = yearFilter ? yearFilter.value : '';
    const selType = typeFilter ? typeFilter.value : '';
    const today   = new Date().toISOString().slice(0,10);

    const filtered = trainings.filter(t => {
      if (selYear && !(t.date || '').startsWith(selYear)) return false;
      if (selType && t.type !== selType) return false;
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = '<p style="color:var(--text-meta);padding:16px 0">No trainings match this filter.</p>';
      return;
    }

    container.innerHTML = filtered.map(t => {
      const appState  = formLinkState(t.pre_app_link,  t.app_open_date,  t.app_close_date,  today);
      const postState = formLinkState(t.post_app_link, t.post_open_date, t.post_close_date, today);

      return `
        <div class="chart-card" style="margin-bottom:16px;padding:20px 24px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
            <div>
              <div style="font-weight:700;font-size:16px;margin-bottom:4px">${esc(t.name)}</div>
              <div style="font-size:13px;color:var(--text-meta)">${esc(t.type)} · ${fmtDateRange(t.date, t.end_date)}</div>
            </div>
            <span class="section-badge" style="flex-shrink:0">${t.status}</span>
          </div>
          <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
            ${formLinkCard('Application Form', appState)}
            ${formLinkCard('Post-Training Survey', postState)}
          </div>
        </div>`;
    }).join('');
  }

  if (yearFilter) yearFilter.addEventListener('change', renderCards);
  if (typeFilter) typeFilter.addEventListener('change', renderCards);
  renderCards();
}

function formLinkState(link, openDate, closeDate, today) {
  if (!link) return { state: 'unavailable', label: 'Not configured', link: null, dateHint: '' };
  if (!openDate || !closeDate) return { state: 'active', label: 'Open', link, dateHint: '' };
  if (today < openDate)  return { state: 'upcoming', label: `Opens ${fmtDateShort(openDate)}`, link: null, dateHint: openDate };
  if (today > closeDate) return { state: 'closed',   label: `Closed ${fmtDateShort(closeDate)}`, link: null, dateHint: closeDate };
  return { state: 'active', label: `Open until ${fmtDateShort(closeDate)}`, link, dateHint: closeDate };
}

function formLinkCard(title, st) {
  const colors = {
    active:      'background:#e8f5e9;border-color:#4caf50;color:#2e7d32',
    upcoming:    'background:#fff8e1;border-color:#ffc107;color:#8b6914',
    closed:      'background:#fce4ec;border-color:#e91e63;color:#880e4f',
    unavailable: 'background:#f5f5f5;border-color:#e0e0e0;color:#9e9e9e',
  };
  const style = colors[st.state] || colors.unavailable;
  const inner = st.state === 'active'
    ? `<a href="${esc(st.link)}" target="_blank" rel="noopener" style="font-weight:700;color:inherit;text-decoration:none">
         ${title} →
       </a>
       <div style="font-size:11px;margin-top:2px">${esc(st.label)}</div>`
    : `<div style="font-weight:600">${title}</div>
       <div style="font-size:12px;margin-top:2px">${esc(st.label)}</div>`;
  return `<div style="flex:1;min-width:160px;border:1.5px solid;border-radius:10px;padding:12px 14px;${style}">${inner}</div>`;
}

function fmtDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmtDateRange(start, end) {
  if (!start) return '—';
  const s = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPaginatedTable({ tbodyEl, pgElId, items, renderRowFn, emptyHtml = '<tr><td colspan="100%" class="empty">No data available</td></tr>', itemsPerPage = 10 }) {
  const pgEl = document.getElementById(pgElId);
  if (!pgEl) {
    if (tbodyEl) tbodyEl.innerHTML = items.length ? items.map(renderRowFn).join('') : emptyHtml;
    return;
  }
  const total = items.length;
  if (!total) {
    pgEl.style.display = 'none';
    if (tbodyEl) tbodyEl.innerHTML = emptyHtml;
    return;
  }
  pgEl.style.display = 'flex';
  const totalPages = Math.ceil(total / itemsPerPage);
  let currentPage = 1;
  
  function renderPage(page) {
    if (!tbodyEl) return;
    const start = (page - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, total);
    
    tbodyEl.innerHTML = items.slice(start, end).map(renderRowFn).join('');
    pgEl.innerHTML = `
      <div class="pg-total">Showing ${start + 1} to ${end} of ${fmt(total)}</div>
      <div class="pg-btns">
        <button class="pg-btn" ${page <= 1 ? 'disabled' : ''} data-dir="prev">Prev</button>
        <button class="pg-btn" ${page >= totalPages ? 'disabled' : ''} data-dir="next">Next</button>
      </div>
    `;
    const prev = pgEl.querySelector('[data-dir="prev"]');
    const next = pgEl.querySelector('[data-dir="next"]');
    if (prev) prev.addEventListener('click', () => { if (currentPage > 1) renderPage(--currentPage); });
    if (next) next.addEventListener('click', () => { if (currentPage < totalPages) renderPage(++currentPage); });
  }
  renderPage(currentPage);
}

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function avg(arr) {
  if (!arr.length) return null;
  return parseFloat((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2));
}
function sortAge(data) {
  const order = ['<18','18-24','25-34','35-44','45+','Unknown'];
  const out = {};
  order.forEach(k => { if (data[k] != null) out[k] = data[k]; });
  Object.keys(data).forEach(k => { if (out[k] == null) out[k] = data[k]; });
  return out;
}
function topN(obj, n) {
  return Object.fromEntries(Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n));
}

// ── Boot ──────────────────────────────────────────────────────────────────────

function boot() {
  const page = document.body?.dataset.page;
  if (!page) return;
  const fns = { index: initIndex, portal: initPortal, backbone: initBackbone };
  const fn = fns[page];
  if (fn) fn().catch(e => showError('Could not load data: ' + e.message));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// ── Edit modal — constants ─────────────────────────────────────────────────

const EDIT_PROXY = 'https://crm-proxy.gideon-valera.workers.dev';

const EDIT_FIELDS = [
  'Solution_Title','Training_Title_Plan','Training_Type','Organised_By','Format',
  'Target_Participants','Start_Date','End_Date',
  'Application_Form_Open_Date','Application_Form_Close_Date',
  'Post_Survey_Open_Date','Post_Survey_Close_Date',
  'Venue','Venue_Address','Language_of_Delivery','Co_host','Countries_Participated',
  'Who_is_this_training_for','Training_Objectives','Approach_Pedagogy',
  'Costs_Covered','Costs_Not_Covered','Course_Access_Information',
  'Facilitator','Name_2','Name_3','Name_4','Name_5','Name_6','Name_7','Name_8','Name_9','Name_10',
  'Facilitator_Type_for_Trainer_1','Facilitator_Type_for_Trainer_2','Facilitator_Type_for_Trainer_3',
  'Facilitator_Type_for_Trainer_4','Facilitator_Type_for_Trainer_5',
  'Facilitator_Type_6','Facilitator_Type_7','Facilitator_Type_8','Facilitator_Type_9','Facilitator_Type_10',
].join(',');

const FAC_NAME_KEYS      = ['Facilitator','Name_2','Name_3','Name_4','Name_5','Name_6','Name_7','Name_8','Name_9','Name_10'];
const FAC_ROLE_KEYS_1_5  = ['Facilitator_Type_for_Trainer_1','Facilitator_Type_for_Trainer_2','Facilitator_Type_for_Trainer_3','Facilitator_Type_for_Trainer_4','Facilitator_Type_for_Trainer_5'];
const FAC_ROLE_KEYS_6_10 = ['Facilitator_Type_6','Facilitator_Type_7','Facilitator_Type_8','Facilitator_Type_9','Facilitator_Type_10'];

const EDIT_TRAINING_TYPE_IDS = {
  'Foundational':               '773031000000354510',
  'Training of Trainers (TOT)': '773031000000354567',
  'Feminist Leadership':        '773031000000354572',
  'Public Narrative':           '773031000000354577',
};

const ROLE_OPTIONS_HTML = `
  <option value="">— Select role —</option>
  <option value="Lead Facilitator">Lead Facilitator</option>
  <option value="Senior Facilitator">Senior Facilitator</option>
  <option value="Co-Facilitator">Co-Facilitator</option>
  <option value="Junior/ Peer Facilitator">Junior/ Peer Facilitator</option>
  <option value="Guest/ External Facilitator">Guest/ External Facilitator</option>
  <option value="Coach">Coach</option>
  <option value="Shadow Coach">Shadow Coach</option>
  <option value="Support">Support</option>
`.trim();

let _editTrainingId = null;

function showEditSkeleton() {
  document.getElementById('edit-modal-body').innerHTML = `
    <div class="edit-skeleton">
      <div class="skel-line" style="width:60%"></div>
      <div class="skel-line" style="width:100%"></div>
      <div class="skel-line" style="width:80%"></div>
      <div class="skel-line" style="width:100%"></div>
      <div class="skel-line" style="width:50%"></div>
      <div class="skel-line" style="width:100%"></div>
    </div>`;
}

function showEditToast(msg) {
  const t = document.getElementById('edit-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1200);
}

function setEditFooterError(msg) {
  const el = document.getElementById('edit-footer-error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function openEditModal(id, name) {
  _editTrainingId = id;
  document.getElementById('edit-modal-subtitle').textContent = name;
  document.getElementById('edit-modal-overlay').classList.add('open');
  setEditFooterError('');
  document.getElementById('btn-save-edit').disabled = true;
  showEditSkeleton();
  loadTrainingForEdit(id);
}

function closeEditModal() {
  document.getElementById('edit-modal-overlay').classList.remove('open');
  _editTrainingId = null;
  document.getElementById('edit-modal-body').innerHTML = '';
}

async function saveTrainingEdit() {
  if (!_editTrainingId) return;
  const saveBtn = document.getElementById('btn-save-edit');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  setEditFooterError('');

  try {
    const facPayload = {};
    document.querySelectorAll('.ef-fac-name').forEach((input, i) => {
      const name = input.value.trim();
      const id   = document.querySelector(`.ef-fac-id[data-slot="${i}"]`).value.trim();
      const role = document.querySelector(`.ef-fac-role[data-slot="${i}"]`).value;
      const nameKey = FAC_NAME_KEYS[i];
      const roleKey = i < 5 ? FAC_ROLE_KEYS_1_5[i] : FAC_ROLE_KEYS_6_10[i - 5];
      if (i < 8) {
        if (id) facPayload[nameKey] = { id };
      } else {
        if (name) facPayload[nameKey] = name;
      }
      if (role) facPayload[roleKey] = role;
    });

    const countriesSel = document.getElementById('ef-Countries_Participated');
    const selectedCountries = countriesSel
      ? [...countriesSel.selectedOptions].map(o => o.value)
      : [];

    const typeLabel = document.getElementById('ef-Training_Type')?.value ?? '';
    const typeId    = EDIT_TRAINING_TYPE_IDS[typeLabel];
    const planId    = document.getElementById('ef-Training_Title_Plan')?.value ?? '';

    const v = fieldId => (document.getElementById(`ef-${fieldId}`)?.value ?? '').trim();

    const rawPayload = {
      Solution_Title:              v('Solution_Title') || undefined,
      Training_Type:               typeId ? { id: typeId } : undefined,
      Organised_By:                v('Organised_By') || undefined,
      Format:                      v('Format') || undefined,
      Target_Participants:         parseInt(v('Target_Participants'), 10) || undefined,
      Start_Date:                  v('Start_Date') || undefined,
      End_Date:                    v('End_Date') || undefined,
      Application_Form_Open_Date:  v('Application_Form_Open_Date') || undefined,
      Application_Form_Close_Date: v('Application_Form_Close_Date') || undefined,
      Post_Survey_Open_Date:       v('Post_Survey_Open_Date') || undefined,
      Post_Survey_Close_Date:      v('Post_Survey_Close_Date') || undefined,
      Venue:                       v('Venue') || undefined,
      Venue_Address:               v('Venue_Address') || undefined,
      Language_of_Delivery:        v('Language_of_Delivery') || undefined,
      Co_host:                     v('Co_host') || undefined,
      Countries_Participated:      selectedCountries.length ? selectedCountries : undefined,
      Training_Title_Plan:         planId ? { id: planId } : undefined,
      Who_is_this_training_for:    v('Who_is_this_training_for') || undefined,
      Training_Objectives:         v('Training_Objectives') || undefined,
      Approach_Pedagogy:           v('Approach_Pedagogy') || undefined,
      Costs_Covered:               v('Costs_Covered') || undefined,
      Costs_Not_Covered:           v('Costs_Not_Covered') || undefined,
      Course_Access_Information:   v('Course_Access_Information') || undefined,
      ...facPayload,
    };

    const cleanPayload = Object.fromEntries(
      Object.entries(rawPayload).filter(([, val]) => val !== undefined)
    );

    const res  = await fetch(`${EDIT_PROXY}/solutions/${_editTrainingId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ data: [cleanPayload] }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message ?? `CRM error ${res.status}`);

    // Update visible table row
    const newName  = v('Solution_Title');
    const newStart = v('Start_Date');
    const newEnd   = v('End_Date');
    const row = document.querySelector(`#edit-dd-${_editTrainingId}`)?.closest('tr');
    if (row) {
      const cells = row.querySelectorAll('td');
      if (newName  && cells[0]) cells[0].textContent = newName;
      if (typeLabel && cells[1]) cells[1].textContent = typeLabel;
      if (newStart && cells[2]) cells[2].textContent = newStart;
      if (newEnd   && cells[3]) cells[3].textContent = newEnd;
    }

    showEditToast('Training updated ✓');
    setTimeout(closeEditModal, 1500);

  } catch (err) {
    setEditFooterError(`Save failed: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

document.getElementById('edit-modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

// ── Edit modal — accordion helpers ────────────────────────────────────────────

function makeAccSection(id, title, bodyHtml, openByDefault) {
  return `
    <div class="acc-card${openByDefault ? ' open' : ''}" id="acc-${id}">
      <div class="acc-header" onclick="toggleAcc('${id}')">
        <span class="acc-title">${title}</span>
        <span class="acc-chevron">▶</span>
      </div>
      <div class="acc-body">${bodyHtml}</div>
    </div>`;
}

function toggleAcc(id) {
  document.getElementById(`acc-${id}`).classList.toggle('open');
}

function editField(label, inputHtml) {
  return `<div class="edit-field"><label class="edit-label">${label}</label>${inputHtml}</div>`;
}

function editTextInput(id, val) {
  const safe = (val ?? '').toString().replace(/"/g, '&quot;');
  return `<input type="text" id="ef-${id}" value="${safe}">`;
}

function editDateInput(id, val) {
  const safe = (val ?? '').toString().replace(/"/g, '&quot;');
  return `<input type="date" id="ef-${id}" value="${safe}">`;
}

function editNumberInput(id, val) {
  return `<input type="number" id="ef-${id}" value="${val ?? ''}">`;
}

function editTextareaInput(id, val) {
  const safe = (val ?? '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<textarea id="ef-${id}">${safe}</textarea>`;
}

function editSelectInput(id, options, selected) {
  const opts = options.map(o => {
    const sel = o.value === selected ? ' selected' : '';
    return `<option value="${o.value}"${sel}>${o.label}</option>`;
  }).join('');
  return `<select id="ef-${id}">${opts}</select>`;
}

// ── Edit modal — fetch + render ────────────────────────────────────────────────

async function loadTrainingForEdit(id) {
  try {
    const solRes  = await fetch(`${EDIT_PROXY}/solutions/${id}?fields=${EDIT_FIELDS}`);
    if (!solRes.ok) throw new Error(`CRM error ${solRes.status}`);
    const solJson = await solRes.json();
    const d       = Array.isArray(solJson.data) ? solJson.data[0] : (solJson.data ?? solJson);
    const country = d.Organised_By ?? '';
    const plansRes  = await fetch(`${EDIT_PROXY}/training-plans/search?organised_by=${encodeURIComponent(country)}`);
    const plansJson = plansRes.ok ? await plansRes.json() : { data: [] };
    renderEditForm(d, plansJson.data ?? []);
  } catch (err) {
    document.getElementById('edit-modal-body').innerHTML = `
      <p style="color:#e53e3e;padding:24px 0">Failed to load training: ${err.message}</p>
      <button class="btn-cancel-edit" onclick="loadTrainingForEdit('${id}')">Retry</button>`;
  }
}

function renderEditForm(d, plans) {
  const currentPlanId = d.Training_Title_Plan?.id ?? '';
  const planOpts = [{ value: '', label: '— None —' }].concat(
    plans.map(p => {
      const dateStr = p.Start_Date ? ` (${p.Start_Date}${p.End_Date ? ' → ' + p.End_Date : ''})` : '';
      return { value: p.id, label: p.Name + dateStr };
    })
  );

  const typeOpts = [
    { value: '', label: '— Select —' },
    { value: 'Foundational', label: 'Foundational' },
    { value: 'Training of Trainers (TOT)', label: 'Training of Trainers (TOT)' },
    { value: 'Feminist Leadership', label: 'Feminist Leadership' },
    { value: 'Public Narrative', label: 'Public Narrative' },
  ];
  const currentType = d.Training_Type?.name ?? d.Training_Type ?? '';

  const orgOpts = [
    { value: '', label: '— Select —' },
    { value: 'Philippines', label: 'Philippines' },
    { value: 'Pakistan', label: 'Pakistan' },
    { value: 'Korea', label: 'Korea' },
    { value: 'Indonesia', label: 'Indonesia' },
    { value: 'Regional', label: 'Regional' },
  ];
  const currentOrg = d.Organised_By ?? '';

  const formatOpts = [
    { value: '', label: '— None —' },
    { value: 'In-Person', label: 'In-Person' },
    { value: 'Online', label: 'Online' },
    { value: 'Hybrid', label: 'Hybrid' },
  ];

  // Section 1: Basic Info
  const basicHtml = [
    editField('Training Plan', editSelectInput('Training_Title_Plan', planOpts, currentPlanId)),
    editField('Training Title', editTextInput('Solution_Title', d.Solution_Title)),
    editField('Training Type', editSelectInput('Training_Type', typeOpts, currentType)),
    editField('Organised By',
      `<select id="ef-Organised_By" onchange="onEditOrgChange(this.value)">${
        orgOpts.map(o => `<option value="${o.value}"${o.value === currentOrg ? ' selected' : ''}>${o.label}</option>`).join('')
      }</select>`
    ),
    editField('Format', editSelectInput('Format', formatOpts, d.Format ?? '')),
    editField('Target Participants', editNumberInput('Target_Participants', d.Target_Participants)),
  ].join('');

  // Section 2: Dates
  const datesHtml = `
    <div class="edit-date-group-label">Training</div>
    <div class="edit-date-grid" style="margin-bottom:16px">
      ${editField('Start Date', editDateInput('Start_Date', d.Start_Date))}
      ${editField('End Date', editDateInput('End_Date', d.End_Date))}
    </div>
    <div class="edit-date-group-label">Application Form</div>
    <div class="edit-date-grid" style="margin-bottom:16px">
      ${editField('Open Date', editDateInput('Application_Form_Open_Date', d.Application_Form_Open_Date))}
      ${editField('Close Date', editDateInput('Application_Form_Close_Date', d.Application_Form_Close_Date))}
    </div>
    <div class="edit-date-group-label">Post Survey</div>
    <div class="edit-date-grid">
      ${editField('Open Date', editDateInput('Post_Survey_Open_Date', d.Post_Survey_Open_Date))}
      ${editField('Close Date', editDateInput('Post_Survey_Close_Date', d.Post_Survey_Close_Date))}
    </div>`;

  // Section 3: Location & Logistics
  const isRegional = currentOrg === 'Regional';
  const countriesAll = ['Philippines','Pakistan','Korea','Indonesia','Regional','India','Bangladesh','Myanmar','Sri Lanka','Nepal'];
  const selectedCountries = Array.isArray(d.Countries_Participated) ? d.Countries_Participated : [];
  const countriesHtml = `
    <select id="ef-Countries_Participated" multiple size="6" style="width:100%;border:1.5px solid #e2e0d8;border-radius:8px;padding:6px">
      ${countriesAll.map(c => `<option value="${c}"${selectedCountries.includes(c) ? ' selected' : ''}>${c}</option>`).join('')}
    </select>
    <div style="font-size:11px;color:#788099;margin-top:4px">Hold Ctrl/Cmd to select multiple</div>`;
  const logisticsHtml = [
    editField('Venue', editTextInput('Venue', d.Venue)),
    editField('Venue Address', editTextInput('Venue_Address', d.Venue_Address)),
    editField('Language of Delivery', editTextInput('Language_of_Delivery', d.Language_of_Delivery)),
    editField('Co-host', editTextInput('Co_host', d.Co_host)),
    `<div class="edit-field" id="ef-countries-wrap" style="${isRegional ? '' : 'display:none'}">
      <label class="edit-label">Countries Participated</label>${countriesHtml}
    </div>`,
  ].join('');

  // Section 4: Training Content
  const contentHtml = [
    editField('Who is this training for?', editTextareaInput('Who_is_this_training_for', d.Who_is_this_training_for)),
    editField('Training Objectives', editTextareaInput('Training_Objectives', d.Training_Objectives)),
    editField('Approach / Pedagogy', editTextareaInput('Approach_Pedagogy', d.Approach_Pedagogy)),
    editField('Costs Covered', editTextareaInput('Costs_Covered', d.Costs_Covered)),
    editField('Costs Not Covered', editTextareaInput('Costs_Not_Covered', d.Costs_Not_Covered)),
    editField('Course Access Information', editTextareaInput('Course_Access_Information', d.Course_Access_Information)),
  ].join('');

  // Section 5: Facilitators
  let facHtml = '<div id="edit-fac-container">';
  for (let i = 0; i < 10; i++) {
    const nameKey = FAC_NAME_KEYS[i];
    const roleKey = i < 5 ? FAC_ROLE_KEYS_1_5[i] : FAC_ROLE_KEYS_6_10[i - 5];
    const raw     = d[nameKey];
    const nameVal = typeof raw === 'object' && raw !== null
      ? (raw.name ?? raw.full_name ?? raw.Full_Name ?? '')
      : (raw ?? '');
    const nameId  = typeof raw === 'object' && raw !== null ? (raw.id ?? '') : '';
    const roleVal = d[roleKey] ?? '';
    const isLookup = i < 8;
    facHtml += `
      <div class="edit-fac-row" data-slot="${i}">
        <div class="edit-field" style="margin-bottom:0">
          <label class="edit-label">Facilitator ${i + 1} Name</label>
          ${isLookup ? `
          <div class="edit-fac-typeahead">
            <input type="text" class="ef-fac-name" data-slot="${i}" value="${nameVal.replace(/"/g, '&quot;')}" placeholder="Search contact…" autocomplete="off" oninput="onEditFacInput(this)" onfocus="onEditFacInput(this)">
            <input type="hidden" class="ef-fac-id" data-slot="${i}" value="${nameId}">
            <div class="edit-fac-dropdown"></div>
          </div>` : `
          <input type="text" class="ef-fac-name" data-slot="${i}" value="${nameVal.replace(/"/g, '&quot;')}" placeholder="Name">
          <input type="hidden" class="ef-fac-id" data-slot="${i}" value="">`}
        </div>
        <div class="edit-field" style="margin-bottom:0">
          <label class="edit-label">Role ${i + 1}</label>
          <select class="ef-fac-role" data-slot="${i}">
            ${ROLE_OPTIONS_HTML.replace(`value="${roleVal}"`, `value="${roleVal}" selected`)}
          </select>
        </div>
      </div>`;
  }
  facHtml += '</div>';

  document.getElementById('edit-modal-body').innerHTML = [
    makeAccSection('basic',       'Basic Info',           basicHtml,    true),
    makeAccSection('dates',       'Dates',                datesHtml,    false),
    makeAccSection('logistics',   'Location & Logistics', logisticsHtml,false),
    makeAccSection('content',     'Training Content',     contentHtml,  false),
    makeAccSection('facilitators','Facilitators',         facHtml,      false),
  ].join('');
  document.getElementById('btn-save-edit').disabled = false;
}

function onEditOrgChange(val) {
  const wrap = document.getElementById('ef-countries-wrap');
  if (wrap) wrap.style.display = val === 'Regional' ? 'block' : 'none';
}

// ── Edit modal — facilitator typeahead ───────────────────────────────────────

function onEditFacInput(input) {
  const wrap = input.closest('.edit-fac-typeahead');
  const dropdown = wrap.querySelector('.edit-fac-dropdown');
  const q = input.value.trim();
  if (q.length < 2) { dropdown.style.display = 'none'; return; }
  clearTimeout(wrap._editFacTimer);
  const seq = (wrap._editFacSeq = (wrap._editFacSeq || 0) + 1);
  wrap._editFacTimer = setTimeout(async () => {
    try {
      const res  = await fetch(`${EDIT_PROXY}/contacts/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (wrap._editFacSeq !== seq) return;
      renderEditFacDropdown(wrap, json.data ?? []);
    } catch {
      if (wrap._editFacSeq !== seq) return;
      renderEditFacDropdown(wrap, []);
    }
  }, 280);
}

function renderEditFacDropdown(wrap, contacts) {
  const dropdown = wrap.querySelector('.edit-fac-dropdown');
  dropdown.innerHTML = '';
  contacts.slice(0, 8).forEach(c => {
    const item = document.createElement('div');
    item.className = 'edit-fac-item';
    item.textContent = c.Full_Name + (c.Email ? ` — ${c.Email}` : '');
    item.onmousedown = e => { e.preventDefault(); selectEditFacContact(wrap, c.id, c.Full_Name); };
    dropdown.appendChild(item);
  });
  dropdown.style.display = contacts.length ? 'block' : 'none';
}

function selectEditFacContact(wrap, id, name) {
  wrap.querySelector('.ef-fac-id').value   = id;
  wrap.querySelector('.ef-fac-name').value = name;
  wrap.querySelector('.edit-fac-dropdown').style.display = 'none';
}

// close edit-fac dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.edit-fac-typeahead')) {
    document.querySelectorAll('.edit-fac-dropdown').forEach(d => { d.style.display = 'none'; });
  }
});

// ── Edit icon button — delegated click handler ────────────────────────────────

document.addEventListener('click', function(e) {
  const editBtn = e.target.closest('[data-edit-id]');
  if (editBtn) {
    openEditModal(editBtn.dataset.editId, editBtn.dataset.editName);
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeEditModal();
});
