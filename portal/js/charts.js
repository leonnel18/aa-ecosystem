/**
 * charts.js — Chart.js wrappers for AktivAsia portal
 * All charts follow the AktivAsia design system.
 */

const Charts = (() => {
  // ── Colour palette ──────────────────────────────────────────────────────
  const BRAND  = '#821545';
  const GRAD   = ['#ff960b', '#f93a3a'];
  const MULTI  = ['#821545', '#c03070', '#ff960b', '#f93a3a', '#4f46e5', '#0891b2', '#16a34a', '#d97706'];
  const GREY   = 'rgba(120,128,153,.15)';

  const defaults = {
    font: { family: "'Inter','Segoe UI',system-ui,sans-serif" },
    color: '#788099',
  };

  Chart.defaults.font.family = defaults.font.family;
  Chart.defaults.color = defaults.color;
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.padding  = 16;

  // ── Helpers ─────────────────────────────────────────────────────────────
  const canvas = id => document.getElementById(id);

  function destroy(id) {
    const existing = Chart.getChart(id);
    if (existing) existing.destroy();
  }

  function gradientFill(ctx, colorA, colorB) {
    const g = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    g.addColorStop(0, colorA);
    g.addColorStop(1, colorB);
    return g;
  }

  // ── YoY Line chart ───────────────────────────────────────────────────────
  function yoyLine(id, trend) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);
    const labels = trend.map(t => t.year);
    new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Applicants',
            data: trend.map(t => t.applicants),
            borderColor: BRAND,
            backgroundColor: 'rgba(130,21,69,.08)',
            fill: true,
            tension: .35,
            pointBackgroundColor: BRAND,
            pointRadius: 4,
          },
          {
            label: 'Graduates',
            data: trend.map(t => t.graduates),
            borderColor: GRAD[0],
            backgroundColor: 'rgba(255,150,11,.08)',
            fill: true,
            tension: .35,
            pointBackgroundColor: GRAD[0],
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: GREY } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { position: 'top' } },
      },
    });
  }

  // ── Likert grouped bar ───────────────────────────────────────────────────
  function likertBar(id, agg) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);
    const labels = Object.keys(COMPETENCY_LABELS).map(k => COMPETENCY_LABELS[k]);
    const preData  = Object.keys(COMPETENCY_LABELS).map(k => parseFloat(agg[k]?.pre)  || 0);
    const postData = Object.keys(COMPETENCY_LABELS).map(k => parseFloat(agg[k]?.post) || 0);
    const sixmData = Object.keys(COMPETENCY_LABELS).map(k => parseFloat(agg[k]?.['6m']) || 0);
    new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Pre',  data: preData,  backgroundColor: 'rgba(130,21,69,.5)',   borderColor: BRAND,   borderWidth: 1 },
          { label: 'Post', data: postData, backgroundColor: 'rgba(255,150,11,.75)', borderColor: GRAD[0], borderWidth: 1 },
          { label: '6M',   data: sixmData, backgroundColor: 'rgba(249,58,58,.75)',  borderColor: GRAD[1], borderWidth: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 7, grid: { color: GREY },
               ticks: { stepSize: 1 } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { position: 'top' } },
      },
    });
  }

  // ── Donut chart ──────────────────────────────────────────────────────────
  function donut(id, data, title) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);
    const labels = Object.keys(data);
    const values = Object.values(data);
    new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: MULTI.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right' },
          title: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                const pct = total ? Math.round(ctx.raw/total*100) : 0;
                return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  // ── Vertical bar ─────────────────────────────────────────────────────────
  function bar(id, data, label) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);
    const ctx = el.getContext('2d');
    new Chart(el, {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label,
          data: Object.values(data),
          backgroundColor: gradientFill(ctx, 'rgba(130,21,69,.7)', 'rgba(249,58,58,.7)'),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: GREY } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  // ── Horizontal bar ────────────────────────────────────────────────────────
  function barH(id, data, label) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);
    new Chart(el, {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label,
          data: Object.values(data),
          backgroundColor: BRAND,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, grid: { color: GREY } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  // ── Stacked bar: trainings by type by year ───────────────────────────────
  // data: {year_str: [{type, conducted, total_planned}]}
  // years: array of year strings to plot
  function stackedBar(id, data, years) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);

    if (!years || !years.length) return;

    // Collect all types
    const typeSet = new Set();
    years.forEach(yr => {
      (data[yr] || []).forEach(row => typeSet.add(row.type));
    });
    const types = Array.from(typeSet).sort();

    const datasets = types.map((type, i) => ({
      label: type,
      data: years.map(yr => {
        const row = (data[yr] || []).find(r => r.type === type);
        return row ? row.conducted : 0;
      }),
      backgroundColor: MULTI[i % MULTI.length],
      borderRadius: 4,
    }));

    new Chart(el, {
      type: 'bar',
      data: { labels: years, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, grid: { color: GREY }, ticks: { stepSize: 1 } },
        },
        plugins: { legend: { position: 'top' } },
      },
    });
  }

  // ── Grouped bar: YoY applicants vs graduates ────────────────────────────
  function yoyBar(id, trend) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);
    if (!trend || !trend.length) return;
    const labels = trend.map(t => t.year);
    new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Applicants',
            data: trend.map(t => t.applicants),
            backgroundColor: 'rgba(130,21,69,.75)',
            borderRadius: 4,
          },
          {
            label: 'Graduates',
            data: trend.map(t => t.graduates),
            backgroundColor: 'rgba(255,150,11,.85)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: GREY } },
          x: { grid: { display: false } },
        },
        plugins: { legend: { position: 'top' } },
      },
    });
  }

  // ── Pie chart (no cutout) ────────────────────────────────────────────────
  function pie(id, data) {
    const el = canvas(id);
    if (!el) return;
    destroy(id);
    const labels = Object.keys(data);
    const values = Object.values(data);
    new Chart(el, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: MULTI.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                const pct = total ? Math.round(ctx.raw/total*100) : 0;
                return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  return { yoyLine, yoyBar, likertBar, donut, bar, barH, stackedBar, pie };
})();
window.Charts = Charts;

// Expose competency labels for app.js
const COMPETENCY_LABELS = {
  strategy_tactics:       'Strategy & Tactics',
  communication_strategy: 'Communication Strategy',
  facilitating_workshop:  'Facilitating Workshops',
  building_connection:    'Building Connections',
};
