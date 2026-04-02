/* =========================================================================
   SESSION.JS — SkillBridge UI State Manager
   Reads `user_role` from localStorage ('customer', 'worker', or null)
   and updates the entire page UI accordingly.
   ========================================================================= */

(function () {

  const role = localStorage.getItem('user_role'); // 'customer' | 'worker' | null

  // -----------------------------------------------------------------------
  // GUEST — not logged in
  // -----------------------------------------------------------------------
  function applyGuestUI() {
    // Replace profile dropdown area with Login / Sign Up buttons
    const profileContainer = document.querySelector('.profile-dropdown-container');
    if (profileContainer) {
      profileContainer.outerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <a href="index.html" class="btn outline" style="padding:8px 16px;font-size:14px;">Log In</a>
          <a href="role-selection.html" class="btn gradient" style="padding:8px 16px;font-size:14px;">Sign Up</a>
        </div>`;
    }

    // Rebuild navbar links for public pages
    const nav = document.getElementById('navbar-links');
    if (nav) {
      const p = window.location.pathname;
      nav.innerHTML = `
        <a class="nav-item ${p.includes('home.html')     ? 'active' : ''}" href="home.html">Home</a>
        <a class="nav-item ${p.includes('services.html') ? 'active' : ''}" href="services.html">Services</a>
        <a class="nav-item ${p.includes('listing.html')  ? 'active' : ''}" href="listing.html">Workers</a>
        <a class="nav-item ${p.includes('contact.html')  ? 'active' : ''}" href="contact.html">Contact</a>`;
    }
  }

  // -----------------------------------------------------------------------
  // CUSTOMER — logged in as customer
  // -----------------------------------------------------------------------
  function applyCustomerUI() {
    const p = window.location.pathname;

    // Navbar links
    const nav = document.getElementById('navbar-links');
    if (nav) {
      nav.innerHTML = `
        <a class="nav-item ${p.includes('home.html')               ? 'active' : ''}" href="home.html">Home</a>
        <a class="nav-item ${p.includes('services.html')           ? 'active' : ''}" href="services.html">Services</a>
        <a class="nav-item ${p.includes('listing.html')            ? 'active' : ''}" href="listing.html">Workers</a>
        <a class="nav-item ${p.includes('customer-dashboard.html') ? 'active' : ''}" href="customer-dashboard.html">My Bookings</a>
        <a class="nav-item ${p.includes('contact.html')            ? 'active' : ''}" href="contact.html">Contact</a>`;
    }

    // Profile dropdown menu
    const menu = document.getElementById('profile-menu');
    if (menu) {
      menu.innerHTML = `
        <div class="dropdown-header">
          <div class="dropdown-name">${localStorage.getItem('first_name') } ${localStorage.getItem('last_name') }</div>
          <div class="dropdown-role">Customer Account</div>
        </div>
        <a class="dropdown-item" href="customer-dashboard.html">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Dashboard
        </a>
        <a class="dropdown-item" href="listing.html">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          Find Workers
        </a>
        <a class="dropdown-item danger" href="#" id="logout-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Log Out
        </a>`;
    }
  }

  // -----------------------------------------------------------------------
  // WORKER — logged in as worker
  // -----------------------------------------------------------------------
  function applyWorkerUI() {
    const p = window.location.pathname;

    // Navbar links
    const nav = document.getElementById('navbar-links');
    if (nav) {
      nav.innerHTML = `
        <a class="nav-item ${p.includes('home.html')             ? 'active' : ''}" href="home.html">Home</a>
        <a class="nav-item ${p.includes('worker-dashboard.html') ? 'active' : ''}" href="worker-dashboard.html">Dashboard</a>
        <a class="nav-item" href="worker-dashboard.html">Job Requests</a>
        <a class="nav-item" href="worker-dashboard.html">My Jobs</a>
        <a class="nav-item" href="worker-dashboard.html">Earnings</a>`;
    }

    // Profile dropdown menu
    const menu = document.getElementById('profile-menu');
    if (menu) {
      menu.innerHTML = `
        <div class="dropdown-header">
          <div class="dropdown-name">${localStorage.getItem('first_name') } ${localStorage.getItem('last_name') }</div>
          <div class="dropdown-role" style="color:var(--primary);font-weight:600">Worker Account</div>
        </div>
        <a class="dropdown-item" href="worker-dashboard.html">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
          Dashboard
        </a>
        <a class="dropdown-item" href="worker-dashboard.html">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          My Profile
        </a>
        <a class="dropdown-item danger" href="#" id="logout-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Log Out
        </a>`;
    }
  }

  // -----------------------------------------------------------------------
  // LOGOUT
  // -----------------------------------------------------------------------
  function wireLogout() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#logout-btn, .logout-btn');
      if (btn) {
        e.preventDefault();
        localStorage.removeItem('user_role');
        window.location.href = 'index.html';
      }
    });
  }

  // -----------------------------------------------------------------------
  // PROFILE DROPDOWN TOGGLE
  // -----------------------------------------------------------------------
  function initDropdown() {
    const trigger = document.getElementById('profile-trigger');
    const menu    = document.getElementById('profile-menu');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }

  // -----------------------------------------------------------------------
  // MOBILE MENU
  // -----------------------------------------------------------------------
  function initMobileMenu() {
    const toggle  = document.getElementById('mobile-toggle');
    const nav     = document.getElementById('navbar-links');
    const overlay = document.getElementById('mobile-overlay');

    const open  = () => { nav?.classList.add('mobile-open'); overlay?.classList.add('active'); document.body.style.overflow = 'hidden'; };
    const close = () => { nav?.classList.remove('mobile-open'); overlay?.classList.remove('active'); document.body.style.overflow = ''; };

    toggle?.addEventListener('click', open);
    overlay?.addEventListener('click', close);

    window._closeMobileMenu = close;
  }

  // -----------------------------------------------------------------------
  // PROFILE AVATAR
  // -----------------------------------------------------------------------
  function updateProfileAvatar(role) {
    const img = document.querySelector('.profile-trigger img');
    if (!img) return;

    const firstName = localStorage.getItem('first_name');
    const workerAvatar = firstName ? `../static/images/${firstName.toLowerCase()}.jpeg` : '../static/images/sohaib.jpeg';

    const avatars = {
      guest: 'https://i.pravatar.cc/150?img=68',
      customer: '../static/images/customer.jpeg',
      worker: workerAvatar
    };

    img.src = avatars[role] || avatars.guest;
    img.alt = role === 'guest' ? 'Guest Avatar' : `${role.charAt(0).toUpperCase() + role.slice(1)} Avatar`;
  }

  // -----------------------------------------------------------------------
  // SPA NAV (dashboard pages only)
  // -----------------------------------------------------------------------
  function initSPANav() {
    const items    = document.querySelectorAll('.nav-item[data-target]');
    const sections = document.querySelectorAll('.dashboard-section');
    if (!items.length) return;

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        const targetId = item.getAttribute('data-target');
        if (!targetId) return;
        e.preventDefault();

        items.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(targetId)?.classList.add('active');

        window._closeMobileMenu?.();
      });
    });
  }

  // -----------------------------------------------------------------------
  // BOOT
  // -----------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    if (!role)                    applyGuestUI();
    else if (role === 'customer') applyCustomerUI();
    else if (role === 'worker')   applyWorkerUI();

    updateProfileAvatar(role || 'guest');
    initDropdown();
    initMobileMenu();
    initSPANav();
    wireLogout();
  });

})();
