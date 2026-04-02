// Minimal client logic to render pages from SKILLBRIDGE_DATA
function q(name){return new URLSearchParams(location.search).get(name)}

function cardHTML(w){
  const photo = w.photo || 'images/hasnain.jpeg';
  return `<div class="worker-card" style="background:var(--card); padding:16px; border-radius:12px; border:1px solid var(--border); text-align:center; transition:transform 0.2s;">
    <img class="worker-photo" src="${photo}" alt="${w.name}" style="width:100%; height:180px; border-radius:8px; object-fit:cover; margin-bottom:12px;">
    <h3 style="margin:0 0 6px 0; font-size:18px;">${w.name}</h3>
    <div style="color:var(--muted); font-size:13px; margin-bottom:12px;">${w.service} • ${w.experience} yrs • <span class="stars">⭐ ${w.rating}</span></div>
    <div style="display:flex; gap:8px;">
      <a class="btn outline" href="profile.html?worker=${w.id}" style="flex:1; padding:8px; font-size:13px;">View</a>
      <a class="btn gradient" href="profile.html?worker=${w.id}" style="flex:1; padding:8px; font-size:13px; background:#5A8C2B;">Book</a>
    </div>
  </div>`
}

// New List View HTML for the All Workers page (LinkedIn style)
function listCardHTML(w){
  const photo = w.photo || 'images/hasnain.jpeg';
  const verifiedBadge = w.verified ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="#10b981" stroke="white" stroke-width="2" style="margin-left:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>` : '';
  return `<div class="worker-list-card" style="display:flex;align-items:flex-start;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;gap:20px;transition:box-shadow 0.2s;">
    <img class="worker-photo" src="${photo}" alt="${w.name}" style="width:96px;aspect-ratio:5/5;border-radius:8px;object-fit:cover;flex-shrink:0;">
    <div style="flex:1;">
      <h3 style="margin:0 0 4px 0;font-size:18px;display:flex;align-items:center;gap:4px;">
        ${w.name} ${verifiedBadge} <span style="color:var(--muted);font-weight:normal;font-size:14px;margin-left:4px;">✨ Pro</span>
      </h3>
      <div style="color:var(--text);font-size:15px;font-weight:500;margin-bottom:2px;">
        ${w.service} Specialist • ${w.experience} years experience
      </div>
      <div style="color:var(--muted);font-size:13px;margin-bottom:8px;">
        📍 ${w.location || 'Local Region'} • 💰 Rs${w.price || 25}/hr
      </div>
      <p style="margin:0;font-size:14px;color:var(--muted);line-height:1.5;">
        Summary: ... ${w.bio}
      </p>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px;">
      <a class="btn outline" href="profile.html?worker=${w.id}" style="border-radius:24px;padding:6px 24px;">View Profile</a>
      <div style="font-size:14px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:4px;">
        <span style="color:#f59e0b;">⭐</span> ${w.rating}
      </div>
    </div>
  </div>`
}

function goCategory(cat){ location.href = 'listing.html?cat='+encodeURIComponent(cat) }

// Home rendering
if (document.getElementById('top-workers')) {
  const container = document.getElementById('top-workers');
  const top = SKILLBRIDGE_DATA.workers.slice().sort((a,b)=>b.rating-a.rating).slice(0,4);
  container.innerHTML = top.map(cardHTML).join('')
}

// Listing rendering
if (document.getElementById('workers-list')) {
  const list = document.getElementById('workers-list');
  const title = document.getElementById('listing-title');
  const catRadios = document.querySelectorAll('input[name="filter-category"]');
  const sortSelect = document.getElementById('filter-sort');
  const clearBtn = document.getElementById('clear-filters');
  
  // New Filter Elements
  const priceInput = document.getElementById('filter-price');
  const priceDisplay = document.getElementById('price-display');
  const availabilitySelect = document.getElementById('filter-availability');
  const ratingSelect = document.getElementById('filter-rating');
  const experienceSelect = document.getElementById('filter-experience');
  const locationInput = document.getElementById('filter-location');
  const verifiedCheckbox = document.getElementById('filter-verified');

  // Set initial category from URL if present
  let initialCat = q('cat') || 'All';
  const matchingRadio = document.querySelector(`input[name="filter-category"][value="${initialCat}"]`);
  if (matchingRadio) matchingRadio.checked = true;

  function renderList() {
    // Get filter values from DOM elements
    const selectedCat = document.querySelector('input[name="filter-category"]:checked').value;
    const maxPrice = parseInt(priceInput.value, 10);
    const selectedAvailability = availabilitySelect.value;
    const minRating = parseFloat(ratingSelect.value);
    const selectedExperience = experienceSelect.value;
    const searchLocation = locationInput.value.toLowerCase().trim();
    const requireVerified = verifiedCheckbox.checked;
    const selectedSort = sortSelect.value;

    // Filter pipeline
    let filtered = SKILLBRIDGE_DATA.workers.filter(w => {
      // 1. Category Check
      if (selectedCat !== 'All' && w.service !== selectedCat) return false;
      
      // 2. Price Check
      if (w.price > maxPrice) return false;
      
      // 3. Availability Check
      if (selectedAvailability !== 'All' && !w.availability.includes(selectedAvailability)) return false;
      
      // 4. Rating Check
      if (w.rating < minRating) return false;
      
      // 5. Experience Check
      if (selectedExperience !== 'All') {
        if (selectedExperience === '1-3' && (w.experience < 1 || w.experience > 3)) return false;
        if (selectedExperience === '4-7' && (w.experience < 4 || w.experience > 7)) return false;
        if (selectedExperience === '8' && w.experience < 8) return false;
      }
      
      // 6. Location Check
      if (searchLocation && (!w.location || !w.location.toLowerCase().includes(searchLocation))) return false;
      
      // 7. Verification Check
      if (requireVerified && !w.verified) return false;

      return true; // Passed all filters
    });

    // Sort by Selected Criteria
    filtered.sort((a, b) => {
      if (selectedSort === 'rating') return b.rating - a.rating; // Highest rating first
      if (selectedSort === 'experience') return b.experience - a.experience; // Most experience first
      if (selectedSort === 'price_low') return a.price - b.price; // Lowest price first
      if (selectedSort === 'price_high') return b.price - a.price; // Highest price first
      return 0;
    });

    // Update Price Display text in UI
    priceDisplay.textContent = maxPrice;

    // Render title
    title.textContent = (selectedCat === 'All' ? 'Available' : selectedCat + ' ') + 'workers';
    
    // Render list
    try {
      list.innerHTML = filtered.map(listCardHTML).join('') || '<div style="padding:20px;text-align:center;color:var(--muted);">No workers found matching your criteria.</div>';
    } catch(e) {
      list.innerHTML = `<div style="padding:20px;color:red;font-weight:bold;">Error rendering workers: ${e.message}</div>`;
      console.error(e);
    }
  }

  // Attach Event Listeners
  const allFilters = [
    ...Array.from(catRadios), 
    sortSelect, 
    priceInput, 
    availabilitySelect, 
    ratingSelect, 
    experienceSelect, 
    locationInput, 
    verifiedCheckbox
  ];
  
  allFilters.forEach(el => {
    if(el) {
      if(el.type === 'text') el.addEventListener('keyup', renderList); // For location input typing
      else el.addEventListener('change', renderList); // For selects, checks, radios, slider
      if(el.type === 'range') el.addEventListener('input', renderList); // Smooth slider update
    }
  });
  
  if(clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.querySelector('input[name="filter-category"][value="All"]').checked = true;
      priceInput.value = 100;
      availabilitySelect.value = 'All';
      ratingSelect.value = '0';
      experienceSelect.value = 'All';
      locationInput.value = '';
      verifiedCheckbox.checked = false;
      sortSelect.value = 'rating';
      renderList();
    });
  }

  // Initial render on page load
  renderList();
}



// Profile rendering (Advanced Fiverr-style)
if (document.getElementById('profile-container')) {
  const id = parseInt(q('worker'),10);
  const container = document.getElementById('profile-container');
  if (!id || isNaN(id)){
    container.innerHTML = '<p>Worker not specified. Redirecting...</p>';
    setTimeout(()=> location.href = 'home.html', 1400);
  } else {
    let w = SKILLBRIDGE_DATA.workers.find(x=>x.id===id);
    if (!w){ container.innerHTML = '<p>Worker not found. Redirecting...</p>'; setTimeout(()=> location.href = 'home.html', 1400); }
    else {
      // 1. Enrich mock data dynamically
      const completedJobs = w.experience * 15 + Math.floor(Math.random() * 50);
      const responseTime = w.rating > 4.5 ? 'Under 1 hour' : 'Under 4 hours';
      const reviewsCount = Math.floor(w.rating * 12 + Math.random() * 30);
      
      const specificServices = w.service === 'Plumber' ? [
        { name: 'Pipe Fitting', price: 40, icon: '🔧', desc: 'Expert pipe fitting for residential buildings with zero leakage guarantee.' },
        { name: 'Drain Cleaning', price: 50, icon: '💧', desc: 'Deep drain cleaning to resolve and prevent major water blockages.' },
        { name: 'Leak Repair', price: 30, icon: '🚿', desc: 'Fast turnaround leak repair for sinks, toilets, and showers.' },
        { name: 'Water Heater Install', price: 120, icon: '🔥', desc: 'Full installation and setup of new electric or gas water heaters.' }
      ] : w.service === 'Electrician' ? [
        { name: 'Wiring Setup', price: 80, icon: '🔌', desc: 'Complete home or office wiring setup according to safety standards.' },
        { name: 'Lighting Fix', price: 40, icon: '💡', desc: 'Repairing or installing new ambient light fixtures.' },
        { name: 'Panel Upgrade', price: 150, icon: '⚡', desc: 'Upgrading electrical panels to support modern heavy appliances.' }
      ] : w.service === 'Carpenter' ? [
        { name: 'Custom Furniture', price: 200, icon: '🪑', desc: 'Designing and building custom wooden furniture pieces.' },
        { name: 'Door Repair', price: 40, icon: '🚪', desc: 'Fixing hinges, locks, and frames for interior and exterior doors.' },
        { name: 'Wood Polishing', price: 60, icon: '✨', desc: 'Premium polishing to restore the original shine of wooden surfaces.' }
      ] : [
        { name: 'Engine Diagnostic', price: 60, icon: '💻', desc: 'Full computer diagnostic of engine lights and performance.' },
        { name: 'Brake Repair', price: 100, icon: '🛑', desc: 'Pad replacement and rotor resurfacing for maximum stopping power.' },
        { name: 'Oil Change', price: 35, icon: '🛢️', desc: 'Standard oil and filter change with premium synthetic blend.' },
        { name: 'Tire Rotation', price: 25, icon: '🛞', desc: 'Rotating and balancing tires for smooth driving.' }
      ];

      const certifications = [
        'Licensed ' + w.service + ' Professional',
        w.experience > 5 ? 'Master Craftsmanship' : 'Apprentice Graduate',
        'Background Checked by SkillBridge'
      ];
      
      const portfolioImages = w.service === 'Plumber' ? [
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

      // Service Grid HTML
      const servicesHtml = specificServices.map(s => `
        <div class="card" style="padding:24px; border:1px solid var(--border); transition:transform 0.2s;">
          <div style="font-size:28px; margin-bottom:16px; width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:rgba(108,138,61,0.1);border-radius:12px;">${s.icon}</div>
          <h4 style="margin:0 0 8px; font-size:18px; color:var(--text);">${s.name}</h4>
          <p style="color:var(--muted); font-size:14px; margin:0 0 16px; line-height:1.6">${s.desc}</p>
          <div style="color:var(--text); font-weight:700; font-size:16px;">Starting from Rs${s.price}</div>
        </div>
      `).join('');

      // Portfolio Slider HTML
      const portfolioHtml = portfolioImages.map((img, i) => `
        <div class="slider-card slider-portfolio">
          <img src="${img}" alt="Portfolio Work">
          <div style="padding:16px;">
            <div style="font-weight:600; font-size:15px; margin-bottom:4px">Project Showcase ${i+1}</div>
            <div style="font-size:13px; color:var(--muted)">Completed ${(i+1)*2} weeks ago</div>
          </div>
        </div>
      `).join('');
      
      const reviewerAvatars = ['https://i.pravatar.cc/150?img=11', 'https://i.pravatar.cc/150?img=32', 'https://i.pravatar.cc/150?img=43'];
      const reviewsHtml = [1,2,3].map((i, index) => `
        <div class="slider-card slider-review">
          <div class="review-author" style="margin-bottom:12px;">
            <img src="${reviewerAvatars[index]}" class="review-avatar">
            <div>
              <div style="font-weight:600; font-size:15px; color:var(--text)">Satisfied Customer</div>
              <div style="font-size:13px; color:var(--muted)">Hired for ${w.service}</div>
            </div>
          </div>
          <div class="review-stars">⭐⭐⭐⭐⭐ 5.0</div>
          <p class="review-text">"Excellent work! ${w.name.split(' ')[0]} was incredibly professional, communicated clearly, and solved the issue faster than expected. Highly recommended."</p>
          <div style="font-size:13px; color:var(--muted); font-weight:500;">Reviewed 2 weeks ago</div>
        </div>
      `).join('');

      // Dates and Times for Booking Chips
      const nextDates = ['Today', 'Tomorrow'];
      const dateForm = nextDates.map(d => `<div class="time-slot bk-date-btn ${d==='Today'?'selected':''}" data-val="${d}">${d}</div>`).join('');
      const times = ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];
      const timeForm = times.map((t, i) => `<div class="time-slot bk-time-btn ${i===0?'selected':''}" data-val="${t}">${t}</div>`).join('');

      const verifiedBadge = w.verified ? `<span style="color:#10b981; font-size:18px; margin-left:6px; display:inline-flex" title="Verified Professional"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg></span>` : '';
      const bannerBgUrl = w.service === 'Plumber' ? 'images/plumbing.jpeg' :
                          w.service === 'Electrician' ? 'images/electrician.jpeg' :
                          w.service === 'Carpenter' ? 'images/carpentry.jpeg' :
                          'images/mechanic.jpeg';
      

      // Similar Workers Gen
      const similarHTML = SKILLBRIDGE_DATA.workers
        .filter(x => x.service === w.service && x.id !== w.id)
        .slice(0, 4)
        .map(sw => `
          <div class="card" style="padding:20px; text-align:center; border:1px solid var(--border); transition:transform 0.2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
            <img src="${sw.photo}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin-bottom:16px;">
            <h4 style="margin:0 0 6px; font-size:16px; color:var(--text);">${sw.name}</h4>
            <div style="font-size:14px; color:var(--muted); margin-bottom:12px;">⭐ ${sw.rating} (${sw.experience} yrs)</div>
            <a href="profile.html?worker=${sw.id}" class="btn outline" style="padding:8px 16px; font-size:14px;">View Profile</a>
          </div>
        `).join('');

      container.innerHTML = `
        <div class="profile-layout">
          <!-- Left Column: Main Content (70%) -->
          <div class="profile-main-content">
            
            <!-- Beautiful Header section (Banner + Info) -->
            <div class="card" style="padding: 0; overflow: hidden; border:1px solid var(--border); margin-bottom:24px;">
              <div style="height: 220px; width: 100%; background: url('${bannerBgUrl}') center/cover no-repeat;"></div>
              
              <div style="padding: 0 32px 32px 32px; position: relative;">
                <!-- Avatar and Action Buttons Row -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: -64px; margin-bottom: 16px; flex-wrap:wrap; gap:16px;">
                  <div style="background: var(--card); padding: 6px; border-radius: 50%; display:inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <img src="${w.photo}" style="width: 140px; height: 140px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);">
                  </div>
                  <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                    <button id="btn-save-worker" class="btn outline" style="padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px; font-weight:600; color:var(--text); display:flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border); cursor:pointer;"><span style="color:#aaa;">🤍</span> Save</button>
                    <button class="btn outline" style="padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px; font-weight:600; color:var(--text); background:transparent; border:1px solid var(--border); cursor:pointer;">Message</button>
                    <button class="btn gradient" style="padding: 10px 24px; font-size: 14px; width: auto; border-radius: 8px; font-weight:600; background:var(--primary); color:white; border:none; box-shadow:0 4px 12px rgba(108,138,61,0.3); cursor:pointer;" onclick="window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'})">Book Service</button>
                  </div>
                </div>
                
                <!-- Worker Info Row -->
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <h1 style="margin: 0; font-size: 28px; display: flex; align-items: center; letter-spacing: -0.5px; color:var(--text);">
                    ${w.name} ${verifiedBadge}
                  </h1>
                  <div style="font-size: 16px; font-weight:600; color: var(--text);">Top Rated ${w.service} Professional</div>
                  <div style="font-size: 14px; color: var(--muted); margin-top: 4px; display:flex; gap:12px; flex-wrap:wrap; align-items: center;">
                    <span style="display:flex; align-items:center; gap:4px;">📍 ${w.location || 'Local Area'}</span>
                    <span style="opacity:0.4; font-size:10px;">•</span>
                    <span style="display:flex; align-items:center; gap:4px;">💼 ${w.experience} yrs exp</span>
                    <span style="opacity:0.4; font-size:10px;">•</span>
                    <span style="display:flex; align-items:center; gap:4px;">✓ ${completedJobs} jobs</span>
                    <span style="opacity:0.4; font-size:10px;">•</span>
                    <span style="display:flex; align-items:center; color:#f59e0b; font-weight:600; gap:4px;">⭐ ${w.rating}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Horizontal Tabs -->
            <div class="tabs-nav" style="display:flex; gap:32px; border-bottom:1px solid var(--border); margin-bottom:24px; padding:0 16px;">
              <button class="tab-btn active" data-target="about" style="background:none; border:none; border-bottom:3px solid transparent; padding:12px 0; font-size:16px; font-weight:600; color:#5A8C2B; cursor:pointer; border-bottom-color:#5A8C2B;">About</button>
              <button class="tab-btn" data-target="services" style="background:none; border:none; border-bottom:3px solid transparent; padding:12px 0; font-size:16px; font-weight:600; color:var(--muted); cursor:pointer;">Services</button>
              <button class="tab-btn" data-target="portfolio" style="background:none; border:none; border-bottom:3px solid transparent; padding:12px 0; font-size:16px; font-weight:600; color:var(--muted); cursor:pointer;">Portfolio</button>
              <button class="tab-btn" data-target="reviews" style="background:none; border:none; border-bottom:3px solid transparent; padding:12px 0; font-size:16px; font-weight:600; color:var(--muted); cursor:pointer;">Reviews</button>
              <button class="tab-btn" data-target="skills" style="background:none; border:none; border-bottom:3px solid transparent; padding:12px 0; font-size:16px; font-weight:600; color:var(--muted); cursor:pointer;">Skills</button>
            </div>

            <!-- TAB CONTENTS -->
            
            <!-- About Tab -->
            <div class="tab-content active" id="tab-about">
              <div style="padding: 32px 0;">
                <h2 style="font-size: 24px; margin: 0 0 20px;">Professional Description</h2>
                <div style="display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap;">
                   ${w.rating >= 4.7 ? `<span style="background:linear-gradient(135deg, #fef3c7, #fde68a); color:#b45309; padding:8px 16px; border-radius:30px; font-size:14px; font-weight:700;">⭐ Top Rated Pro</span>` : ''}
                   <span style="background:rgba(59,130,246,0.1); color:#2563eb; padding:8px 16px; border-radius:30px; font-size:14px; font-weight:600;">⚡ ${responseTime}</span>
                   <span style="background:rgba(16,185,129,0.1); color:#10b981; padding:8px 16px; border-radius:30px; font-size:14px; font-weight:600;">🛡️ Verified Professional</span>
                </div>
                <p style="color: var(--text); line-height: 1.8; margin: 0; font-size: 16px;">
                  ${w.bio} I have built a strong reputation over my ${w.experience} years of experience in the field. My primary goal is ensuring customer satisfaction and long-lasting quality on every project. I prioritize clear communication, arriving on time, and delivering results that exceed expectations.
                </p>
              </div>
            </div>

            <!-- Services Tab -->
            <div class="tab-content" id="tab-services">
              <div style="padding: 32px 0;">
                <h2 style="font-size: 24px; margin: 0 0 24px;">Services Offered</h2>
                <div class="service-grid">
                  ${servicesHtml}
                </div>
              </div>
            </div>

            <!-- Portfolio Tab -->
            <div class="tab-content" id="tab-portfolio">
              <div style="padding: 32px 0;">
                <h2 style="font-size: 24px; margin: 0 0 24px;">Completed Projects</h2>
                <div class="horizontal-slider" style="padding-bottom:16px;">${portfolioHtml}</div>
              </div>
            </div>
            
            <!-- Reviews Tab -->
            <div class="tab-content" id="tab-reviews">
              <div style="padding: 32px 0;">
                <h2 style="font-size: 24px; margin: 0 0 24px;">Customer Reviews <span style="color:var(--muted); font-weight:normal; font-size:18px">(${reviewsCount})</span></h2>
                <div class="horizontal-slider" style="padding-bottom:16px;">${reviewsHtml}</div>
              </div>
            </div>

            <!-- Skills Tab -->
            <div class="tab-content" id="tab-skills">
              <div style="padding: 32px 0;">
                <h2 style="font-size: 24px; margin: 0 0 24px;">Qualifications</h2>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  ${certifications.map(c => `
                    <div style="display: flex; align-items: center; gap: 16px; border: 1px solid rgba(0,0,0,0.06); padding: 20px; border-radius: 12px; background:var(--surface)">
                      <div style="font-size:20px; color:#10b981; background:rgba(16,185,129,0.1); width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center;">✓</div>
                      <div style="font-weight: 600; font-size:16px; color:var(--text);">${c}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <!-- Similar Workers section injected at bottom of Main Layout -->
            <div style="margin-top: 48px; padding-top: 40px; border-top: 1px solid var(--border);">
              <h2 style="font-size: 26px; margin: 0 0 24px;">Similar Workers Near You</h2>
              <div class="similar-workers-grid">
                ${similarHTML}
              </div>
            </div>

          </div>

          <!-- Right Column: Booking Sidebar (30%) -->
          <div class="profile-sidebar">
            <div class="card" style="border:1px solid var(--border); padding:32px;">
              <h3 style="margin:0 0 24px; font-size:22px; color:var(--text);">Book this Professional</h3>
              
              <div style="margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:20px;">
                 <span style="font-size:16px; font-weight:600; color:var(--muted)">Hourly Rate</span>
                 <span style="font-size:28px; font-weight:800; color:var(--text)">Rs${w.price}</span>
              </div>
              
              <div style="margin-bottom:28px;">
                <label style="font-weight:600; font-size:15px; display:flex; justify-content:space-between; margin-bottom:12px; color:var(--text)">
                  <span>Select Date</span>
                  <span style="color:#10b981; font-weight:600; display:flex; align-items:center; gap:4px">
                    <span style="width:8px;height:8px;background:#10b981;border-radius:50%;display:inline-block"></span> Available
                  </span>
                </label>
                <div class="time-slot-grid">${dateForm}</div>
                <input type="hidden" id="bk-date" value="Today">
              </div>

              <div style="margin-bottom:36px;">
                <label style="font-weight:600; font-size:15px; display:block; margin-bottom:12px; color:var(--text)">Select Arrival Time</label>
                <div class="time-slot-grid">${timeForm}</div>
                <input type="hidden" id="bk-time" value="09:00 AM">
              </div>

              <div style="background: rgba(108, 138, 61, 0.08); padding: 16px; border-radius: 12px; margin-bottom: 28px; display:flex; gap:12px; align-items:flex-start; border: 1px solid var(--border);">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                 <span style="font-size:14px; color:var(--text); font-weight:600; line-height:1.4">Covered by SkillBridge Guarantee.<br><span style="font-weight:normal;color:var(--muted)">Your satisfaction is strictly protected.</span></span>
              </div>

              <button id="profile-book-confirm" class="btn" style="width:100%; font-size:17px; padding:16px; border-radius:12px; font-weight:600; background:#5A8C2B; color:white; border:none; box-shadow:0 8px 16px rgba(90,140,43,0.25); cursor:pointer;">Confirm Request</button>
              <div id="bk-msg" style="margin-top:16px; color:#10b981; font-size:15px; text-align:center; font-weight:700; min-height:22px"></div>
              <div style="margin-top:14px; font-size:13px; color:var(--muted); text-align:center;">You won't be charged yet</div>
            </div>
          </div>
        </div>
      `;

      // ------------------------------------
      // JS LOGIC AFTER DOM INJECTION
      // ------------------------------------

      // Tabs Logic (Updated for New Screenshot Layout)
      const tabs = container.querySelectorAll('.tab-btn');
      const contents = container.querySelectorAll('.tab-content');
      tabs.forEach(t => {
        t.addEventListener('click', () => {
          tabs.forEach(btn => {
            btn.classList.remove('active');
            btn.style.color = 'var(--muted)';
            btn.style.borderBottomColor = 'transparent';
          });
          contents.forEach(c => c.classList.remove('active'));
          
          t.classList.add('active');
          t.style.color = '#5A8C2B';
          t.style.borderBottomColor = '#5A8C2B';
          
          container.querySelector('#tab-' + t.dataset.target).classList.add('active');
        });
      });

      // Chips Logic
      const dateChips = container.querySelectorAll('.bk-date-btn');
      dateChips.forEach(c => {
        c.addEventListener('click', () => {
          dateChips.forEach(btn => btn.classList.remove('selected'));
          c.classList.add('selected');
          document.getElementById('bk-date').value = c.dataset.val;
        });
      });
      const timeChips = container.querySelectorAll('.bk-time-btn');
      timeChips.forEach(c => {
        c.addEventListener('click', () => {
          timeChips.forEach(btn => btn.classList.remove('selected'));
          c.classList.add('selected');
          document.getElementById('bk-time').value = c.dataset.val;
        });
      });

      // Save Worker Logic
      const saveBtn = document.getElementById('btn-save-worker');
      if (saveBtn) {
        // Initial state
        let saved = JSON.parse(localStorage.getItem('savedWorkers') || '[]');
        if (saved.includes(id)) {
          saveBtn.innerHTML = '<span style="color:#ef4444;">❤</span> Saved';
          saveBtn.style.color = '#ef4444';
        }

        saveBtn.addEventListener('click', () => {
          let currentSaved = JSON.parse(localStorage.getItem('savedWorkers') || '[]');
          if (currentSaved.includes(id)) {
            currentSaved = currentSaved.filter(item => item !== id);
            saveBtn.innerHTML = '<span style="color:#aaa;">🤍</span> Save';
            saveBtn.style.color = '#555';
          } else {
            currentSaved.push(id);
            saveBtn.innerHTML = '<span style="color:#ef4444;">❤</span> Saved';
            saveBtn.style.color = '#ef4444';
          }
          localStorage.setItem('savedWorkers', JSON.stringify(currentSaved));
        });
      }

      // Booking Confirm Logic
      const bookBtn = document.getElementById('profile-book-confirm');
      bookBtn.addEventListener('click', () => {
        bookBtn.innerHTML = 'Pre-authorizing...';
        bookBtn.style.opacity = '0.7';
        setTimeout(() => {
          bookBtn.innerHTML = 'Request Sent!';
          bookBtn.style.background = '#10b981';
          bookBtn.style.opacity = '1';
          const dt = document.getElementById('bk-date').value;
          const tm = document.getElementById('bk-time').value;
          document.getElementById('bk-msg').textContent = 'Appointment requested for ' + dt + ' at ' + tm;
        }, 1000);
      });
    }
  }
}
