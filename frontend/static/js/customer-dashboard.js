/**
 * FILE LOCATION: frontend/static/js/customer-dashboard.js
 * Complete rewrite — merged My Bookings + History into one tab with filters
 */

// ─────────────────────────────────────────────────────────────────
// 1. SPA TAB NAVIGATION
// ─────────────────────────────────────────────────────────────────

function switchTab(sectionId, filter) {
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-target]').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(sectionId);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
  if (navItem) navItem.classList.add('active');

  document.getElementById('profile-menu')?.classList.remove('open');

  if (sectionId === 'sec-bookings') renderAllBookings(filter || 'all');
  if (sectionId === 'sec-saved')    renderSavedWorkers();
}

// Wire nav items
document.querySelectorAll('.nav-item[data-target]').forEach(item => {
  item.onclick = () => switchTab(item.dataset.target);
});

// Profile dropdown
document.getElementById('profile-trigger')?.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('profile-menu')?.classList.toggle('open');
});
document.addEventListener('click', () => {
  document.getElementById('profile-menu')?.classList.remove('open');
});

// Logout
document.querySelector('.dropdown-item.danger')?.addEventListener('click', e => {
  e.preventDefault();
  localStorage.clear();
  location.replace('index.html');
});

// ─────────────────────────────────────────────────────────────────
// 2. THEME TOGGLE
// ─────────────────────────────────────────────────────────────────

const html = document.documentElement;
function applyTheme(dark) {
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  const m = document.getElementById('moon-icon'), s = document.getElementById('sun-icon');
  if (m) m.style.display = dark ? 'none' : 'block';
  if (s) s.style.display = dark ? 'block' : 'none';
}
applyTheme(localStorage.getItem('theme') === 'dark');
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const dark = html.getAttribute('data-theme') !== 'dark';
  applyTheme(dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
});

// ─────────────────────────────────────────────────────────────────
// 3. NAVBAR USER INFO
// ─────────────────────────────────────────────────────────────────

function initNavbarUser() {
  const first = localStorage.getItem('first_name') || '';
  const last  = localStorage.getItem('last_name')  || '';
  const photo = localStorage.getItem('profile_photo_url');

  const title = document.querySelector('#sec-overview .section-title');
  if (title) title.textContent = `Welcome back, ${first || 'there'} 👋`;

  const nameEl = document.querySelector('.dropdown-name');
  if (nameEl) nameEl.textContent = `${first} ${last}`.trim() || 'Customer';

  if (photo) {
    const img = document.querySelector('.profile-trigger .user-avatar');
    if (img && img.tagName === 'IMG') img.src = `${CONFIG.SERVER_BASE}${photo}`;
  }
}
initNavbarUser();

// ─────────────────────────────────────────────────────────────────
// 4. OVERVIEW — clickable stat cards + recent activity
// ─────────────────────────────────────────────────────────────────

async function initOverview() {
  injectCustomerStyles();
  const result = await getMyBookings();
  if (!result.success) return;

  const bookings  = result.bookings;
  const active    = bookings.filter(b => ['pending','accepted','in_progress'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'completed');
  const total     = completed.reduce((s, b) => s + parseFloat(b.total_price || 0), 0);

  // Clickable stat cards — rebuild with onclick
  const grid = document.querySelector('#sec-overview .stats-grid');
  if (grid) {
    grid.innerHTML = `
      <!-- Active Bookings → My Bookings filtered to active -->
      <div class="stat-card" onclick="switchTab('sec-bookings','active')"
        style="cursor:pointer;transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s"
        onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 36px rgba(0,0,0,0.12)';this.style.borderColor='var(--primary)'"
        onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
        <div class="stat-icon orange">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-details">
          <h3 class="stat-value">${active.length}</h3>
          <p class="stat-label">Active Bookings</p>
          <p style="font-size:11px;color:var(--primary);margin:4px 0 0;font-weight:600"></p>
        </div>
      </div>

      <!-- Completed Jobs → My Bookings filtered to completed -->
      <div class="stat-card" onclick="switchTab('sec-bookings','completed')"
        style="cursor:pointer;transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s"
        onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 36px rgba(0,0,0,0.12)';this.style.borderColor='#34d399'"
        onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor=''">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="stat-details">
          <h3 class="stat-value">${completed.length}</h3>
          <p class="stat-label">Completed Jobs</p>
          <p style="font-size:11px;color:#34d399;margin:4px 0 0;font-weight:600"> </p>
        </div>
      </div>

      <!-- Total Spent — not clickable, just info -->
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="stat-details">
          <h3 class="stat-value">Rs${total.toLocaleString()}</h3>
          <p class="stat-label">Total Spent</p>
        </div>
      </div>`;
  }

  renderRecentActivity(bookings.slice(0, 5));
  renderOverviewFavorites();
}

function renderRecentActivity(bookings) {
  const tbody = document.querySelector('#sec-overview .table tbody');
  if (!tbody) return;

  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">No recent activity yet</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const photo   = b.worker_photo ? `${CONFIG.SERVER_BASE}${b.worker_photo}` : '../static/images/default-avatar.png';
    const initial = (b.worker_name || 'W')[0].toUpperCase();
    return `<tr>
      <td style="display:flex;align-items:center;gap:12px;font-weight:600">
        <img src="${photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div style="display:none;width:36px;height:36px;border-radius:50%;background:var(--primary);
          color:#fff;font-weight:700;font-size:13px;align-items:center;justify-content:center;flex-shrink:0">${initial}</div>
        ${b.worker_name || 'Worker'}
      </td>
      <td>${capitalize(b.service_category)}</td>
      <td style="color:var(--muted);font-size:13px">${formatDate(b.scheduled_at)}</td>
      <td>${customerStatusBadge(b.status)}</td>
    </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────
// 5. MY BOOKINGS — ALL bookings with filter tabs
// ─────────────────────────────────────────────────────────────────

let _allCustomerBookings = []; // cache

async function renderAllBookings(filter = 'all') {
  injectCustomerStyles();
  const container = document.getElementById('customer-bookings-container');
  if (!container) return;

  // Fetch bookings if cache empty
  if (!_allCustomerBookings.length) {
    container.innerHTML = loadingHTML();
    const result = await getMyBookings();
    if (!result.success) { container.innerHTML = errorHTML(result.error); return; }
    _allCustomerBookings = result.bookings;
  }

  // Fetch reviewed booking IDs — returns Set of booking UUIDs
  const reviewedIds = await fetchMyReviewedBookingIds();

  // Set correct filter tab active
  document.querySelectorAll('.booking-filter-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === filter);
  });

  // Filter bookings
  const filtered = filterBookings(_allCustomerBookings, filter);

  if (!filtered.length) {
    container.innerHTML = emptyHTML('📅', 'No bookings here', 'Nothing in this category yet.');
    return;
  }

  const showReview = filter === 'completed' || filter === 'all';

  container.innerHTML = `
    <div style="overflow-x:auto">
      <table class="table" style="margin:0">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Service</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Action</th>
            ${showReview ? '<th>Review</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => {
            const photo      = b.worker_photo ? `${CONFIG.SERVER_BASE}${b.worker_photo}` : '../static/images/default-avatar.png';
            const initial    = (b.worker_name || 'W')[0].toUpperCase();
            const canCancel  = b.status === 'pending' || b.status === 'accepted';

            // FIX: use reviewedIds Set instead of b.review (which is always undefined)
            const alreadyReviewed = reviewedIds.has(b.id);

            let reviewCell = '';
            if (showReview) {
              if (b.status === 'completed') {
                if (alreadyReviewed) {
                  reviewCell = `<td>
                    <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
                      border-radius:8px;background:rgba(52,211,153,0.12);
                      border:1.5px solid rgba(52,211,153,0.3)">
                      <span style="color:#34d399;font-size:13px">✓</span>
                      <span style="color:#059669;font-size:12px;font-weight:600">Submitted</span>
                    </div>
                  </td>`;
                } else {
                  reviewCell = `<td>
                    <button class="btn-leave-review"
                      onclick="openReviewModal('${b.id}','${(b.worker_name||'Worker').replace(/'/g,"\\'")}')">
                      ⭐ Review
                    </button>
                  </td>`;
                }
              } else {
                reviewCell = `<td><span style="color:var(--muted);font-size:13px">—</span></td>`;
              }
            }

            return `<tr>
              <td style="display:flex;align-items:center;gap:12px;font-weight:600">
                <img src="${photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <div style="display:none;width:36px;height:36px;border-radius:50%;background:var(--primary);
                  color:#fff;font-weight:700;font-size:13px;align-items:center;justify-content:center;flex-shrink:0">${initial}</div>
                ${b.worker_name || 'Worker'}
              </td>
              <td>${capitalize(b.service_category)}</td>
              <td style="color:var(--muted);font-size:13px">${formatDate(b.scheduled_at)}</td>
              <td style="font-weight:600;color:var(--primary)">Rs${b.total_price}</td>
              <td>${customerStatusBadge(b.status)}</td>
              <td>
                ${canCancel
                  ? `<button class="btn-cancel-booking" onclick="cancelBooking_customer('${b.id}')">Cancel</button>`
                  : `<span style="color:var(--muted);font-size:13px">—</span>`
                }
              </td>
              ${reviewCell}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function filterBookings(bookings, filter) {
  switch (filter) {
    case 'active':    return bookings.filter(b => ['pending','accepted','in_progress'].includes(b.status));
    case 'pending':   return bookings.filter(b => b.status === 'pending');
    case 'accepted':  return bookings.filter(b => b.status === 'accepted');
    case 'progress':  return bookings.filter(b => b.status === 'in_progress');
    case 'completed': return bookings.filter(b => b.status === 'completed');
    case 'cancelled': return bookings.filter(b => b.status.startsWith('cancelled'));
    
    default:          return bookings;
  }
}

async function cancelBooking_customer(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  const result = await cancelBooking(bookingId, 'Cancelled by customer');
  if (result.success) {
    showToast('✅ Booking cancelled');
    _allCustomerBookings = []; // clear cache
    renderAllBookings(currentFilter());
    initOverview();
  } else {
    showToast('❌ Failed: ' + result.error, 'error');
  }
}

function currentFilter() {
  return document.querySelector('.booking-filter-tab.active')?.dataset.filter || 'all';
}

// ─────────────────────────────────────────────────────────────────
// 6. REVIEW MODAL
// ─────────────────────────────────────────────────────────────────

let _reviewBookingId = null;
let _reviewRating    = 0;
const ratingHints    = ['','Poor','Fair','Good','Very Good','Excellent'];

function openReviewModal(bookingId, workerName) {
  _reviewBookingId = bookingId;
  _reviewRating    = 0;

  document.getElementById('review-modal-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'review-modal-backdrop';
  backdrop.className = 'review-modal-backdrop';
  backdrop.innerHTML = `

  <!-- Public/Private toggle -->
<div style="margin-bottom:20px">
  <label style="display:block;font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text)">
    Visibility
  </label>
  <div style="display:flex;gap:10px">
    <button type="button" id="vis-public"
      onclick="setReviewVisibility(true)"
      style="flex:1;padding:10px;border-radius:8px;border:2px solid var(--primary);
      background:rgba(108,138,61,0.1);color:var(--primary);font-weight:600;cursor:pointer;font-size:13px">
      🌍 Public
    </button>
    <button type="button" id="vis-private"
      onclick="setReviewVisibility(false)"
      style="flex:1;padding:10px;border-radius:8px;border:2px solid var(--border);
      background:transparent;color:var(--muted);font-weight:600;cursor:pointer;font-size:13px">
      🔒 Private
    </button>
  </div>
  <p id="vis-hint" style="margin:8px 0 0;font-size:12px;color:var(--muted)">
    Public reviews appear on the worker's profile page.
  </p>
</div>
    <div class="review-modal-box">
      <button onclick="closeReviewModal()"
        style="position:absolute;top:16px;right:16px;background:none;border:none;
        cursor:pointer;color:var(--muted);font-size:22px;line-height:1">✕</button>
      <h3 style="margin:0 0 4px;font-size:18px">Leave a Review</h3>
      <p style="margin:0 0 20px;color:var(--muted);font-size:13px">
        How was your experience with <strong style="color:var(--text)">${workerName}</strong>?
      </p>
      <div style="margin-bottom:20px">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text)">Your Rating</label>
        <div class="star-picker" id="star-picker" style="display:flex;gap:4px">
          ${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" onclick="selectReviewStar(${n})">☆</button>`).join('')}
        </div>
        <div id="rating-hint" style="font-size:12px;color:#f59e0b;margin-top:6px;min-height:16px;font-weight:600"></div>
      </div>
      <div style="margin-bottom:20px">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text)">
          Comment <span style="color:var(--muted);font-weight:400">(optional)</span>
        </label>
        <textarea id="review-comment-text" rows="3" placeholder="Tell others about your experience..."
          style="width:100%;padding:12px 16px;border:1.5px solid var(--border);border-radius:10px;
          background:var(--card);color:var(--text);font-size:14px;outline:none;resize:vertical;
          box-sizing:border-box;font-family:inherit"
          onfocus="this.style.borderColor='var(--primary)'"
          onblur="this.style.borderColor='var(--border)'"></textarea>
      </div>
      <div style="display:flex;gap:12px">
        <button onclick="closeReviewModal()" class="btn outline" style="flex:1;padding:12px">Cancel</button>
        <button onclick="submitReviewFromModal()" class="btn gradient" style="flex:1;padding:12px" id="review-submit-btn">
          Submit Review
        </button>
      </div>
    </div>`;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeReviewModal(); });
  document.body.appendChild(backdrop);
}

function closeReviewModal() {
  document.getElementById('review-modal-backdrop')?.remove();
  _reviewRating = 0; _reviewBookingId = null;
  _reviewIsPublic  = true; // reset to default
}

let _reviewIsPublic = true; // default public

function setReviewVisibility(isPublic) {
  _reviewIsPublic = isPublic;

  const pubBtn = document.getElementById('vis-public');
  const priBtn = document.getElementById('vis-private');
  const hint   = document.getElementById('vis-hint');

  if (isPublic) {
    pubBtn.style.borderColor = 'var(--primary)';
    pubBtn.style.background  = 'rgba(108,138,61,0.1)';
    pubBtn.style.color       = 'var(--primary)';
    priBtn.style.borderColor = 'var(--border)';
    priBtn.style.background  = 'transparent';
    priBtn.style.color       = 'var(--muted)';
    hint.textContent         = 'Public reviews appear on the worker\'s profile page.';
  } else {
    priBtn.style.borderColor = '#8b5cf6';
    priBtn.style.background  = 'rgba(139,92,246,0.1)';
    priBtn.style.color       = '#8b5cf6';
    pubBtn.style.borderColor = 'var(--border)';
    pubBtn.style.background  = 'transparent';
    pubBtn.style.color       = 'var(--muted)';
    hint.textContent         = 'Only you and the worker can see private reviews.';
  }
}

function selectReviewStar(rating) {
  _reviewRating = rating;
  document.querySelectorAll('#star-picker button').forEach((btn, i) => {
    btn.textContent = i < rating ? '★' : '☆';
    btn.style.color = i < rating ? '#f59e0b' : 'var(--border)';
  });
  const hint = document.getElementById('rating-hint');
  if (hint) hint.textContent = ratingHints[rating] || '';
}

async function submitReviewFromModal() {
  if (!_reviewBookingId) { showToast('⚠️ No booking selected', 'error'); return; }
  if (!_reviewRating)    { showToast('⚠️ Please select a star rating', 'error'); return; }

  const comment = document.getElementById('review-comment-text')?.value?.trim() || '';
  const btn     = document.getElementById('review-submit-btn');

  btn.textContent = 'Submitting...'; btn.disabled = true;

  const token = localStorage.getItem('access_token');
  const res   = await fetch(`${CONFIG.SERVER_BASE}/api/bookings/${_reviewBookingId}/review/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ rating: _reviewRating,
                            comment,
                            is_public: _reviewIsPublic   
                           }),
  });

  if (res.ok || res.status === 201) {
    showToast('✅ Review submitted! Thank you.');
    closeReviewModal();
    _allCustomerBookings = [];
    renderAllBookings(currentFilter());
  } else {
    const err = await res.json().catch(() => ({}));
    showToast('❌ ' + (err.detail || 'Failed to submit'), 'error');
    btn.textContent = 'Submit Review'; btn.disabled = false;
  }
}

async function fetchMyReviewedBookingIds() {
  const token = localStorage.getItem('access_token');
  const res   = await fetch(`${CONFIG.SERVER_BASE}/api/bookings/my/reviews/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) return new Set();
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.results || []);
  // Returns Set of booking IDs that have been reviewed
  return new Set(list.map(r => r.booking_id || r.booking));
}

// ─────────────────────────────────────────────────────────────────
// 7. SAVED WORKERS
// ─────────────────────────────────────────────────────────────────

async function fetchFavorites() {
  const token = localStorage.getItem('access_token');
  if (!token) return [];
  const res = await fetch(`${CONFIG.SERVER_BASE}/api/accounts/favorites/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

async function renderSavedWorkers() {
  const container = document.getElementById('saved-workers-list');
  if (!container) return;
  container.innerHTML = loadingHTML();
  const favList = await fetchFavorites();
  if (!favList.length) {
    container.style.cssText = 'display:block';
    container.innerHTML = emptyHTML('<span style="filter: saturate(0.5) opacity(0.85);">❤️</span>', 'No saved workers yet', 'Tap the heart icon on any worker profile to save them here.');
    return;
  }
  container.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin-top:24px';
  container.innerHTML = favList.map(fav => savedWorkerCard(fav)).join('');
}

async function renderOverviewFavorites() {
  const container = document.getElementById('overview-saved-list');
  if (!container) return;
  const favList = await fetchFavorites();
  if (!favList.length) {
   container.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;padding:16px 20px 20px;align-items:stretch';
    container.innerHTML = `<p class="muted" style="padding:20px;text-align:center;font-size:14px">
      No saved workers yet.
      <a href="#" onclick="switchTab('sec-saved');return false;" style="color:var(--primary);font-weight:600">Browse workers →</a>
    </p>`;
    return;
  }
  container.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;padding:16px 20px 20px';
  container.innerHTML = favList.slice(0, 3).map(fav => savedWorkerCard(fav, true)).join('');
}

function savedWorkerCard(fav, compact = false) {
  const w        = fav.worker_profile_detail || fav.worker_detail || fav.worker || fav;
  const name     = w.full_name || 'Worker';
  const rawPhoto = w.profile_photo_url || '';
  const photo    = rawPhoto ? `${CONFIG.SERVER_BASE}${rawPhoto}` : '../static/images/default-avatar.png';
  const city     = w.city || 'Local Area';
  const rating   = parseFloat(w.avg_rating || 0).toFixed(1);
  const rate     = parseFloat(w.base_hourly_rate || 0);
  const verified = w.verification_status === 'approved' || w.verification_status === 'verified';
  const isAvail  = w.is_available;
  const services = (w.services || []).map(s => capitalize(s.category)).join(', ') || 'Professional';
  const workerId = w.id || fav.worker_profile || fav.worker_profile_id;
  const favId    = fav.id;
  const initial  = (name[0] || 'W').toUpperCase();
  const size     = compact ? '52px' : '64px';

  return `
    <div data-fav-id="${favId}"
      style="background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;
      display:flex;flex-direction:column;transition:transform 0.2s,box-shadow 0.2s"
      onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(0,0,0,0.1)'"
      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
      <div style="padding:${compact?'14px':'20px'};display:flex;gap:14px;align-items:center;flex:1">
        <div style="position:relative;flex-shrink:0">
          <img src="${photo}" alt="${name}"
            style="width:${size};height:${size};border-radius:50%;object-fit:cover;border:2px solid var(--border);display:block"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div style="display:none;width:${size};height:${size};border-radius:50%;background:var(--primary);
            color:#fff;font-weight:700;font-size:20px;align-items:center;justify-content:center;border:2px solid var(--border)">
            ${initial}</div>
          <div style="position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;
            border:2px solid var(--card);background:${isAvail?'#10b981':'#ef4444'}"></div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
            <span style="font-weight:700;font-size:${compact?'13px':'15px'};color:var(--text);
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
            ${verified?`<svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981" style="flex-shrink:0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`:''}
            <span style="margin-left:auto;flex-shrink:0;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;
              background:${isAvail?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'};color:${isAvail?'#10b981':'#ef4444'}">
              ${isAvail?'Available':'Busy'}</span>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${services}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <span style="font-size:12px;color:var(--muted)">📍 ${city}</span>
            <span style="font-size:12px;color:#f59e0b;font-weight:600">⭐ ${rating}</span>
            <span style="font-size:12px;color:var(--muted)">Rs${rate}/hr</span>
          </div>
        </div>
      </div>
      <div style="height:1px;background:var(--border)"></div>
      <div style="padding:12px 16px;display:flex;gap:8px;align-items:center">
        <a href="profile.html?worker=${workerId}" class="btn gradient"
          style="flex:1;padding:9px 0;font-size:13px;text-align:center;border-radius:8px;
          font-weight:600;text-decoration:none;display:flex;align-items:center;justify-content:center">
          View Profile
        </a>
        <button onclick="unsaveWorker('${favId}', this)" title="Remove from saved"
          style="width:38px;height:38px;border:none;border-radius:8px;cursor:pointer;
          background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;
          font-size:18px;flex-shrink:0;transition:all 0.2s"
          onmouseover="this.style.background='rgba(239,68,68,0.25)';this.style.transform='scale(1.1)'"
          onmouseout="this.style.background='rgba(239,68,68,0.1)';this.style.transform='scale(1)'"><span style="filter: saturate(0.5) opacity(0.85);">❤️</span></button>
      </div>
    </div>`;
}

async function unsaveWorker(favoriteId, btn) {
  const card = btn.closest('[data-fav-id]');
  if (card) {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity = '0'; card.style.transform = 'scale(0.95)';
    setTimeout(() => card.remove(), 200);
  }
  const token = localStorage.getItem('access_token');
  const res   = await fetch(`${CONFIG.SERVER_BASE}/api/accounts/favorites/${favoriteId}/`, {
    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.ok || res.status === 204) {
    showToast('Removed from saved');
    setTimeout(() => {
      const c = document.getElementById('saved-workers-list');
      if (c && !c.querySelector('[data-fav-id]')) {
        c.style.cssText = 'display:block';
        c.innerHTML = emptyHTML('<span style="filter: saturate(0.5) opacity(0.85);">❤️</span>', 'No saved workers yet', 'Tap the heart icon on any worker profile to save them here.');
      }
      renderOverviewFavorites();
    }, 250);
  } else {
    showToast('Failed to remove', 'error');
    if (card) { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }
  }
}

// ─────────────────────────────────────────────────────────────────
// 8. STYLES + HELPERS
// ─────────────────────────────────────────────────────────────────

function injectCustomerStyles() {
  if (document.getElementById('customer-btn-styles')) return;
  const s = document.createElement('style');
  s.id = 'customer-btn-styles';
  s.textContent = `
    .btn-cancel-booking {
      padding:5px 14px;font-size:12px;width:auto;border-radius:8px;font-weight:600;cursor:pointer;
      background:transparent;border:1.5px solid #f87171;color:#ef4444;transition:all 0.18s;
    }
    .btn-cancel-booking:hover { background:rgba(248,113,113,0.12);border-color:#ef4444;color:#dc2626;transform:translateY(-1px); }

    .btn-leave-review {
      padding:5px 14px;font-size:12px;width:auto;border-radius:8px;font-weight:600;cursor:pointer;
      background:var(--primary);border:none;color:#fff;transition:all 0.18s;
    }
    .btn-leave-review:hover { filter:brightness(1.1);transform:translateY(-1px); }

    /* Booking filter tabs */
          .booking-filter-tab {
        padding: 9px 18px;
        border-radius: 10px;
        border: 2px solid var(--border);
        background: transparent;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s;
        white-space: nowrap;
        color: var(--muted);
      }
      .booking-filter-tab[data-filter="all"].active       { background:#6c8a3d; border-color:#6c8a3d; color:#fff; }
      .booking-filter-tab[data-filter="active"].active    { background:#f0e246; border-color:#eaed9d; color:#fff; }
      .booking-filter-tab[data-filter="accepted"].active  { background:#38bdf8; border-color:#38bdf8; color:#fff; }
      .booking-filter-tab[data-filter="progress"].active  { background:#fb923c; border-color:#fb923c; color:#fff; }
      .booking-filter-tab[data-filter="completed"].active { background:#34d399; border-color:#34d399; color:#fff; }
      .booking-filter-tab[data-filter="cancelled"].active { background:#f87171; border-color:#f87171; color:#fff; }
      .booking-filter-tab[data-filter="all"]:hover        { border-color:#6c8a3d; color:#6c8a3d; }
      .booking-filter-tab[data-filter="active"]:hover     { border-color:#eaed9d; color:#eaed9d; }
      .booking-filter-tab[data-filter="accepted"]:hover   { border-color:#38bdf8; color:#0284c7; }
      .booking-filter-tab[data-filter="progress"]:hover   { border-color:#fb923c; color:#ea580c; }
      .booking-filter-tab[data-filter="completed"]:hover  { border-color:#34d399; color:#059669; }
      .booking-filter-tab[data-filter="cancelled"]:hover  { border-color:#f87171; color:#dc2626; }

    /* Review modal */
    .review-modal-backdrop {
      position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:500;
      display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);
    }
    .review-modal-box {
      background:var(--card);border-radius:20px;padding:32px;width:100%;max-width:460px;
      margin:24px;position:relative;box-shadow:0 24px 48px rgba(0,0,0,0.3);animation:fadeIn 0.2s ease;
    }
    .star-picker button {
      background:none;border:none;cursor:pointer;font-size:32px;color:var(--border);
      padding:2px 3px;transition:color 0.1s,transform 0.1s;line-height:1;
    }
    .star-picker button:hover { color:#f59e0b;transform:scale(1.15); }
  `;
  document.head.appendChild(s);
}

function customerStatusBadge(status) {
  const map = {
    pending:            { bg:'rgba(108,138,61,0.12)',  color:'#6c8a3d', label:'Pending'            },
    accepted:           { bg:'rgba(56,189,248,0.15)',  color:'#0284c7', label:'Accepted'           },
    in_progress:        { bg:'rgba(251,146,60,0.15)',  color:'#ea580c', label:'In Progress'        },
    completed:          { bg:'rgba(52,211,153,0.15)',  color:'#059669', label:'Completed'          },
    cancelled_customer: { bg:'rgba(248,113,113,0.15)', color:'#dc2626', label:'Cancelled'          },
    cancelled_worker:   { bg:'rgba(248,113,113,0.15)', color:'#dc2626', label:'Declined by Worker' },
    cancelled:          { bg:'rgba(248,113,113,0.15)', color:'#dc2626', label:'Cancelled'          },
  };
  const s = map[status] || { bg:'var(--border)', color:'var(--muted)', label: status };
  return `<span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;
    font-size:12px;font-weight:600;background:${s.bg};color:${s.color}">${s.label}</span>`;
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('customer-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'customer-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);transition:opacity 0.3s';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#ef4444' : '#1a1a1a';
  toast.style.color = '#fff'; toast.style.opacity = '1'; toast.style.display = 'block';
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.style.display = 'none', 300); }, 3000);
}

const loadingHTML = () => `<div style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>`;
const errorHTML   = msg => `<div style="text-align:center;padding:40px;color:#ef4444">Failed to load: ${msg}</div>`;
const emptyHTML   = (icon, title, sub) => `<div style="text-align:center;padding:60px;color:var(--muted)">
  <div style="font-size:48px;margin-bottom:16px">${icon}</div>
  <h3 style="margin:0 0 8px;color:var(--text)">${title}</h3>
  <p style="margin:0;font-size:14px">${sub}</p>
</div>`;
const capitalize  = str => str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g,' ') : '';

// ─────────────────────────────────────────────────────────────────
// 9. INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initOverview);