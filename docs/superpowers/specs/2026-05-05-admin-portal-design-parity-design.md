# Spec: Admin.html Portal Design Parity

**Date:** 2026-05-05  
**Status:** Approved  

---

## Context

`admin.html` is a training management page (Selection, Attendance, Post-Survey tabs) that was built with a utilitarian yellow-accent style (`#f5c842`, dark gray header, square buttons, plain tables). It needs to match `portal.html`'s design system for visual coherence across the AktivAsia product. All design tokens and most component classes already exist in `portal/css/style.css` — this is primarily a CSS replacement and HTML restructure task. JS behavior in `admin.js` is untouched.

---

## Approach

**CSS-first rewrite (Option A):** Replace the entire `<style>` block in `admin.html` with a minimal admin-specific override block. Restructure HTML to use existing `style.css` component classes. Convert tables to sit inside `.chart-card` wrappers. No new CSS file; no changes to `style.css` except one `.btn:disabled` addition.

---

## Files to Modify

| File | Change |
|------|--------|
| `portal/admin.html` | Full HTML restructure + `<style>` block replacement |
| `portal/css/style.css` | Add `.btn:disabled` rule (one line) |
| `portal/js/admin.js` | Remap saving-msg span → toast div; update tab class selector if needed |

---

## Section 1: Header

Replace `.admin-header` (`#1a1a1a` bg) with portal's existing header pattern:

```html
<header class="site-header">
  <div class="container">
    <a class="logo" href="index.html">Aktiv<span>Asia</span></a>
  </div>
</header>

<div class="portal-header">
  <div class="container">
    <a class="back-link" href="portal.html" id="back-link">← Back to Portal</a>
    <h1 id="training-title">Loading…</h1>
    <p class="subtitle" id="training-meta"></p>
  </div>
</div>
```

- Uses existing `.site-header`, `.portal-header`, `.back-link`, `.subtitle` from `style.css`
- No new CSS needed for this section

---

## Section 2: Tab Navigation

Replace `.admin-tabs` with `.portal-nav` / `.nav-tab`:

```html
<nav class="portal-nav">
  <div class="container">
    <button class="nav-tab" id="tab-selection"   onclick="switchTab('selection')">Selection</button>
    <button class="nav-tab" id="tab-attendance"  onclick="switchTab('attendance')">Attendance</button>
    <button class="nav-tab" id="tab-post_survey" onclick="switchTab('post_survey')">Post-Survey</button>
  </div>
</nav>
```

**Admin-specific override** (in admin.html `<style>` block) — gradient underline to signal admin mode:
```css
.portal-nav .nav-tab.active {
  color: var(--brand);
  border-bottom-color: transparent;
  border-image: linear-gradient(90deg, var(--grad-start), var(--grad-end)) 1;
}
```

`switchTab()` in `admin.js` must toggle `.active` on `.nav-tab` elements (verify selector targets `nav-tab` not old `admin-tabs button`).

---

## Section 3: View Cards (Tables)

Each view (`#view-selection`, `#view-attendance`, `#view-post_survey`) restructures to:

```html
<div class="admin-view" id="view-[name]">

  <!-- Counter -->
  <p class="admin-counter" id="[x]-counter"></p>

  <!-- Bulk actions (Selection/Attendance only) -->
  <div class="filter-row" style="margin-bottom:16px">
    <button class="btn btn-outline" onclick="bulkSetStage(…)">Select All</button>
    <button class="btn btn-outline" onclick="bulkSetStage(…)">Reject All</button>
  </div>

  <!-- Main table -->
  <div class="chart-card">
    <div class="table-wrap">
      <table>
        <thead><tr><th>…</th></tr></thead>
        <tbody id="[x]-tbody"></tbody>
      </table>
    </div>
    <div class="empty" id="[x]-empty" style="display:none">…</div>
  </div>

  <!-- Sub-section (Rejected / Not Attended) -->
  <div class="section-header" style="margin-top:32px">
    <h2 id="[x]-rej-header">Rejected (0)</h2>
  </div>
  <div class="chart-card">
    <div class="table-wrap">
      <table>…</table>
    </div>
    <div class="empty" id="[x]-rej-empty">…</div>
  </div>

  <!-- Save row -->
  <div style="margin-top:20px;display:flex;align-items:center;gap:12px">
    <button class="btn btn-primary" onclick="saveChanges('[name]')">Save Changes</button>
  </div>

</div>
```

**Stage dropdowns** inside `<td>` get class `filter` for pill-styled selects.

**Post-Survey progress bar** replaces `.progress-bar-wrap/.progress-bar-fill` (yellow) with:
```html
<div class="type-bar-wrap"><div class="type-bar" id="ps-bar" style="width:0%"></div></div>
```
Uses existing gradient fill from `style.css`.

**Empty states** use existing `.empty` class (centered, `var(--text-meta)`).

**Sub-section headers** use `.section-header > h2` (brand purple) instead of inline red `h3`.

---

## Section 4: Buttons & Save States

| Old | New | Class |
|-----|-----|-------|
| `.btn-save` (yellow square) | Save Changes | `.btn .btn-primary` |
| `.btn-bulk` (gray square) | Select All / Reject All | `.btn .btn-outline` |
| `.saving-msg` span | Toast notification | `#admin-toast.edit-toast` |

**Toast div** added before `</body>`:
```html
<div class="edit-toast" id="admin-toast"></div>
```

**`admin.js` change:** Replace `saving-msg` show/hide logic with toast show/hide using `#admin-toast`. Pattern from portal:
```js
function showAdminToast(msg) {
  const t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
```

**`style.css` addition** (one line block):
```css
.btn:disabled { opacity: .45; cursor: not-allowed; }
```

---

## Section 5: Modals & Dropdowns

**Modals** (if triggered from admin): use portal's `.edit-modal` pattern with one admin-specific override in the `<style>` block:
```css
.edit-modal-header {
  border-top: 4px solid;
  border-image: linear-gradient(90deg, var(--grad-start), var(--grad-end)) 1;
}
```
Same white body, 16px radius, Cancel + Save footer buttons (`.btn-cancel-edit`, `.btn-save-edit`).

**Dropdowns** (manage dropdown): restyle to match portal's typeahead dropdown pattern:
- `background: #fff`
- `border: 1.5px solid var(--border)`  
- `border-radius: 8px`
- `box-shadow: 0 4px 12px rgba(0,0,0,.1)`

---

## Section 6: Footer

Add before `</body>`:
```html
<footer class="site-footer">
  <div class="container">
    <strong>AktivAsia</strong> · Admin · Training Management
  </div>
</footer>
```

Fully covered by existing `style.css` — zero new CSS needed.

---

## Admin-Specific `<style>` Block Summary

The new `<style>` block in `admin.html` contains only:

```css
/* Admin view panels */
.admin-view { display: none; padding: 32px 0; }
.admin-view.active { display: block; }
.admin-counter { font-size: .85rem; color: var(--text-meta); margin-bottom: 12px; }

/* Admin tab: gradient underline to signal admin mode */
.portal-nav .nav-tab.active {
  color: var(--brand);
  border-bottom-color: transparent;
  border-image: linear-gradient(90deg, var(--grad-start), var(--grad-end)) 1;
}

/* Admin modal: gradient top strip */
.edit-modal-header {
  border-top: 4px solid;
  border-image: linear-gradient(90deg, var(--grad-start), var(--grad-end)) 1;
}

/* Dropdown restyling */
.manage-dropdown {
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,.1);
}
```

Everything else inherits from `style.css`.

---

## Verification

1. Open `admin.html?id=[valid-training-id]` in browser
2. **Header:** Brand purple bar with AktivAsia logo + portal-header band with training title
3. **Tabs:** Sticky nav tabs; active tab shows orange-red gradient underline
4. **Views:** Each tab view shows `.chart-card` wrapped tables with portal styling (hover row highlight, rounded wrapper, uppercase headers)
5. **Buttons:** Save = pill gradient; bulk = pill outline; dropdowns = pill select style
6. **Saving:** Toast appears at bottom center on save, fades out after 2.5s
7. **Progress bar** (Post-Survey): gradient fill matches portal type bars
8. **Footer:** Brand purple footer at bottom
9. **No JS regressions:** Selection/Attendance/Post-Survey save flows work correctly
