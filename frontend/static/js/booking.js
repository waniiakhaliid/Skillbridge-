/**
 * FILE: booking.js (REFACTORED)
 * Modular booking system using HTML templates
 */

// =====================================
// 1. STATE MANAGEMENT
// =====================================
class BookingState {
  constructor() {
    this.worker = null;
    this.currentSlide = 0;
    this.formData = {
      date: '',
      time: '',
      duration: 2,
      address: '',
      description: '',
      paymentMethod: 'cash'
    };
  }

  setWorker(worker) {
    this.worker = worker;
  }

  updateField(field, value) {
    this.formData[field] = value;
  }

  getScheduledAt() {
    const date = new Date(`${this.formData.date}T${this.formData.time}:00`);
    return date.toISOString();
  }

  getEstimatedTotal() {
    return (parseFloat(this.worker.price) * parseFloat(this.formData.duration)).toFixed(0);
  }
}


// =====================================
// 2. VALIDATION MODULE
// =====================================
const BookingValidator = {
  validateDateTime(date, time) {
    if (!date || !time) {
      return { valid: false, error: 'Please select both date and time.' };
    }
    
    const selectedDateTime = new Date(`${date}T${time}`);
    if (selectedDateTime <= new Date()) {
      return { valid: false, error: 'Please select a future date and time.' };
    }
    
    return { valid: true };
  },

  validateAddress(address) {
    if (!address?.trim()) {
      return { valid: false, error: 'Address is required' };
    }
    return { valid: true };
  }
};


// =====================================
// 3. TEMPLATE RENDERER
// =====================================
class TemplateRenderer {
  static render(templateId, data) {
    const template = document.getElementById(templateId);
    const clone = template.content.cloneNode(true);
    
    // Fill in worker data using data-worker attributes
    clone.querySelectorAll('[data-worker]').forEach(el => {
      const field = el.getAttribute('data-worker');
      const value = data[field];
      
      if (el.tagName === 'IMG') {
        el.src = value || CONFIG.DEFAULT_AVATAR;
        el.onerror = () => el.src = CONFIG.DEFAULT_AVATAR;
      } else {
        el.textContent = value;
      }
    });
    
    // Set min date for date input
    const dateInput = clone.querySelector('#bk-exact-date');
    if (dateInput) {
      dateInput.min = new Date().toISOString().split('T')[0];
    }
    
    return clone;
  }
}


// =====================================
// 4. UI CONTROLLER
// =====================================
class BookingUI {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.elements = {};
  }

  render() {
    const formContent = TemplateRenderer.render('booking-form-template', this.state.worker);
    this.container.innerHTML = '';
    this.container.appendChild(formContent);
    
    this.cacheElements();
    this.attachEventListeners();
  }

  cacheElements() {
    this.slider = this.container.querySelector('#booking-slider');
    this.dots = this.container.querySelectorAll('.slide-dot');
    this.slides = this.container.querySelectorAll('.booking-slide');
    
    // Cache form inputs by data-field attribute
    this.container.querySelectorAll('[data-field]').forEach(input => {
      const field = input.getAttribute('data-field');
      this.elements[field] = input;
      
      // Auto-update state on input change
      input.addEventListener('change', () => {
        this.state.updateField(field, input.value);
      });
    });
    
    this.elements.confirmBtn = this.container.querySelector('#confirm-booking-btn');
    this.elements.message = this.container.querySelector('#bk-msg');
  }

  attachEventListeners() {
    // Dot navigation
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => {
        this.goToSlide(parseInt(dot.dataset.slide));
      });
    });

    // All [data-action] buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const currentSlideIndex = Array.from(this.slides).findIndex(slide => slide.contains(btn));
        
        if (action === 'next') {
          this.handleNext(currentSlideIndex);
        } else if (action === 'back') {
          this.goToSlide(currentSlideIndex - 1);
        }
      });
    });

    // Special actions
    this.container.querySelector('#book-now-btn')?.addEventListener('click', () => this.setDefaultDateTime());
    this.container.querySelector('#find-more-workers')?.addEventListener('click', () => location.href = 'listing.html');
    this.elements.confirmBtn?.addEventListener('click', () => this.handleConfirmBooking());
  }

  handleNext(fromSlide) {
    if (fromSlide === 0) {
      // Validate date & time
      const validation = BookingValidator.validateDateTime(
        this.elements.date.value,
        this.elements.time.value
      );
      
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
      
      this.goToSlide(1);
      
    } else if (fromSlide === 1) {
      // Validate address
      const validation = BookingValidator.validateAddress(this.elements.address.value);
      
      if (!validation.valid) {
        this.elements.address.style.borderColor = '#ef4444';
        this.elements.address.placeholder = `⚠️ ${validation.error}`;
        return;
      }
      
      this.elements.address.style.borderColor = 'var(--border)';
      this.populateSummary();
      this.goToSlide(2);
    }
  }

  goToSlide(index) {
    this.state.currentSlide = index;
    this.slider.style.transform = `translateX(-${index * 33.333}%)`;

    this.dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  setDefaultDateTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    this.elements.date.value = now.toISOString().split('T')[0];
    this.elements.time.value = now.toTimeString().split(' ')[0].substring(0, 5);
    this.state.updateField('date', this.elements.date.value);
    this.state.updateField('time', this.elements.time.value);
  }

  populateSummary() {
    const paymentLabels = {
      cash: '💵 Cash on Delivery',
      jazzcash: '📱 JazzCash',
      easypaisa: '📱 EasyPaisa',
      card: '💳 Card',
    };

    const rows = [
      { label: '📅 Date', value: `${this.state.formData.date} at ${this.state.formData.time}` },
      { label: '⏱ Duration', value: `${this.state.formData.duration} hour${this.state.formData.duration > 1 ? 's' : ''}` },
      { label: '📍 Address', value: this.state.formData.address },
      { label: '💳 Payment', value: paymentLabels[this.state.formData.paymentMethod] },
      { label: '💰 Est. Total', value: `Rs${this.state.getEstimatedTotal()}`, bold: true },
    ];

    const summaryHtml = rows.map(r => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <span style="color:var(--muted);font-size:13px;white-space:nowrap;">${r.label}</span>
        <span style="color:var(--text);font-size:13px;text-align:right;font-weight:${r.bold ? '700' : '500'};">
          ${r.value}
        </span>
      </div>
    `).join('');

    this.container.querySelector('#summary-rows').innerHTML = summaryHtml;
  }

  async handleConfirmBooking() {
    if (!localStorage.getItem('access_token')) {
      this.showError('Please log in to book.');
      setTimeout(() => location.href = 'index.html', 1500);
      return;
    }

    this.setLoadingState(true);

    const result = await createBooking(
      this.state.worker.id,
      this.state.worker.service.toLowerCase(),
      this.state.getScheduledAt(),
      this.state.formData.address,
      this.state.formData.description,
      this.state.formData.paymentMethod,
      parseFloat(this.state.formData.duration)
    );
    console.log('=== handleConfirmBooking Debug ===');
  console.log('result:', result);
  console.log('result.success:', result.success);
  console.log('result.booking:', result.booking);  // ← CHECK THIS!

    if (result.success) {
      this.showSuccessScreen(result.booking);
    } else {
      this.showError(result.error);
      this.setLoadingState(false);
    }
  }

  setLoadingState(isLoading) {
    this.elements.confirmBtn.innerHTML = isLoading ? '⏳ Submitting...' : '✅ Confirm Request';
    this.elements.confirmBtn.disabled = isLoading;
    this.elements.confirmBtn.style.opacity = isLoading ? '0.7' : '1';
  }

  showError(message) {
    this.elements.message.style.color = '#ef4444';
    this.elements.message.textContent = message;
  }

  showSuccessScreen(booking) {
    const successContent = TemplateRenderer.render('success-screen-template', {});
    
    // Fill in success data
    successContent.querySelector('[data-success="workerName"]').textContent = this.state.worker.name;
    successContent.querySelector('[data-success="datetime"]').textContent = 
      `${this.state.formData.date} at ${this.state.formData.time}`;
    
    this.container.querySelector('.card').innerHTML = '';
    this.container.querySelector('.card').appendChild(successContent);
    
    // Setup success screen handlers
    new SuccessScreenController(this.container, booking);
  }
}


// =====================================
// 5. SUCCESS SCREEN CONTROLLER
// =====================================
class SuccessScreenController {
  constructor(container, booking) {
    this.container = container;
    this.booking = booking;
    this.cancelTimeLeft = 10 * 60 * 1000;
    
    this.attachEventListeners();
    this.startCancelTimer();
  }

  attachEventListeners() {
    this.container.querySelector('#find-more-after-booking')?.addEventListener('click', () => {
      location.href = 'listing.html';
    });

    this.container.querySelector('#cancel-booking-btn')?.addEventListener('click', () => {
      this.handleCancel();
    });
  }

  startCancelTimer() {
    const cancelBtn = this.container.querySelector('#cancel-booking-btn');
    
    this.timerInterval = setInterval(() => {
      this.cancelTimeLeft -= 1000;
      
      if (this.cancelTimeLeft <= 0) {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancellation period expired';
        cancelBtn.style.background = '#ccc';
        clearInterval(this.timerInterval);
      } else {
        const minutes = Math.floor(this.cancelTimeLeft / 60000);
        const seconds = Math.floor((this.cancelTimeLeft % 60000) / 1000);
        cancelBtn.textContent = `Cancel Booking (${minutes}:${seconds.toString().padStart(2, '0')})`;
      }
    }, 1000);
  }

  async handleCancel() {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    const result = await cancelBooking(this.booking.id);
    
    if (result.success) {
      alert('Booking cancelled successfully.');
      location.href = 'customer-dashboard.html';
    } else {
      alert('Failed to cancel: ' + result.error);
    }
  }
}


// =====================================
// 6. MAIN CONTROLLER
// =====================================
class BookingController {
  constructor() {
    this.state = new BookingState();
    this.ui = null;
  }

  async init() {
    const workerId = new URLSearchParams(location.search).get('worker');
    const container = document.getElementById('booking-container');

    if (!workerId) {
      this.showError(container, 'Worker not specified. Redirecting...', 'home.html');
      return;
    }

    const worker = SKILLBRIDGE_DATA.workers.find(x => x.id == workerId);

    if (!worker) {
      this.showError(container, 'Worker not found. Redirecting...', 'listing.html');
      return;
    }

    this.state.setWorker(worker);
    this.ui = new BookingUI(container, this.state);
    this.ui.render();
  }

  showError(container, message, redirectUrl) {
    container.innerHTML = `<p>${message}</p>`;
    setTimeout(() => location.href = redirectUrl, 1400);
  }
}


// =====================================
// 7. AUTO-INITIALIZE
// =====================================
if (document.getElementById('booking-container')) {
  window.addEventListener('skillbridge-ready', async function() {
    const controller = new BookingController();
    await controller.init();
  });
}


// =====================================
// API FUNCTIONS (Keep existing)
// =====================================
function authHeaders() {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function createBooking(workerProfileId, serviceCategory, scheduledAt, address, description, paymentMethod, durationHrs) {
  try {
    const response = await fetch(CONFIG.API_BASE + '/bookings/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        worker_profile: workerProfileId,
        service_category: serviceCategory.toLowerCase(),
        scheduled_at: scheduledAt,
        service_address: address,
        description: description,
        payment_method: paymentMethod,
        estimated_duration_hrs: durationHrs,
      })
    });

    const data = await response.json();
    

    if (!response.ok) {
      throw new Error(data.detail || data.non_field_errors?.[0] || 'Booking failed');
    }

    return { success: true, booking: data };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function cancelBooking(bookingId, reason = '') {
  try {
    console.log('Cancelling booking with ID:', bookingId);
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