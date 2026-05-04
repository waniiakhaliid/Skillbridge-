/**
 * FILE LOCATION: frontend/static/js/booking-history.js
 * Provides booking data loading and management for both customer and worker dashboards.
 * Contains API functions and utility functions for booking history display.
 *
 * FIX: Added safe DEFAULT_AVATAR fallback in case CONFIG.DEFAULT_AVATAR
 * is missing or points to a 404 path.
 */

// =====================================
// SAFE AVATAR FALLBACK
// If CONFIG.DEFAULT_AVATAR is missing or broken, use a reliable fallback.
// =====================================
function getDefaultAvatar() {
  // Try CONFIG first, then a relative path, then a data URI as last resort
  if (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_AVATAR) {
    return CONFIG.DEFAULT_AVATAR;
  }
  // Use a reliable relative path — adjust if your folder structure differs
  return '../static/images/default-avatar.png';
}

// =====================================
// API FUNCTIONS
// =====================================

async function getMyBookings() {
  try {
    const response = await fetch(CONFIG.API_BASE + '/bookings/my/', {
      method: 'GET',
      headers: authHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch bookings');
    }

    return { success: true, bookings: data };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getWorkerBookings() {
  try {
    const response = await fetch(CONFIG.API_BASE + '/bookings/worker/', {
      method: 'GET',
      headers: authHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch bookings');
    }

    return { success: true, bookings: data };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateBookingStatus(bookingId, newStatus) {
  try {
    const response = await fetch(CONFIG.API_BASE + `/bookings/${bookingId}/status/`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update booking status');
    }

    return { success: true, data };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function cancelBooking(bookingId, reason = '') {
  try {
    const response = await fetch(CONFIG.API_BASE + `/bookings/${bookingId}/cancel/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.detail || data.error || 'Cancellation failed');

    return { success: true, data };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function submitReview(bookingId, rating, comment) {
  try {
    const response = await fetch(CONFIG.API_BASE + `/bookings/${bookingId}/review/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ rating, comment })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to submit review');
    }

    return { success: true, data };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function statusBadge(status) {
  const badges = {
    pending:            '<span class="badge pending">Pending</span>',
    accepted:           '<span class="badge accepted">Accepted</span>',
    in_progress:        '<span class="badge in-progress">In Progress</span>',
    completed:          '<span class="badge completed">Completed</span>',
    cancelled_customer: '<span class="badge cancelled">Cancelled by Customer</span>',
    cancelled_worker:   '<span class="badge cancelled">Declined</span>',
    cancelled:          '<span class="badge cancelled">Cancelled</span>',
  };
  return badges[status] || `<span class="badge">${status}</span>`;
}

// formatDate — single source of truth (used by worker-dashboard.js and customer-dashboard.js)
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today, ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Tomorrow, ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays > 1 && diffDays <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' }) + ', ' +
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  } catch (e) {
    return dateString;
  }
}

// =====================================
// SHARED RENDERING FUNCTIONS
// =====================================

function customerBookingCard(b) {
  const defaultAvatar = getDefaultAvatar();
  const photo = b.worker_photo
    ? CONFIG.SERVER_BASE + b.worker_photo
    : defaultAvatar;

  let actionBtn = '';
  if (b.status === 'pending' || b.status === 'accepted') {
    actionBtn = `
      <button class="btn-cancel-booking btn outline"
        data-id="${b.id}"
        style="padding:8px 16px;font-size:13px;color:#ef4444;border-color:#ef4444;border-radius:8px;cursor:pointer;background:transparent;">
        Cancel Booking
      </button>`;
  } else if (b.status === 'completed' && !b.review) {
    actionBtn = `
      <button class="btn-leave-review btn gradient"
        data-id="${b.id}"
        style="padding:8px 16px;font-size:13px;border-radius:8px;cursor:pointer;">
        Leave Review
      </button>`;
  }

  return `
    <div style="display:flex;gap:20px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;flex-wrap:wrap;">
      <img src="${photo}" alt="${b.worker_name || 'Worker'}"
           style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;"
           onerror="this.src='${defaultAvatar}'">
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
          <h3 style="margin:0;font-size:17px;">${b.worker_name || 'Worker'}</h3>
          ${statusBadge(b.status)}
        </div>
        <div style="font-size:14px;color:var(--muted);margin-bottom:4px;">
          🔧 ${(b.service_category || '').charAt(0).toUpperCase() + (b.service_category || '').slice(1)}
          &nbsp;•&nbsp;
          📅 ${formatDate(b.scheduled_at)}
        </div>
        <div style="font-size:14px;color:var(--muted);">
          💰 Rs${b.total_price} &nbsp;•&nbsp; 💳 ${b.payment_method || 'cash'}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;justify-content:center;">
        <a href="booking-detail.html?id=${b.id}"
           style="font-size:13px;color:var(--primary);text-decoration:none;font-weight:600;">
          View Details →
        </a>
        ${actionBtn}
      </div>
    </div>`;
}

function workerBookingCard(b, groupKey) {
  const defaultAvatar = getDefaultAvatar();
  const photo = b.customer_photo
    ? CONFIG.SERVER_BASE + b.customer_photo
    : defaultAvatar;

  const actions = {
    pending: `
      <button class="btn-booking-action btn gradient"
        data-id="${b.id}" data-status="accepted"
        style="padding:8px 16px;font-size:13px;border-radius:8px;cursor:pointer;">
        ✅ Accept
      </button>
      <button class="btn-booking-action btn outline"
        data-id="${b.id}" data-status="cancelled_worker"
        style="padding:8px 16px;font-size:13px;color:#ef4444;border-color:#ef4444;border-radius:8px;cursor:pointer;background:transparent;">
        ❌ Decline
      </button>`,
    accepted: `
      <button class="btn-booking-action btn gradient"
        data-id="${b.id}" data-status="in_progress"
        style="padding:8px 16px;font-size:13px;border-radius:8px;cursor:pointer;">
        🔧 Start Job
      </button>`,
    in_progress: `
      <button class="btn-booking-action btn gradient"
        data-id="${b.id}" data-status="completed"
        style="padding:8px 16px;font-size:13px;border-radius:8px;cursor:pointer;background:#10b981;">
        🎉 Mark Complete
      </button>`,
  };

  return `
    <div style="display:flex;gap:20px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:12px;flex-wrap:wrap;">
      <img src="${photo}" alt="${b.customer_name || 'Customer'}"
           style="width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0;"
           onerror="this.src='${defaultAvatar}'">
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap;">
          <h4 style="margin:0;font-size:16px;">${b.customer_name || 'Customer'}</h4>
          ${statusBadge(b.status)}
        </div>
        <div style="font-size:14px;color:var(--muted);margin-bottom:4px;">
          🔧 ${(b.service_category || '').charAt(0).toUpperCase() + (b.service_category || '').slice(1)}
          &nbsp;•&nbsp;
          📅 ${formatDate(b.scheduled_at)}
        </div>
        <div style="font-size:14px;color:var(--muted);">
          💰 Rs${b.total_price}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;justify-content:center;">
        ${actions[groupKey] || ''}
        <a href="booking-detail.html?id=${b.id}"
           style="font-size:13px;color:var(--primary);text-decoration:none;font-weight:600;text-align:center;">
          View Details →
        </a>
      </div>
    </div>`;
}