/**
 * FILE LOCATION: frontend/static/js/profile.js
 * Handles the worker profile page.
 * Waits for 'skillbridge-ready' event before rendering.
 * Worker ID is now a UUID string (not integer).
 */
// Helper: dateStr + timeStr → ISO string
// dateStr can be 'Today', 'Tomorrow', or 'YYYY-MM-DD'
// timeStr can be '09:00 AM' or '14:30'
function buildScheduledAt(dateStr, timeStr) {
  let date = new Date();
  if (dateStr === 'Tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (dateStr !== 'Today' && dateStr.includes('-')) {
    // Exact date
    date = new Date(dateStr + 'T00:00:00');
  }

  if (timeStr.includes(' ')) {
    // 12-hour format
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    date.setHours(hours, minutes, 0, 0);
  } else {
    // 24-hour format
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  }
  return date.toISOString();
}

// -------------------------------------------------------
// Only runs on profile page
// -------------------------------------------------------
if (document.getElementById('profile-container')) {

  window.addEventListener('skillbridge-ready', function () {

    // UUID from URL: profile.html?worker=e29a84ef-d79c-41a7-...
    const workerId  = new URLSearchParams(location.search).get('worker');
    const container = document.getElementById('profile-container');

    // No ID in URL
    if (!workerId) {
      container.innerHTML = '<p>Worker not specified. Redirecting...</p>';
      setTimeout(() => location.href = 'home.html', 1400);
      return;
    }

    // Find worker by UUID string (not parseInt)
    const w = SKILLBRIDGE_DATA.workers.find(x => x.id == workerId);

    // Worker not found
    if (!w) {
      container.innerHTML = '<p>Worker not found. Redirecting...</p>';
      setTimeout(() => location.href = 'listing.html', 1400);
      return;
    }

    // -------------------------------------------------------
    // Derived / enriched values
    // -------------------------------------------------------
    const completedJobs = w.experience * 15 + Math.floor(Math.random() * 50);
    const responseTime  = w.rating > 4.5 ? 'Under 1 hour' : 'Under 4 hours';
    const reviewsCount  = Math.floor(w.rating * 12 + Math.random() * 30);

    // Banner image based on service (correct path from templates/)
    const bannerBgUrl = w.service === 'Plumber'     ? '../static/images/plumbing.jpeg'
                      : w.service === 'Electrician' ? '../static/images/electrician.jpeg'
                      : w.service === 'Carpenter'   ? '../static/images/carpentry.jpeg'
                      :                               '../static/images/mechanic.jpeg';

    // -------------------------------------------------------
    // Service offerings per category
    // -------------------------------------------------------
    const specificServices =
      w.service === 'Plumber' ? [
        { name: 'Pipe Fitting',        price: 40,  icon: '🔧', desc: 'Expert pipe fitting for residential buildings with zero leakage guarantee.' },
        { name: 'Drain Cleaning',      price: 50,  icon: '💧', desc: 'Deep drain cleaning to resolve and prevent major water blockages.' },
        { name: 'Leak Repair',         price: 30,  icon: '🚿', desc: 'Fast turnaround leak repair for sinks, toilets, and showers.' },
        { name: 'Water Heater Install',price: 120, icon: '🔥', desc: 'Full installation and setup of new electric or gas water heaters.' }
      ] : w.service === 'Electrician' ? [
        { name: 'Wiring Setup',  price: 80,  icon: '🔌', desc: 'Complete home or office wiring setup according to safety standards.' },
        { name: 'Lighting Fix',  price: 40,  icon: '💡', desc: 'Repairing or installing new ambient light fixtures.' },
        { name: 'Panel Upgrade', price: 150, icon: '⚡', desc: 'Upgrading electrical panels to support modern heavy appliances.' }
      ] : w.service === 'Carpenter' ? [
        { name: 'Custom Furniture', price: 200, icon: '🪑', desc: 'Designing and building custom wooden furniture pieces.' },
        { name: 'Door Repair',      price: 40,  icon: '🚪', desc: 'Fixing hinges, locks, and frames for interior and exterior doors.' },
        { name: 'Wood Polishing',   price: 60,  icon: '✨', desc: 'Premium polishing to restore the original shine of wooden surfaces.' }
      ] : [
        { name: 'Engine Diagnostic', price: 60,  icon: '💻', desc: 'Full computer diagnostic of engine lights and performance.' },
        { name: 'Brake Repair',      price: 100, icon: '🛑', desc: 'Pad replacement and rotor resurfacing for maximum stopping power.' },
        { name: 'Oil Change',        price: 35,  icon: '🛢️', desc: 'Standard oil and filter change with premium synthetic blend.' },
        { name: 'Tire Rotation',     price: 25,  icon: '🛞', desc: 'Rotating and balancing tires for smooth driving.' }
      ];

    // -------------------------------------------------------
    // Portfolio images per category (Unsplash)
    // -------------------------------------------------------
    const portfolioImages =
      w.service === 'Plumber' ? [
        'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1607472586893-edb57cb31422?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517581177682-a085bc7fac7c?q=80&w=400&auto=format&fit=crop'
      ] : w.service === 'Electrician' ? [
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1544724569-5f546fd6f2b6?q=80&w=400&auto=format&fit=crop'
      ] : w.service === 'Carpenter' ? [
        'https://images.unsplash.com/photo-1505015920881-0f83c2f7c95e?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1610996884021-3d7788ea9b85?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1622372736851-2a1e3ce88825?q=80&w=400&auto=format&fit=crop'
      ] : [
        'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1503376710955-bfa345dbec6e?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=400&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=400&auto=format&fit=crop'
      ];

    // -------------------------------------------------------
    // Build HTML sections
    // -------------------------------------------------------
    const verifiedBadge = w.verified
      ? `<span style="color:#10b981;font-size:18px;margin-left:6px;display:inline-flex" title="Verified Professional">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
           </svg>
         </span>`
      : '';

    const certifications = [
      'Licensed ' + w.service + ' Professional',
      w.experience > 5 ? 'Master Craftsmanship' : 'Apprentice Graduate',
      'Background Checked by SkillBridge'
    ];

    const servicesHtml = specificServices.map(s => `
      <div class="card" style="padding:24px;border:1px solid var(--border);transition:transform 0.2s;">
        <div style="font-size:28px;margin-bottom:16px;width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:rgba(108,138,61,0.1);border-radius:12px;">
          ${s.icon}
        </div>
        <h4 style="margin:0 0 8px;font-size:18px;color:var(--text);">${s.name}</h4>
        <p style="color:var(--muted);font-size:14px;margin:0 0 16px;line-height:1.6">${s.desc}</p>
        <div style="color:var(--text);font-weight:700;font-size:16px;">Starting from Rs${s.price}</div>
      </div>
    `).join('');

    const portfolioHtml = portfolioImages.map((img, i) => `
      <div class="slider-card slider-portfolio">
        <img src="${img}" alt="Portfolio Work ${i + 1}" style="width:100%;height:200px;object-fit:cover;border-radius:8px 8px 0 0;">
        <div style="padding:16px;">
          <div style="font-weight:600;font-size:15px;margin-bottom:4px;">Project Showcase ${i + 1}</div>
          <div style="font-size:13px;color:var(--muted);">Completed ${(i + 1) * 2} weeks ago</div>
        </div>
      </div>
    `).join('');

    const reviewerAvatars = [
      'https://i.pravatar.cc/150?img=11',
      'https://i.pravatar.cc/150?img=32',
      'https://i.pravatar.cc/150?img=43'
    ];
    const reviewsHtml = [0, 1, 2].map(i => `
      <div class="slider-card slider-review">
        <div class="review-author" style="margin-bottom:12px;display:flex;align-items:center;gap:12px;">
          <img src="${reviewerAvatars[i]}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">
          <div>
            <div style="font-weight:600;font-size:15px;color:var(--text);">Satisfied Customer</div>
            <div style="font-size:13px;color:var(--muted);">Hired for ${w.service}</div>
          </div>
        </div>
        <div style="color:#f59e0b;margin-bottom:8px;">⭐⭐⭐⭐⭐ 5.0</div>
        <p style="margin:0 0 12px;font-size:14px;color:var(--text);line-height:1.6;font-style:italic;">
          "Excellent work! ${w.name.split(' ')[0]} was incredibly professional, communicated clearly,
          and solved the issue faster than expected. Highly recommended."
        </p>
        <div style="font-size:13px;color:var(--muted);font-weight:500;">Reviewed 2 weeks ago</div>
      </div>
    `).join('');

    const similarHtml = SKILLBRIDGE_DATA.workers
      .filter(x => x.service === w.service && x.id !== w.id)
      .slice(0, 4)
      .map(sw => `
        <div class="card" style="padding:20px;text-align:center;border:1px solid var(--border);transition:transform 0.2s;"
             onmouseover="this.style.transform='translateY(-4px)'"
             onmouseout="this.style.transform='translateY(0)'">
          <img src="${sw.photo || 'https://i.pravatar.cc/150?u=' + sw.id}"
               style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:16px;"
               onerror="this.src='https://i.pravatar.cc/150?u=${sw.id}'">
          <h4 style="margin:0 0 6px;font-size:16px;color:var(--text);">${sw.name}</h4>
          <div style="font-size:14px;color:var(--muted);margin-bottom:12px;">⭐ ${sw.rating} (${sw.experience} yrs)</div>
          <a href="profile.html?worker=${sw.id}" class="btn outline" style="padding:8px 16px;font-size:14px;">View Profile</a>
        </div>
      `).join('');

    // -------------------------------------------------------
    // Inject full profile HTML
    // -------------------------------------------------------
    container.innerHTML = `
      <div style="display:flex;justify-content:center;width:100%;">
        <div class="profile-main-content" style="max-width:900px;width:100%;">

          <!-- Banner + Avatar + Info Card -->
          <div class="card" style="padding:0;overflow:hidden;border:1px solid var(--border);margin-bottom:24px;">
            <div style="height:220px;width:100%;background:url('${bannerBgUrl}') center/cover no-repeat;"></div>

            <div style="padding:0 32px 32px 32px;position:relative;">
              <!-- Avatar + Action Buttons -->
              <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:-64px;margin-bottom:16px;flex-wrap:wrap;gap:16px;">
                <div style="background:var(--card);padding:6px;border-radius:50%;display:inline-block;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                  <img src="${w.photo || 'https://i.pravatar.cc/150?u=' + w.id}"
                       style="width:140px;height:140px;border-radius:50%;object-fit:cover;border:1px solid var(--border);"
                       onerror="this.src='https://i.pravatar.cc/150?u=${w.id}'">
                </div>
                <div style="display:flex;gap:12px;margin-bottom:12px;">
                  <button id="btn-save-worker" class="btn outline"
                    style="padding:10px 24px;font-size:14px;width:auto;border-radius:8px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <span style="color:#aaa;">🤍</span> Save
                  </button>
                  <button class="btn outline"
                    style="padding:10px 24px;font-size:14px;width:auto;border-radius:8px;font-weight:600;cursor:pointer;">
                    Message
                  </button>
                  <button class="btn outline"
                    style="padding:10px 24px;font-size:14px;width:auto;border-radius:8px;font-weight:600;cursor:pointer;"
                    onclick="location.href='review.html?worker=${workerId}'">
                    Review
                  </button>
                  <!-- Book Worker button: Redirects to booking page -->
                  <button class="btn gradient"
                    style="padding:10px 24px;font-size:14px;width:auto;border-radius:8px;font-weight:600;background:var(--primary);color:white;border:none;cursor:pointer;"
                    onclick="location.href='booking.html?worker=${workerId}'">
                    Book Worker
                  </button>
                </div>
              </div>

              <!-- Name + Meta -->
              <div style="display:flex;flex-direction:column;gap:6px;">
                <h1 style="margin:0;font-size:28px;display:flex;align-items:center;color:var(--text);">
                  ${w.name} ${verifiedBadge}
                </h1>
                <div style="font-size:16px;font-weight:600;color:var(--text);">
                  Top Rated ${w.service} Professional
                </div>
                <div style="font-size:14px;color:var(--muted);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                  <span>📍 ${w.location || 'Local Area'}</span>
                  <span style="opacity:0.4;">•</span>
                  <span>💼 ${w.experience} yrs exp</span>
                  <span style="opacity:0.4;">•</span>
                  <span>✓ ${completedJobs} jobs</span>
                  <span style="opacity:0.4;">•</span>
                  <span style="color:#f59e0b;font-weight:600;">⭐ ${w.rating}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabs Navigation -->
          <div class="tabs-nav" style="display:flex;gap:32px;border-bottom:1px solid var(--border);margin-bottom:24px;padding:0 16px;">
            <button class="tab-btn active" data-target="about"
              style="background:none;border:none;border-bottom:3px solid #5A8C2B;padding:12px 0;font-size:16px;font-weight:600;color:#5A8C2B;cursor:pointer;">About</button>
            <button class="tab-btn" data-target="services"
              style="background:none;border:none;border-bottom:3px solid transparent;padding:12px 0;font-size:16px;font-weight:600;color:var(--muted);cursor:pointer;">Services</button>
            <button class="tab-btn" data-target="portfolio"
              style="background:none;border:none;border-bottom:3px solid transparent;padding:12px 0;font-size:16px;font-weight:600;color:var(--muted);cursor:pointer;">Portfolio</button>
            <button class="tab-btn" data-target="reviews"
              style="background:none;border:none;border-bottom:3px solid transparent;padding:12px 0;font-size:16px;font-weight:600;color:var(--muted);cursor:pointer;">Reviews</button>
            <button class="tab-btn" data-target="skills"
              style="background:none;border:none;border-bottom:3px solid transparent;padding:12px 0;font-size:16px;font-weight:600;color:var(--muted);cursor:pointer;">Skills</button>
          </div>

          <!-- About Tab -->
          <div class="tab-content active" id="tab-about">
            <div style="padding:32px 0;">
              <h2 style="font-size:24px;margin:0 0 20px;">Professional Description</h2>
              <div style="display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap;">
                ${w.rating >= 4.7 ? `<span style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#b45309;padding:8px 16px;border-radius:30px;font-size:14px;font-weight:700;">⭐ Top Rated Pro</span>` : ''}
                <span style="background:rgba(59,130,246,0.1);color:#2563eb;padding:8px 16px;border-radius:30px;font-size:14px;font-weight:600;">⚡ ${responseTime}</span>
                <span style="background:rgba(16,185,129,0.1);color:#10b981;padding:8px 16px;border-radius:30px;font-size:14px;font-weight:600;">🛡️ Verified Professional</span>
              </div>
              <p style="color:var(--text);line-height:1.8;margin:0;font-size:16px;">
                ${w.bio} I have built a strong reputation over my ${w.experience} years of experience.
                My primary goal is ensuring customer satisfaction and long-lasting quality on every project.
              </p>
            </div>
          </div>

          <!-- Services Tab -->
          <div class="tab-content" id="tab-services" style="display:none;">
            <div style="padding:32px 0;">
              <h2 style="font-size:24px;margin:0 0 24px;">Services Offered</h2>
              <div class="service-grid">${servicesHtml}</div>
            </div>
          </div>

          <!-- Portfolio Tab -->
          <div class="tab-content" id="tab-portfolio" style="display:none;">
            <div style="padding:32px 0;">
              <h2 style="font-size:24px;margin:0 0 24px;">Completed Projects</h2>
              <div class="horizontal-slider" style="padding-bottom:16px;">${portfolioHtml}</div>
            </div>
          </div>

          <!-- Reviews Tab -->
          <div class="tab-content" id="tab-reviews" style="display:none;">
            <div style="padding:32px 0;">
              <h2 style="font-size:24px;margin:0 0 24px;">
                Customer Reviews
                <span style="color:var(--muted);font-weight:normal;font-size:18px;">(${reviewsCount})</span>
              </h2>
              <div class="horizontal-slider" style="padding-bottom:16px;">${reviewsHtml}</div>
            </div>
          </div>

          <!-- Skills Tab -->
          <div class="tab-content" id="tab-skills" style="display:none;">
            <div style="padding:32px 0;">
              <h2 style="font-size:24px;margin:0 0 24px;">Qualifications</h2>
              <div style="display:flex;flex-direction:column;gap:16px;">
                ${certifications.map(c => `
                  <div style="display:flex;align-items:center;gap:16px;border:1px solid rgba(0,0,0,0.06);padding:20px;border-radius:12px;background:var(--surface);">
                    <div style="font-size:20px;color:#10b981;background:rgba(16,185,129,0.1);width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;">✓</div>
                    <div style="font-weight:600;font-size:16px;color:var(--text);">${c}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Similar Workers -->
          <div style="margin-top:48px;padding-top:40px;border-top:1px solid var(--border);">
            <h2 style="font-size:26px;margin:0 0 24px;">Similar Workers Near You</h2>
            <div class="similar-workers-grid">${similarHtml}</div>
          </div>

        </div>

        </div>
      </div>
    `;

    
    // -------------------------------------------------------
    // Post-render JS logic
    // -------------------------------------------------------

    // Tab switching
    const tabs     = container.querySelectorAll('.tab-btn');
    const contents = container.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Reset all tabs
        tabs.forEach(t => {
          t.style.color            = 'var(--muted)';
          t.style.borderBottomColor = 'transparent';
        });
        contents.forEach(c => c.style.display = 'none');

        // Activate clicked tab
        tab.style.color            = '#5A8C2B';
        tab.style.borderBottomColor = '#5A8C2B';
        container.querySelector('#tab-' + tab.dataset.target).style.display = 'block';
      });
    });

  }); // end skillbridge-ready

}