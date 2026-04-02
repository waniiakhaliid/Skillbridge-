/**
 * admin.js
 * Logic for the Admin Dashboard to render statistics and worker lists.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof SKILLBRIDGE_DATA === 'undefined') {
    console.error("SKILLBRIDGE_DATA is not loaded.");
    return;
  }

  updateStats();
  renderWorkerList();
});

function updateStats() {
  const usersEl = document.getElementById('total-users-val');
  const workersEl = document.getElementById('total-workers-val');
  const pendingEl = document.getElementById('pending-approvals-val');

  if (usersEl) usersEl.textContent = '123'; // Mock total users
  if (workersEl) workersEl.textContent = SKILLBRIDGE_DATA.workers.length;
  // Let's mock pending approvals based on unverified status
  const pendingCount = SKILLBRIDGE_DATA.workers.filter(w => !w.verified).length;
  if (pendingEl) pendingEl.textContent = pendingCount;
}

function renderWorkerList() {
  const container = document.getElementById('all-workers-list');
  if (!container) return;

  if (SKILLBRIDGE_DATA.workers.length === 0) {
    container.innerHTML = '<p class="muted">No workers registered yet.</p>';
    return;
  }

  const tableHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Service</th>
          <th>Experience</th>
          <th>Rating</th>
          <th>Location</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${SKILLBRIDGE_DATA.workers.map(w => `
          <tr style="vertical-align: middle;">
            <td>#${w.id}</td>
            <td style="display:flex; align-items:center; gap:8px;">
              <img src="${w.photo}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
              ${w.name}
            </td>
            <td>${w.service}</td>
            <td>${w.experience} yrs</td>
            <td>⭐ ${w.rating}</td>
            <td>${w.location}</td>
            <td>
              <span class="badge ${w.verified ? 'completed' : 'pending'}" style="margin:0;">
                ${w.verified ? 'Verified' : 'Pending'}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:4px;">
                <button class="btn outline" style="width:auto; padding:4px 8px; font-size:12px;" onclick="location.href='profile.html?worker=${w.id}'">View</button>
                ${!w.verified ? `<button class="btn gradient" style="width:auto; padding:4px 8px; font-size:12px;">Verify</button>` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}
