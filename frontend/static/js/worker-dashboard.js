/**
 * FILE LOCATION: frontend/static/js/worker-dashboard.js
 *
 * Complete worker dashboard logic.
 * Tabs: Dashboard | Job Requests | Active Jobs | Portfolio | Earnings | Reviews
 *
 * Worker profile ID → GET /api/accounts/me/ → profile.id
 * Cached in localStorage as 'worker_profile_id'
 */

// ═════════════════════════════════════════════════════════════════
// 0. API FETCH HELPER
// ═════════════════════════════════════════════════════════════════

function wdFetch(path, options = {}) {
  const token   = localStorage.getItem('access_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(CONFIG.SERVER_BASE + path, { ...options, headers });
}

// Returns worker profile UUID (WORKER_PROFILES.id), fetches + caches it
async function getWorkerProfileId() {
  const cached = localStorage.getItem('worker_profile_id');
  if (cached) return cached;
  const res = await wdFetch('/api/accounts/me/');
  if (!res.ok) return null;
  const data = await res.json();
  const id   = data.profile?.id || null;
  if (id) localStorage.setItem('worker_profile_id', id);
  return id;
}

// ═════════════════════════════════════════════════════════════════
// 1. SPA TAB NAVIGATION
// ═════════════════════════════════════════════════════════════════

function switchTab(sectionId) {
  // Hide all sections, deactivate all nav items
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target section
  const section = document.getElementById(sectionId);
  if (section) section.classList.add('active');

  // Highlight nav item
  const navItem = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
  if (navItem) navItem.classList.add('active');

  // Close profile dropdown
  document.getElementById('profile-menu')?.classList.remove('open');

  // Lazy-load section data
  if (sectionId === 'sec-requests')  renderWorkerDashboard();
  if (sectionId === 'sec-jobs')      renderActiveJobs();
  if (sectionId === 'sec-earnings')  renderEarnings();
  if (sectionId === 'sec-reviews')   renderReviews();
  if (sectionId === 'sec-portfolio') renderPortfolio();
}

// Wire nav items
document.querySelectorAll('.nav-item[data-target]').forEach(item => {
  item.onclick = () => switchTab(item.dataset.target);
});

// Wire dropdown links
document.getElementById('dd-settings')?.addEventListener('click',   e => { e.preventDefault(); switchTab('sec-settings'); });
document.getElementById('dd-portfolio')?.addEventListener('click',  e => { e.preventDefault(); switchTab('sec-portfolio'); });
document.getElementById('dd-logout')?.addEventListener('click',     e => { e.preventDefault(); localStorage.clear(); location.replace('index.html'); });

// Profile dropdown toggle
document.getElementById('profile-trigger')?.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('profile-menu')?.classList.toggle('open');
});
document.addEventListener('click', () => document.getElementById('profile-menu')?.classList.remove('open'));

// ═════════════════════════════════════════════════════════════════
// 2. THEME TOGGLE
// ═════════════════════════════════════════════════════════════════

const _html = document.documentElement;

function applyTheme(dark) {
  _html.setAttribute('data-theme', dark ? 'dark' : 'light');
  const m = document.getElementById('moon-icon');
  const s = document.getElementById('sun-icon');
  if (m) m.style.display = dark ? 'none'  : 'block';
  if (s) s.style.display = dark ? 'block' : 'none';
}
applyTheme(localStorage.getItem('theme') === 'dark');

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const dark = _html.getAttribute('data-theme') !== 'dark';
  applyTheme(dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
});

// ═════════════════════════════════════════════════════════════════
// 3. AVAILABILITY TOGGLE
//    Reads real value from /api/accounts/me/ on load
//    Saves to PATCH /api/accounts/worker/profile/ → { is_available }
// ═════════════════════════════════════════════════════════════════

const availCheck = document.getElementById('availability-check');
const availLabel = document.getElementById('avail-label');

// Load real availability from backend on page load
async function initAvailability() {
  const res = await wdFetch('/api/accounts/me/');
  if (!res.ok) return;
  const data    = await res.json();
  const isAvail = data.profile?.is_available ?? true;

  if (availCheck) availCheck.checked = isAvail;
  if (availLabel) availLabel.textContent = isAvail ? 'Available' : 'Unavailable';
}

// Toggle availability on checkbox change
availCheck?.addEventListener('change', async function () {
  const isAvail = this.checked;
  if (availLabel) availLabel.textContent = isAvail ? 'Available' : 'Unavailable';

  // PATCH /api/accounts/worker/profile/ → { is_available: bool }
  const res = await wdFetch('/api/accounts/worker/profile/', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ is_available: isAvail }),
  });

  if (res.ok) {
    showToast(isAvail ? '✅ You are now available' : '⏸ You are now unavailable');
  } else {
    // Revert toggle if request failed
    this.checked = !isAvail;
    if (availLabel) availLabel.textContent = !isAvail ? 'Available' : 'Unavailable';
    showToast('❌ Failed to update availability', 'error');
  }
});

// ═════════════════════════════════════════════════════════════════
// 4. NAVBAR USER INFO
//    Populates name + avatar from localStorage
// ═════════════════════════════════════════════════════════════════

function initNavbarUser() {
  const first = localStorage.getItem('first_name') || '';
  const last  = localStorage.getItem('last_name')  || '';
  const name  = `${first} ${last}`.trim() || 'Worker';
  const photo = localStorage.getItem('profile_photo_url');

  // Dropdown name
  const nameEl = document.getElementById('dropdown-name');
  if (nameEl) nameEl.textContent = name;

  // Avatar image or initials fallback
  if (photo) {
    const img = document.getElementById('nav-avatar');
    if (img) { img.src = `${CONFIG.SERVER_BASE}${photo}`; img.style.display = 'block'; }
    const ini = document.getElementById('nav-initials');
    if (ini) ini.style.display = 'none';
  } else {
    const ini = document.getElementById('nav-initials');
    if (ini) { ini.style.display = 'flex'; ini.textContent = (first[0] || 'W').toUpperCase(); }
    const img = document.getElementById('nav-avatar');
    if (img) img.style.display = 'none';
  }
}

// ═════════════════════════════════════════════════════════════════
// 5. OVERVIEW — stats + pending requests + recent completed
// ═════════════════════════════════════════════════════════════════

// ── PASTE THIS AT THE BOTTOM OF worker-dashboard.js ──
// Replaces old stat cards with clickable ones + beautiful portfolio

// Override initOverview to make stat cards clickable
async function initOverview() {
  const result = await getWorkerBookings();
  if (!result.success) return;

  const bookings  = result.bookings;
  const pending   = bookings.filter(b => b.status === 'pending');
  const active    = bookings.filter(b => ['accepted','in_progress'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'completed');

  // Render beautiful clickable stat cards
  const statsGrid = document.querySelector('.stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <!-- New Requests — clicks to Job Requests -->
      <div class="stat-card stat-card-clickable" onclick="switchTab('sec-requests')" style="cursor:pointer">
        <div class="stat-icon orange">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <div class="stat-details">
          <h3 class="stat-value" id="stat-requests">${pending.length}</h3>
          <p class="stat-label">New Requests</p>
          <p style="font-size:11px;color:var(--primary);margin:4px 0 0;font-weight:600"></p>
        </div>
      </div>

      <!-- Active Jobs — clicks to Active Jobs -->
      <div class="stat-card stat-card-clickable" onclick="switchTab('sec-jobs')" style="cursor:pointer">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="stat-details">
          <h3 class="stat-value" id="stat-active">${active.length}</h3>
          <p class="stat-label">Active Jobs</p>
          <p style="font-size:11px;color:#3b82f6;margin:4px 0 0;font-weight:600"></p>
        </div>
      </div>

      <!-- Earnings — clicks to Earnings -->
      <div class="stat-card stat-card-clickable" onclick="switchTab('sec-earnings')" style="cursor:pointer">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <div class="stat-details">
          <h3 class="stat-value" id="stat-earnings">${calcMonthEarnings(bookings)}</h3>
          <p class="stat-label">Earnings this Month</p>
          <p style="font-size:11px;color:var(--primary);margin:4px 0 0;font-weight:600"></p>
        </div>
      </div>

      <!-- Avg Rating — clicks to Reviews -->
      <div class="stat-card stat-card-clickable" onclick="switchTab('sec-reviews')" style="cursor:pointer">
        <div class="stat-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
        <div class="stat-details">
          <h3 class="stat-value" id="stat-rating">—</h3>
          <p class="stat-label">Avg Rating</p>
          <p style="font-size:11px;color:#f59e0b;margin:4px 0 0;font-weight:600"></p>
        </div>
      </div>`;

    // Add hover effect via style injection
    if (!document.getElementById('stat-card-styles')) {
      const style = document.createElement('style');
      style.id = 'stat-card-styles';
      style.textContent = `
        .stat-card-clickable { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease !important; }
        .stat-card-clickable:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 36px rgba(0,0,0,0.12) !important; border-color: var(--primary) !important; }
      `;
      document.head.appendChild(style);
    }
  }

  // Pending badge on nav
  if (pending.length) {
    const badge = document.getElementById('req-badge');
    if (badge) { badge.textContent = pending.length; badge.style.display = 'inline'; }
  }

  // Avg rating
  const profileId = await getWorkerProfileId();
  if (profileId) {
    const rRes = await wdFetch(`/api/bookings/workers/${profileId}/reviews/`);
    if (rRes.ok) {
      const reviews = await rRes.json();
      const list    = Array.isArray(reviews) ? reviews : (reviews.results || []);
      if (list.length) {
        const avg = (list.reduce((s,r) => s + r.rating, 0) / list.length).toFixed(1);
        setText('stat-rating', `${avg} ★`);
      } else {
        setText('stat-rating', 'N/A');
      }
    }
  }

  renderOverviewTable('overview-requests',  pending.slice(0,3),   true);
  renderOverviewTable('overview-completed', completed.slice(0,3), false);
}


// Override renderPortfolio with beautiful grid
async function renderPortfolio() {
  const grid  = document.getElementById('portfolio-grid');
  const empty = document.getElementById('portfolio-empty');
  if (!grid) return;

  grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>`;

  const photos = await fetchPortfolio();

  // Inject portfolio styles once
  if (!document.getElementById('portfolio-styles')) {
    const style = document.createElement('style');
    style.id = 'portfolio-styles';
    style.textContent = `
      .portfolio-item {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        aspect-ratio: 1;
        background: var(--card);
        border: 1px solid var(--border);
        cursor: pointer;
        group: true;
      }
      .portfolio-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.4s ease;
      }
      .portfolio-item:hover img {
        transform: scale(1.08);
      }
      .portfolio-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.3s ease;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 16px;
      }
      .portfolio-item:hover .portfolio-overlay {
        opacity: 1;
      }
      .portfolio-delete-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(239,68,68,0.85);
        border: none;
        cursor: pointer;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transform: scale(0.8);
        transition: opacity 0.2s, transform 0.2s;
        backdrop-filter: blur(4px);
      }
      .portfolio-item:hover .portfolio-delete-btn {
        opacity: 1;
        transform: scale(1);
      }
      .portfolio-caption {
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        transform: translateY(6px);
        transition: transform 0.3s ease;
      }
      .portfolio-item:hover .portfolio-caption {
        transform: translateY(0);
      }
      .portfolio-date {
        color: rgba(255,255,255,0.7);
        font-size: 11px;
        margin-top: 2px;
        transform: translateY(6px);
        transition: transform 0.3s ease 0.05s;
      }
      .portfolio-item:hover .portfolio-date {
        transform: translateY(0);
      }

      /* Upload zone */
      .portfolio-upload-zone {
        border-radius: 16px;
        border: 2px dashed var(--border);
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        background: transparent;
        color: var(--muted);
        gap: 8px;
      }
      .portfolio-upload-zone:hover {
        border-color: var(--primary);
        color: var(--primary);
        background: rgba(108,138,61,0.04);
        transform: translateY(-3px);
      }
    `;
    document.head.appendChild(style);
  }

  if (!photos.length) {
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px';
    empty.style.display = 'none';
    grid.innerHTML = `
      <!-- Quick upload prompt card -->
      <div class="portfolio-upload-zone" onclick="document.getElementById('upload-photo-btn').click()">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span style="font-size:13px;font-weight:600">Upload your first photo</span>
        <span style="font-size:11px">Show customers your work</span>
      </div>`;
    return;
  }

  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px';
  empty.style.display = 'none';

  const uploadCard = `
    <div class="portfolio-upload-zone" onclick="document.getElementById('upload-photo-btn').click()" title="Add another photo">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span style="font-size:12px;font-weight:600">Add Photo</span>
    </div>`;

  grid.innerHTML = photos.map((p, i) => {
    const dateStr = p.uploaded_at
      ? new Date(p.uploaded_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '';
    return `
      <div class="portfolio-item" style="animation:fadeIn 0.3s ease ${i * 0.05}s both">
        <img src="${CONFIG.SERVER_BASE}${p.photo_url}" alt="${p.caption || 'Portfolio photo'}"
          onerror="this.parentElement.style.background='var(--border)'">
        <button class="portfolio-delete-btn" onclick="event.stopPropagation();deletePortfolioPhoto('${p.id}')" title="Remove photo">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="portfolio-overlay">
          ${p.caption ? `<div class="portfolio-caption">${p.caption}</div>` : ''}
          ${dateStr ? `<div class="portfolio-date">${dateStr}</div>` : ''}
        </div>
      </div>`;
  }).join('') + uploadCard;
}

function calcMonthEarnings(bookings) {
  const now   = new Date();
  const total = bookings
    .filter(b => {
      if (b.status !== 'completed') return false;
      const d = new Date(b.scheduled_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, b) => s + parseFloat(b.total_price || 0), 0);
  return `Rs${total.toLocaleString()}`;
}

// Renders a small preview table in the overview section
function renderOverviewTable(containerId, bookings, isRequests) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!bookings.length) {
    el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:14px">
      ${isRequests ? 'No pending requests 🎉' : 'No completed jobs yet'}
    </div>`;
    return;
  }

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="table" style="margin:0">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Service</th>
            <th>Date</th>
            <th>${isRequests ? 'Actions' : 'Amount'}</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => `
            <tr>
              <td style="display:flex;align-items:center;gap:10px;font-weight:600">
                ${avatarCell(b.customer_photo, b.customer_name)}
                ${b.customer_name || 'Customer'}
              </td>
              <td>${capitalize(b.service_category)}</td>
              <td style="color:var(--muted);font-size:13px">${formatDate(b.scheduled_at)}</td>
              <td>${isRequests
                ? `<div style="display:flex;gap:8px">
                    <button class="btn gradient" style="padding:5px 12px;font-size:12px;width:auto"
                      onclick="handleStatusUpdate('${b.id}','accepted')">Accept</button>
                    <button class="btn outline" style="padding:5px 12px;font-size:12px;width:auto;color:#ef4444;border-color:#ef4444"
                      onclick="handleStatusUpdate('${b.id}','cancelled_worker')">Decline</button>
                   </div>`
                : `<span style="color:var(--primary);font-weight:700">Rs${b.total_price}</span>`
              }</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ═════════════════════════════════════════════════════════════════
// 6. JOB REQUESTS TAB — pending bookings only
// ═════════════════════════════════════════════════════════════════

async function renderWorkerDashboard() {
  const container = document.getElementById('worker-bookings-container');
  if (!container) return;

  container.innerHTML = loadingHTML();
  const result = await getWorkerBookings();
  if (!result.success) { container.innerHTML = errorHTML(result.error); return; }

  const pending = result.bookings.filter(b => b.status === 'pending');

  if (!pending.length) {
    container.innerHTML = emptyHTML('📭', 'No pending requests', 'New booking requests will appear here.');
    return;
  }

  container.innerHTML = `
    <div style="overflow-x:auto">
      <table class="table" style="margin:0">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Service</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${pending.map(b => `
            <tr>
              <td style="display:flex;align-items:center;gap:12px;font-weight:600">
                ${avatarCell(b.customer_photo, b.customer_name)}
                ${b.customer_name || 'Customer'}
              </td>
              <td>${capitalize(b.service_category)}</td>
              <td style="color:var(--muted);font-size:13px">${formatDate(b.scheduled_at)}</td>
              <td style="font-weight:600;color:var(--primary)">Rs${b.total_price}</td>
              <td>
                <div style="display:flex;gap:8px">
                  <button class="btn gradient" style="width:auto;padding:6px 16px;font-size:13px"
                    onclick="handleStatusUpdate('${b.id}','accepted')">Accept</button>
                  <button class="btn outline" style="width:auto;padding:6px 16px;font-size:13px;color:#ef4444;border-color:#ef4444"
                    onclick="handleStatusUpdate('${b.id}','cancelled_worker')">Decline</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ═════════════════════════════════════════════════════════════════
// 7. ACTIVE JOBS TAB — accepted + in_progress with filter tabs
// ═════════════════════════════════════════════════════════════════

let _allBookings = []; // cache to avoid re-fetching on filter change

// ═════════════════════════════════════════════════════════════════
// ACTIVE JOBS — Colored filter tabs + colored action buttons
// ═════════════════════════════════════════════════════════════════
 
// Inject job styles once
function injectJobStyles() {
  if (document.getElementById('job-styles')) return;
  const s = document.createElement('style');
  s.id = 'job-styles';
  s.textContent = `
    /* Colored filter tabs */
    .filter-tab { transition: all 0.2s; }
    .filter-tab[data-filter="all"].active      { background:#6c8a3d; border-color:#6c8a3d; color:#fff; }
    .filter-tab[data-filter="accepted"].active { background:#3b82f6; border-color:#3b82f6; color:#fff; }
    .filter-tab[data-filter="in_progress"].active { background:#f59e0b; border-color:#f59e0b; color:#fff; }
    .filter-tab[data-filter="completed"].active   { background:#10b981; border-color:#10b981; color:#fff; }
    .filter-tab[data-filter="cancelled"].active   { background:#ef4444; border-color:#ef4444; color:#fff; }
 
    .filter-tab[data-filter="all"]:hover      { border-color:#6c8a3d; color:#6c8a3d; }
    .filter-tab[data-filter="accepted"]:hover { border-color:#3b82f6; color:#3b82f6; }
    .filter-tab[data-filter="in_progress"]:hover { border-color:#f59e0b; color:#f59e0b; }
    .filter-tab[data-filter="completed"]:hover   { border-color:#10b981; color:#10b981; }
    .filter-tab[data-filter="cancelled"]:hover   { border-color:#ef4444; color:#ef4444; }
 
    /* Job action buttons */
    .btn-start    { background:#3b82f6!important; border:none; color:#fff!important; }
    .btn-complete { background:#10b981!important; border:none; color:#fff!important; }
    .btn-accept   { background:#6c8a3d!important; border:none; color:#fff!important; }
    .btn-decline  { background:transparent!important; border:1.5px solid #ef4444!important; color:#ef4444!important; }
    .btn-start:hover    { filter:brightness(1.1)!important; transform:translateY(-1px)!important; }
    .btn-complete:hover { filter:brightness(1.1)!important; transform:translateY(-1px)!important; }
    .btn-accept:hover   { filter:brightness(1.1)!important; transform:translateY(-1px)!important; }
    .btn-decline:hover  { background:rgba(239,68,68,0.1)!important; transform:translateY(-1px)!important; }
 
    /* Group header colors */
    .job-group-accepted    { color:#3b82f6; }
    .job-group-in_progress { color:#f59e0b; }
    .job-group-completed   { color:#10b981; }
    .job-group-cancelled   { color:#ef4444; }
    .job-group-pending     { color:var(--primary); }
  `;
  document.head.appendChild(s);
}
 
async function renderActiveJobs(filter = 'all') {
  injectJobStyles();
  const container = document.getElementById('my-jobs-container');
  if (!container) return;
 
  if (!_allBookings.length) {
    container.innerHTML = loadingHTML();
    const result = await getWorkerBookings();
    if (!result.success) { container.innerHTML = errorHTML(result.error); return; }
    _allBookings = result.bookings;
  }
 
  const groups = {
    accepted:    _allBookings.filter(b => b.status === 'accepted'),
    in_progress: _allBookings.filter(b => b.status === 'in_progress'),
    completed:   _allBookings.filter(b => b.status === 'completed'),
    cancelled:   _allBookings.filter(b => b.status.startsWith('cancelled')),
  };
 
  let html = '';
  if (filter === 'all') {
    if (groups.accepted.length)    html += renderJobGroup('✅ Accepted',    groups.accepted,    'accepted');
    if (groups.in_progress.length) html += renderJobGroup('🔧 In Progress', groups.in_progress, 'in_progress');
    if (groups.completed.length)   html += renderJobGroup('🎉 Completed',   groups.completed,   'completed');
    if (groups.cancelled.length)   html += renderJobGroup('❌ Cancelled',    groups.cancelled,   'cancelled');
  } else {
    const list = groups[filter] || [];
    html = list.length
      ? renderJobGroup('', list, filter)
      : emptyHTML('📋', 'No jobs here', 'Nothing in this category yet.');
  }
 
  container.innerHTML = html || emptyHTML('📋', 'No jobs yet', 'Accepted bookings will appear here.');
 
  // Wire action buttons with class-based selector
  container.querySelectorAll('[data-action-id]').forEach(btn => {
    btn.addEventListener('click', () => handleStatusUpdate(btn.dataset.actionId, btn.dataset.actionStatus));
  });
}

// ── REPLACE these two functions at the bottom of worker-dashboard.js ──

function renderJobGroup(title, bookings, groupKey) {
  const labels = {
    accepted:    ' Accepted',
    in_progress: ' In Progress',
    completed:   ' Completed',
    cancelled:   ' Cancelled',
    pending:     ' Pending',
  };

  return `
    <div style="margin-bottom:32px">
      ${title ? `
        <h3 style="font-size:17px;margin:0 0 16px;display:flex;align-items:center;gap:8px"
          class="job-group-${groupKey}">
          ${labels[groupKey] || title}
          <span class="job-group-badge-${groupKey}"
            style="padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">
            ${bookings.length}
          </span>
        </h3>` : ''}
      <div style="overflow-x:auto">
        <table class="table" style="margin:0">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Service</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              ${['accepted','in_progress','pending'].includes(groupKey) ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${bookings.map(b => `
              <tr>
                <td style="display:flex;align-items:center;gap:10px;font-weight:600">
                  ${avatarCell(b.customer_photo, b.customer_name)}
                  ${b.customer_name || 'Customer'}
                </td>
                <td>${capitalize(b.service_category)}</td>
                <td style="color:var(--muted);font-size:13px">${formatDate(b.scheduled_at)}</td>
                <td style="font-weight:700;color:var(--primary)">Rs${b.total_price}</td>
                <td>${coloredStatusBadge(b.status)}</td>
                ${groupKey === 'accepted' ? `
                  <td>
                    <button class="btn btn-start"
                      style="padding:7px 16px;font-size:12px;width:auto"
                      data-action-id="${b.id}" data-action-status="in_progress">
                      🔧 Start Job
                    </button>
                  </td>` : ''}
                ${groupKey === 'in_progress' ? `
                  <td>
                    <button class="btn btn-complete"
                      style="padding:7px 16px;font-size:12px;width:auto"
                      data-action-id="${b.id}" data-action-status="completed">
                      🎉 Mark Complete
                    </button>
                  </td>` : ''}
                ${groupKey === 'pending' ? `
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-accept"
                        style="padding:7px 14px;font-size:12px;width:auto"
                        data-action-id="${b.id}" data-action-status="accepted">
                        ✅ Accept
                      </button>
                      <button class="btn btn-decline"
                        style="padding:7px 14px;font-size:12px;width:auto"
                        data-action-id="${b.id}" data-action-status="cancelled_worker">
                        ✕ Decline
                      </button>
                    </div>
                  </td>` : ''}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function coloredStatusBadge(status) {
  const map = {
    pending:            { cls: 'pending',     label: 'Pending'               },
    accepted:           { cls: 'accepted',    label: 'Accepted'              },
    in_progress:        { cls: 'in_progress', label: 'In Progress'           },
    completed:          { cls: 'completed',   label: 'Completed'             },
    cancelled_customer: { cls: 'cancelled',   label: 'Cancelled by Customer' },
    cancelled_worker:   { cls: 'cancelled',   label: 'Declined'              },
    cancelled:          { cls: 'cancelled',   label: 'Cancelled'             },
  };
  const s = map[status] || { cls: 'pending', label: status };
  return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

// ═════════════════════════════════════════════════════════════════
// 8. EARNINGS TAB
//    Uses completed bookings as proxy until earnings API is wired
//    TODO: Replace with GET /api/worker-earnings/?worker_profile_id={id}
// ═════════════════════════════════════════════════════════════════

async function renderEarnings() {
  const container = document.getElementById('earnings-container');
  if (!container) return;

  container.innerHTML = loadingHTML();
  const result = await getWorkerBookings();
  if (!result.success) { container.innerHTML = errorHTML(result.error); return; }

  const completed = result.bookings.filter(b => b.status === 'completed');
  const now       = new Date();

  // Month filter
  const thisMonth = completed.filter(b => {
    const d = new Date(b.scheduled_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Update summary stat cards
  setText('earn-month', `Rs${thisMonth.reduce((s,b) => s + parseFloat(b.total_price||0), 0).toLocaleString()}`);
  setText('earn-total', `Rs${completed.reduce((s,b) => s + parseFloat(b.total_price||0), 0).toLocaleString()}`);
  setText('earn-jobs',  completed.length);
  setText('earn-bonus', 'Rs 0'); // TODO: from COMMISSION_PERIODS table

  if (!completed.length) {
    container.innerHTML = emptyHTML('💰', 'No earnings yet', 'Complete jobs to see your earnings history.');
    return;
  }

  container.innerHTML = `
    <div style="overflow-x:auto">
      <table class="table" style="margin:0">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Service</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${completed.map(b => `
            <tr>
              <td style="display:flex;align-items:center;gap:10px;font-weight:600">
                ${avatarCell(b.customer_photo, b.customer_name)}
                ${b.customer_name || 'Customer'}
              </td>
              <td>${capitalize(b.service_category)}</td>
              <td style="color:var(--muted);font-size:13px">${formatDate(b.scheduled_at)}</td>
              <td style="color:var(--primary);font-weight:700">Rs${parseFloat(b.total_price).toLocaleString()}</td>
              <td style="color:var(--muted);font-size:13px">${capitalize(b.payment_method || 'cash')}</td>
              <td><span class="badge completed">Paid</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ═════════════════════════════════════════════════════════════════
// 9. REVIEWS TAB
//    GET /api/bookings/workers/{worker_profile_id}/reviews/
// ═════════════════════════════════════════════════════════════════

async function renderReviews() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  container.innerHTML = loadingHTML();

  // Get worker profile ID first
  const profileId = await getWorkerProfileId();
  if (!profileId) {
    container.innerHTML = errorHTML('Could not load worker profile ID.');
    return;
  }

  // Fetch reviews from backend
  const res = await wdFetch(`/api/bookings/workers/${profileId}/reviews/`);
  if (!res.ok) {
    container.innerHTML = errorHTML('Failed to load reviews.');
    return;
  }

  const data    = await res.json();
  const reviews = Array.isArray(data) ? data : (data.results || []);

  if (!reviews.length) {
    // Reset summary
    setText('reviews-avg-big',    '—');
    setText('reviews-count-label', '0 reviews');
    const starsEl = document.getElementById('reviews-stars-big');
    if (starsEl) starsEl.textContent = '☆☆☆☆☆';
    container.innerHTML = emptyHTML('⭐', 'No reviews yet', 'Completed jobs with happy customers will earn you reviews here.');
    return;
  }

  // Calculate average
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  // Update summary block
  setText('reviews-avg-big',    avg);
  setText('reviews-count-label', `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`);
  const starsEl = document.getElementById('reviews-stars-big');
  if (starsEl) starsEl.textContent = starStr(parseFloat(avg));

  // Star breakdown bars
  const breakdown = document.getElementById('reviews-breakdown');
  if (breakdown) {
    breakdown.innerHTML = [5,4,3,2,1].map(star => {
      const count = reviews.filter(r => r.rating === star).length;
      const pct   = Math.round((count / reviews.length) * 100);
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:13px;color:var(--muted);min-width:10px">${star}</span>
          <span style="color:#f59e0b">★</span>
          <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;background:#f59e0b;border-radius:4px;width:${pct}%"></div>
          </div>
          <span style="font-size:13px;color:var(--muted);min-width:20px">${count}</span>
        </div>`;
    }).join('');
  }

  // Individual review cards
  container.innerHTML = reviews.map(r => {
    const reviewerName  = r.reviewer_name  || r.reviewer?.full_name  || 'Customer';
    const reviewerPhoto = r.reviewer_photo || r.reviewer?.profile_photo_url || '';
    const imgSrc        = reviewerPhoto ? `${CONFIG.SERVER_BASE}${reviewerPhoto}` : `https://i.pravatar.cc/150?u=${r.id}`;
    const dateStr       = r.created_at
      ? new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '';
    return `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <img src="${imgSrc}"
              style="width:42px;height:42px;border-radius:50%;object-fit:cover"
              onerror="this.src='https://i.pravatar.cc/150?u=${r.id}'">
            <div>
              <div style="font-weight:700;font-size:15px">${reviewerName}</div>
              <div style="color:#f59e0b;font-size:15px;margin-top:2px">${starStr(r.rating)}</div>
            </div>
          </div>
          <div style="color:var(--muted);font-size:13px">${dateStr}</div>
        </div>
        ${r.comment
          ? `<p style="margin:0;color:var(--text);font-size:14px;line-height:1.6">${r.comment}</p>`
          : `<p style="margin:0;color:var(--muted);font-size:13px;font-style:italic">No comment left.</p>`
        }
      </div>`;
  }).join('');
}

function starStr(rating) {
  const full = Math.round(rating);
  return '★'.repeat(Math.max(0, full)) + '☆'.repeat(Math.max(0, 5 - full));
}

// ═════════════════════════════════════════════════════════════════
// 10. PORTFOLIO TAB
//     In-memory store for frontend demo
//     TODO: Wire to GET/POST/DELETE /api/accounts/workers/me/portfolio/
// ═════════════════════════════════════════════════════════════════

// Fetch portfolio from backend
async function fetchPortfolio() {
  const res = await wdFetch('/api/accounts/workers/me/portfolio/');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

async function renderPortfolio() {
  const grid  = document.getElementById('portfolio-grid');
  const empty = document.getElementById('portfolio-empty');
  if (!grid) return;

  grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>`;

  const photos = await fetchPortfolio();

  if (!photos.length) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  grid.style.display  = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = photos.map(p => `
    <div style="border-radius:16px;overflow:hidden;position:relative;aspect-ratio:1;
      background:var(--card);border:1px solid var(--border)">
      <img src="${CONFIG.SERVER_BASE}${p.photo_url}" alt="${p.caption||'Portfolio photo'}"
        style="width:100%;height:100%;object-fit:cover;display:block"
        onerror="this.style.background='var(--border)'">
      ${p.caption
        ? `<div style="position:absolute;bottom:0;left:0;right:0;
            background:linear-gradient(transparent,rgba(0,0,0,0.7));
            padding:24px 12px 12px;color:#fff;font-size:13px">${p.caption}</div>`
        : ''}
      <button onclick="deletePortfolioPhoto('${p.id}')"
        style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.55);
        border:none;border-radius:50%;width:30px;height:30px;display:flex;
        align-items:center;justify-content:center;cursor:pointer;color:#fff">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>`).join('');
}

// Open upload modal
document.getElementById('upload-photo-btn')?.addEventListener('click', () => {
  const modal = document.getElementById('upload-modal');
  if (modal) modal.style.display = 'flex';
});

// Preview selected image
document.getElementById('portfolio-file-input')?.addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview     = document.getElementById('upload-preview');
    const placeholder = document.getElementById('upload-placeholder');
    if (preview)     { preview.src = e.target.result; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

function closeUploadModal() {
  const modal       = document.getElementById('upload-modal');
  const preview     = document.getElementById('upload-preview');
  const placeholder = document.getElementById('upload-placeholder');
  const caption     = document.getElementById('portfolio-caption');
  const fileInput   = document.getElementById('portfolio-file-input');
  if (modal)       modal.style.display = 'none';
  if (preview)     { preview.src = ''; preview.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'block';
  if (caption)     caption.value = '';
  if (fileInput)   fileInput.value = '';
}

async function submitPortfolioPhoto() {
  // POST /api/accounts/workers/me/portfolio/ → FormData { photo, caption }
  const file    = document.getElementById('portfolio-file-input')?.files[0];
  const caption = document.getElementById('portfolio-caption')?.value?.trim() || '';
  if (!file) { showToast('⚠️ Please select a photo first', 'error'); return; }

  const btn = document.getElementById('upload-submit-btn');
  if (btn) btn.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('photo', file);
  if (caption) formData.append('caption', caption);

  const res = await wdFetch('/api/accounts/workers/me/portfolio/', {
    method: 'POST',
    body:   formData,
    // Don't set Content-Type — browser sets it with boundary for FormData
  });

  if (res.ok || res.status === 201) {
    closeUploadModal();
    renderPortfolio(); // re-fetch from backend
    showToast('✅ Photo uploaded!');
  } else {
    const err = await res.json().catch(() => ({}));
    showToast('❌ ' + (err.detail || 'Upload failed'), 'error');
  }
  if (btn) btn.textContent = 'Upload Photo';
}

async function deletePortfolioPhoto(photoId) {
  // DELETE /api/accounts/workers/me/portfolio/{uuid}/
  const res = await wdFetch(`/api/accounts/workers/me/portfolio/${photoId}/`, { method: 'DELETE' });
  if (res.ok || res.status === 204) {
    renderPortfolio();
    showToast('🗑 Photo removed');
  } else {
    showToast('❌ Failed to delete', 'error');
  }
}

// ═════════════════════════════════════════════════════════════════
// 11. SETTINGS TAB (sub-tabs: Profile, Account, Services, Availability)
// ═════════════════════════════════════════════════════════════════

const SERVICE_CATEGORIES = [
  'plumbing','electrical','carpentry','painting','cleaning',
  'ac_repair','welding','masonry','tiling','gardening'
];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

async function initSettings() {
  // Populate from /me/ endpoint for accurate data
  const res = await wdFetch('/api/accounts/me/');
  if (res.ok) {
    const data    = await res.json();
    const profile = data.profile || {};

    setVal('s-first-name', data.first_name);
    setVal('s-last-name',  data.last_name);
    setVal('s-email',      data.email);
    setVal('s-phone',      data.phone);
    setVal('s-bio',        profile.bio);
    setVal('s-experience', profile.years_experience);
    setVal('s-rate',       profile.base_hourly_rate);
    setVal('s-radius',     profile.service_radius_km);
    setVal('s-location',   profile.city);

    const nameDisp = document.getElementById('settings-name-display');
    if (nameDisp) nameDisp.textContent = `${data.first_name} ${data.last_name}`.trim();

    const photo = profile.profile_photo_url || data.profile_photo_url;
    if (photo) {
      const avatarEl = document.getElementById('settings-avatar');
      if (avatarEl) avatarEl.src = `${CONFIG.SERVER_BASE}${photo}`;
    }
  }

  // Wire settings sub-tabs
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.stab)?.classList.add('active');
    };
  });

  initServicesPanel();
  initAvailabilityPanel();
}

// ── Profile settings save ──
async function saveProfileSettings() {
  // PATCH /api/accounts/worker/profile/ → worker profile fields
  // PATCH /api/accounts/me/ is not a thing — use worker/profile/ for profile fields
  const profileData = {
    bio:               getVal('s-bio'),
    years_experience:  parseInt(getVal('s-experience')) || 0,
    base_hourly_rate:  parseFloat(getVal('s-rate'))     || 0,
    service_radius_km: parseFloat(getVal('s-radius'))   || 0,
    city:              getVal('s-location'),
  };

  // User fields go to a separate endpoint if you have one
  // For now update profile fields
  const res = await wdFetch('/api/accounts/worker/profile/', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(profileData),
  });

  if (res.ok) {
    // Update localStorage name
    localStorage.setItem('first_name', getVal('s-first-name'));
    localStorage.setItem('last_name',  getVal('s-last-name'));
    initNavbarUser();
    showToast('✅ Profile updated!');
  } else {
    const err = await res.json().catch(() => ({}));
    showToast('❌ ' + (err.detail || 'Failed to save'), 'error');
  }
}

// ── Email save ──
async function saveEmailSettings() {
  const email = getVal('s-email');
  if (!email || !email.includes('@')) { showToast('⚠️ Enter a valid email', 'error'); return; }
  // TODO: PATCH /api/accounts/me/ with { email } when endpoint is available
  showToast('✅ Email updated!');
}

// ── Password change ──
async function savePasswordSettings() {
  const current = getVal('s-current-pwd');
  const newPwd  = getVal('s-new-pwd');
  const confirm = getVal('s-confirm-pwd');
  if (!current)           { showToast('⚠️ Enter current password', 'error'); return; }
  if (newPwd.length < 8)  { showToast('⚠️ New password must be 8+ chars', 'error'); return; }
  if (newPwd !== confirm)  { showToast('⚠️ Passwords do not match', 'error'); return; }

  // POST /api/accounts/me/change-password/
  const res = await wdFetch('/api/accounts/me/change-password/', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ current_password: current, new_password: newPwd }),
  });

  if (res.ok) {
    showToast('✅ Password changed!');
    ['s-current-pwd','s-new-pwd','s-confirm-pwd'].forEach(id => setVal(id, ''));
  } else {
    const err = await res.json().catch(() => ({}));
    showToast('❌ ' + (err.detail || 'Failed to change password'), 'error');
  }
}

// ── Services panel ──
function initServicesPanel() {
  const list = document.getElementById('services-list');
  if (!list || list.children.length > 0) return;
  // TODO: GET /api/accounts/workers/me/services/ to pre-populate
  addServiceRow();
}

function addServiceRow(category = '', modifier = 0) {
  const list = document.getElementById('services-list');
  if (!list) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap';
  row.innerHTML = `
    <select class="form-input" style="flex:1;min-width:160px">
      ${SERVICE_CATEGORIES.map(c =>
        `<option value="${c}" ${c === category ? 'selected' : ''}>${capitalize(c.replace('_',' '))}</option>`
      ).join('')}
    </select>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
      <label style="font-size:13px;color:var(--muted);white-space:nowrap">Price Adj %</label>
      <input type="number" class="form-input" value="${modifier}" style="width:80px" min="-50" max="100">
    </div>
    <button onclick="this.parentElement.remove()"
      style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:22px;padding:4px;line-height:1">×</button>`;
  list.appendChild(row);
}

async function saveServicesSettings() {
  const rows = document.querySelectorAll('#services-list > div');
  const services = Array.from(rows).map(row => ({
    category:           row.querySelector('select')?.value || '',
    price_modifier_pct: parseFloat(row.querySelector('input[type="number"]')?.value) || 0,
  }));
  // TODO: POST /api/accounts/workers/me/services/ with services array
  showToast('✅ Services saved!');
}

// ── Availability panel ──
function initAvailabilityPanel() {
  const container = document.getElementById('availability-schedule');
  if (!container || container.children.length > 0) return;
  // TODO: GET /api/accounts/workers/me/availability/ to pre-populate
  container.innerHTML = DAYS.map(day => `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:8px;min-width:130px;cursor:pointer">
        <input type="checkbox" class="avail-day-check" data-day="${day}" checked
          style="width:16px;height:16px;accent-color:var(--primary)">
        <span style="font-weight:600;font-size:14px">${day}</span>
      </label>
      <div class="avail-time-inputs" style="display:flex;align-items:center;gap:8px">
        <input type="time" class="form-input" value="09:00" style="width:120px">
        <span style="color:var(--muted);font-size:13px">to</span>
        <input type="time" class="form-input" value="18:00" style="width:120px">
      </div>
    </div>`).join('');

  container.querySelectorAll('.avail-day-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const times = chk.closest('div').querySelector('.avail-time-inputs');
      if (times) times.style.opacity = chk.checked ? '1' : '0.3';
    });
  });
}

async function saveAvailabilitySettings() {
  // TODO: POST /api/accounts/workers/me/availability/ with schedule array
  showToast('✅ Schedule saved!');
}

// ── Avatar preview ──
function previewAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const el = document.getElementById('settings-avatar');
    if (el) el.src = e.target.result;
  };
  reader.readAsDataURL(file);
  // TODO: PATCH /api/accounts/worker/profile/ with FormData { profile_photo }
}

function togglePwd(id) {
  const input = document.getElementById(id);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

// ═════════════════════════════════════════════════════════════════
// 12. BOOKING ACTIONS (accept / decline / start / complete)
// ═════════════════════════════════════════════════════════════════

function wireActionButtons(container) {
  container.querySelectorAll('.btn-booking-action').forEach(btn => {
    btn.addEventListener('click', () => handleStatusUpdate(btn.dataset.id, btn.dataset.status));
  });
}

async function handleStatusUpdate(bookingId, newStatus) {
  const labels = {
    accepted:         'accept this booking',
    in_progress:      'mark as started',
    completed:        'mark as completed',
    cancelled_worker: 'decline this booking',
  };
  if (!confirm(`Are you sure you want to ${labels[newStatus] || 'update this booking'}?`)) return;

  const result = await updateBookingStatus(bookingId, newStatus);
  if (result.success) {
    _allBookings = []; // clear cache
    renderWorkerDashboard();
    if (document.getElementById('sec-jobs')?.classList.contains('active')) renderActiveJobs();
    initOverview();
    showToast('✅ Booking updated!');
  } else {
    showToast('❌ Failed: ' + result.error, 'error');
  }
}

// ═════════════════════════════════════════════════════════════════
// 13. TOAST NOTIFICATION
// ═════════════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent   = message;
  toast.style.background = type === 'error' ? '#ef4444' : '#1a1a1a';
  toast.style.color   = '#fff';
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3000);
}

// ═════════════════════════════════════════════════════════════════
// 14. SHARED HELPERS
// ═════════════════════════════════════════════════════════════════

// Small avatar image with initial fallback
function avatarCell(photoUrl, name) {
  const initial = (name || 'C')[0].toUpperCase();
  const src     = photoUrl ? `${CONFIG.SERVER_BASE}${photoUrl}` : '';
  if (src) {
    return `<img src="${src}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="display:none;width:32px;height:32px;border-radius:50%;background:var(--primary);
        color:#fff;font-weight:700;font-size:12px;align-items:center;justify-content:center;flex-shrink:0">${initial}</div>`;
  }
  return `<div style="width:32px;height:32px;border-radius:50%;background:var(--primary);
    color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${initial}</div>`;
}

const loadingHTML = () => `<div style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>`;
const errorHTML   = msg => `<div style="text-align:center;padding:40px;color:#ef4444">Failed to load: ${msg}</div>`;
const emptyHTML   = (icon, title, sub) => `
  <div style="text-align:center;padding:60px;color:var(--muted)">
    <div style="font-size:48px;margin-bottom:16px">${icon}</div>
    <h3 style="margin:0 0 8px;color:var(--text)">${title}</h3>
    <p style="margin:0;font-size:14px">${sub}</p>
  </div>`;
const setText     = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
const getVal      = id => document.getElementById(id)?.value?.trim() || '';
const setVal      = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
const capitalize  = str => str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ') : '';

// ═════════════════════════════════════════════════════════════════
// 15. INIT ON PAGE LOAD
// ═════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  initNavbarUser();
  initAvailability();   // load real availability from backend
  initOverview();       // load dashboard stats
});

// ── Re-wire filter tabs after all overrides are loaded ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _allBookings = [];
      renderActiveJobs(tab.dataset.filter);
    };
  });
});