# 🍲 ShareBite — Food Donation & Rescue Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.x-38bdf8.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-brightgreen.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)

> **ShareBite** is a full-stack, production-grade web platform engineered to bridge the gap between food donors (restaurants, caterers, individuals), verified non-profit organizations (NGOs), and community delivery volunteers. It eliminates food waste and fights local hunger through automated discovery, concurrency-safe claims, and cryptographically verified physical hand-offs.

---

## 📌 Table of Contents

- [🌟 Key Features](#-key-features)
- [🔄 How It Works (Platform Architecture)](#-how-it-works-platform-architecture)
  - [End-to-End Donation Lifecycle Flowchart](#end-to-end-donation-lifecycle-flowchart)
  - [Role-Based Workflows](#role-based-workflows)
  - [Trust & Integrity Protections](#trust--integrity-protections)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚙️ Prerequisites](#️-prerequisites)
- [🚀 Seamless Local Installation & Setup](#-seamless-local-installation--setup)
  - [Method 1: Manual Step-by-Step Setup (Recommended)](#method-1-manual-step-by-step-setup-recommended)
  - [Method 2: One-Command Docker Compose Setup](#method-2-one-command-docker-compose-setup)
- [🔑 Environment Variables Reference](#-environment-variables-reference)
  - [Backend (`server/.env`)](#backend-serverenv)
  - [Frontend (`client/.env`)](#frontend-clientenv)
- [👤 Seeding the Administrator Account](#-seeding-the-administrator-account)
- [📡 API Endpoints Overview](#-api-endpoints-overview)
- [🧪 Automated Test Suites & Audits](#-automated-test-suites--audits)
- [🚢 Deployment Guide](#-deployment-guide)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🌟 Key Features

### 1. 🍱 Comprehensive Donation Management
* **Rich Donation Creation:** Post surplus meals with detailed quantities, perishability/expiry times, dietary classifications (Veg, Non-Veg, Vegan), preparation timestamps, location coordinates, and Cloudinary-hosted photos.
* **Smart Filtering:** Browse donations by urgency, distance, food category, and fulfillment status.
* **Auto-Expiration Daemon:** Integrated background worker automatically sweeps and cancels expired donations so no unsafe food is claimed.

### 2. 🔐 Dual-OTP Cryptographic Handoff
* **Pickup Verification:** When a volunteer arrives at the donor's address, the donor provides a unique **Pickup OTP** to confirm physical item collection.
* **Delivery Verification:** Once delivered to the NGO facility or beneficiary, the receiving NGO provides a **Delivery OTP** to conclude the transaction and credit the volunteer.

### 3. 🛡️ Concurrency & Race-Condition Safe
* **Atomic MongoDB Updates:** Prevents race conditions such as duplicate claims by multiple NGOs, overlapping volunteer dispatches, and conflicting state transitions.
* **Strict State Machine:** Donations follow a deterministic state pipeline: `pending` ➔ `accepted` ➔ `in-transit` ➔ `delivered` (or `cancelled` / `expired`).

### 4. 👥 4 Tailored Role Dashboards
* **Donor Dashboard:** Create donations, track real-time delivery status, view active OTPs, and review donation impact history.
* **NGO Dashboard:** Browse pending donations, accept items atomically, assign tasks to registered volunteers, and track inbound deliveries.
* **Volunteer Dashboard:** Claim pickup tasks, access turn-by-turn navigation data, enter pickup/delivery OTPs, and track completed community milestones.
* **Admin Control Center:** Platform analytics, verification of NGO legal documents, user account controls, and dispute/complaint management.

### 5. 📬 Real-Time Notifications & Email Alerts
* **Gmail OAuth2 & SMTP Engine:** Sends instant transactional updates (donation accepted, volunteer dispatched, delivered) with styled HTML emails.
* **In-App Notification Center:** Unread counters and instant system alerts for all roles.

---

## 🔄 How It Works (Platform Architecture)

### End-to-End Donation Lifecycle Flowchart

```mermaid
flowchart TD
    A([Donor Creates Listing]) -->|Status: pending| B{Available in Feed}
    B -->|Donation Past Due| C[Auto-Expiration Daemon]
    C -->|Status: expired| C1([Archived / Closed])
    
    B -->|NGO Accepts Donation| D[Atomic Allocation Check]
    D -->|Concurrent Clash| D1[HTTP 409 Conflict - Claim Denied]
    D -->|Claim Successful| E[Status: accepted]
    
    E --> F{Fulfillment Method}
    F -->|NGO Direct Pickup| G[NGO Dispatches Self]
    F -->|Volunteer Assigned / Claimed| H[Volunteer Assigned]
    
    G --> I[Volunteer / NGO arrives at Donor]
    H --> I
    
    I --> J[Donor provides Pickup OTP]
    J -->|OTP Verified| K[Status: in-transit]
    
    K --> L[Arrival at NGO / Beneficiary]
    L --> M[NGO provides Delivery OTP]
    M -->|OTP Verified| N[Status: delivered]
    
    N --> O([Completed & Logged in Impact Stats])
```

### Role-Based Workflows

1. **Food Donor (Restaurant / Individual / Event Organizer):**
   - Registers as `donor`.
   - Fills out a donation form specifying food type, number of servings, preparation time, consumption deadline, and address.
   - Retains a private **Pickup OTP** visible on their dashboard.
   - Hands food to the designated driver only upon successful OTP match.

2. **NGO (Charity / Shelter / Food Bank):**
   - Registers as `ngo` and submits legal registration documents for verification.
   - Once approved by Admin, views all active, pending donations in their operational perimeter.
   - Accepts a listing and either claims direct self-pickup or broadcasts a dispatch to verified volunteers.
   - Verifies final receipt by validating the **Delivery OTP**.

3. **Volunteer (Driver / Community Helper):**
   - Registers as `volunteer` and sets active transport mode.
   - Views delivery dispatches assigned by partner NGOs.
   - Navigates to the pickup location, requests the **Pickup OTP** from the donor, and transitions the donation to `in-transit`.
   - Transports items to the designated recipient and confirms completion via the recipient's **Delivery OTP**.

4. **Platform Administrator:**
   - Evaluates NGO verification applications and uploaded tax/trust certificates.
   - Reviews system performance, audit logs, and handles platform complaints.

### Trust & Integrity Protections

* **Sliding-Window Rate Limiting:** Protects `/api/auth/login` (5 attempts/min) and password reset triggers against credential stuffing and brute-force attacks.
* **IDOR & Mass Assignment Guards:** Prevents privilege escalation (`role: admin` injection) and restricts donation mutations solely to verified resource owners.
* **Helmet Security Headers:** Restricts CORS origins, enforces strict CSP, and prevents clickjacking and MIME-type sniffing.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router v7, Framer Motion, Axios, React Icons |
| **Backend API** | Node.js (v20 LTS), Express 5.x, Mongoose 9.x, Multer, Helmet, CORS |
| **Database** | MongoDB Atlas / Local MongoDB Community Edition |
| **Authentication** | JWT (JSON Web Tokens), Bcryptjs password hashing, Google OAuth2 integration |
| **Cloud Storage** | Cloudinary (for food images & NGO document verification) |
| **Email Service** | Nodemailer with Gmail OAuth2 & Standard SMTP relay support |
| **DevOps & Testing** | Docker, Docker Compose, Nodemon, Playwright, Vercel (Client), Render (API) |

---

## 📁 Project Structure

```text
food-donation-platform/
├── client/                     # Frontend Single Page Application (React + Vite)
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── assets/             # Images, SVGs, and brand styling
│   │   ├── components/         # Reusable UI, modals, forms & dashboard layouts
│   │   │   ├── common/         # Inputs, alerts, spinners, complaints modals
│   │   │   ├── donations/      # Create/Edit donation modals, donation cards
│   │   │   ├── layout/         # Navbar, Sidebar, Dashboard wrapper
│   │   │   └── ui/             # Status badges, stat counters, empty states
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── pages/              # Route pages (Home, Login, Register, Dashboards)
│   │   │   ├── auth/           # Login, Register, Forgot/Reset Password
│   │   │   ├── dashboards/     # Donor, NGO, Volunteer, Admin Dashboards
│   │   │   └── profile/        # User profile & document uploads
│   │   ├── routes/             # ProtectedRoute & RoleBasedRoute guards
│   │   ├── services/           # Axios API service instances
│   │   └── App.jsx             # Main router & page code-splitting
│   ├── .env.example            # Sample client configuration
│   ├── Dockerfile              # Multi-stage production Nginx container
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend REST API (Node.js + Express + Mongoose)
│   ├── config/                 # DB connection and Cloudinary initialization
│   ├── controllers/            # Business logic (Auth, Donations, NGO, Admin, Volunteers)
│   ├── middleware/             # Auth check, RBAC, Multer upload, Rate limiters
│   ├── models/                 # Mongoose Schemas (User, Donation, Complaint, Profiles)
│   ├── routes/                 # Express API routes
│   ├── scripts/                # Database backup, admin seed, and audit utilities
│   ├── services/               # Background cron workers (auto-expiration service)
│   ├── tests/                  # Concurrency, race condition, abuse, and recovery test suites
│   ├── utils/                  # OTP generator, email sender & transactional templates
│   ├── .env.example            # Sample server configuration
│   ├── Dockerfile              # Production Node.js Alpine container
│   ├── package.json
│   └── server.js               # Application entrypoint & graceful shutdown
│
├── Documentation/              # Architecture blueprints & UI wireframes
├── docker-compose.yml          # Unified multi-container orchestration
├── LICENSE                     # MIT License
└── README.md                   # Project documentation
```

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Node.js**: `v18.0.0` or higher (`v20.x LTS` recommended).  
   Verify with: `node -v`
2. **Git**: Installed and configured.  
   Verify with: `git --version`
3. **MongoDB**:
   - Either a free cloud cluster at [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended for fastest setup)
   - Or a local MongoDB instance running on `mongodb://localhost:27017/food-donation`
4. **Cloudinary Account (Free Tier)**: For storing food photos and verification docs. ([Sign up here](https://cloudinary.com/))
5. *(Optional)* **Docker & Docker Desktop**: If you prefer containerized deployment.

---

## 🚀 Seamless Local Installation & Setup

### Method 1: Manual Step-by-Step Setup (Recommended)

Follow these steps to run both backend and frontend directly on your development machine.

#### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/food-donation-platform.git
cd food-donation-platform
```

---

#### Step 2: Configure & Start the Backend

1. Navigate to the server folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the environment configuration file:
   - On Windows (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```
   - On macOS / Linux:
     ```bash
     cp .env.example .env
     ```

4. Open `.env` in your text editor and fill in your values (at minimum, `MONGO_URI` and `JWT_SECRET`):
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/food-donation?retryWrites=true&w=majority
   JWT_SECRET=super_secret_jwt_random_key_123456
   CLIENT_URL=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5173
   ```
   *(See the [Environment Variables Reference](#-environment-variables-reference) below for Cloudinary and Email setup).*

5. *(Optional)* Seed an Admin user:
   ```bash
   node scripts/seedAdmin.js
   ```
   *(Default credentials will be displayed in the terminal console).*

6. Start the server in development mode:
   ```bash
   npm run dev
   ```
   You should see:
   ```text
   Connected to MongoDB
   Expiration background cron started (running every 60s)
   Server running in development mode on port 5000
   ```

---

#### Step 3: Configure & Start the Frontend

1. Open a **new terminal window** and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the client environment file:
   - On Windows (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```
   - On macOS / Linux:
     ```bash
     cp .env.example .env
     ```

4. Verify that `client/.env` points to your local server:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. Start the frontend development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

🎉 **Your platform is now fully running and ready to use!**

---

### Method 2: One-Command Docker Compose Setup

If you have Docker Desktop installed, you can spin up the complete application with one command:

1. In the repository root, create `server/.env` based on `server/.env.example`.
2. Start the containers:
   ```bash
   docker compose up --build
   ```
3. Access the services:
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:5000](http://localhost:5000)
   - **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

To stop the containers:
```bash
docker compose down
```

---

## 🔑 Environment Variables Reference

### Backend (`server/.env`)

| Variable | Required | Description | Example / Default |
|---|---|---|---|
| `PORT` | No | Port on which the Express server listens | `5000` |
| `NODE_ENV` | Yes | Application environment mode | `development` or `production` |
| `MONGO_URI` | **Yes** | MongoDB connection string (Atlas or Local) | `mongodb+srv://user:pass@cluster.mongodb.net/sharebite` |
| `JWT_SECRET` | **Yes** | Secret string used to sign and verify JSON Web Tokens | `e.g. 64-char random hex string` |
| `CLIENT_URL` | Yes | URL of frontend client for CORS policy and email links | `http://localhost:5173` |
| `ALLOWED_ORIGINS` | No | Comma-separated list of allowed CORS origins | `http://localhost:5173,http://localhost:3000` |
| `CLOUDINARY_CLOUD_NAME` | Optional* | Cloudinary cloud identifier for uploads | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Optional* | Cloudinary access API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Optional* | Cloudinary private secret key | `abcdefghijklmnopqrstuvwx` |
| `GMAIL_USER` | Optional** | Email address used to send notifications | `notifications@yourdomain.com` |
| `GMAIL_CLIENT_ID` | Optional** | Google OAuth2 Client ID for Gmail API | `xxxx.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | Optional** | Google OAuth2 Client Secret for Gmail API | `GOCSPX-xxxx` |
| `GMAIL_REFRESH_TOKEN` | Optional** | Google OAuth2 Refresh Token | `1//04xxxx` |
| `FROM_NAME` | No | Display name for outbound emails | `ShareBite Support` |
| `FROM_EMAIL` | No | Sender email address | `noreply@sharebite.com` |

*\* Cloudinary keys are recommended for permanent media storage. When omitted in development, uploads fall back to local disk storage (`server/uploads/`).*  
*\*\* If email credentials are not supplied, email triggers log output safely to the server console without halting application flows.*

### Frontend (`client/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | Base URL for the backend API endpoints | `http://localhost:5000/api` |

---

## 👤 Seeding the Administrator Account

To manage NGOs and oversee the system, you can seed an initial administrative user into your database.

From inside the `server/` directory, run:
```bash
node scripts/seedAdmin.js
```

You can optionally specify custom credentials:
```bash
ADMIN_NAME="Super Admin" ADMIN_EMAIL="admin@sharebite.com" ADMIN_PASS="AdminSecurePass123!" node scripts/seedAdmin.js
```

Once executed, log in at `http://localhost:5173/login` with your admin credentials to access the **Admin Dashboard** (`/admin/dashboard`).

---

## 📡 API Endpoints Overview

The backend exposes a structured, RESTful JSON API under `/api`:

### Authentication (`/api/auth`)
- `POST /register` — Register a new account (`donor`, `ngo`, `volunteer`).
- `POST /login` — Authenticate credentials, apply rate-limiting, and obtain JWT.
- `GET /me` — Get current authenticated user profile.
- `POST /forgot-password` — Issue a password reset token via email.
- `PUT /reset-password/:resetToken` — Apply new password using cryptographic token.
- `PUT /updatedetails` — Update account profile details.
- `PUT /updatepassword` — Change password for authenticated session.

### Donations (`/api/donations`)
- `GET /` — Fetch donation listings with query filters (food type, status, urgency).
- `POST /` — Create a donation listing (supports multipart image upload).
- `GET /my-donations` — Fetch donations authored by the authenticated donor.
- `GET /:id` — Retrieve detailed record of an individual donation.
- `PUT /:id` — Update listing details (allowed only while in `pending` status).
- `DELETE /:id` — Cancel/remove a pending donation.
- `POST /:id/verify-pickup-otp` — Verify physical donor-to-driver handoff.
- `POST /:id/verify-delivery-otp` — Verify driver-to-recipient final delivery.

### NGO Management (`/api/ngos`)
- `GET /available-donations` — View all active unassigned food items available for claim.
- `POST /claim/:donationId` — Atomically claim an item (concurrency-protected).
- `POST /assign-volunteer` — Dispatch an accepted donation to a volunteer.
- `POST /upload-verification-doc` — Submit legal NGO registration documents.
- `GET /my-claims` — View donations currently accepted or fulfilled by this NGO.

### Volunteer Operations (`/api/volunteers`)
- `GET /tasks` — View tasks assigned to the authenticated volunteer.
- `POST /tasks/:donationId/accept` — Accept delivery dispatch assignment.
- `GET /stats` — Retrieve volunteer metrics (completed trips, hours, meals delivered).

### Administration (`/api/admin`)
- `GET /stats` — Overall platform summary counters and metrics.
- `GET /ngos/pending` — List NGOs awaiting documentation review.
- `PUT /ngos/:id/verify` — Approve or reject NGO legal verification.
- `GET /users` — Paginated user directory with role filters and account status toggles.
- `GET /complaints` & `PUT /complaints/:id` — Manage user disputes and tickets.

---

## 🧪 Automated Test Suites & Audits

ShareBite includes automated test suites covering edge cases, race conditions, and attack vectors:

| Test File | Objective | Command |
|---|---|---|
| `server/tests/raceConditionStressTest.js` | Simulates $N$ concurrent NGOs & volunteers claiming identical donations to verify atomic consistency. | `node server/tests/raceConditionStressTest.js` |
| `server/tests/authSecurityTest.js` | Validates JWT forgery rejection, role IDOR guards, and mass-assignment preventions. | `node server/tests/authSecurityTest.js` |
| `server/tests/apiAbuseTest.js` | Tests payload size limits (1MB), malformed ObjectIds, and rate-limiting limits. | `node server/tests/apiAbuseTest.js` |
| `server/tests/backgroundWorkerStressTest.js` | Verifies multi-worker auto-expiration without duplicate status updates. | `node server/tests/backgroundWorkerStressTest.js` |
| `server/scripts/dataConsistencyAudit.js` | Performs consistency checks across user records, donation states, and counters. | `node server/scripts/dataConsistencyAudit.js` |

To run the complete verification suite:
```bash
cd server
node tests/raceConditionStressTest.js
node tests/authSecurityTest.js
node tests/apiAbuseTest.js
node scripts/dataConsistencyAudit.js
```

---

## 🚢 Deployment Guide

### Deploying the Backend (e.g. Render, Railway, AWS EC2)
1. Set the root directory or service path to `server`.
2. Set Build Command: `npm install`.
3. Set Start Command: `node server.js`.
4. Configure all environment variables in your cloud provider's dashboard (see [Backend `.env`](#backend-serverenv)).
5. Ensure your `ALLOWED_ORIGINS` and `CLIENT_URL` match your live frontend URL.

### Deploying the Frontend (e.g. Vercel, Netlify)
1. Set root directory to `client`.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Set Environment Variable:
   - `VITE_API_URL`: Your live backend API URL (e.g. `https://your-api.onrender.com/api`).
5. A `vercel.json` rewrite file is already included to support client-side SPA routing (`/*` ➔ `/index.html`).

---

## 🤝 Contributing

Contributions are warmly welcomed! To contribute:

1. **Fork** the repository.
2. **Create a branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes with clear messages:
   ```bash
   git commit -m "feat: Add geolocation map view for pickup tracking"
   ```
4. **Push** your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a **Pull Request** and describe the changes made.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Built with ❤️ to reduce food waste and feed communities in need.</b><br>
  <sub>If you find this project helpful, please consider starring ⭐️ the repository!</sub>
</p>
