/**
 * footer.js - SkillBridge Footer System
 * Full footer on home.html only; compact footer everywhere else.
 */
(function () {
  const page = location.pathname.split('/').pop().toLowerCase();
  const isHome = (page === 'home.html' || page === '');


  // -------------------------------------------------------
  // MINIMAL FOOTER (Dashboard pages)
  // -------------------------------------------------------
  const minimalFooter = `
    <footer class="sb-footer-mini">
      <span>© 2026 SkillBridge. All rights reserved.</span>
      <div class="sb-footer-mini-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Support</a>
      </div>
    </footer>`;

  // -------------------------------------------------------
  // FULL FOOTER (Public pages)
  // -------------------------------------------------------
  const fullFooter = `
    <footer class="sb-footer-full" id="sb-footer">
      <div class="sb-footer-inner">

        <!-- Brand Column -->
        <div class="sb-footer-col sb-footer-brand">
          <div class="sb-footer-logo">
            <div class="sb-footer-logo-mark">SB</div>
            <span>SkillBridge</span>
          </div>
          <p class="sb-footer-tagline">Connecting skilled professionals with people who need them. Quality service, verified workers, guaranteed satisfaction.</p>
          <div class="sb-footer-social">
            <!-- Facebook -->
            <a href="#" aria-label="Facebook" class="sb-social-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <!-- Twitter/X -->
            <a href="#" aria-label="Twitter" class="sb-social-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
            </a>
            <!-- Instagram -->
            <a href="#" aria-label="Instagram" class="sb-social-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <!-- LinkedIn -->
            <a href="#" aria-label="LinkedIn" class="sb-social-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
          </div>
        </div>

        <!-- Company Column -->
        <div class="sb-footer-col">
          <h4 class="sb-footer-col-title">Company</h4>
          <ul class="sb-footer-links">
            <li><a href="#">About SkillBridge</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Blog & News</a></li>
            <li><a href="#">Press Kit</a></li>
          </ul>
        </div>

        <!-- Services Column -->
        <div class="sb-footer-col">
          <h4 class="sb-footer-col-title">Services</h4>
          <ul class="sb-footer-links">
            <li><a href="listing.html">Find Workers</a></li>
            <li><a href="worker-signup.html">Become a Worker</a></li>
            <li><a href="listing.html">Browse Categories</a></li>
            <li><a href="#">Request a Service</a></li>
          </ul>
        </div>

        <!-- Support Column -->
        <div class="sb-footer-col">
          <h4 class="sb-footer-col-title">Support</h4>
          <ul class="sb-footer-links">
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Contact Support</a></li>
            <li><a href="#">Safety Guidelines</a></li>
            <li><a href="#">Report an Issue</a></li>
          </ul>
        </div>

        <!-- Legal Column -->
        <div class="sb-footer-col">
          <h4 class="sb-footer-col-title">Legal</h4>
          <ul class="sb-footer-links">
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Cookie Policy</a></li>
            <li><a href="#">Disclaimer</a></li>
          </ul>
        </div>

      </div>

      <!-- Footer Bottom Bar -->
      <div class="sb-footer-bottom">
        <div class="sb-footer-bottom-inner">
          <span>© 2026 SkillBridge Platform. All rights reserved.</span>
          <span>Connecting skilled workers across Pakistan 🇵🇰</span>
        </div>
      </div>
    </footer>`;

  // Inject the appropriate footer
  document.body.insertAdjacentHTML('beforeend', isHome ? fullFooter : minimalFooter);
})();
