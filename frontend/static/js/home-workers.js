/**
 * home-workers.js
 * Renders the Top Rated Workers grid on home.html
 * using specific hardcoded worker IDs from SKILLBRIDGE_DATA.
 */
(function () {
  const container = document.getElementById('top-rated-workers');
  if (!container || typeof SKILLBRIDGE_DATA === 'undefined') return;

  // Exact workers to feature on the home page (by ID)
  const FEATURED_IDS = [8, 37, 7, 1, 38];
  // eshaal → Eshaal Hussain, wania → Wania Khalid,
  // talal  → Talal Amer,     hasnain → Hasnain Afkar, hafsa → Hafsa Tanveer

  const workerMap = {};
  SKILLBRIDGE_DATA.workers.forEach(w => { workerMap[w.id] = w; });

  const reviewsEstimate = (w) => Math.floor(w.rating * 12 + w.experience * 4);

  const cards = FEATURED_IDS
    .map(id => workerMap[id])
    .filter(Boolean)
    .map(w => `
      <article class="worker-card">
        <div class="worker-photo-wrapper">
          <img class="worker-photo" src="${w.photo}" alt="${w.name}">
        </div>
        <h3 class="worker-name">${w.name}${w.verified ? ' <span style="color:#10b981;font-size:14px;" title="Verified">&#10003;</span>' : ''}</h3>
        <div class="meta">${w.service} &bull; ${w.experience} yrs</div>
        <div class="location">&#x1F4CD; ${w.location}</div>
        <div class="rating">&#11088; ${w.rating} <span class="muted">(${reviewsEstimate(w)} reviews)</span></div>
        <button class="btn outline view" onclick="location.href='profile.html?worker=${w.id}'">View Profile</button>
      </article>
    `).join('');

  container.innerHTML = cards;
})();
