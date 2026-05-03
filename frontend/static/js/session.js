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
 * =========================================================================
 */

(function () {

  // Get the logged-in user's role from localStorage
  const role = localStorage.getItem('user_role'); // 'customer' | 'worker' | null

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1: HANDLE REDIRECTS
  // ═══════════════════════════════════════════════════════════════════════

  function handleRedirects() {
    const currentPath = window.location.pathname;
    const isHomePage = currentPath.includes('home.html') || currentPath.endsWith('/');

    // If a WORKER visits home.html, send them to their dashboard instead
    if (role === 'worker' && isHomePage) {
      window.location.href = 'worker-dashboard.html';
      return; // Stop executing the rest of session.js
    }

    // Guests and customers can stay on home.html
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: BUILD NAVBAR LINKS
  // ═══════════════════════════════════════════════════════════════════════

  function buildNavbarLinks() {
    const nav = document.querySelector('.navbar-links');
    if (!nav) return;

    const currentPath = window.location.pathname;
    const isActive = (pageName) => currentPath.includes(pageName) ? 'active' : '';

    let html = '';

    if (!role) {
      // GUEST
      html = `
        <a class="nav-item ${isActive('home.html')}" href="home.html">Home</a>
        <a class="nav-item ${isActive('services.html')}" href="services.html">Services</a>
        <a class="nav-item ${isActive('listing.html')}" href="listing.html">Workers</a>
        <a class="nav-item ${isActive('contact.html')}" href="contact.html">Contact</a>
      `;
    }
    else if (role === 'customer') {
      // CUSTOMER
      html = `
        <a class="nav-item ${isActive('home.html')}" href="home.html">Home</a>
        <a class="nav-item ${isActive('services.html')}" href="services.html">Services</a>
        <a class="nav-item ${isActive('listing.html')}" href="listing.html">Workers</a>
        <a class="nav-item ${isActive('customer-dashboard.html')}" href="customer-dashboard.html">My Bookings</a>
        <a class="nav-item ${isActive('contact.html')}" href="contact.html">Contact</a>
      `;
    }
    else if (role === 'worker') {
      // WORKER — SPA tabs with data-target for in-page navigation
      // switchTab() in worker-dashboard.js handles the clicks
      html = `
        <a class="nav-item active" data-target="sec-overview">Dashboard</a>
        <a class="nav-item" data-target="sec-jobs">Active Jobs</a>
        <a class="nav-item" data-target="sec-portfolio">Portfolio</a>
        <a class="nav-item" data-target="sec-earnings">Earnings</a>
        <a class="nav-item" data-target="sec-reviews">Reviews</a>
      `;
    }

    nav.innerHTML = html;

    // Wire up worker SPA tab clicks AFTER setting innerHTML
    if (role === 'worker') {
      nav.querySelectorAll('.nav-item[data-target]').forEach(item => {
        item.style.cursor = 'pointer';
        item.onclick = () => {
          if (typeof switchTab === 'function') switchTab(item.dataset.target);
        };
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3: BUILD PROFILE DROPDOWN
  // ═══════════════════════════════════════════════════════════════════════

  function buildProfileDropdown() {
    const profileContainer = document.querySelector('.profile-dropdown-container');
    if (!profileContainer) return;

    if (!role) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // GUEST — Show Login/Signup buttons instead
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      profileContainer.outerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <a href="index.html" class="btn outline" style="padding:8px 16px;font-size:14px;">Log In</a>
          <a href="role-selection.html" class="btn gradient" style="padding:8px 16px;font-size:14px;">Sign Up</a>
        </div>`;
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // LOGGED IN — Build dropdown (customer or worker)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const firstName = localStorage.getItem('first_name') || 'User';
    const lastName = localStorage.getItem('last_name') || '';
    const fullName = `${firstName} ${lastName}`.trim();

    // Determine role label
    const roleLabel = role === 'customer' 
      ? 'Customer Account' 
      : 'Verified Worker';

    // Build the menu items based on role
    let menuItems = '';

    if (role === 'customer') {
      menuItems = `
        <a class="dropdown-item" data-target="sec-settings" href="javascript:void(0)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </a>
      `;
    } 
    else if (role === 'worker') {
      menuItems = `
        <a class="dropdown-item" data-target="sec-settings" href="javascript:void(0)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </a>
      `;
    }

    // Build final dropdown HTML
    const dropdownHTML = `
      <div class="profile-dropdown-container">
        <div class="profile-trigger" id="profile-trigger">
          <img src="../static/images/sohaib.jpeg" class="user-avatar" alt="Avatar" 
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="user-avatar-initials" style="display:none" id="avatar-fallback">
            ${firstName.charAt(0)}${lastName.charAt(0) || ''}
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(255,255,255,0.7)" 
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div class="profile-menu" id="profile-menu">
          <div class="dropdown-header">
            <div class="dropdown-name">${fullName}</div>
            <div class="dropdown-role" ${role === 'worker' ? 'style="color:var(--brand);font-weight:600"' : ''}>
              ${roleLabel}
            </div>
          </div>
          ${menuItems}
          <a class="dropdown-item danger" href="#" id="logout-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log Out
          </a>
        </div>
      </div>
    `;

    profileContainer.outerHTML = dropdownHTML;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4: UPDATE PROFILE AVATAR
  // ═══════════════════════════════════════════════════════════════════════

  function updateProfileAvatar() {
    const img = document.querySelector('.profile-trigger img');
    if (!img) return;

    const photoPath = localStorage.getItem('profile_photo_url');

    // Determine which avatar to use
    let avatarUrl = '../static/images/default-avatar.png'; // fallback

    if (role === 'worker' && photoPath) {
      // Worker with uploaded photo
      avatarUrl = `http://127.0.0.1:8000${photoPath}`;
    } else if (role === 'customer') {
      avatarUrl = '../static/images/customer.jpeg';
    } else if (role === 'worker') {
      avatarUrl = '../static/images/default-avatar.png';
    }

    img.src = avatarUrl;
    img.alt = role === 'customer' ? 'Customer Avatar' : role === 'worker' ? 'Worker Avatar' : 'User Avatar';
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5: WIRE UP INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  // ── Profile dropdown toggle ──
  function initProfileDropdown() {
    const trigger = document.getElementById('profile-trigger');
    const menu = document.getElementById('profile-menu');

    if (!trigger || !menu) return;

    // Toggle dropdown on click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }

  // ── Mobile menu toggle ──
  function initMobileMenu() {
    const toggle = document.getElementById('mobile-toggle');
    const nav = document.getElementById('navbar-links');
    const overlay = document.getElementById('mobile-overlay');

    if (!toggle || !nav) return;

    const openMenu = () => {
      nav.classList.add('open');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      nav.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Expose closeMenu globally so other scripts can use it
    window._closeMobileMenu = closeMenu;
  }

  // ── Logout handler ──
  function wireLogout() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#logout-btn, .logout-btn');
      if (btn) {
        e.preventDefault();
        localStorage.removeItem('user_role');
        localStorage.removeItem('first_name');
        localStorage.removeItem('last_name');
        localStorage.removeItem('profile_photo_url');
        window.location.href = 'index.html';
      }
    });
  }

  // ── Close dropdown when clicking menu items ──
  function wireDropdownItemClose() {
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item:not(.danger)');
      if (item) {
        const menu = document.getElementById('profile-menu');
        if (menu) menu.classList.remove('open');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', () => {
    // Step 1: Handle redirects FIRST (before building UI)
    handleRedirects();

    // Step 2: Build UI based on role
    buildNavbarLinks();
    buildProfileDropdown();

    // Step 3: Update avatar
    updateProfileAvatar();

    // Step 4: Wire up all interactions
    initProfileDropdown();
    initMobileMenu();
    wireLogout();
    wireDropdownItemClose();
  });

})();