// /* =========================================================================
//    MODERN DASHBOARD NAVBAR LOGIC
//    ========================================================================= */

// document.addEventListener('DOMContentLoaded', () => {

//   // --- MOBILE MENUS ---
//   const mobileToggle = document.getElementById('mobile-toggle');
//   const navbarLinks = document.getElementById('navbar-links');
//   const mobileOverlay = document.getElementById('mobile-overlay');

//   function openMobileMenu() {
//     if(navbarLinks) navbarLinks.classList.add('mobile-open');
//     if(mobileOverlay) mobileOverlay.classList.add('active');
//     document.body.style.overflow = 'hidden';
//   }

//   function closeMobileMenu() {
//     if(navbarLinks) navbarLinks.classList.remove('mobile-open');
//     if(mobileOverlay) mobileOverlay.classList.remove('active');
//     document.body.style.overflow = '';
//   }

//   if(mobileToggle) mobileToggle.addEventListener('click', openMobileMenu);
//   if(mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);

//   // --- PROFILE DROPDOWN ---
//   const profileTrigger = document.getElementById('profile-trigger');
//   const profileMenu = document.getElementById('profile-menu');
  
//   if (profileTrigger && profileMenu) {
//     profileTrigger.addEventListener('click', (e) => {
//       e.stopPropagation();
//       profileMenu.classList.toggle('open');
//     });

//     // Close when clicking outside
//     document.addEventListener('click', (e) => {
//       if (!profileMenu.contains(e.target) && !profileTrigger.contains(e.target)) {
//         profileMenu.classList.remove('open');
//       }
//     });
//   }

//   // --- SPA SECTION NAVIGATION ---
//   const navItems = document.querySelectorAll('.nav-item');
//   const sections = document.querySelectorAll('.dashboard-section');

//   navItems.forEach(item => {
//     item.addEventListener('click', (e) => {
//       const targetId = item.getAttribute('data-target');
      
//       // If there is no data-target, allow default anchor behavior (href navigation)
//       if (!targetId) return;

//       e.preventDefault();

//       // Update Nav active states
//       navItems.forEach(nav => nav.classList.remove('active'));
//       item.classList.add('active');

//       // Update Sections
//       sections.forEach(sec => sec.classList.remove('active'));
//       const targetSec = document.getElementById(targetId);
//       if(targetSec) {
//         targetSec.classList.add('active');
//         // Trigger specific logic based on section
//         if (targetId === 'sec-saved' || targetId === 'sec-overview') renderSavedWorkers();
//       }

//       // Close mobile menu on click
//       closeMobileMenu();
//     });
//   });

//   // --- SAVED WORKERS LOGIC ---
//   function renderSavedWorkers() {
//     const mainList = document.getElementById('saved-workers-list');
//     const overviewList = document.getElementById('overview-saved-list');
    
//     const savedIds = JSON.parse(localStorage.getItem('savedWorkers') || '[]');
//     const workers = (typeof SKILLBRIDGE_DATA !== 'undefined') ? SKILLBRIDGE_DATA.workers.filter(w => savedIds.includes(w.id)) : [];

//     // Render Main List
//     if (mainList) {
//       if (workers.length === 0) {
//         mainList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--muted);">No saved workers yet. Browse the listing to save professionals!</div>';
//       } else {
//         mainList.innerHTML = workers.map(w => `
//           <div class="card" style="padding: 24px; text-align:center; position:relative; border:1px solid var(--border); transition: transform 0.2s, box-shadow 0.2s;">
//             <button onclick="removeSavedWorker(${w.id})" style="position:absolute; top:12px; right:12px; background:none; border:none; cursor:pointer; color:#ef4444; font-size:18px; opacity:0.6; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="Remove">✕</button>
//             <div style="width: 100px; height: 100px; margin: 0 auto 16px; border-radius: 50%; padding: 4px; background: var(--border);">
//               <img src="${w.photo}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
//             </div>
//             <h3 style="margin:0 0 4px; font-size:18px; color:var(--text);">${w.name}</h3>
//             <p style="color:var(--muted); font-size:14px; margin:0 0 16px;">${w.service}</p>
//             <div style="font-size:14px; margin-bottom:16px; font-weight:600; color:var(--text);">⭐ ${w.rating} • ${w.experience} yrs exp</div>
//             <a href="profile.html?worker=${w.id}" class="btn outline" style="width:100%; border-radius:8px; display:inline-block; text-decoration:none; font-size:14px;">View Profile</a>
//           </div>
//         `).join('');
//       }
//     }

//     // Render Overview Preview (max 4)
//     if (overviewList) {
//       if (workers.length === 0) {
//         overviewList.innerHTML = '<p class="muted" style="grid-column: 1/-1; padding: 20px; text-align:center;">No saved workers yet.</p>';
//       } else {
//         overviewList.innerHTML = workers.slice(0, 4).map(w => `
//           <div style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--surface); border:1px solid var(--border); border-radius:12px; transition: all 0.2s;" onmouseover="this.style.background='var(--dropdown-hover)'" onmouseout="this.style.background='var(--surface)'">
//             <img src="${w.photo}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--border);">
//             <div style="flex:1">
//                <div style="font-weight:600; font-size:14px; color:var(--text);">${w.name}</div>
//                <div style="font-size:12px; color:var(--muted);">${w.service}</div>
//             </div>
//             <a href="profile.html?worker=${w.id}" style="font-size:18px; text-decoration:none; color:var(--primary); transition: transform 0.2s;" onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">→</a>
//           </div>
//         `).join('');
//       }
//     }
//   }

//   window.removeSavedWorker = function(id) {
//      let saved = JSON.parse(localStorage.getItem('savedWorkers') || '[]');
//      saved = saved.filter(item => item !== id);
//      localStorage.setItem('savedWorkers', JSON.stringify(saved));
//      renderSavedWorkers();
//   };

//   // Initial render if section is active (e.g. on direct link or reload)
//   if (document.getElementById('sec-saved')?.classList.contains('active') || document.getElementById('sec-overview')?.classList.contains('active')) {
//     renderSavedWorkers();
//   }

// });

// /* =========================================================================
//    DYNAMIC NAVBAR ROLE ROUTING (For Shared Pages like Home)
//    ========================================================================= */

// document.addEventListener('DOMContentLoaded', () => {
//   const currentRole = localStorage.getItem('user_role'); // 'worker' or 'customer' or null

//   // If we are on the Home page (or any shared public page)
//   // We want to update the links and the profile dropdown to match their role.
//   const isPublicPage = window.location.pathname.includes('home.html') || window.location.pathname.includes('listing.html') || window.location.pathname.endsWith('/');

//   if (isPublicPage) {
//     const navLinksContainer = document.getElementById('navbar-links');
//     const profileMenu = document.getElementById('profile-menu');
//     const profileTriggerImg = document.querySelector('#profile-trigger img');
//     const authActionsContainers = document.querySelectorAll('.navbar-actions'); // Might need to swap out the whole right side if logged out

//     if (!currentRole) {
//       // LOGGED OUT STATE
//       // We can hide the notification bell and profile, and show Login/Signup on public pages
//       authActionsContainers.forEach(container => {
//         container.innerHTML = `
//           <a href="index.html" class="btn outline" style="padding:8px 16px;font-size:14px;border-color:var(--border);color:var(--text)">Log In</a>
//           <a href="index.html" class="btn gradient" style="padding:8px 16px;font-size:14px">Sign Up</a>
//           <!-- Mobile Hamburger Toggle -->
//           <button class="mobile-toggle" id="mobile-toggle">
//             <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
//           </button>
//         `;
//       });
      
//       // Re-attach mobile toggle listener since we overwrote the DOM
//       const newToggle = document.getElementById('mobile-toggle');
//       if(newToggle) {
//         newToggle.addEventListener('click', () => {
//             const nl = document.getElementById('navbar-links');
//             const mo = document.getElementById('mobile-overlay');
//             if(nl) nl.classList.add('mobile-open');
//             if(mo) mo.classList.add('active');
//             document.body.style.overflow = 'hidden';
//         });
//       }

//     } else if (currentRole === 'worker') {
//       // LOGGED IN AS WORKER
//       if (navLinksContainer) {
//         navLinksContainer.innerHTML = `
//           <a class="nav-item ${window.location.pathname.includes('home.html') ? 'active' : ''}" href="home.html">Home</a>
//           <a class="nav-item" href="worker-dashboard.html">Dashboard</a>
//           <a class="nav-item" href="worker-dashboard.html">Job Requests</a>
//           <a class="nav-item" href="worker-dashboard.html">My Jobs</a>
//         `;
//       }
      
//       if (profileMenu) {
//         profileMenu.innerHTML = `
//           <div class="dropdown-header">
//             <div class="dropdown-name">Hassan Raza</div>
//             <div class="dropdown-role" style="color:var(--primary);font-weight:600">Verified Worker</div>
//           </div>
//           <a class="dropdown-item" href="worker-dashboard.html">
//             <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
//             My Profile
//           </a>
//           <a class="dropdown-item" href="#" onclick="localStorage.removeItem('userRole'); location.href='index.html';" style="color: #ef4444;">
//             <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
//             Log Out
//           </a>
//         `;
//       }

//       if (profileTriggerImg) {
//         profileTriggerImg.src = "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=100&auto=format&fit=crop";
//       }

//     } else if (currentRole === 'customer') {
//       // LOGGED IN AS CUSTOMER
//       if (navLinksContainer) {
//         navLinksContainer.innerHTML = `
//           <a class="nav-item ${window.location.pathname.includes('home.html') ? 'active' : ''}" href="home.html">Home</a>
//           <a class="nav-item" href="customer-dashboard.html">Overview</a>
//           <a class="nav-item" href="listing.html">Find Workers</a>
//           <a class="nav-item" href="customer-dashboard.html">My Bookings</a>
//         `;
//       }

//       if (profileMenu) {
//         profileMenu.innerHTML = `
//           <div class="dropdown-header">
//             <div class="dropdown-name">Alex Johnson</div>
//             <div class="dropdown-role">Customer Account</div>
//           </div>
//           <a class="dropdown-item" href="customer-dashboard.html">
//             <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
//             My Profile
//           </a>
//           <a class="dropdown-item" href="#" onclick="localStorage.removeItem('user_role'); location.href='index.html';" style="color: #ef4444;">
//             <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
//             Log Out
//           </a>
//         `;
//       }
//     }
//   }

//   // Handle Logout clicks across the entire site
//   const logoutButtons = document.querySelectorAll('a[href="index.html"]');
//   logoutButtons.forEach(btn => {
//     // Only hit this on explicit logout buttons (by text content, or ones in dropdowns)
//     if(btn.textContent.includes('Log Out') || btn.classList.contains('logout')) {
//       btn.addEventListener('click', () => {
    
//         handleSessionExpiry();
//       });
//     }
//   });

// });
// function handleSessionExpiry() {
//     localStorage.removeItem('access_token');
//     localStorage.removeItem('refresh_token');
//     localStorage.removeItem('user');
//     localStorage.removeItem('user_role');
//     localStorage.removeItem('first_name');
//     localStorage.removeItem('last_name');
//     window.location.href = 'index.html';
// }
