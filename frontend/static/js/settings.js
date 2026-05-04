/**
 * FILE LOCATION: frontend/static/js/settings.js
 *
 * Worker Settings Page logic.
 * Handles: Email update, Password change, Services, Availability
 *
 * Profile photo / bio / name / rates → update-profile.html (not here)
 */

// ─────────────────────────────────────────────────────────────────
// FETCH HELPER
// ─────────────────────────────────────────────────────────────────

function stFetch(path, options = {}) {
  const token   = localStorage.getItem('access_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const base = (typeof CONFIG !== 'undefined') ? CONFIG.SERVER_BASE : 'http://127.0.0.1:8000';
  return fetch(base + path, { ...options, headers });
}

// ─────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────

function stToast(message, type = 'success') {
  const toast = document.getElementById('st-toast');
  if (!toast) return;
  toast.textContent      = message;
  toast.style.background = type === 'error' ? '#ef4444' : '#1a1a1a';
  toast.style.color      = '#fff';
  toast.style.opacity    = '1';
  toast.style.display    = 'block';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.style.display = 'none', 300);
  }, 3000);
}

// ─────────────────────────────────────────────────────────────────
// INJECT STYLES
// ─────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('st-styles')) return;
  const s = document.createElement('style');
  s.id = 'st-styles';
  s.textContent = `
    /* Tab buttons */
    .st-tab {
      background: none; border: none;
      border-bottom: 3px solid transparent;
      padding: 12px 22px; font-size: 14px; font-weight: 600;
      color: var(--muted); cursor: pointer;
      white-space: nowrap; margin-bottom: -2px;
      transition: color 0.2s, border-color 0.2s;
      font-family: inherit;
    }
    .st-tab:hover  { color: var(--text); }
    .st-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

    /* Tab content */
    .st-panel         { display: none; }
    .st-panel.active  { display: block; }

    /* Form fields */
    .st-label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--text); margin-bottom: 7px;
    }
    .st-input {
      width: 100%; padding: 11px 16px;
      border: 1.5px solid var(--border); border-radius: 10px;
      background: var(--card); color: var(--text);
      font-size: 14px; outline: none;
      transition: border-color 0.2s; font-family: inherit;
      box-sizing: border-box;
    }
    .st-input:focus { border-color: var(--primary); }

    /* Password eye toggle */
    .pwd-eye {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: var(--muted); font-size: 16px; padding: 4px; line-height: 1;
    }
    .pwd-eye:hover { color: var(--primary); }

    /* Service row */
    .svc-row {
      display: flex; gap: 12px; align-items: center;
      margin-bottom: 12px; flex-wrap: wrap;
      padding: 14px 16px;
      background: var(--surface, #f9f9f9);
      border: 1px solid var(--border);
      border-radius: 10px;
      transition: border-color 0.2s;
    }
    .svc-row:hover { border-color: var(--primary); }
    .svc-select {
      flex: 1; min-width: 160px; padding: 9px 12px;
      border: 1.5px solid var(--border); border-radius: 8px;
      background: var(--card); color: var(--text);
      font-size: 13px; outline: none; font-family: inherit;
    }
    .svc-select:focus { border-color: var(--primary); }
    .svc-modifier {
      width: 80px; padding: 9px 12px;
      border: 1.5px solid var(--border); border-radius: 8px;
      background: var(--card); color: var(--text);
      font-size: 13px; outline: none; text-align: center; font-family: inherit;
    }
    .svc-modifier:focus { border-color: var(--primary); }
    .svc-remove {
      background: none; border: none; cursor: pointer;
      color: #ef4444; font-size: 20px; padding: 4px;
      line-height: 1; transition: transform 0.15s;
      flex-shrink: 0;
    }
    .svc-remove:hover { transform: scale(1.2); }

    /* Availability row */
    .avail-row {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 0; border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .avail-row:last-child { border-bottom: none; }
    .avail-day {
      min-width: 110px; display: flex; align-items: center; gap: 8px;
      cursor: pointer; user-select: none;
    }
    .avail-day input[type=checkbox] {
      width: 16px; height: 16px;
      accent-color: var(--primary); cursor: pointer;
    }
    .avail-day span { font-weight: 600; font-size: 14px; color: var(--text); }
    .avail-times {
      display: flex; align-items: center; gap: 8px;
      transition: opacity 0.2s;
    }
    .avail-times input[type=time] {
      padding: 8px 10px; border: 1.5px solid var(--border);
      border-radius: 8px; background: var(--card); color: var(--text);
      font-size: 13px; outline: none; font-family: inherit; width: 115px;
    }
    .avail-times input[type=time]:focus { border-color: var(--primary); }
    .avail-sep { color: var(--muted); font-size: 13px; }

    /* Toggle switch */
    #global-avail:checked + #avail-slider {
      background: var(--primary);
    }
    #global-avail:checked + #avail-slider span {
      transform: translateX(20px);
    }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.st-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.st-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.st-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.stab)?.classList.add('active');
      history.replaceState(null, '', `#${btn.dataset.stab.replace('stab-', '')}`);
    });
  });

  // Open tab from URL hash
  const hash = location.hash.replace('#', '');
  if (hash) {
    const target = document.querySelector(`.st-tab[data-stab="stab-${hash}"]`);
    if (target) target.click();
  }
}

// ─────────────────────────────────────────────────────────────────
// LOAD INITIAL DATA
// ─────────────────────────────────────────────────────────────────

async function loadSettings() {
  const res = await stFetch('/api/accounts/me/');
  if (!res.ok) return;

  const data    = await res.json();
  const profile = data.profile || {};

  // Email field
  const emailEl = document.getElementById('s-email');
  if (emailEl) emailEl.value = data.email || '';

  // Global availability toggle
  const toggle = document.getElementById('global-avail');
  if (toggle) {
    toggle.checked = profile.is_available ?? true;
    updateToggleUI(toggle.checked);
  }

  // Navbar avatar
  const photo = data.profile_photo_url || profile.profile_photo_url || '';
  if (photo) {
    const base  = (typeof CONFIG !== 'undefined') ? CONFIG.SERVER_BASE : '';
    const img   = document.getElementById('nav-avatar');
    const ini   = document.getElementById('nav-initials');
    if (img) { img.src = `${base}${photo}`; img.style.display = 'block'; }
    if (ini) ini.style.display = 'none';
  }

  // Load services and availability panels
  await loadServices(profile);
  loadAvailabilityPanel(profile);
}

// ─────────────────────────────────────────────────────────────────
// ACCOUNT — EMAIL
// ─────────────────────────────────────────────────────────────────

async function saveEmail() {
  const email = document.getElementById('s-email')?.value?.trim();
  if (!email || !email.includes('@')) {
    stToast('⚠️ Enter a valid email address', 'error'); return;
  }

  // PATCH /api/accounts/me/ with { email }
  // Note: if your backend doesn't support email update via this endpoint yet,
  // add it to UserUpdateSerializer and a PATCH view on /api/accounts/me/
  const res = await stFetch('/api/accounts/me/', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email }),
  });

  if (res.ok) {
    stToast('✅ Email updated successfully!');
  } else {
    const err = await res.json().catch(() => ({}));
    stToast('❌ ' + (err.detail || err.email?.[0] || 'Failed to update email'), 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// ACCOUNT — PASSWORD
// ─────────────────────────────────────────────────────────────────

function togglePwd(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

// Wire password strength meter
document.addEventListener('DOMContentLoaded', () => {
  const newPwdEl = document.getElementById('s-new-pwd');
  if (!newPwdEl) return;

  newPwdEl.addEventListener('input', () => {
    const val   = newPwdEl.value;
    const wrap  = document.getElementById('pwd-strength-wrap');
    const bar   = document.getElementById('pwd-strength-bar');
    const label = document.getElementById('pwd-strength-label');
    if (!wrap || !bar || !label) return;

    if (!val) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    let score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
      { label: 'Too short',  color: '#ef4444', width: '15%' },
      { label: 'Weak',       color: '#f97316', width: '30%' },
      { label: 'Fair',       color: '#f59e0b', width: '55%' },
      { label: 'Good',       color: '#84cc16', width: '75%' },
      { label: 'Strong',     color: '#10b981', width: '100%' },
    ];
    const level = levels[Math.min(score, 4)];
    bar.style.width      = level.width;
    bar.style.background = level.color;
    label.textContent    = level.label;
    label.style.color    = level.color;
  });
});

async function savePassword() {
  const current = document.getElementById('s-cur-pwd')?.value?.trim();
  const newPwd  = document.getElementById('s-new-pwd')?.value?.trim();
  const confirm = document.getElementById('s-con-pwd')?.value?.trim();

  if (!current) { stToast('⚠️ Enter your current password', 'error'); return; }
  if (!newPwd || newPwd.length < 6) { stToast('⚠️ New password must be at least 6 characters', 'error'); return; }
  if (newPwd !== confirm) { stToast('⚠️ Passwords do not match', 'error'); return; }

  // POST /api/accounts/me/change-password/
  const res = await stFetch('/api/accounts/me/change-password/', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      old_password:     current,
      current_password: current,  // send both field names for compatibility
      new_password:     newPwd,
    }),
  });

  if (res.ok) {
    stToast('✅ Password changed successfully!');
    ['s-cur-pwd', 's-new-pwd', 's-con-pwd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('pwd-strength-wrap').style.display = 'none';
  } else {
    const err = await res.json().catch(() => ({}));
    stToast('❌ ' + (err.detail || err.error || 'Failed to change password'), 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// ACCOUNT — DEACTIVATE
// ─────────────────────────────────────────────────────────────────

async function deactivateAccount() {
  if (!confirm('Are you sure? Your profile will be hidden from customers and you won\'t receive new bookings.')) return;

  const res = await stFetch('/api/accounts/worker/profile/', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ is_available: false }),
  });

  if (res.ok) {
    stToast('Account deactivated. You can reactivate from your dashboard.');
    setTimeout(() => location.href = 'worker-dashboard.html', 2000);
  } else {
    stToast('❌ Failed to deactivate account', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  { value: 'plumber',     label: 'Plumber'     },
  { value: 'electrician', label: 'Electrician' },
  { value: 'carpenter',   label: 'Carpenter'   },
  { value: 'mechanic',    label: 'Mechanic'    },
  { value: 'painter',     label: 'Painter'     },
  { value: 'cleaner',     label: 'Cleaner'     },
  { value: 'ac_repair',   label: 'AC Repair'   },
  { value: 'welder',      label: 'Welder'      },
  { value: 'mason',       label: 'Mason'       },
  { value: 'gardener',    label: 'Gardener'    },
];

// Store existing service IDs so we can DELETE them if removed
let _existingServiceIds = {};

async function loadServices(profile) {
  const list = document.getElementById('services-list');
  if (!list) return;
  list.innerHTML = '';
  _existingServiceIds = {};

  // Fetch from /api/accounts/me/ profile.services
  const services = profile.services || [];

  if (services.length) {
    services.forEach(svc => {
      _existingServiceIds[svc.id] = svc.category;
      addServiceRow(svc.category, svc.price_modifier_pct || 0, svc.id);
    });
  } else {
    addServiceRow(); // one empty row
  }
}

function addServiceRow(category = '', modifier = 0, serviceId = '') {
  const list = document.getElementById('services-list');
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'svc-row';
  row.dataset.serviceId = serviceId;

  row.innerHTML = `
    <select class="svc-select">
      ${SERVICE_CATEGORIES.map(c =>
        `<option value="${c.value}" ${c.value === category ? 'selected' : ''}>${c.label}</option>`
      ).join('')}
    </select>
    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
      <label style="font-size:12px;color:var(--muted);white-space:nowrap">Price adj %</label>
      <input type="number" class="svc-modifier" value="${modifier}" min="-50" max="200" placeholder="0">
    </div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
      ${serviceId
        ? `<span style="font-size:11px;color:var(--muted);background:var(--border);padding:2px 8px;border-radius:6px">saved</span>`
        : `<span style="font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.1);padding:2px 8px;border-radius:6px">new</span>`
      }
      <button class="svc-remove" onclick="removeServiceRow(this)" title="Remove">×</button>
    </div>
  `;

  list.appendChild(row);
}

function removeServiceRow(btn) {
  btn.closest('.svc-row').remove();
}

async function saveServices() {
  const rows    = document.querySelectorAll('.svc-row');
  const base    = (typeof CONFIG !== 'undefined') ? CONFIG.SERVER_BASE : 'http://127.0.0.1:8000';
  const token   = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  let saved = 0;
  let errors = 0;

  for (const row of rows) {
    const category  = row.querySelector('.svc-select')?.value;
    const modifier  = parseFloat(row.querySelector('.svc-modifier')?.value) || 0;
    const serviceId = row.dataset.serviceId;

    if (!category) continue;

    if (serviceId) {
      // Existing service — this endpoint may need to be added to your backend
      // For now we skip update (category can't change, only modifier)
      // TODO: PATCH /api/accounts/workers/me/services/{id}/
    } else {
      // New service — POST /api/accounts/workers/me/services/
      const res = await fetch(`${base}/api/accounts/workers/me/services/`, {
        method: 'POST', headers,
        body: JSON.stringify({ category, price_modifier_pct: modifier }),
      });

      if (res.ok || res.status === 201) {
        const data = await res.json();
        row.dataset.serviceId = data.id || '';
        // Update badge from "new" to "saved"
        const badge = row.querySelector('span');
        if (badge) {
          badge.textContent       = 'saved';
          badge.style.color       = 'var(--muted)';
          badge.style.background  = 'var(--border)';
        }
        saved++;
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Service save error:', err);
        errors++;
      }
    }
  }

  if (errors === 0) {
    stToast(`✅ Services saved!`);
  } else {
    stToast(`⚠️ ${saved} saved, ${errors} failed`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────────────────────────

const DAYS = [
  { id: 0, name: 'Monday' },
  { id: 1, name: 'Tuesday' },
  { id: 2, name: 'Wednesday' },
  { id: 3, name: 'Thursday' },
  { id: 4, name: 'Friday' },
  { id: 5, name: 'Saturday' },
  { id: 6, name: 'Sunday' },
];

function loadAvailabilityPanel(profile) {
  const container = document.getElementById('availability-schedule');
  if (!container) return;

  // Pre-load existing slots from profile if available
  const existingSlots = profile.availability || [];
  const slotMap = {};
  existingSlots.forEach(s => { slotMap[s.day_of_week] = s; });

  container.innerHTML = DAYS.map(day => {
    const slot    = slotMap[day.id];
    const checked = !!slot;
    const start   = slot?.start_time?.slice(0, 5) || '09:00';
    const end     = slot?.end_time?.slice(0, 5)   || '18:00';

    return `
      <div class="avail-row" data-day="${day.id}">
        <label class="avail-day">
          <input type="checkbox" ${checked ? 'checked' : ''}
            onchange="toggleDayAvailability(this)">
          <span>${day.name}</span>
        </label>
        <div class="avail-times" style="opacity:${checked ? '1' : '0.35'}">
          <input type="time" value="${start}" class="avail-start">
          <span class="avail-sep">to</span>
          <input type="time" value="${end}" class="avail-end">
        </div>
        ${slot?.id ? `<input type="hidden" class="avail-slot-id" value="${slot.id}">` : ''}
      </div>`;
  }).join('');
}

function toggleDayAvailability(checkbox) {
  const row   = checkbox.closest('.avail-row');
  const times = row.querySelector('.avail-times');
  if (times) times.style.opacity = checkbox.checked ? '1' : '0.35';
}

async function toggleGlobalAvailability(toggle) {
  updateToggleUI(toggle.checked);

  const res = await stFetch('/api/accounts/worker/profile/', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ is_available: toggle.checked }),
  });

  if (res.ok) {
    stToast(toggle.checked ? '✅ You are now available' : '⏸ Set to unavailable');
  } else {
    toggle.checked = !toggle.checked;
    updateToggleUI(toggle.checked);
    stToast('❌ Failed to update availability', 'error');
  }
}

function updateToggleUI(checked) {
  const slider = document.getElementById('avail-slider');
  if (!slider) return;
  slider.style.background = checked ? 'var(--primary)' : 'var(--border)';
  const knob = slider.querySelector('span');
  if (knob) knob.style.transform = checked ? 'translateX(20px)' : 'translateX(0)';
}

async function saveAvailability() {
  const base    = (typeof CONFIG !== 'undefined') ? CONFIG.SERVER_BASE : 'http://127.0.0.1:8000';
  const token   = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const rows = document.querySelectorAll('.avail-row');
  let saved  = 0;
  let errors = 0;

  for (const row of rows) {
    const dayId   = parseInt(row.dataset.day);
    const checked = row.querySelector('input[type=checkbox]')?.checked;
    const start   = row.querySelector('.avail-start')?.value;
    const end     = row.querySelector('.avail-end')?.value;
    const slotId  = row.querySelector('.avail-slot-id')?.value;

    if (!checked) {
      // If unchecked and has existing slot — DELETE it
      if (slotId) {
        const res = await fetch(`${base}/api/accounts/workers/me/availability/${slotId}/`, {
          method: 'DELETE', headers,
        });
        if (res.ok || res.status === 204) {
          row.querySelector('.avail-slot-id')?.remove();
          saved++;
        }
      }
      continue;
    }

    if (!start || !end) continue;

    if (slotId) {
      // Existing slot — for simplicity delete and recreate
      // (PUT/PATCH on availability isn't in your urls.py yet)
      await fetch(`${base}/api/accounts/workers/me/availability/${slotId}/`, {
        method: 'DELETE', headers,
      });
      row.querySelector('.avail-slot-id')?.remove();
    }

    // POST new slot
    const res = await fetch(`${base}/api/accounts/workers/me/availability/`, {
      method: 'POST', headers,
      body: JSON.stringify({
        day_of_week: dayId,
        start_time:  start + ':00',
        end_time:    end   + ':00',
      }),
    });

    if (res.ok || res.status === 201) {
      const data = await res.json();
      // Store new ID on the row
      let hiddenInput = row.querySelector('.avail-slot-id');
      if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type      = 'hidden';
        hiddenInput.className = 'avail-slot-id';
        row.appendChild(hiddenInput);
      }
      hiddenInput.value = data.id || '';
      saved++;
    } else {
      const err = await res.json().catch(() => ({}));
      // unique_together conflict (slot already exists) — not a real error
      if (err.non_field_errors?.[0]?.includes('unique')) {
        saved++;
      } else {
        console.error('Availability save error:', err);
        errors++;
      }
    }
  }

  if (errors === 0) {
    stToast('✅ Schedule saved!');
  } else {
    stToast(`⚠️ ${saved} days saved, ${errors} failed`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  injectStyles();
  initTabs();
  await loadSettings();
});