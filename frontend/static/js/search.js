/**
 * search.js
 * Universal search logic for SkillBridge navbar and home page
 */
(function() {
    function setupSearch(inputId, dropdownId) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);

        if (!input || !dropdown) return;

        input.addEventListener('input', () => {
            const val = input.value.toLowerCase().trim();
            if (val.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            if (typeof SKILLBRIDGE_DATA === 'undefined') return;

            const matches = SKILLBRIDGE_DATA.workers.filter(w =>
                w.name.toLowerCase().includes(val) ||
                w.service.toLowerCase().includes(val)
            ).slice(0, 5);

            if (matches.length > 0) {
                dropdown.innerHTML = matches.map(w => `
                    <a href="profile.html?worker=${w.id}" class="search-item">
                        <img src="${w.photo}" alt="${w.name}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                        <div class="info">
                            <div class="name" style="font-weight:600; font-size:14px; color:var(--text);">${w.name}</div>
                            <div class="sub" style="font-size:12px; color:var(--muted);">${w.service}</div>
                        </div>
                    </a>
                `).join('');
                dropdown.classList.add('show');
            } else {
                dropdown.classList.remove('show');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    // Setup navbar search (all pages)
    setupSearch('nav-search-input', 'nav-search-dropdown');
    
    // Setup home specific search
    setupSearch('home-search-input', 'search-dropdown');
})();
// ===== ADD THIS AT THE END OF session.js =====

// Adjust navbar formatting based on role
function adjustNavbarFormatting() {
  const role = localStorage.getItem('user_role');
  const navLinks = document.querySelector('.navbar-links');
  
  if (!navLinks) return;

  // Add CSS to handle different content widths
  const style = document.createElement('style');
  
  if (role === 'worker') {
    // Worker has longer tab names
    style.textContent = `
      .navbar-links {
        gap: 8px !important;
        overflow-x: auto !important;
        scrollbar-width: none;
      }
      .navbar-links::-webkit-scrollbar {
        display: none;
      }
      .nav-item {
        padding: 0 10px !important;
        font-size: 13px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
      }
    `;
  } else {
    // Guest/Customer - normal spacing
    style.textContent = `
      .navbar-links {
        gap: 24px !important;
      }
      .nav-item {
        padding: 0 16px !important;
        font-size: 15px !important;
      }
    `;
  }
  
  document.head.appendChild(style);
}

// Call this after navbar is built
setTimeout(() => {
  adjustNavbarFormatting();
}, 100);