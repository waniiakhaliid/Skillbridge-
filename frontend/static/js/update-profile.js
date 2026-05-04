/**
 * FILE LOCATION: frontend/static/js/update-profile.js
 *
 * Worker's own editable profile + portfolio + reviews page.
 * - Tab switching uses CSS classes (fixes !important override bug)
 * - Portfolio photos are drag-and-drop reorderable (first = cover)
 * - Avatar upload works via PATCH /api/accounts/worker/documents/
 */

const UP_BASE = typeof CONFIG !== 'undefined' ? CONFIG.SERVER_BASE : 'http://127.0.0.1:8000';

// ─────────────────────────────────────────────────────────────────
// FETCH HELPER
// ─────────────────────────────────────────────────────────────────

function upFetch(path, options = {}) {
  const token   = localStorage.getItem('access_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(UP_BASE + path, { ...options, headers });
}

// ─────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────

function upToast(message, type = 'success') {
  const toast = document.getElementById('up-toast');
  if (!toast) return;
  toast.textContent      = message;
  toast.style.background = type === 'error' ? '#ef4444' : '#1a1a1a';
  toast.style.color      = '#fff';
  toast.style.opacity    = '1';
  toast.style.display    = 'block';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.style.display = 'none', 300);
  }, 3500);
}

// ─────────────────────────────────────────────────────────────────
// LIGHTBOX
// ─────────────────────────────────────────────────────────────────

function upLightbox(src, caption) {
  document.getElementById('up-lightbox')?.remove();
  const lb = document.createElement('div');
  lb.id = 'up-lightbox';
  lb.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    cursor:zoom-out;padding:24px;box-sizing:border-box;animation:fadeIn 0.2s ease`;
  lb.innerHTML = `
    <button onclick="document.getElementById('up-lightbox').remove()"
      style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.1);border:none;
      border-radius:50%;width:44px;height:44px;cursor:pointer;color:#fff;font-size:22px;
      display:flex;align-items:center;justify-content:center">✕</button>
    <img src="${src}" style="max-width:100%;max-height:85vh;object-fit:contain;border-radius:8px;
      box-shadow:0 24px 64px rgba(0,0,0,0.5)">
    ${caption ? `<p style="color:rgba(255,255,255,0.8);margin:16px 0 0;font-size:14px;text-align:center">${caption}</p>` : ''}`;
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', onKey); }
  });
  document.body.appendChild(lb);
}

// ─────────────────────────────────────────────────────────────────
// INJECT STYLES
// ─────────────────────────────────────────────────────────────────

function injectUpStyles() {
  if (document.getElementById('up-styles')) return;
  const s = document.createElement('style');
  s.id = 'up-styles';
  s.textContent = `
    .up-card { background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:24px; }
    .up-section-title { font-size:18px;font-weight:700;margin:0 0 20px;color:var(--text);padding-bottom:12px;border-bottom:1px solid var(--border); }
    .up-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px; }
    .up-form-group { display:flex;flex-direction:column;gap:6px; }
    .up-label { font-size:13px;font-weight:600;color:var(--text); }
    .up-input { padding:11px 16px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);
      color:var(--text);font-size:14px;outline:none;transition:border-color 0.2s;font-family:inherit;
      width:100%;box-sizing:border-box; }
    .up-input:focus { border-color:var(--primary); }

    .up-tab-btn {
      background:none;border:none;border-bottom:3px solid transparent;
      padding:12px 24px;font-size:15px;font-weight:600;color:var(--muted);cursor:pointer;
      white-space:nowrap;margin-bottom:-2px;transition:color 0.2s,border-color 0.2s;
    }
    .up-tab-btn.active { color:var(--primary); border-bottom-color:var(--primary); }
    .up-tab-content { display:none; }
    .up-tab-content.active { display:block !important; }

    /* Portfolio drag-and-drop grid */
    .up-pf-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
      gap:14px;
    }
    .up-pf-item {
      position:relative;border-radius:14px;overflow:hidden;aspect-ratio:1;
      background:var(--card);border:2px solid var(--border);cursor:grab;
      transition:transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      user-select:none;
    }
    .up-pf-item:hover { border-color:var(--primary); box-shadow:0 8px 24px rgba(0,0,0,0.12); }
    .up-pf-item.dragging {
      opacity:0.4; cursor:grabbing; transform:scale(0.96);
      border-color:var(--primary); border-style:dashed;
    }
    .up-pf-item.drag-over {
      border-color:var(--primary); border-style:dashed;
      transform:scale(1.03); box-shadow:0 12px 28px rgba(108,138,61,0.25);
    }
    .up-pf-item img { width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.35s; pointer-events:none; }
    .up-pf-item:hover img { transform:scale(1.04); }
    .up-pf-overlay {
      position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%);
      opacity:0;transition:opacity 0.25s;display:flex;flex-direction:column;justify-content:flex-end;
      padding:12px;pointer-events:none;
    }
    .up-pf-item:hover .up-pf-overlay { opacity:1; }
    .up-pf-del {
      position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;
      background:rgba(239,68,68,0.85);border:none;cursor:pointer;color:#fff;display:flex;
      align-items:center;justify-content:center;opacity:0;transform:scale(0.8);
      transition:opacity 0.2s,transform 0.2s;pointer-events:auto;backdrop-filter:blur(4px);
      z-index:10;
    }
    .up-pf-item:hover .up-pf-del { opacity:1;transform:scale(1); }

    /* Drag handle indicator */
    .up-pf-drag-hint {
      position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.5);
      border-radius:6px;padding:3px 7px;font-size:11px;color:#fff;
      opacity:0;transition:opacity 0.2s;pointer-events:none;backdrop-filter:blur(4px);
    }
    .up-pf-item:hover .up-pf-drag-hint { opacity:1; }

    .up-pf-add {
      border-radius:14px;border:2px dashed var(--border);aspect-ratio:1;display:flex;
      flex-direction:column;align-items:center;justify-content:center;cursor:pointer;
      transition:all 0.2s;color:var(--muted);gap:8px;background:transparent;
    }
    .up-pf-add:hover { border-color:var(--primary);color:var(--primary);background:rgba(108,138,61,0.04);transform:translateY(-3px); }

    /* Avatar upload hover */
    .up-avatar-wrap { position:relative; display:inline-block; cursor:pointer; }
    .up-avatar-overlay {
      position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      opacity:0;transition:opacity 0.2s;flex-direction:column;gap:4px;
    }
    .up-avatar-wrap:hover .up-avatar-overlay { opacity:1; }
    .up-avatar-overlay span { color:#fff;font-size:11px;font-weight:600; }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

let _upProfileId   = null;
let _upPendingFile = null;
let _portfolioList = []; // keep in memory for reorder

document.addEventListener('DOMContentLoaded', async () => {
  injectUpStyles();

  const html = document.documentElement;
  const applyTheme = dark => {
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    const m = document.getElementById('moon-icon'), s = document.getElementById('sun-icon');
    if (m) m.style.display = dark ? 'none' : 'block';
    if (s) s.style.display = dark ? 'block' : 'none';
  };
  applyTheme(localStorage.getItem('theme') === 'dark');
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const dark = html.getAttribute('data-theme') !== 'dark';
    applyTheme(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });

  const photo = localStorage.getItem('profile_photo_url');
  const first = localStorage.getItem('first_name') || 'W';
  if (photo) {
    const img = document.getElementById('nav-avatar');
    if (img) { img.src = `${UP_BASE}${photo}`; img.style.display = 'block'; }
    const ini = document.getElementById('nav-initials');
    if (ini) ini.style.display = 'none';
  } else {
    const ini = document.getElementById('nav-initials');
    if (ini) { ini.style.display = 'flex'; ini.textContent = first[0].toUpperCase(); }
  }

  await loadPage();
});

async function loadPage() {
  const container = document.getElementById('update-profile-container');
  container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--muted)">
    <div style="font-size:32px;margin-bottom:12px">⏳</div>Loading...</div>`;

  try {
    const meRes = await upFetch('/api/accounts/me/');
    if (!meRes.ok) throw new Error('Failed to load profile');

    const me      = await meRes.json();
    const profile = me.profile || {};
    _upProfileId  = profile.id;

    const [portRes, revRes] = await Promise.all([
      upFetch('/api/accounts/workers/me/portfolio/'),
      _upProfileId ? upFetch(`/api/bookings/workers/${_upProfileId}/reviews/`) : Promise.resolve(null),
    ]);

    const portData  = portRes.ok ? await portRes.json() : [];
    const revData   = revRes?.ok ? await revRes.json() : [];
    _portfolioList  = Array.isArray(portData) ? portData : (portData.results || []);
    const reviews   = Array.isArray(revData)  ? revData  : (revData.results  || []);

    renderPage(container, me, profile, _portfolioList, reviews);

    const hash = location.hash.replace('#', '');
    if (hash === 'portfolio') switchUpTab('uptab-portfolio');
    else if (hash === 'reviews') switchUpTab('uptab-reviews');
    else switchUpTab('uptab-info');

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:#ef4444;text-align:center;padding:40px">Error: ${err.message}</p>`;
  }
}

// ─────────────────────────────────────────────────────────────────
// RENDER PAGE
// ─────────────────────────────────────────────────────────────────

function renderPage(container, me, profile, portfolio, reviews) {
  const fullName  = `${me.first_name || ''} ${me.last_name || ''}`.trim() || 'Worker';
  const rawPhoto  = profile.profile_photo_url || me.profile_photo_url || '';
  const photo     = rawPhoto ? `${UP_BASE}${rawPhoto}` : '../static/images/default-avatar.png';
  const bio       = profile.bio || '';
  const city      = profile.city || '';
  const rate      = parseFloat(profile.base_hourly_rate || 0);
  const radius    = parseFloat(profile.service_radius_km || 0);
  const exp       = profile.years_experience || 0;
  const isAvail   = profile.is_available;
  const verified  = profile.verification_status === 'approved' || profile.verification_status === 'verified';
  const services  = profile.services || [];
  const jobsDone  = profile.total_jobs_completed || 0;
  const category  = services[0]?.category || '';

  const bannerUrl = portfolio.length
    ? `${UP_BASE}${portfolio[0].photo_url}`
    : upBannerForCategory(category);

  const avgRating   = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : parseFloat(profile.avg_rating || 0).toFixed(1);
  const reviewCount = reviews.length;

  container.innerHTML = `
    <!-- Banner + Avatar -->
    <div class="up-card">
      <div style="height:220px;width:100%;position:relative;overflow:hidden" id="up-banner-wrap">
        <img id="up-banner-img" src="${bannerUrl}"
          style="width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.3s"
          onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'"
          onerror="this.src='../static/images/workers.jpeg'">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 60%,rgba(0,0,0,0.25));pointer-events:none"></div>
        <div style="position:absolute;top:16px;right:16px;padding:6px 14px;border-radius:20px;font-size:13px;
          font-weight:600;background:${isAvail?'#10b981':'#ef4444'};color:#fff">
          ${isAvail ? '✓ Available' : 'Unavailable'}
        </div>
        <div style="position:absolute;bottom:12px;left:16px;background:rgba(0,0,0,0.55);color:#fff;
          padding:5px 12px;border-radius:8px;font-size:12px;pointer-events:none">
          🖼️ First portfolio photo = cover image &nbsp;•&nbsp; Drag photos to reorder
        </div>
      </div>

      <div style="padding:0 28px 28px">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;
          margin-top:-60px;margin-bottom:16px;flex-wrap:wrap;gap:12px">

          <!-- Avatar — click to change -->
          <div class="up-avatar-wrap" onclick="document.getElementById('up-avatar-input').click()"
            title="Click to change profile photo">
            <div style="background:var(--card);padding:4px;border-radius:50%;
              box-shadow:0 4px 12px rgba(0,0,0,0.15);display:inline-block;">
              <img id="up-avatar-preview" src="${photo}"
                style="width:110px;height:110px;border-radius:50%;object-fit:cover;
                border:2px solid var(--border);display:block;"
                onerror="this.src='../static/images/default-avatar.png'">
            </div>
            <div class="up-avatar-overlay" style="border-radius:50%;top:4px;left:4px;right:4px;bottom:4px;width:110px;height:110px;margin:4px">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span>Change Photo</span>
            </div>
            <input type="file" id="up-avatar-input" accept="image/*" style="display:none"
              onchange="handleAvatarChange(this)">
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;padding-bottom:4px">
            <button onclick="document.getElementById('up-avatar-input').click()"
              class="btn outline" style="padding:9px 18px;font-size:13px;width:auto">
              📷 Change Photo
            </button>
          </div>
        </div>

        <h1 style="margin:0 0 4px;font-size:24px;color:var(--text);display:flex;align-items:center;gap:8px">
          <span id="up-display-name">${fullName}</span>
          ${verified ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>` : ''}
        </h1>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">
          ${services.map(s => upCap(s.category)).join(' • ') || 'Service Professional'}
        </div>
        <div style="font-size:13px;color:var(--muted);display:flex;gap:10px;flex-wrap:wrap">
          <span>📍 ${city||'Not set'}</span>
          <span>💼 ${exp} yrs</span>
          <span>✓ ${jobsDone} jobs</span>
          <span style="color:#f59e0b;font-weight:600">⭐ ${avgRating}</span>
          <span>Rs${rate}/hr</span>
          <span>📡 ${radius}km radius</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:24px;overflow-x:auto;scrollbar-width:none">
      <button class="up-tab-btn active" data-uptab="uptab-info"     onclick="switchUpTab('uptab-info')">✏️ Edit Profile</button>
      <button class="up-tab-btn"        data-uptab="uptab-portfolio" onclick="switchUpTab('uptab-portfolio')">🖼️ Portfolio (${portfolio.length})</button>
      <button class="up-tab-btn"        data-uptab="uptab-reviews"   onclick="switchUpTab('uptab-reviews')">⭐ Reviews (${reviewCount})</button>
    </div>

    <!-- TAB: EDIT PROFILE -->
    <div class="up-tab-content active" id="uptab-info">
      <div class="up-card" style="padding:28px">
        <h2 class="up-section-title">Personal Information</h2>
        <div class="up-grid" style="margin-bottom:16px">
          <div class="up-form-group">
            <label class="up-label">First Name</label>
            <input class="up-input" id="up-first" type="text" value="${me.first_name||''}" placeholder="First name">
          </div>
          <div class="up-form-group">
            <label class="up-label">Last Name</label>
            <input class="up-input" id="up-last" type="text" value="${me.last_name||''}" placeholder="Last name">
          </div>
          <div class="up-form-group">
            <label class="up-label">City / Location</label>
            <input class="up-input" id="up-city" type="text" value="${city}" placeholder="e.g. Islamabad">
          </div>
          <div class="up-form-group">
            <label class="up-label">Years of Experience</label>
            <input class="up-input" id="up-exp" type="number" value="${exp}" min="0" max="50">
          </div>
          <div class="up-form-group">
            <label class="up-label">Base Hourly Rate (Rs)</label>
            <input class="up-input" id="up-rate" type="number" value="${rate}" min="0">
          </div>
          <div class="up-form-group">
            <label class="up-label">Service Radius (km)</label>
            <input class="up-input" id="up-radius" type="number" value="${radius}" min="1" max="200">
          </div>
        </div>
        <div class="up-form-group" style="margin-bottom:20px">
          <label class="up-label">Bio / About Me</label>
          <textarea class="up-input" id="up-bio" rows="4"
            placeholder="Tell customers about your experience and skills..."
            style="resize:vertical">${bio}</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end">
          <button class="btn gradient" style="width:auto;padding:12px 28px" onclick="saveProfileInfo()">
            Save Changes
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px">
        ${[
          {icon:'⭐', val:avgRating,    label:'Avg Rating', color:'#f59e0b'},
          {icon:'✅', val:jobsDone,      label:'Jobs Done',  color:'var(--primary)'},
          {icon:'💼', val:`${exp}y`,     label:'Experience', color:'#3b82f6'},
          {icon:'📡', val:`${radius}km`, label:'Radius',     color:'#8b5cf6'},
          {icon:'💰', val:`Rs${rate}`,   label:'Per Hour',   color:'var(--primary)'},
        ].map(s => `
          <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
            <div style="font-size:20px;margin-bottom:4px">${s.icon}</div>
            <div style="font-size:18px;font-weight:800;color:${s.color}">${s.val}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${s.label}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- TAB: PORTFOLIO -->
    <div class="up-tab-content" id="uptab-portfolio">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <h2 style="margin:0 0 4px;font-size:20px;font-weight:700">Portfolio Photos</h2>
          <p style="margin:0;font-size:13px;color:var(--muted)">
            🖱️ <strong>Drag photos to reorder</strong> — first photo becomes your cover image.
          </p>
        </div>
        <button class="btn gradient" style="width:auto;padding:9px 18px;font-size:13px"
          onclick="document.getElementById('up-photo-input').click()">
          + Add Photo
        </button>
      </div>
      <input type="file" id="up-photo-input" accept="image/*" style="display:none"
        onchange="handlePortfolioSelect(this)">

      <div id="up-caption-area" style="display:none;background:var(--card);border:1px solid var(--border);
        border-radius:14px;padding:20px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <img id="up-photo-preview" src="" style="width:64px;height:64px;border-radius:10px;object-fit:cover;border:1px solid var(--border)">
          <div>
            <div style="font-weight:600;font-size:14px" id="up-photo-name"></div>
            <div style="font-size:12px;color:var(--muted)">Ready to upload</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <input type="text" id="up-caption-input" class="up-input" style="flex:1;min-width:200px"
            placeholder="Caption (optional)...">
          <button class="btn gradient" style="width:auto;padding:10px 20px;font-size:13px"
            onclick="confirmPortfolioUpload()">Upload</button>
          <button class="btn outline" style="width:auto;padding:10px 20px;font-size:13px"
            onclick="cancelPortfolioUpload()">Cancel</button>
        </div>
      </div>

      <div class="up-pf-grid" id="up-portfolio-grid">
        ${buildPortfolioGrid(portfolio)}
      </div>
    </div>

    <!-- TAB: REVIEWS -->
    <div class="up-tab-content" id="uptab-reviews">
      ${buildReviews(reviews)}
    </div>
  `;

  document.getElementById('up-first')?.addEventListener('input', updateNamePreview);
  document.getElementById('up-last')?.addEventListener('input', updateNamePreview);

  // Wire drag-and-drop after DOM is ready
  setTimeout(() => initPortfolioDrag(), 100);
}

// ─────────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────────

function switchUpTab(tabId) {
  document.querySelectorAll('.up-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.up-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.up-tab-btn[data-uptab="${tabId}"]`)?.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
  history.replaceState(null, '', `#${tabId.replace('uptab-', '')}`);
}

function updateNamePreview() {
  const f = document.getElementById('up-first')?.value || '';
  const l = document.getElementById('up-last')?.value  || '';
  const el = document.getElementById('up-display-name');
  if (el) el.textContent = `${f} ${l}`.trim() || 'Worker';
}

// ─────────────────────────────────────────────────────────────────
// DRAG AND DROP PORTFOLIO REORDER
// ─────────────────────────────────────────────────────────────────

let _dragSrcIndex = null;

function initPortfolioDrag() {
  const grid = document.getElementById('up-portfolio-grid');
  if (!grid) return;

  // Wire all draggable items
  refreshDragListeners();
}

function refreshDragListeners() {
  const grid = document.getElementById('up-portfolio-grid');
  if (!grid) return;

  const items = grid.querySelectorAll('.up-pf-item[data-index]');

  items.forEach(item => {
    item.setAttribute('draggable', 'true');

    item.ondragstart = (e) => {
      _dragSrcIndex = parseInt(item.dataset.index);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    };

    item.ondragend = () => {
      item.classList.remove('dragging');
      grid.querySelectorAll('.up-pf-item').forEach(i => i.classList.remove('drag-over'));
    };

    item.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      grid.querySelectorAll('.up-pf-item').forEach(i => i.classList.remove('drag-over'));
      item.classList.add('drag-over');
    };

    item.ondragleave = () => item.classList.remove('drag-over');

    item.ondrop = async (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const dropIndex = parseInt(item.dataset.index);

      if (_dragSrcIndex === null || _dragSrcIndex === dropIndex) return;

      // Reorder in memory
      const moved = _portfolioList.splice(_dragSrcIndex, 1)[0];
      _portfolioList.splice(dropIndex, 0, moved);
      _dragSrcIndex = null;

      // Re-render grid immediately (optimistic)
      const gridEl = document.getElementById('up-portfolio-grid');
      if (gridEl) gridEl.innerHTML = buildPortfolioGrid(_portfolioList);
      refreshDragListeners();

      // Update banner to new first photo
      updateBanner();

      // Save new order to backend
      await savePortfolioOrder();
    };
  });
}

function updateBanner() {
  const bannerImg = document.getElementById('up-banner-img');
  if (bannerImg && _portfolioList.length) {
    bannerImg.src = `${UP_BASE}${_portfolioList[0].photo_url}`;
  }
}

async function savePortfolioOrder() {
  // Send new order as array of IDs to backend
  // POST /api/accounts/workers/me/portfolio/reorder/
  const ids = _portfolioList.map(p => p.id);
  try {
    const res = await upFetch('/api/accounts/workers/me/portfolio/reorder/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ order: ids }),
    });
    if (res.ok) {
      upToast('✅ Cover photo updated!');
    } else {
      // Backend may not have reorder endpoint yet — show hint
      upToast('⚠️ Reorder saved locally. Add reorder endpoint to persist.', 'error');
    }
  } catch (e) {
    upToast('⚠️ Could not save order to server', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// SAVE PROFILE INFO
// ─────────────────────────────────────────────────────────────────

async function saveProfileInfo() {
  const btn = document.querySelector('#uptab-info .btn.gradient');
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

  const profileData = {
    bio:               document.getElementById('up-bio')?.value?.trim()        || '',
    city:              document.getElementById('up-city')?.value?.trim()        || '',
    years_experience:  parseInt(document.getElementById('up-exp')?.value)       || 0,
    base_hourly_rate:  parseFloat(document.getElementById('up-rate')?.value)    || 0,
    service_radius_km: parseFloat(document.getElementById('up-radius')?.value)  || 0,
  };

  const res = await upFetch('/api/accounts/worker/profile/', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(profileData),
  });

  if (res.ok) {
    const first = document.getElementById('up-first')?.value?.trim() || '';
    const last  = document.getElementById('up-last')?.value?.trim()  || '';
    if (first) localStorage.setItem('first_name', first);
    if (last)  localStorage.setItem('last_name',  last);
    upToast('✅ Profile updated!');
  } else {
    const err = await res.json().catch(() => ({}));
    upToast('❌ ' + (err.detail || 'Failed to save'), 'error');
  }

  if (btn) { btn.textContent = 'Save Changes'; btn.disabled = false; }
}

// ─────────────────────────────────────────────────────────────────
// AVATAR UPLOAD — click avatar or "Change Photo" button
// ─────────────────────────────────────────────────────────────────

function handleAvatarChange(input) {
  const file = input.files[0];
  if (!file) return;

  // Show preview immediately
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('up-avatar-preview');
    if (img) img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  uploadAvatar(file);
}

async function uploadAvatar(file) {
  upToast('Uploading photo...');
  const formData = new FormData();
  formData.append('profile_photo', file);

  // Try worker documents endpoint first
  let res = await upFetch('/api/accounts/worker/documents/', {
    method: 'PATCH',
    body:   formData,
  });

  // Fallback to worker profile endpoint
  if (!res.ok) {
    const formData2 = new FormData();
    formData2.append('profile_photo', file);
    res = await upFetch('/api/accounts/worker/profile/', {
      method: 'PATCH',
      body:   formData2,
    });
  }

  if (res.ok) {
    // Refresh from /me/ to get actual stored URL
    const meRes = await upFetch('/api/accounts/me/');
    if (meRes.ok) {
      const me = await meRes.json();
      const newPhoto = me.profile?.profile_photo_url || me.profile_photo_url || '';
      if (newPhoto) {
        localStorage.setItem('profile_photo_url', newPhoto);
        const preview = document.getElementById('up-avatar-preview');
        if (preview) preview.src = `${UP_BASE}${newPhoto}`;
        const navImg = document.getElementById('nav-avatar');
        if (navImg) navImg.src = `${UP_BASE}${newPhoto}`;
      }
    }
    upToast('✅ Profile photo updated!');
  } else {
    const err = await res.json().catch(() => ({}));
    upToast('❌ ' + (err.detail || 'Failed to update photo'), 'error');
  }
}

// ─────────────────────────────────────────────────────────────────
// PORTFOLIO UPLOAD
// ─────────────────────────────────────────────────────────────────

function handlePortfolioSelect(input) {
  const file = input.files[0];
  if (!file) return;
  _upPendingFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('up-photo-preview');
    if (preview) preview.src = e.target.result;
  };
  reader.readAsDataURL(file);

  document.getElementById('up-photo-name').textContent = file.name;
  document.getElementById('up-caption-area').style.display = 'block';
  document.getElementById('up-caption-input').value = '';
  document.getElementById('up-caption-input').focus();
}

function cancelPortfolioUpload() {
  _upPendingFile = null;
  document.getElementById('up-caption-area').style.display = 'none';
  document.getElementById('up-photo-input').value = '';
}

async function confirmPortfolioUpload() {
  if (!_upPendingFile) return;
  const caption = document.getElementById('up-caption-input')?.value?.trim() || '';
  const btn     = document.querySelector('#up-caption-area .btn.gradient');
  if (btn) { btn.textContent = 'Uploading...'; btn.disabled = true; }

  const formData = new FormData();
  formData.append('photo', _upPendingFile);
  if (caption) formData.append('caption', caption);

  const res = await upFetch('/api/accounts/workers/me/portfolio/', {
    method: 'POST', body: formData,
  });

  if (res.ok || res.status === 201) {
    upToast('✅ Photo uploaded!');
    cancelPortfolioUpload();
    await refreshPortfolioGrid();
    if (_portfolioList.length === 1) location.reload(); // first photo — reload banner
  } else {
    const err = await res.json().catch(() => ({}));
    upToast('❌ ' + (JSON.stringify(err) || 'Upload failed'), 'error');
    if (btn) { btn.textContent = 'Upload'; btn.disabled = false; }
  }
}

async function deleteUpPortfolioPhoto(id, event) {
  event.stopPropagation();
  if (!confirm('Remove this photo?')) return;

  const res = await upFetch(`/api/accounts/workers/me/portfolio/${id}/`, { method: 'DELETE' });
  if (res.ok || res.status === 204) {
    upToast('🗑 Photo removed');
    await refreshPortfolioGrid();
  } else {
    upToast('❌ Failed to delete', 'error');
  }
}

async function refreshPortfolioGrid() {
  const res = await upFetch('/api/accounts/workers/me/portfolio/');
  if (!res.ok) return;
  const data = await res.json();
  _portfolioList = Array.isArray(data) ? data : (data.results || []);

  const grid = document.getElementById('up-portfolio-grid');
  if (grid) grid.innerHTML = buildPortfolioGrid(_portfolioList);

  const tabBtn = document.querySelector('.up-tab-btn[data-uptab="uptab-portfolio"]');
  if (tabBtn) tabBtn.textContent = `🖼️ Portfolio (${_portfolioList.length})`;

  updateBanner();
  refreshDragListeners();
}

// ─────────────────────────────────────────────────────────────────
// BUILD PORTFOLIO GRID
// ─────────────────────────────────────────────────────────────────

function buildPortfolioGrid(portfolio) {
  const cards = portfolio.map((p, i) => {
    const src     = `${UP_BASE}${p.photo_url}`;
    const caption = p.caption || '';
    const date    = p.uploaded_at
      ? new Date(p.uploaded_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : '';
    const isCover = i === 0;

    return `
      <div class="up-pf-item" data-id="${p.id}" data-index="${i}">
        ${isCover ? `<div style="position:absolute;top:8px;left:8px;z-index:3;background:var(--primary);
          color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;pointer-events:none">
          🖼 Cover</div>` : ''}
        <div class="up-pf-drag-hint">⠿ Drag to reorder</div>
        <img src="${src}" alt="${caption||'Portfolio photo'}"
          onerror="this.parentElement.style.background='var(--border)';this.style.display='none'"
          onclick="upLightbox('${src}','${caption.replace(/'/g,"&#39;")}')">
        <button class="up-pf-del" onclick="deleteUpPortfolioPhoto('${p.id}', event)" title="Remove">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="up-pf-overlay">
          ${caption ? `<div style="color:#fff;font-size:13px;font-weight:600">${caption}</div>` : ''}
          ${date    ? `<div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:2px">${date}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const addCard = `
    <div class="up-pf-add" onclick="document.getElementById('up-photo-input').click()">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span style="font-size:12px;font-weight:600">${portfolio.length ? 'Add More' : 'Upload First Photo'}</span>
      ${portfolio.length === 0 ? '<span style="font-size:11px;color:var(--muted)">First photo becomes cover</span>' : ''}
    </div>`;

  return cards + addCard;
}

// ─────────────────────────────────────────────────────────────────
// REVIEWS — read-only
// ─────────────────────────────────────────────────────────────────

function buildReviews(reviews) {
  if (!reviews.length) {
    return `<div style="text-align:center;padding:60px;color:var(--muted)">
      <div style="font-size:40px;margin-bottom:12px">⭐</div>
      <h3 style="margin:0 0 8px;color:var(--text)">No reviews yet</h3>
      <p style="margin:0;font-size:14px">Complete jobs to earn reviews from customers!</p>
    </div>`;
  }

  const avg    = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const filled = Math.round(parseFloat(avg));

  const breakdown = [5,4,3,2,1].map(star => {
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

  const cards = reviews.map(r => {
    const rName    = r.reviewer_name || 'Customer';
    const rPhoto   = r.reviewer_photo || '';
    const imgSrc   = rPhoto ? `${UP_BASE}${rPhoto}` : `https://i.pravatar.cc/150?u=${r.id}`;
    const stars    = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const date     = r.created_at
      ? new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : '';
    const isPublic = r.is_public !== false;

    return `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:12px">
            <img src="${imgSrc}" style="width:42px;height:42px;border-radius:50%;object-fit:cover"
              onerror="this.src='https://i.pravatar.cc/150?u=${r.id}'">
            <div>
              <div style="font-weight:700;font-size:15px">${rName}</div>
              <div style="color:#f59e0b;font-size:15px;margin-top:2px">${stars}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span style="color:var(--muted);font-size:13px">${date}</span>
            <span style="font-size:11px;padding:3px 9px;border-radius:10px;font-weight:600;
              background:${isPublic?'rgba(16,185,129,0.1)':'rgba(139,92,246,0.1)'};
              color:${isPublic?'#10b981':'#8b5cf6'}">
              ${isPublic ? '🌍 Public' : '🔒 Private'}
            </span>
          </div>
        </div>
        ${r.comment
          ? `<p style="margin:0;color:var(--text);font-size:14px;line-height:1.6">${r.comment}</p>`
          : `<p style="margin:0;color:var(--muted);font-size:13px;font-style:italic">No comment left.</p>`}
      </div>`;
  }).join('');

  return `
    <p style="font-size:13px;color:var(--muted);margin-bottom:16px">
      💡 Only public reviews with comments appear on your public profile.
    </p>
    <div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;margin-bottom:24px;
      background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px">
      <div style="text-align:center">
        <div style="font-size:52px;font-weight:800;color:var(--text);line-height:1">${avg}</div>
        <div style="color:#f59e0b;font-size:22px;margin:6px 0">
          ${'★'.repeat(filled)}${'☆'.repeat(5-filled)}
        </div>
        <div style="color:var(--muted);font-size:13px">
          ${reviews.length} review${reviews.length!==1?'s':''}
        </div>
      </div>
      <div style="flex:1;min-width:180px">${breakdown}</div>
    </div>
    ${cards}`;
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function upCap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g,' ') : '';
}

function upBannerForCategory(cat) {
  const map = {
    plumber:'../static/images/plumbing.jpeg',
    plumbing:'../static/images/plumbing.jpeg',
    electrician:'../static/images/electrician.jpeg',
    electrical:'../static/images/electrician.jpeg',
    carpenter:'../static/images/carpentry.jpeg',
    carpentry:'../static/images/carpentry.jpeg',
    mechanic:'../static/images/mechanic.jpeg',
  };
  return map[(cat||'').toLowerCase()] || '../static/images/workers.jpeg';
}