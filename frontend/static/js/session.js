/**
 * =========================================================================
 * SESSION.JS — SkillBridge UI State Manager
 *
 * Handles:
 * 1. Role-based redirects (workers go to dashboard, not home)
 * 2. Navbar links (different for guest/customer/worker)
 * 3. Profile dropdown (name, role, menu items)
 * 4. Profile avatar (shows uploaded photo or initials)
 * 5. Interactions (dropdown toggle, mobile menu, logout)
 *
 * NOTE: worker-dashboard.html manages its own navbar entirely.
 * Session.js skips buildNavbarLinks + buildProfileDropdown on that page
 * to avoid conflicts with worker-dashboard.js.
 * =========================================================================
 */

(function () {

  const role              = localStorage.getItem('user_role');
  const isWorkerDashboard = window.location.pathname.includes('worker-dashboard');

  // ─────────────────────────────────────────────────────────────
  // HELPER: get server base from CONFIG (safe fallback)
  // ─────────────────────────────────────────────────────────────
  function getBase() {
    return (typeof CONFIG !== 'undefined' && CONFIG.SERVER_BASE)
      ? CONFIG.SERVER_BASE
      : 'http://127.0.0.1:8000';
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: HANDLE REDIRECTS
  // ═══════════════════════════════════════════════════════════════

  function handleRedirects() {
    const currentPath = window.location.pathname;
    const isHomePage  = currentPath.includes('home.html') || currentPath.endsWith('/');
    if (role === 'worker' && isHomePage) {
      window.location.href = 'worker-dashboard.html';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: BUILD NAVBAR LINKS
  // Skipped on worker-dashboard — that page manages its own navbar
  // ═══════════════════════════════════════════════════════════════

  function buildNavbarLinks() {
    const nav = document.querySelector('.navbar-links');
    if (!nav) return;

    const currentPath = window.location.pathname;
    const isActive    = (pageName) => currentPath.includes(pageName) ? 'active' : '';

    let html = '';

    if (!role) {
      html = `
        <a class="nav-item ${isActive('home.html')}"     href="home.html">Home</a>
        <a class="nav-item ${isActive('services.html')}" href="services.html">Services</a>
        <a class="nav-item ${isActive('listing.html')}"  href="listing.html">Workers</a>
        <a class="nav-item ${isActive('contact.html')}"  href="contact.html">Contact</a>
      `;
    } else if (role === 'customer') {
      html = `
        <a class="nav-item ${isActive('home.html')}"               href="home.html">Home</a>
        <a class="nav-item ${isActive('services.html')}"           href="services.html">Services</a>
        <a class="nav-item ${isActive('listing.html')}"            href="listing.html">Workers</a>
        <a class="nav-item ${isActive('customer-dashboard.html')}" href="customer-dashboard.html">My Bookings</a>
        <a class="nav-item ${isActive('contact.html')}"            href="contact.html">Contact</a>
      `;
    } else if (role === 'worker') {
      html = `
        <a class="nav-item" href="worker-dashboard.html">← Dashboard</a>
      `;
    }

    nav.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: BUILD PROFILE DROPDOWN
  // Skipped on worker-dashboard — that page manages its own dropdown
  // ═══════════════════════════════════════════════════════════════

  function buildProfileDropdown() {
    const profileContainer = document.querySelector('.profile-dropdown-container');
    if (!profileContainer) return;

    if (!role) {
      profileContainer.outerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <a href="index.html"          class="btn outline"  style="padding:8px 16px;font-size:14px;">Log In</a>
          <a href="role-selection.html" class="btn gradient" style="padding:8px 16px;font-size:14px;">Sign Up</a>
        </div>`;
      return;
    }

    const firstName = localStorage.getItem('first_name') || 'User';
    const lastName  = localStorage.getItem('last_name')  || '';
    const fullName  = `${firstName} ${lastName}`.trim();
    const roleLabel = role === 'customer' ? 'Customer Account' : 'Verified Worker';

    let menuItems = '';

    if (role === 'customer') {
      menuItems = `
        <a class="dropdown-item" href="customer-dashboard.html">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          My Bookings
        </a>
        <a class="dropdown-item" href="#" id="open-chatbot-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          AI Assistant ✨
        </a>`;
    } else if (role === 'worker') {
      menuItems = `
        <a class="dropdown-item" href="update-profile.html">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Update Profile
        </a>`;
    }

    const dropdownHTML = `
      <div class="profile-dropdown-container">
        <div class="profile-trigger" id="profile-trigger">
          <img id="session-avatar-img" src="../static/images/default-avatar.png"
            class="user-avatar" alt="Avatar"
            style="object-fit:cover"
            onerror="this.style.display='none';document.getElementById('session-avatar-initials').style.display='flex'">
          <div id="session-avatar-initials" class="user-avatar"
            style="display:none;background:var(--primary);color:#fff;font-weight:700;font-size:14px;align-items:center;justify-content:center">
            ${firstName.charAt(0).toUpperCase()}${(lastName.charAt(0)||'').toUpperCase()}
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted)">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div class="profile-menu" id="profile-menu">
          <div class="dropdown-header">
            <div class="dropdown-name">${fullName}</div>
            <div class="dropdown-role" ${role === 'worker' ? 'style="color:var(--primary);font-weight:600"' : ''}>
              ${roleLabel}
            </div>
          </div>
          ${menuItems}
          <a class="dropdown-item danger" href="#" id="logout-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log Out
          </a>
        </div>
      </div>`;

    profileContainer.outerHTML = dropdownHTML;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: UPDATE PROFILE AVATAR
  // Uses CONFIG.SERVER_BASE (not hardcoded URL)
  // ═══════════════════════════════════════════════════════════════

  function updateProfileAvatar() {
    // Target the img built by buildProfileDropdown (or already in DOM for worker-dashboard)
    const img = document.getElementById('session-avatar-img')
              || document.querySelector('.profile-trigger img.user-avatar');
    if (!img) return;

    const photoPath = localStorage.getItem('profile_photo_url');

    if (photoPath) {
      img.src = `${getBase()}${photoPath}`;
    } else if (role === 'customer') {
      img.src = '../static/images/customer.jpeg';
    } else {
      img.src = '../static/images/default-avatar.png';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: WIRE UP INTERACTIONS
  // ═══════════════════════════════════════════════════════════════

  function initProfileDropdown() {
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

  function initMobileMenu() {
    const toggle  = document.getElementById('mobile-toggle');
    const nav     = document.getElementById('navbar-links');
    const overlay = document.getElementById('mobile-overlay');
    if (!toggle || !nav) return;

    const openMenu = () => {
      // Support both class names used across pages
      nav.classList.add('open');
      nav.classList.add('mobile-open');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      nav.classList.remove('open');
      nav.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    window._closeMobileMenu = closeMenu;
  }

  function wireOpenChatbot() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#open-chatbot-btn');
      if (btn) {
        e.preventDefault();
        document.getElementById('profile-menu')?.classList.remove('open');
        // Open Bridget chatbot bubble
        const bubble = document.getElementById('sb-bubble');
        if (bubble) {
          bubble.click();
        }
      }
    });
  }

  function wireLogout() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#logout-btn, .logout-btn, #dd-logout');
      if (btn) {
        e.preventDefault();
        localStorage.removeItem('user_role');
        localStorage.removeItem('first_name');
        localStorage.removeItem('last_name');
        localStorage.removeItem('profile_photo_url');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('worker_profile_id');
        window.location.href = 'index.html';
      }
    });
  }

  function wireDropdownItemClose() {
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item:not(.danger)');
      if (item) {
        document.getElementById('profile-menu')?.classList.remove('open');
      }
    });
  }

  // Wire worker Settings/Portfolio links to SPA tabs (only on worker-dashboard)
  function wireWorkerDropdownLinks() {
    if (role !== 'worker' || !isWorkerDashboard) return;

    document.addEventListener('click', (e) => {
      const ddSettings = e.target.closest('#dd-settings');
      if (ddSettings) {
        e.preventDefault();
        if (typeof switchTab === 'function') switchTab('sec-settings');
        document.getElementById('profile-menu')?.classList.remove('open');
      }
      const ddPortfolio = e.target.closest('#dd-portfolio');
      if (ddPortfolio) {
        e.preventDefault();
        location.href = 'update-profile.html#portfolio';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', () => {
    handleRedirects();

    // SKIP navbar/dropdown rebuild on worker-dashboard — it manages its own
    if (!isWorkerDashboard) {
      buildNavbarLinks();
      buildProfileDropdown();
    }

    updateProfileAvatar();
    initProfileDropdown();
    initMobileMenu();
    wireLogout();
    wireDropdownItemClose();
    wireOpenChatbot();
    wireWorkerDropdownLinks();
  });

})();