/**
 * FILE LOCATION: frontend/static/js/profile.js
 * - Lightbox for banner + avatar click
 * - Portfolio grid with image viewer + captions
 * - Reviews tab: read-only (no submit form shown to anyone)
 * - Save/unsave worker
 */

if (document.getElementById('profile-container')) {
  initProfilePage();
}

// ─────────────────────────────────────────────────────────────────
// FETCH HELPER
// ─────────────────────────────────────────────────────────────────

function apiFetch(path, options = {}) {
  const token   = localStorage.getItem('access_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const base = typeof CONFIG !== 'undefined' ? CONFIG.SERVER_BASE : 'http://127.0.0.1:8000';
  return fetch(base + path, { ...options, headers });
}

function authHeader() {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────────────────────────
// LIGHTBOX — click any image to view full screen
// ─────────────────────────────────────────────────────────────────

function openLightbox(src, caption) {
  document.getElementById('sb-lightbox')?.remove();

  const lb = document.createElement('div');
  lb.id = 'sb-lightbox';
  lb.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    cursor:zoom-out;animation:fadeIn 0.2s ease;padding:24px;box-sizing:border-box;
  `;

  lb.innerHTML = `
    <button onclick="document.getElementById('sb-lightbox').remove()"
      style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.1);
      border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;
      color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;
      transition:background 0.2s;z-index:1"
      onmouseover="this.style.background='rgba(255,255,255,0.2)'"
      onmouseout="this.style.background='rgba(255,255,255,0.1)'">✕</button>
    <img src="${src}"
      style="max-width:100%;max-height:85vh;object-fit:contain;border-radius:8px;
      box-shadow:0 24px 64px rgba(0,0,0,0.5);display:block">
    ${caption ? `<p style="color:rgba(255,255,255,0.8);margin:16px 0 0;font-size:14px;
      text-align:center;max-width:600px;line-height:1.5">${caption}</p>` : ''}
  `;

  // Close on backdrop click
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });

  // Close on Escape
  const onKey = e => { if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  document.body.appendChild(lb);
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────

async function initProfilePage() {
  const container = document.getElementById('profile-container');
  const workerId  = new URLSearchParams(location.search).get('worker');

  if (!workerId) {
    container.innerHTML = errorState('No worker specified.');
    setTimeout(() => location.href = 'listing.html', 1500);
    return;
  }

  container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--muted)">
    <div style="font-size:32px;margin-bottom:12px">⏳</div>Loading profile...</div>`;

  try {
    const [workerRes, reviewsRes] = await Promise.all([
      apiFetch(`/api/accounts/workers/${workerId}/`),
      apiFetch(`/api/bookings/workers/${workerId}/reviews/`),
    ]);

    if (!workerRes.ok) {
      container.innerHTML = errorState(`Worker not found. (${workerRes.status})`);
      setTimeout(() => location.href = 'listing.html', 2000);
      return;
    }

    const worker  = await workerRes.json();
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

    // Check if already saved (customers only)
    let savedFavoriteId = null;
    if (localStorage.getItem('access_token') && localStorage.getItem('user_role') === 'customer') {
      const favRes = await apiFetch('/api/accounts/favorites/');
      if (favRes.ok) {
        const favData = await favRes.json();
        const favList = Array.isArray(favData) ? favData : (favData.results || []);
        const match   = favList.find(f =>
          f.worker_profile === workerId || f.worker_profile_id === workerId || f.worker === workerId
        );
        if (match) savedFavoriteId = match.id;
      }
    }

    renderProfile(container, worker, reviews, workerId, savedFavoriteId);

  } catch (err) {
    console.error('Profile load error:', err);
    container.innerHTML = errorState('Failed to load profile.');
  }
}

// ─────────────────────────────────────────────────────────────────
// RENDER PROFILE
// ─────────────────────────────────────────────────────────────────

function renderProfile(container, w, reviews, workerId, savedFavoriteId) {
  const serverBase = typeof CONFIG !== 'undefined' ? CONFIG.SERVER_BASE : 'http://127.0.0.1:8000';

  const fullName   = w.full_name || 'Worker';
  const rawPhoto   = w.profile_photo_url || '';
  const photo      = rawPhoto ? `${serverBase}${rawPhoto}` : `https://i.pravatar.cc/150?u=${workerId}`;
  const bio        = w.bio || 'Experienced professional ready to help.';
  const experience = w.years_experience || 0;
  const rate       = parseFloat(w.base_hourly_rate || 0);
  const radius     = parseFloat(w.service_radius_km || 0);
  const location   = w.city || 'Local Area';
  const isAvail    = w.is_available;
  const verified   = w.verification_status === 'approved' || w.verification_status === 'verified';
  const jobsDone   = w.total_jobs_completed || 0;
  const services   = w.services || [];
  const portfolio  = w.portfolio_photos || [];

  const reviewList  = Array.isArray(reviews) ? reviews : (reviews.results || []);
  const reviewCount = w.total_reviews || reviewList.length;
  const avgRating   = reviewList.length
    ? (reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length).toFixed(1)
    : parseFloat(w.avg_rating || 0).toFixed(1);

  const category   = services[0]?.category || '';
  // Use first portfolio photo as banner — fall back to category image if no portfolio
  const bannerUrl  = portfolio.length
  ? `${serverBase}${portfolio[0].photo_url}`
  : bannerForCategory(category);
  let isSaved      = !!savedFavoriteId;
  let currentFavId = savedFavoriteId;

  container.innerHTML = `
    <div style="display:flex;justify-content:center;width:100%">
      <div style="max-width:900px;width:100%">

        <!-- ── Banner + Avatar Card ── -->
        <div class="card" style="padding:0;overflow:hidden;border:1px solid var(--border);margin-bottom:24px">

          <!-- Banner — clickable -->
          <div style="height:220px;width:100%;position:relative;cursor:zoom-in;overflow:hidden"
            onclick="openLightbox('${bannerUrl}','')">
            <img src="${bannerUrl}" style="width:100%;height:100%;object-fit:cover;display:block;
              transition:transform 0.3s ease" onmouseover="this.style.transform='scale(1.03)'"
              onmouseout="this.style.transform='scale(1)'">
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0);transition:background 0.2s;
              display:flex;align-items:center;justify-content:center" id="banner-hover-overlay">
              <span style="background:rgba(0,0,0,0.5);color:#fff;padding:6px 14px;border-radius:20px;
                font-size:13px;font-weight:600;opacity:0;transition:opacity 0.2s" id="banner-zoom-hint">
                🔍 Click to view
              </span>
            </div>
            <div style="position:absolute;top:16px;right:16px;padding:6px 14px;border-radius:20px;
              font-size:13px;font-weight:600;background:${isAvail?'#10b981':'#ef4444'};color:#fff">
              ${isAvail ? '✓ Available' : 'Unavailable'}
            </div>
          </div>

          <div style="padding:0 32px 32px">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;
              margin-top:-64px;margin-bottom:16px;flex-wrap:wrap;gap:16px">

              <!-- Avatar — clickable -->
              <div style="background:var(--card);padding:5px;border-radius:50%;
                box-shadow:0 4px 12px rgba(0,0,0,0.1);cursor:zoom-in;position:relative"
                onclick="openLightbox('${photo}','${fullName}')">
                <img id="profile-avatar-img" src="${photo}"
                  style="width:130px;height:130px;border-radius:50%;object-fit:cover;
                  border:2px solid var(--border);display:block;transition:filter 0.2s"
                  onmouseover="this.style.filter='brightness(0.85)'"
                  onmouseout="this.style.filter=''"
                  onerror="this.src='https://i.pravatar.cc/150?u=${workerId}'">
                <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);
                  border-radius:50%;width:28px;height:28px;display:flex;align-items:center;
                  justify-content:center;font-size:13px;pointer-events:none">🔍</div>
              </div>

              <!-- Action Buttons -->
              <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
                <button id="btn-save-worker"
                  style="padding:10px 22px;font-size:14px;border-radius:8px;font-weight:600;
                  cursor:pointer;border:1.5px solid var(--border);background:transparent;
                  color:var(--text);display:flex;align-items:center;gap:6px;transition:all 0.2s">
                  <span id="save-icon">${isSaved?'<span style="filter: saturate(0.5) opacity(0.85);">❤️</span>':'🤍'}</span>
                  <span id="save-label">${isSaved?'Saved':'Save'}</span>
                </button>
                <button class="btn gradient"
                  style="padding:10px 24px;font-size:14px;width:auto;border-radius:8px;font-weight:600"
                  onclick="location.href='booking.html?worker=${workerId}'">
                  Book Worker
                </button>
              </div>
            </div>

            <!-- Name + Meta -->
            <h1 style="margin:0 0 6px;font-size:26px;color:var(--text);display:flex;align-items:center;gap:8px">
              ${fullName}
              ${verified ? `<span title="Verified" style="color:#10b981">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg></span>` : ''}
            </h1>
            <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:8px">
              ${services.map(s => capitalize(s.category)).join(' • ') || 'Service Professional'}
            </div>
            <div style="font-size:14px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap;align-items:center">
              <span>📍 ${location}</span><span style="opacity:.4">•</span>
              <span>💼 ${experience} yrs</span><span style="opacity:.4">•</span>
              <span>✓ ${jobsDone} jobs</span><span style="opacity:.4">•</span>
              <span style="color:#f59e0b;font-weight:600">⭐ ${avgRating}</span><span style="opacity:.4">•</span>
              <span>Rs${rate}/hr</span><span style="opacity:.4">•</span>
              <span>📍 ${radius}km radius</span>
            </div>
          </div>
        </div>

        <!-- ── Tabs ── -->
        <div style="display:flex;border-bottom:2px solid var(--border);margin-bottom:24px;overflow-x:auto;scrollbar-width:none">
          ${['about','services','portfolio','reviews'].map((t, i) => `
            <button class="profile-tab-btn ${i===0?'active':''}" data-tab="${t}"
              style="background:none;border:none;
              border-bottom:${i===0?'3px solid var(--primary)':'3px solid transparent'};
              padding:12px 24px;font-size:15px;font-weight:600;
              color:${i===0?'var(--primary)':'var(--muted)'};cursor:pointer;
              white-space:nowrap;margin-bottom:-2px;transition:color 0.2s">
              ${capitalize(t)}
              ${t==='reviews'&&reviewCount
                ? `<span style="background:var(--border);color:var(--muted);padding:1px 7px;
                    border-radius:10px;font-size:12px;margin-left:4px">${reviewCount}</span>`
                : ''}
            </button>`).join('')}
        </div>

        <!-- ── About ── -->
        <div class="profile-tab-content active" id="ptab-about">
          <div style="margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap">
            ${parseFloat(avgRating)>=4.7
              ? `<span style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#b45309;
                  padding:7px 14px;border-radius:30px;font-size:13px;font-weight:700">⭐ Top Rated</span>` : ''}
            ${verified
              ? `<span style="background:rgba(16,185,129,0.1);color:#10b981;padding:7px 14px;
                  border-radius:30px;font-size:13px;font-weight:600">🛡️ Verified</span>` : ''}
            ${isAvail
              ? `<span style="background:rgba(59,130,246,0.1);color:#2563eb;padding:7px 14px;
                  border-radius:30px;font-size:13px;font-weight:600">⚡ Available Now</span>` : ''}
          </div>
          <p style="color:var(--text);line-height:1.8;font-size:16px;margin:0 0 24px">${bio}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px">
            ${[
              {icon:'⭐', val:avgRating,        label:'Avg Rating'},
              {icon:'✅', val:jobsDone,          label:'Jobs Done'},
              {icon:'💼', val:`${experience}y`,  label:'Experience'},
              {icon:'📍', val:`${radius}km`,     label:'Radius'},
              {icon:'💰', val:`Rs${rate}`,       label:'Per Hour'},
            ].map(s => `
              <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;
                padding:18px;text-align:center">
                <div style="font-size:22px;margin-bottom:6px">${s.icon}</div>
                <div style="font-size:20px;font-weight:800;color:var(--text)">${s.val}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:2px">${s.label}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- ── Services ── -->
        <div class="profile-tab-content" id="ptab-services" style="display:none">
          ${services.length
            ? `<div class="service-grid">${services.map(s => `
                <div class="card" style="padding:24px;border:1px solid var(--border)">
                  <div style="font-size:26px;margin-bottom:14px;width:52px;height:52px;display:flex;
                    align-items:center;justify-content:center;background:rgba(108,138,61,0.1);border-radius:12px">
                    ${iconForCategory(s.category)}
                  </div>
                  <h4 style="margin:0 0 8px;font-size:17px">${capitalize(s.category)}</h4>
                  <div style="color:var(--muted);font-size:13px;margin-bottom:10px">
                    ${parseFloat(s.price_modifier_pct||0)!==0
                      ? `${parseFloat(s.price_modifier_pct)>0?'+':''}${s.price_modifier_pct}% adjustment`
                      : 'Standard rate'}
                  </div>
                  <div style="color:var(--primary);font-weight:700;font-size:15px">
                    Rs${s.effective_rate||rate}/hr
                  </div>
                </div>`).join('')}</div>`
            : emptyState('🔧', 'No services listed yet')
          }
        </div>

        <!-- ── Portfolio ── -->
        <div class="profile-tab-content" id="ptab-portfolio" style="display:none">
          ${buildPortfolioGrid(portfolio, serverBase)}
        </div>

        <!-- ── Reviews (read-only) ── -->
        <div class="profile-tab-content" id="ptab-reviews" style="display:none">
          ${buildReviewsReadOnly(reviewList, avgRating, reviewCount, serverBase)}
        </div>

      </div>
    </div>`;

  // ── Wire banner hover effect ──
  const bannerDiv = container.querySelector('[id="banner-hover-overlay"]');
  if (bannerDiv) {
    const hint = document.getElementById('banner-zoom-hint');
    bannerDiv.parentElement?.addEventListener('mouseover', () => {
      if (hint) hint.style.opacity = '1';
    });
    bannerDiv.parentElement?.addEventListener('mouseout', () => {
      if (hint) hint.style.opacity = '0';
    });
  }

  // ── Wire tab switching ──
  container.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.profile-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--muted)';
        b.style.borderBottomColor = 'transparent';
      });
      container.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      btn.style.color = 'var(--primary)';
      btn.style.borderBottomColor = 'var(--primary)';
      document.getElementById(`ptab-${btn.dataset.tab}`)?.style && (document.getElementById(`ptab-${btn.dataset.tab}`).style.display = 'block');
    });
  });

  // ── Wire save button ──
  document.getElementById('btn-save-worker')?.addEventListener('click', async () => {
    if (!localStorage.getItem('access_token')) {
      showProfileToast('⚠️ Please log in to save workers', 'error'); return;
    }
    if (localStorage.getItem('user_role') !== 'customer') {
      showProfileToast('⚠️ Only customers can save workers', 'error'); return;
    }
    const btn = document.getElementById('btn-save-worker');
    btn.disabled = true;

    if (isSaved && currentFavId) {
      const res = await apiFetch(`/api/accounts/favorites/${currentFavId}/`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        isSaved = false; currentFavId = null;
        document.getElementById('save-icon').textContent = '🤍';
        document.getElementById('save-label').textContent = 'Save';
        showProfileToast('Removed from saved workers');
      } else { showProfileToast('❌ Failed to unsave', 'error'); }
    } else {
      const res = await apiFetch('/api/accounts/favorites/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({ worker_profile: workerId }),
      });
      if (res.ok || res.status === 201) {
        const data = await res.json();
        isSaved = true; currentFavId = data.id;
        document.getElementById('save-icon').textContent = '<span style="filter: saturate(0.5) opacity(0.85);">❤️</span>';
        document.getElementById('save-label').textContent = 'Saved';
        showProfileToast('✅ Worker saved!');
      } else {
        const err = await res.json().catch(() => ({}));
        showProfileToast('❌ ' + (err.detail || 'Failed to save'), 'error');
      }
    }
    btn.disabled = false;
  });
}

// ─────────────────────────────────────────────────────────────────
// PORTFOLIO GRID — clickable images with lightbox
// ─────────────────────────────────────────────────────────────────

function buildPortfolioGrid(portfolio, serverBase) {
  if (!portfolio.length) return emptyState('🖼️', 'No portfolio photos yet');

  // Inject portfolio styles once
  if (!document.getElementById('portfolio-grid-styles')) {
    const s = document.createElement('style');
    s.id = 'portfolio-grid-styles';
    s.textContent = `
      .pf-item {
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid var(--border);
        background: var(--card);
        cursor: zoom-in;
        position: relative;
      }
      .pf-item img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        display: block;
        transition: transform 0.35s ease;
      }
      .pf-item:hover img { transform: scale(1.06); }
      .pf-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.25s;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 14px;
        pointer-events: none;
      }
      .pf-item:hover .pf-overlay { opacity: 1; }
      .pf-zoom-icon {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.55);
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
      }
      .pf-item:hover .pf-zoom-icon { opacity: 1; }
      .pf-caption {
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        transform: translateY(4px);
        transition: transform 0.25s;
      }
      .pf-item:hover .pf-caption { transform: translateY(0); }
    `;
    document.head.appendChild(s);
  }

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">
      ${portfolio.map((p, i) => {
        const src     = `${serverBase}${p.photo_url}`;
        const caption = p.caption || '';
        const date    = p.uploaded_at
          ? new Date(p.uploaded_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
          : '';
        return `
          <div class="pf-item" onclick="openLightbox('${src}','${caption.replace(/'/g,"&#39;")}')"
            style="animation:fadeIn 0.3s ease ${i*0.05}s both">
            <img src="${src}" alt="${caption||'Portfolio photo'}"
              onerror="this.parentElement.style.background='var(--border)';this.style.display='none'">
            <div class="pf-zoom-icon">🔍</div>
            <div class="pf-overlay">
              ${caption ? `<div class="pf-caption">${caption}</div>` : ''}
              ${date ? `<div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:2px">${date}</div>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
// REVIEWS — READ ONLY (no form, no submit)
// ─────────────────────────────────────────────────────────────────

function buildReviewsReadOnly(reviewList, avgRating, reviewCount, serverBase) {
  const publicReviews = reviewList.filter(r => r.is_public !== false && r.comment && r.comment.trim() !== '');
  const filled = Math.round(parseFloat(avgRating));

  // Star breakdown bars
  const breakdown = [5,4,3,2,1].map(star => {
    const count = reviewList.filter(r => r.rating === star).length;
    const pct   = reviewCount ? Math.round((count / reviewCount) * 100) : 0;
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

  // Individual review cards
  const cards = reviewList.length
    ? publicReviews.map(r => {
        const rName  = r.reviewer_name || r.reviewer?.full_name || 'Customer';
        const rPhoto = r.reviewer_photo || r.reviewer?.profile_photo_url || '';
        const imgSrc = rPhoto ? `${serverBase}${rPhoto}` : `https://i.pravatar.cc/150?u=${r.id}`;
        const stars  = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const date   = r.created_at
          ? new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
          : '';
        return `
          <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;
            padding:20px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:12px">
                <img src="${imgSrc}" style="width:42px;height:42px;border-radius:50%;object-fit:cover"
                  onerror="this.src='https://i.pravatar.cc/150?u=${r.id}'">
                <div>
                  <div style="font-weight:700;font-size:15px">${rName}</div>
                  <div style="color:#f59e0b;font-size:15px;margin-top:2px">${stars}</div>
                </div>
              </div>
              <div style="color:var(--muted);font-size:13px">${date}</div>
            </div>
            ${r.comment
              ? `<p style="margin:0;color:var(--text);font-size:14px;line-height:1.6">${r.comment}</p>`
              : `<p style="margin:0;color:var(--muted);font-size:13px;font-style:italic">No comment left.</p>`}
          </div>`;
      }).join('')
    : emptyState('⭐', 'No reviews yet');

  return `
    <!-- Rating Summary -->
    <div style="display:flex;gap:32px;align-items:center;flex-wrap:wrap;margin-bottom:24px;
      background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px">
      <div style="text-align:center">
        <div style="font-size:52px;font-weight:800;color:var(--text);line-height:1">${avgRating}</div>
        <div style="color:#f59e0b;font-size:22px;margin:6px 0">
          ${'★'.repeat(filled)}${'☆'.repeat(5-filled)}
        </div>
        <div style="color:var(--muted);font-size:13px">
          ${reviewCount} review${reviewCount !== 1 ? 's' : ''}
        </div>
      </div>
      <div style="flex:1;min-width:180px">${breakdown}</div>
    </div>
    ${cards}`;
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ') : '';
}

function bannerForCategory(cat) {
  const map = {
    plumbing:    '../static/images/plumbing.jpeg',
    electrical:  '../static/images/electrician.jpeg',
    electrician: '../static/images/electrician.jpeg',
    carpentry:   '../static/images/carpentry.jpeg',
    mechanic:    '../static/images/mechanic.jpeg',
  };
  return map[(cat||'').toLowerCase()] || '../static/images/workers.jpeg';
}

function iconForCategory(cat) {
  const map = {
    plumbing:'🔧', electrical:'⚡', electrician:'⚡', carpentry:'🪑',
    mechanic:'🔩', painting:'🎨', cleaning:'🧹', ac_repair:'❄️',
    welding:'🔥', masonry:'🧱', tiling:'🪟', gardening:'🌿',
  };
  return map[(cat||'').toLowerCase()] || '🔨';
}

function emptyState(icon, msg) {
  return `<div style="text-align:center;padding:48px;color:var(--muted)">
    <div style="font-size:40px;margin-bottom:12px">${icon}</div>
    <p style="margin:0;font-size:15px">${msg}</p>
  </div>`;
}

function errorState(msg) {
  return `<div style="text-align:center;padding:60px;color:#ef4444">
    <div style="font-size:40px;margin-bottom:12px">⚠️</div>
    <p style="margin:0;font-size:15px">${msg}</p>
  </div>`;
}

function showProfileToast(message, type = 'success') {
  let toast = document.getElementById('profile-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'profile-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);transition:opacity 0.3s';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#ef4444' : '#1a1a1a';
  toast.style.color = '#fff'; toast.style.opacity = '1'; toast.style.display = 'block';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.style.display = 'none', 300);
  }, 3500);
}

if (typeof formatDate === 'undefined') {
  window.formatDate = d => {
    try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
    catch { return d; }
  };
}