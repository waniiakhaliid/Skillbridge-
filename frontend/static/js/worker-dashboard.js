/**
 * FILE LOCATION: frontend/static/js/worker-dashboard.js
 * Renders incoming and active bookings for workers.
 */

// Only runs on worker dashboard page
if (document.getElementById('worker-bookings-container')) {
  renderWorkerDashboard();
}

async function renderWorkerDashboard() {
  const container = document.getElementById('worker-bookings-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--muted);">
      Loading bookings...
    </div>`;

  const result = await getWorkerBookings();

  if (!result.success) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#ef4444;">
        Failed to load: ${result.error}
      </div>`;
    return;
  }

  const bookings = result.bookings;

  if (!bookings.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--muted);">
        <div style="font-size:48px;margin-bottom:16px;">📭</div>
        <h3>No bookings yet</h3>
        <p>New booking requests will appear here.</p>
      </div>`;
    return;
  }

  // Group bookings by status for better UX
  const groups = {
    pending:     bookings.filter(b => b.status === 'pending'),
    accepted:    bookings.filter(b => b.status === 'accepted'),
    in_progress: bookings.filter(b => b.status === 'in_progress'),
    completed:   bookings.filter(b => b.status === 'completed'),
    cancelled:   bookings.filter(b => b.status.startsWith('cancelled')),
  };

  container.innerHTML = `
    ${groups.pending.length     ? renderGroup('🔔 New Requests',    groups.pending,     'pending')     : ''}
    ${groups.accepted.length    ? renderGroup('✅ Accepted Jobs',    groups.accepted,    'accepted')    : ''}
    ${groups.in_progress.length ? renderGroup('🔧 In Progress',     groups.in_progress, 'in_progress') : ''}
    ${groups.completed.length   ? renderGroup('🎉 Completed',       groups.completed,   'completed')   : ''}
    ${groups.cancelled.length   ? renderGroup('❌ Cancelled',        groups.cancelled,   'cancelled')   : ''}
  `;

  // Attach action button listeners
  container.querySelectorAll('.btn-booking-action').forEach(btn => {
    btn.addEventListener('click', () =>
      handleStatusUpdate(btn.dataset.id, btn.dataset.status)
    );
  });
}


function renderGroup(title, bookings, groupKey) {
  return `
    <div style="margin-bottom:32px;">
      <h3 style="font-size:18px;margin:0 0 16px;color:var(--text);">${title} (${bookings.length})</h3>
      ${bookings.map(b => workerBookingCard(b, groupKey)).join('')}
    </div>`;
}


async function handleStatusUpdate(bookingId, newStatus) {
  const labels = {
    accepted:         'accept this booking',
    in_progress:      'mark this job as started',
    completed:        'mark this job as completed',
    cancelled_worker: 'decline this booking',
  };

  if (!confirm(`Are you sure you want to ${labels[newStatus] || 'update this booking'}?`)) return;

  const result = await updateBookingStatus(bookingId, newStatus);

  if (result.success) {
    renderWorkerDashboard(); // refresh the list
  } else {
    alert('Failed to update: ' + result.error);
  }
}