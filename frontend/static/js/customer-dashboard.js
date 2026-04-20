/**
 * FILE LOCATION: frontend/static/js/customer-dashboard.js
 * Renders booking history and management for customers.
 */

// Only runs on customer dashboard page
if (document.getElementById('customer-bookings-container')) {
  window.addEventListener('skillbridge-ready', renderCustomerDashboard);
}

async function renderCustomerDashboard() {
  const container = document.getElementById('customer-bookings-container');
  if (!container) return;

  // Show loading
  container.innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--muted);">
      Loading your bookings...
    </div>`;

  // Fetch bookings from API
  const result = await getMyBookings();

  if (!result.success) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#ef4444;">
        Failed to load bookings: ${result.error}
      </div>`;
    return;
  }

  const bookings = result.bookings;

  if (!bookings.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--muted);">
        <div style="font-size:48px;margin-bottom:16px;">📋</div>
        <h3>No bookings yet</h3>
        <p>When you book a worker, your bookings will appear here.</p>
        <a href="listing.html" class="btn gradient" style="margin-top:16px;display:inline-block;padding:10px 24px;">
          Find Workers
        </a>
      </div>`;
    return;
  }

  // Render booking cards
  container.innerHTML = bookings.map(b => customerBookingCard(b)).join('');

  // Attach cancel button listeners
  container.querySelectorAll('.btn-cancel-booking').forEach(btn => {
    btn.addEventListener('click', () => handleCancelBooking(btn.dataset.id));
  });

  // Attach review button listeners
  container.querySelectorAll('.btn-leave-review').forEach(btn => {
    btn.addEventListener('click', () => showReviewModal(btn.dataset.id));
  });
}


async function handleCancelBooking(bookingId) {
  const reason = prompt('Reason for cancellation (optional):') || '';

  if (!confirm('Are you sure you want to cancel this booking?')) return;

  const result = await cancelBooking(bookingId, reason);

  if (result.success) {
    // Show cancellation fee if any
    if (result.data.cancellation_fee > 0) {
      alert(`Booking cancelled. Cancellation fee: Rs${result.data.cancellation_fee}`);
    }
    // Refresh the list
    renderCustomerDashboard();
  } else {
    alert('Failed to cancel: ' + result.error);
  }
}


function showReviewModal(bookingId) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.5);z-index:9999;
    display:flex;align-items:center;justify-content:center;`;

  modal.innerHTML = `
    <div style="background:var(--card);border-radius:16px;padding:32px;width:90%;max-width:480px;border:1px solid var(--border);">
      <h3 style="margin:0 0 24px;font-size:22px;">Leave a Review</h3>

      <!-- Star Rating -->
      <div style="margin-bottom:20px;">
        <label style="font-weight:600;display:block;margin-bottom:12px;">Rating</label>
        <div id="star-selector" style="display:flex;gap:8px;font-size:28px;cursor:pointer;">
          ${[1,2,3,4,5].map(n =>
            `<span class="star" data-val="${n}" style="opacity:0.3;transition:opacity 0.1s;">⭐</span>`
          ).join('')}
        </div>
        <input type="hidden" id="review-rating" value="0">
      </div>

      <!-- Comment -->
      <div style="margin-bottom:24px;">
        <label style="font-weight:600;display:block;margin-bottom:8px;">Comment (optional)</label>
        <textarea id="review-comment"
          placeholder="Share your experience..."
          style="width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px;resize:none;height:100px;"></textarea>
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:12px;">
        <button id="submit-review-btn" class="btn gradient"
          style="flex:1;padding:12px;border-radius:8px;font-weight:600;cursor:pointer;">
          Submit Review
        </button>
        <button id="close-modal-btn" class="btn outline"
          style="flex:1;padding:12px;border-radius:8px;cursor:pointer;">
          Cancel
        </button>
      </div>

      <div id="review-msg" style="margin-top:12px;text-align:center;font-size:14px;min-height:20px;"></div>
    </div>`;

  document.body.appendChild(modal);

  // Star selector logic
  const stars = modal.querySelectorAll('.star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.val);
      document.getElementById('review-rating').value = val;
      // Highlight selected stars
      stars.forEach(s => {
        s.style.opacity = parseInt(s.dataset.val) <= val ? '1' : '0.3';
      });
    });
  });

  // Close modal
  modal.querySelector('#close-modal-btn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Submit review
  modal.querySelector('#submit-review-btn').addEventListener('click', async () => {
    const rating  = parseInt(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value.trim();
    const msg     = document.getElementById('review-msg');

    if (rating === 0) {
      msg.style.color   = '#ef4444';
      msg.textContent   = 'Please select a rating.';
      return;
    }

    const result = await submitReview(bookingId, rating, comment);

    if (result.success) {
      msg.style.color = '#10b981';
      msg.textContent = 'Review submitted! Thank you.';
      setTimeout(() => {
        document.body.removeChild(modal);
        renderCustomerDashboard(); // refresh
      }, 1500);
    } else {
      msg.style.color = '#ef4444';
      msg.textContent = result.error;
    }
  });
}