/**
 * Playwright script — captures screenshots of all AktivAsia portal pages.
 * Output: docs/screenshots/*.png
 *
 * Run: node tools/screenshot_portal.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8765/portal';
const OUT  = path.join(__dirname, '..', 'docs', 'screenshots');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 1440, height: 900 };

const PAGES = [
  // Landing page
  {
    name: '01_landing_page',
    url: `${BASE}/index.html`,
    waitFor: '.portal-grid, .country-card, main',
    desc: 'Landing Page — all 5 portal cards',
  },

  // Country portal tabs — Philippines
  {
    name: '02_portal_ph_overview',
    url: `${BASE}/portal.html?country=PH`,
    waitFor: '.nav-tab, .kpi-card, main',
    desc: 'Philippines Portal — Overview tab',
  },
  {
    name: '03_portal_ph_training_plan',
    url: `${BASE}/portal.html?country=PH`,
    waitFor: '.nav-tab',
    clickTab: 1,
    desc: 'Philippines Portal — Training Plan tab',
  },
  {
    name: '04_portal_ph_impact',
    url: `${BASE}/portal.html?country=PH`,
    waitFor: '.nav-tab',
    clickTab: 2,
    desc: 'Philippines Portal — Impact tab',
  },
  {
    name: '05_portal_ph_demographics',
    url: `${BASE}/portal.html?country=PH`,
    waitFor: '.nav-tab',
    clickTab: 3,
    desc: 'Philippines Portal — Demographics tab',
  },

  // Backbone portal
  {
    name: '06_backbone_overview',
    url: `${BASE}/backbone.html`,
    waitFor: '.nav-tab, main',
    desc: 'Backbone (Regional) Portal — Overview',
  },

  // Admin panel (training_id will show the UI skeleton even without data)
  {
    name: '07_admin_panel',
    url: `${BASE}/admin.html`,
    waitFor: '.admin-tabs, .tab-btn, main, body',
    desc: 'Admin Panel',
  },
  {
    name: '08_admin_selection_tab',
    url: `${BASE}/admin.html`,
    waitFor: '.tab-btn',
    clickAdminTab: 0,
    desc: 'Admin Panel — Selection tab',
  },
  {
    name: '09_admin_attendance_tab',
    url: `${BASE}/admin.html`,
    waitFor: '.tab-btn',
    clickAdminTab: 1,
    desc: 'Admin Panel — Attendance tab',
  },
  {
    name: '10_admin_graduates_tab',
    url: `${BASE}/admin.html`,
    waitFor: '.tab-btn',
    clickAdminTab: 2,
    desc: 'Admin Panel — Graduates tab',
  },

  // Create training form
  {
    name: '11_create_training',
    url: `${BASE}/create-training.html`,
    waitFor: 'form, .form-container, main',
    desc: 'Create Training form',
  },

  // Application form
  {
    name: '12_apply_ph',
    url: `${BASE}/apply-ph.html`,
    waitFor: 'form, .form-container, main',
    desc: 'Philippines Application Form',
  },

  // Post-survey form
  {
    name: '13_post_survey_ph',
    url: `${BASE}/trainingsurvey-ph.html`,
    waitFor: 'form, .form-container, main',
    desc: 'Post-Survey Form',
  },
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });

  for (const page_def of PAGES) {
    const page = await context.newPage();
    console.log(`  -> ${page_def.desc}`);

    try {
      await page.goto(page_def.url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for a key element
      if (page_def.waitFor) {
        try {
          await page.waitForSelector(page_def.waitFor, { timeout: 8000 });
        } catch (_) {
          // Element not found — still screenshot whatever loaded
        }
      }

      // Click a portal tab if needed (Overview=0, Training Plan=1, Impact=2, Demographics=3)
      if (typeof page_def.clickTab === 'number') {
        try {
          const tabs = await page.$$('.nav-tab');
          if (tabs[page_def.clickTab]) {
            await tabs[page_def.clickTab].click();
            await sleep(1500);
          }
        } catch (_) {}
      }

      // Click an admin panel tab if needed
      if (typeof page_def.clickAdminTab === 'number') {
        try {
          const tabs = await page.$$('.tab-btn, [data-tab]');
          if (tabs[page_def.clickAdminTab]) {
            await tabs[page_def.clickAdminTab].click();
            await sleep(1000);
          }
        } catch (_) {}
      }

      // Extra wait for charts/data to render
      await sleep(2000);

      const outPath = path.join(OUT, `${page_def.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`     Saved: ${outPath}`);

    } catch (err) {
      console.error(`     ERROR on ${page_def.name}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\nAll screenshots done! Check docs/screenshots/');
})();
