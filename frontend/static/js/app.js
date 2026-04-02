// ===============================
// SkillBridge Main App JS
// ===============================

// Worker Card HTML
function listCardHTML(w) {

  const photo = w.photo || "https://i.pravatar.cc/150";
  const stars = "⭐".repeat(Math.round(w.rating));

  return `
  <div class="worker-card" style="display:flex;gap:16px;padding:16px;border-bottom:1px solid #eee;align-items:center;">
    
    <img src="${photo}" 
         style="width:70px;height:70px;border-radius:50%;object-fit:cover;" />

    <div style="flex:1;">
      <h3 style="margin:0;">${w.name} ${w.verified ? "✔️" : ""}</h3>

      <div style="color:#666;font-size:14px;">
        ${w.service} • ${w.experience} years exp
      </div>

      <div style="font-size:13px;margin-top:4px;color:#888;">
        📍 ${w.location} • 💰 $${w.price}/hr
      </div>

      <div style="margin-top:6px;font-size:14px;">
        ${stars} (${w.rating})
      </div>
    </div>

    <a href="profile.html?worker=${w.id}" 
       style="padding:8px 14px;background:#4f46e5;color:white;border-radius:6px;text-decoration:none;">
       View Profile
    </a>

  </div>
  `;
}


// ===============================
// Render Worker List
// ===============================

function renderList() {

  const list = document.getElementById("workers-list");
  if (!list) return;

  const categoryInput = document.querySelector('input[name="filter-category"]:checked');
  const selectedCat = categoryInput ? categoryInput.value : "All";

  const priceInput = document.getElementById("filter-price");
  const maxPrice = priceInput ? parseInt(priceInput.value) : 100;

  const availabilityInput = document.getElementById("filter-availability");
  const selectedAvailability = availabilityInput ? availabilityInput.value : "All";

  const ratingInput = document.getElementById("filter-rating");
  const minRating = ratingInput ? parseFloat(ratingInput.value) : 0;

  const experienceInput = document.getElementById("filter-experience");
  const selectedExperience = experienceInput ? experienceInput.value : "All";

  const locationInput = document.getElementById("filter-location");
  const searchLocation = locationInput ? locationInput.value.toLowerCase() : "";

  const verifiedInput = document.getElementById("filter-verified");
  const verifiedOnly = verifiedInput ? verifiedInput.checked : false;

  const sortInput = document.getElementById("filter-sort");
  const selectedSort = sortInput ? sortInput.value : "rating";

  let filtered = SKILLBRIDGE_DATA.workers.filter(w => {

    // Category
    if (selectedCat !== "All" && w.service !== selectedCat) return false;

    // Price
    if (w.price > maxPrice) return false;

    // Availability (safe check)
    const availability = w.availability || [];
    if (selectedAvailability !== "All" && !availability.includes(selectedAvailability)) return false;

    // Rating
    if (w.rating < minRating) return false;

    // Experience
    if (selectedExperience === "1-3" && (w.experience < 1 || w.experience > 3)) return false;
    if (selectedExperience === "4-7" && (w.experience < 4 || w.experience > 7)) return false;
    if (selectedExperience === "8" && w.experience < 8) return false;

    // Location
    if (searchLocation && !w.location.toLowerCase().includes(searchLocation)) return false;

    // Verified
    if (verifiedOnly && !w.verified) return false;

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (selectedSort === "rating") return b.rating - a.rating;
    if (selectedSort === "experience") return b.experience - a.experience;
    if (selectedSort === "price_low") return a.price - b.price;
    if (selectedSort === "price_high") return b.price - a.price;
    return 0;
  });

  // If no workers
  if (filtered.length === 0) {
    list.innerHTML = "<p>No workers found.</p>";
    return;
  }

  // Render workers
  list.innerHTML = filtered.map(listCardHTML).join("");
}


// ===============================
// Filter Listeners
// ===============================

function setupFilters() {

  const inputs = document.querySelectorAll(
    "#filters-aside input, #filters-aside select"
  );

  inputs.forEach(input => {
    input.addEventListener("change", renderList);
  });

  const priceInput = document.getElementById("filter-price");
  const priceDisplay = document.getElementById("price-display");

  if (priceInput && priceDisplay) {
    priceInput.addEventListener("input", () => {
      priceDisplay.textContent = priceInput.value;
      renderList();
    });
  }

  const clearBtn = document.getElementById("clear-filters");

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {

      document.querySelector('input[value="All"]').checked = true;

      document.getElementById("filter-price").value = 100;
      document.getElementById("price-display").textContent = 100;

      document.getElementById("filter-availability").value = "All";
      document.getElementById("filter-rating").value = "0";
      document.getElementById("filter-experience").value = "All";
      document.getElementById("filter-location").value = "";
      document.getElementById("filter-verified").checked = false;
      document.getElementById("filter-sort").value = "rating";

      renderList();
    });
  }

}


// ===============================
// Init
// ===============================

function initApp() {
  if (document.getElementById("workers-list") && typeof renderList === "function") {
    renderList();
    if(typeof setupFilters === "function") setupFilters();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}