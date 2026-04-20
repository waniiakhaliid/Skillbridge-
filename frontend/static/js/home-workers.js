/**
 * home-workers.js
 * Renders the Top Rated Workers grid on home.html
 * Waits for 'skillbridge-ready' event before rendering
 * so API data is guaranteed to be loaded first.
 */

function renderTopWorkers() {
  const container = document.getElementById('top-rated-workers');

  if (!container) return;

  if (!SKILLBRIDGE_DATA.workers.length) {
    container.innerHTML = '<p>No workers available right now.</p>';
    return;
  }

  const reviewsEstimate = (w) => Math.floor(w.rating * 12 + w.experience * 4);

  // Sort by rating (highest first) and take top 6
  const topWorkers = SKILLBRIDGE_DATA.workers
    .slice()                          // don't mutate original array
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const cards = topWorkers.map(w => `
    <article class="worker-card">
      <div class="worker-photo-wrapper">
        <img class="worker-photo" src="${w.photo}" alt="${w.name}">
      </div>
      <h3 class="worker-name">
        ${w.name}
        ${w.verified ? '<span style="color:#10b981;font-size:14px;" title="Verified">&#10003;</span>' : ''}
      </h3>
      <div class="meta">${w.service} &bull; ${w.experience} yrs</div>
      <div class="location">&#x1F4CD; ${w.location}</div>
      <div class="rating">
        &#11088; ${w.rating}
        <span class="muted">(${reviewsEstimate(w)} reviews)</span>
      </div>
      <button class="btn outline view"
        onclick="location.href='profile.html?worker=${w.id}'">
        View Profile
      </button>
    </article>
  `).join('');

  container.innerHTML = cards;
}


// ✅ Wait for data.js to finish fetching from API
window.addEventListener('skillbridge-ready', renderTopWorkers);