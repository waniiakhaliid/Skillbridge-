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

---

## 🎨 Design

- Primary color: `#6C8A3D` (nature-inspired green)
- Dark mode supported across all pages via `theme.js` and CSS variables
- Fully responsive — mobile optimized

---

## 📋 Development Phases

- **Phase 1** ✅ — Auth, user management, worker verification
- **Phase 2** 🔜 — Bookings and payments
- **Phase 3** 🔜 — Location services and GPS tracking
- **Phase 4** 🔜 — Reviews, ratings, and commissions
- **Phase 5** 🔜 — Notifications and chat