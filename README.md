# SkillBridge

SkillBridge is a web platform that connects customers with verified professional skill workers (Plumbers, Electricians, Carpenters, and Mechanics). Customers can browse workers, make bookings, and pay — workers can manage jobs and earnings.

---

## 🗂️ Project Structure
```
SkillBridge_2/
├── backend/                        # Django REST API
│   ├── skillbridge/
│   │   ├── accounts/               # Users, workers, customers
│   │   ├── bookings/               # Booking management
│   │   ├── skillbridge/            # Project settings & root urls
│   │   └── manage.py
│   ├── requirements.txt
│   └── .venv/
│
└── frontend/                       # Static HTML/CSS/JS prototype
    ├── static/
    │   ├── css/
    │   ├── js/
    │   └── images/
    └── templates/
        ├── index.html
        ├── home.html
        └── ...
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5, Django REST Framework |
| Authentication | SimpleJWT (JSON Web Tokens) |
| Database | PostgreSQL |
| File Storage | Local media/ (Cloudinary in production) |
| Frontend | Vanilla HTML, CSS, JavaScript |

---

## 🚀 Getting Started

### Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Apply database migrations
cd skillbridge
python manage.py migrate

# 5. Create an admin user
python manage.py createsuperuser

# 6. Start the server
python manage.py runserver
```

API will be running at `http://127.0.0.1:8000`

---

### Frontend Setup

No build steps required — it's a static prototype.
```bash
# Option 1 — just open in browser
open frontend/templates/index.html

# Option 2 — run via local server (recommended to avoid CORS issues)
cd frontend
python -m http.server 3000
```

Frontend will be running at `http://localhost:3000`

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login/` | Login, returns JWT tokens | Public |
| POST | `/api/auth/logout/` | Blacklist refresh token | Required |
| POST | `/api/auth/token/refresh/` | Get new access token | Public |

### Accounts
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/accounts/register/customer/` | Customer signup | Public |
| POST | `/api/accounts/register/worker/` | Worker signup steps 1+2 | Public |
| PATCH | `/api/accounts/worker/documents/` | Worker signup step 3 (files) | Required |
| GET | `/api/accounts/me/` | Get current user info | Required |
| PATCH | `/api/accounts/worker/profile/` | Update worker profile | Required |
| PATCH | `/api/accounts/customer/profile/` | Update customer profile | Required |
| GET | `/api/accounts/workers/` | List all approved workers | Public |
| GET | `/api/accounts/workers/?category=plumber` | Filter workers by category | Public |
| GET | `/api/accounts/workers/<uuid>/` | Get single worker profile | Public |

### Bookings
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/bookings/` | Create new booking | Customer |
| GET | `/api/bookings/my/` | Get customer's bookings | Customer |
| GET | `/api/bookings/worker/` | Get worker's bookings | Worker |
| GET | `/api/bookings/<uuid>/` | Get booking details | Participant |
| PATCH | `/api/bookings/<uuid>/status/` | Update booking status | Worker |
| POST | `/api/bookings/<uuid>/cancel/` | Cancel a booking | Customer |
| POST | `/api/bookings/<uuid>/review/` | Submit a review | Customer |

---

## 📂 Frontend Pages

### Authentication
- `index.html` — Login page
- `role-selection.html` — Choose Customer or Worker
- `customer-signup.html` — Customer registration
- `worker-signup.html` — 3-step worker registration wizard
- `verification-status.html` — Post-signup pending screen
- `forgot-password.html` — Password recovery

### Core Platform
- `home.html` — Landing and service discovery
- `services.html` — Full service catalog across 4 categories
- `listing.html` — Worker search and filtering
- `profile.html` — Worker profile page
- `booking.html` — Booking checkout flow
- `contact.html` — Contact page with Google Maps
- `review.html` — Submit a review after a completed job

### Dashboards
- `customer-dashboard.html` — Bookings, favorites, account
- `worker-dashboard.html` — Jobs, schedule, earnings
- `admin.html` — Approve/reject workers, manage disputes

---

## 👤 User Roles

| Role | Description |
|---|---|
| Customer | Browses workers, makes bookings, leaves reviews |
| Worker | Receives jobs, manages schedule, gets paid |
| Admin | Approves workers, resolves disputes, manages platform |

---

## 🔐 Authentication Flow
```
Customer signup → account active immediately → redirect to dashboard

Worker signup →  Step 1+2: basic + professional info (JSON)
              →  Step 3: upload CNIC + profile photo (multipart)
              →  account pending until admin approves
              →  redirect to verification-status page
```

JWT tokens are stored in `localStorage` and sent in the `Authorization: Bearer <token>` header on every protected request.

---

## 🗄️ Database Models (Phase 1)

- `User` — unified user table for all roles
- `WorkerProfile` — professional details, verification status, ratings
- `WorkerService` — categories a worker offers (plumber, electrician etc.)
- `CustomerProfile` — customer details and booking history
- `Booking` — booking request with pricing and status tracking
- `Review` — customer reviews on completed bookings

---

## 🌱 Seeding the Database

The database comes pre-populated with sample workers and test data to enable frontend development without manual user creation.

### Run the Seed Command

```bash
cd backend/skillbridge

# Load sample workers into the database
python manage.py seed_workers

# This creates:
# - 25+ verified workers across 4 categories (Plumber, Electrician, Carpenter, Mechanic)
# - Test customer and worker accounts for manual testing
# - Sample profile photos and service categories
```

### Sample Login Credentials

After seeding, use these accounts to test:

**Customer Account:**
- Email: `customer@skillbridge.com`
- Password: `test123!@#`

**Worker Account:**
- Email: `worker@skillbridge.com`
- Password: `test123!@#`

**Admin Account:** (create via `python manage.py createsuperuser`)
- Access at: `http://127.0.0.1:8000/admin/`

---

## 🎨 Design

- Primary color: `#6C8A3D` (nature-inspired green)
- Dark mode supported across all pages via `theme.js` and CSS variables
- Fully responsive — mobile optimized

---

## 📚 Frontend Architecture

### Key JavaScript Files

| File | Purpose |
|---|---|
| `config.js` | API base URL and default settings |
| `api.js` | Generic HTTP client with JWT auth |
| `data.js` | Loads workers from backend `/api/accounts/workers/` |
| `session.js` | User authentication state management |
| `booking-history.js` | **NEW** — Booking API functions and shared utilities |
| `customer-dashboard.js` | Customer booking management and history |
| `worker-dashboard.js` | Worker job requests and status updates |
| `booking.js` | Booking form flow (date, time, details, confirmation) |
| `profile.js` | Worker profile page and booking modal |

### Booking System Architecture

```
User Books Worker
    ↓
booking.js renders 3-slide form:
  1. Date, Time, Duration
  2. Address, Description, Payment Method
  3. Review & Confirm
    ↓
createBooking() called → POST /api/bookings/
    ↓
Backend creates Booking object
    ↓
Success screen shown:
  - "Find More Workers" button (redirect to listing.html)
  - "Cancel Booking" button (10-min window)
  - Live countdown timer
```

### Dashboard Data Flow

**Customer Dashboard:**
```
Page loads
  ↓
customer-dashboard.js detects #customer-bookings-container
  ↓
getMyBookings() → GET /api/bookings/my/
  ↓
Renders booking cards using customerBookingCard()
  ↓
Actions: Cancel, Leave Review, View Details
```

**Worker Dashboard:**
```
Page loads
  ↓
worker-dashboard.js detects #worker-bookings-container
  ↓
getWorkerBookings() → GET /api/bookings/worker/
  ↓
Groups by status: Pending, Accepted, In Progress, Completed, Cancelled
  ↓
Renders cards using workerBookingCard()
  ↓
Actions: Accept/Decline, Start Job, Mark Complete
```

### booking-history.js Module

Provides **centralized booking management** for both customer and worker dashboards:

**API Functions:**
- `getMyBookings()` — Fetch customer bookings
- `getWorkerBookings()` — Fetch worker bookings  
- `updateBookingStatus()` — Change booking status
- `cancelBooking()` — Cancel a booking
- `submitReview()` — Leave a customer review

**Utility Functions:**
- `authHeaders()` — Return JWT-authenticated headers
- `statusBadge(status)` — Render status badges (HTML)
- `formatDate(dateString)` — Human-readable date/time formatting
- `customerBookingCard(b)` — Card template for customer view
- `workerBookingCard(b, groupKey)` — Card template for worker view

---



## 📋 Development Phases

- **Phase 1** ✅ — Auth, user management, worker verification
- **Phase 2** In Progress  — Bookings management, customer & worker dashboards
- **Phase 3** 🔜 — Booking detail page, cancellation with fees
- **Phase 4** 🔜 — Location services and GPS tracking
- **Phase 5** 🔜 — Notifications and real-time chat
- **Phase 6** 🔜 — Ratings, earnings reports, payment processing

---

## 🐛 Troubleshooting

### Issue: Dashboards show no bookings (dummy data visible)

**Cause:** 
- Backend not running
- API endpoints not authenticated
- No booking data in database

**Solution:**
```bash
# 1. Start backend server
cd backend/skillbridge
python manage.py runserver

# 2. Seed the database with sample workers
python manage.py seed_workers

# 3. Login to a customer/worker account
# 4. Create test bookings via the booking form
# 5. Check dashboards — they should now load real data via API
```

### Issue: API returns 401 Unauthorized

**Cause:** JWT token missing or invalid

**Solution:**
- Login to generate tokens in localStorage
- Check browser DevTools → Application → LocalStorage → `access_token`
- If missing, login again
- If expired, use refresh token endpoint to get new one

### Issue: CORS errors when fetching from frontend

**Solution:** Start frontend via HTTP server, not file:// protocol:
```bash
cd frontend
python -m http.server 3000
# Then access: http://localhost:3000
```

---

## 📞 Support

For issues or feature requests, refer to the project documentation or contact the development team.