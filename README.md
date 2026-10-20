# FormFlow Pro — Google Forms-Inspired Web Application

**FormFlow** is a modern, responsive full-stack web application designed for creating and managing surveys, evaluations, event registrations, workshops, seminars, and university/college activities.

Built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL 15+, Auth, Realtime & RLS)** with a high-performance offline/local fallback.

---

## 🌟 Key Features

1. **Authentication & Role-Based Access Control (RBAC)**:
   - Pre-configured roles: `admin` (global control), `organizer` (owns forms & shared events), and `user` (respondent).
   - Persona switcher built-in for instant verification of permissions.
   - Dual authentication: Connects directly to Supabase Auth or runs in zero-friction local interactive mode.

2. **Form & Event Builder**:
   - Google Forms-inspired design: Card layout with teal top accent, title, and description.
   - 7 Question types:
     - **Short answer**
     - **Paragraph**
     - **Multiple choice** (single-selection with dynamic options)
     - **Checkboxes** (multi-selection with dynamic options)
     - **Dropdown** (select menu)
     - **Date** (calendar date picker)
     - **Linear scale** (custom range 1–5 or 1–10 with configurable min/max labels)
   - Re-ordering (Move Up / Down), Duplicate question, Delete question, and Required toggle.

3. **Form & Event Settings**:
   - Status switcher: `Draft`, `Published (Active)`, or `Closed`.
   - Public vs. Private access.
   - Response limit cap (e.g. max 150 submissions).
   - Submission deadline date/time.
   - Event Mode: Set event date, venue / meeting link, and participant capacity.

4. **Multi-Organizer Collaboration**:
   - Invite fellow organizers by email.
   - Assign `editor` or `viewer` permissions.
   - Row Level Security (RLS) policies enforce authorized modifications.

5. **Public Form Responder**:
   - Google Forms aesthetic: distraction-free, mobile-first responsive layout.
   - Client-side validation: Required question checks, email format checks, and range bounds.
   - Anti-duplicate submission protection.
   - Deadline and response limit enforcement.
   - Shareable links: Access any form via `http://localhost:5173/?form=<form-id>`.

6. **Analytics & Responses Dashboard**:
   - **Summary Tab**:
     - Visual bar charts with percentages and response distributions for multiple choice, checkboxes, and dropdowns.
     - Average score computation and rating histogram for linear scales.
     - Scrollable response feed for open-ended text answers.
   - **Individual Tab**:
     - Stepper navigation (Response 1 of N) with timestamps and exact submitted answers.
   - **Attendance & Check-in Tab** (for Event forms):
     - Participant table with status badges (`registered`, `confirmed`, `attended`, `cancelled`).
     - One-click **"Check In"** action to mark attendance with real-time timestamps.
     - Search and filter by participant name, email, or status.
   - **Export to CSV**:
     - Generates and downloads a clean CSV file including submission IDs, timestamps, participant data, and all answers.

---

## 🏗️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript |
| **Build & Dev Server** | Vite 5 (HMR, minimal memory overhead) |
| **Styling** | Tailwind CSS + Lucide Icons |
| **Backend & Database** | Supabase (PostgreSQL 15+, Auth, Row Level Security) |
| **Data Layer** | Hybrid Client (`formService.ts`) — connects directly to Supabase with local-storage fallback |
| **Platform** | Linux ARM64 (Android PRoot Ubuntu compatibility verified) |

---

## 🚀 Getting Started

### 1. Start Development Server

FormFlow is already installed and built in this directory. To launch the server:

```bash
npm run dev
```

The application runs on:
- **Local Browser:** `http://localhost:5173`
- **Network / Wi-Fi:** `http://<your-device-ip>:5173`

To build for production:
```bash
npm run build
```

---

## 🗄️ Supabase Setup & SQL Migrations

FormFlow runs out of the box in zero-config local mode. When you are ready to link your remote Supabase cloud project:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase Dashboard.
3. Open [`supabase/schema.sql`](file:///root/supabase/schema.sql) and paste the entire script into the SQL Editor, then click **Run**.
   - This sets up all 7 tables (`profiles`, `forms`, `questions`, `form_collaborators`, `responses`, `answers`, `event_registrations`).
   - Enables Row Level Security (RLS) on every table.
   - Creates helper functions `is_admin()` and `can_manage_form()`.
   - Creates automated triggers for user creation and updated timestamps.
4. Copy your **Project URL** and **Anon Public Key** from **Project Settings > API**.
5. Update your `.env` file in the root folder:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
6. Restart Vite or run `npm run build`. FormFlow will automatically detect the credentials and switch to live Supabase queries!

---

## 📱 Android ARM64 Ubuntu / PRoot Notes

* **Port Access**: Bound to port `5173` on `0.0.0.0` so you can test it directly in Android Chrome or Firefox at `http://localhost:5173`.
* **Resource Optimization**: Direct Supabase client calls avoid running heavy background Python/Postgres daemons on your Android device, conserving RAM and battery.
* **Tested & Verified**: TypeScript compilation (`tsc`) and Vite bundling (`vite build`) complete cleanly with 0 errors.
