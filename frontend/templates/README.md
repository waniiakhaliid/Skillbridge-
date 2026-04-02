# SkillBridge — Frontend Prototype

SkillBridge is a modern, premium web-based platform designed to connect customers with top-rated professional skill workers (Plumbers, Electricians, Carpenters, and Mechanics). 

This repository contains the interactive frontend UI prototype, demonstrating the platform's core user journeys, modern aesthetic, and responsive design.

## 🚀 Key Features & UI Highlights

- **Modern Aesthetic**: Clean card-based layouts, soft drop-shadows, fully rounded "pill" buttons, and smooth hover micro-interactions.
- **Detailed Services Catalog**: A dedicated services discovery hub with categorized horizontal sliders and professional local imagery.
- **Adaptive Dark Mode**: Full support for dark theme across all dashboard and core pages, ensuring a premium viewing experience in any lighting.
- **Dynamic Homepage**: Features interactive "Recent Projects" grids, a hover-to-reveal "Before & After" gallery, "Special Offers", and a comprehensive SaaS-style modern footer.
- **Advanced Auth Architecture**: A dedicated split-screen authentication flow separating Login, Role Selection, and specialized multi-step Signups.
- **Global Navigation Consistency**: A unified, responsive top-navigation bar integrated across every page for a seamless user experience.
- **Responsive Design**: Fully mobile-optimized, easily stacking grids and layout panels for smaller screens.

## 📂 Page Directory

### Authentication Flows
- `index.html` — Modern Split-Screen Login Page
- `role-selection.html` — Choose between joining as a Customer or Worker
- `customer-signup.html` — Dedicated customer registration with OTP mockup
- `worker-signup.html` — 3-Step Wizard for workers (Basic Info, Professional Info, Document Uploads)
- `verification-status.html` — "Analysis in Progress" hold screen post-worker-signup
- `forgot-password.html` — Password recovery flow

### Core Platform
- `home.html` — The main landing and high-level service discovery page
- `services.html` — **[New]** Detailed catalog featuring 17+ specific services across 4 categories with horizontal sliders.
- `listing.html` — Worker search and filtering 
- `profile.html` — Detailed professional worker profile
- `booking.html` — Service booking checkout flow
- `contact.html` — **[New]** Reach the SkillBridge team via an interactive form and live Google Maps integration.
- `review.html` — Submit a review and rating for a completed job

### Dashboards
- `customer-dashboard.html` — Manage ongoing bookings, favorites, and account details (Dark Mode Optimized)
- `worker-dashboard.html` — Manage incoming job requests, schedule, and earnings (Dark Mode Optimized)
- `admin.html` — Platform administration (Approve/Reject workers, monitor disputes)

## 🛠️ How to Run

Because this is a static frontend prototype, no build steps are required. 

1. Simply clone the repository or download the folder.
2. Open `index.html` in any modern web browser to begin the journey from the Login screen.
3. *Optional:* To run via a local server (recommended for avoiding CORS issues with local assets):
   ```bash
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000/index.html`

## 📝 Technical Implementation Details
- **Localization**: Service card imagery is powered by local project assets (e.g., `pipeleakrepair.jpeg`, `woodenflooring.jpeg`) to ensure immediate loading and visual authenticity.
- **Routing**: Navigation links are fully cross-linked. The "Contact" link is a dedicated page, and "Workers" filters by category dynamically via URL parameters.
- **Dark Mode**: Managed through a global `theme.js` script and CSS variables, providing persistent theme selection across navigation.

## 🎨 Design Philosophy
The design language focuses on **Trust, Quality, and Usability**. We utilize a nature-inspired green primary color (`#6C8A3D`) to evoke growth and reliability, paired with significant whitespace, modern typography, and interactive depth (shadows/scaling) to ensure the platform feels like a premium consumer product.
