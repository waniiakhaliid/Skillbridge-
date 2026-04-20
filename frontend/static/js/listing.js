/**
 * FILE LOCATION: frontend/static/js/listing.js
 * Handles the workers listing page with filters and sorting.
 * Waits for 'skillbridge-ready' event before rendering.
 */

// Helper to get URL query params
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

// -------------------------------------------------------
// List Card HTML — LinkedIn style
// -------------------------------------------------------
function listCardHTML(w) {
  const photo = w.photo || 'https://i.pravatar.cc/150?u=default';
  const verifiedBadge = w.verified
    ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="#10b981" stroke="white" stroke-width="2" style="margin-left:4px;">
         <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
         <polyline points="9 12 11 14 15 10"></polyline>
       </svg>`
    : '';

  return `
    <div class="worker-list-card" style="display:flex;align-items:flex-start;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;gap:20px;transition:box-shadow 0.2s;">
      
      <img src="${photo}" alt="${w.name}"
           style="width:96px;height:96px;border-radius:8px;object-fit:cover;flex-shrink:0;"
           onerror="this.src='https://i.pravatar.cc/150?u=${w.id}'">

      <div style="flex:1;">
        <h3 style="margin:0 0 4px 0;font-size:18px;display:flex;align-items:center;gap:4px;">
          ${w.name} ${verifiedBadge}
          <span style="color:var(--muted);font-weight:normal;font-size:14px;margin-left:4px;">✨ Pro</span>
        </h3>
        <div style="color:var(--text);font-size:15px;font-weight:500;margin-bottom:2px;">
          ${w.service} Specialist • ${w.experience} years experience
        </div>
        <div style="color:var(--muted);font-size:13px;margin-bottom:8px;">
          📍 ${w.location || 'Local Region'} • 💰 Rs${w.price || 25}/hr
        </div>
        <p style="margin:0;font-size:14px;color:var(--muted);line-height:1.5;">
          ${w.bio || ''}
        </p>
      </div>

      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px;">
        <a class="btn outline" href="profile.html?worker=${w.id}"
           style="border-radius:24px;padding:6px 24px;white-space:nowrap;">
          View Profile
        </a>
        <div style="font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:4px;">
          <span style="color:#f59e0b;">⭐</span> ${w.rating}
        </div>
      </div>

    </div>`;
}

// -------------------------------------------------------
// Main render function — applies all filters and sorting
// -------------------------------------------------------
function renderList() {
  const list  = document.getElementById('workers-list');
  const title = document.getElementById('listing-title');
  if (!list) return;

  // --- Read all filter values from DOM ---
  const selectedCat      = document.querySelector('input[name="filter-category"]:checked')?.value || 'All';
  const maxPrice         = parseInt(document.getElementById('filter-price')?.value || 100, 10);
  const selectedAvail    = document.getElementById('filter-availability')?.value || 'All';
  const minRating        = parseFloat(document.getElementById('filter-rating')?.value || 0);
  const selectedExp      = document.getElementById('filter-experience')?.value || 'All';
  const searchLocation   = document.getElementById('filter-location')?.value.toLowerCase().trim() || '';
  const requireVerified  = document.getElementById('filter-verified')?.checked || false;
  const selectedSort     = document.getElementById('filter-sort')?.value || 'rating';

  // Update price display
  const priceDisplay = document.getElementById('price-display');
  if (priceDisplay) priceDisplay.textContent = maxPrice;

  // --- Filter pipeline ---
  let filtered = SKILLBRIDGE_DATA.workers.filter(w => {

    // 1. Category
    if (selectedCat !== 'All' && w.service !== selectedCat) return false;

    // 2. Price
    if (w.price > maxPrice) return false;

    // 3. Availability — w.availability is array like ['Today','Tomorrow']
    if (selectedAvail !== 'All' && !w.availability.includes(selectedAvail)) return false;

    // 4. Rating
    if (w.rating < minRating) return false;

    // 5. Experience
    if (selectedExp === '1-3' && (w.experience < 1 || w.experience > 3)) return false;
    if (selectedExp === '4-7' && (w.experience < 4 || w.experience > 7)) return false;
    if (selectedExp === '8'   && w.experience < 8) return false;

    // 6. Location
    if (searchLocation && !w.location?.toLowerCase().includes(searchLocation)) return false;

    // 7. Verified only
    if (requireVerified && !w.verified) return false;

    return true;
  });

  // --- Sort ---
  filtered.sort((a, b) => {
    if (selectedSort === 'rating')      return b.rating     - a.rating;
    if (selectedSort === 'experience')  return b.experience - a.experience;
    if (selectedSort === 'price_low')   return a.price      - b.price;
    if (selectedSort === 'price_high')  return b.price      - a.price;
    return 0;
  });

  // --- Update title ---
  if (title) {
    title.textContent = (selectedCat === 'All' ? 'Available' : selectedCat) + ' Workers';
  }

  // --- Render ---
  list.innerHTML = filtered.length
    ? filtered.map(listCardHTML).join('')
    : '<div style="padding:40px;text-align:center;color:var(--muted);">No workers found matching your criteria.</div>';
}

// -------------------------------------------------------
// Setup filter event listeners
// -------------------------------------------------------
function setupFilters() {
  const catRadios       = document.querySelectorAll('input[name="filter-category"]');
  const priceInput      = document.getElementById('filter-price');
  const availSelect     = document.getElementById('filter-availability');
  const ratingSelect    = document.getElementById('filter-rating');
  const expSelect       = document.getElementById('filter-experience');
  const locationInput   = document.getElementById('filter-location');
  const verifiedCheck   = document.getElementById('filter-verified');
  const sortSelect      = document.getElementById('filter-sort');
  const clearBtn        = document.getElementById('clear-filters');

  // Attach listeners to all filter inputs
  catRadios.forEach(r  => r.addEventListener('change', renderList));
  availSelect?.addEventListener('change', renderList);
  ratingSelect?.addEventListener('change', renderList);
  expSelect?.addEventListener('change', renderList);
  sortSelect?.addEventListener('change', renderList);
  verifiedCheck?.addEventListener('change', renderList);
  locationInput?.addEventListener('keyup', renderList);   // live typing
  priceInput?.addEventListener('input', renderList);      // smooth slider

  // Clear all filters button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.querySelector('input[name="filter-category"][value="All"]').checked = true;
      if (priceInput)    { priceInput.value    = 100; }
      if (availSelect)   { availSelect.value   = 'All'; }
      if (ratingSelect)  { ratingSelect.value  = '0'; }
      if (expSelect)     { expSelect.value     = 'All'; }
      if (locationInput) { locationInput.value = ''; }
      if (verifiedCheck) { verifiedCheck.checked = false; }
      if (sortSelect)    { sortSelect.value    = 'rating'; }
      renderList();
    });
  }

  // Set initial category from URL ?cat=Plumber
  const urlCat = getParam('cat');
  if (urlCat) {
    const radio = document.querySelector(`input[name="filter-category"][value="${urlCat}"]`);
    if (radio) radio.checked = true;
  }
}

// -------------------------------------------------------
// Init — only runs on listing page, waits for data
// -------------------------------------------------------
if (document.getElementById('workers-list')) {
  window.addEventListener('skillbridge-ready', () => {
    setupFilters();
    renderList();
  });
}