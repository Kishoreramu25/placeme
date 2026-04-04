# 🎓 ESEC Placement Portal

> **Erode Sengunthar Engineering College** — End-to-End Placement Management System

A full-stack placement portal that manages the complete placement lifecycle — from student profile submission and approval, to company drive management, student applications, and final placement record tracking.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui, Tailwind CSS |
| **State Management** | TanStack Query (React Query) |
| **Backend** | Supabase (PostgreSQL 17) |
| **Authentication** | Supabase Auth |
| **Server Functions** | Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL 17 via Supabase |
| **Hosting** | Vercel / Netlify (Frontend) |

---

## ✨ Features

### 👨‍🎓 Student
- Register and fill detailed profile (personal, academic, placement preferences)
- View placement drives eligible for their department
- Apply for placement drives
- Track application status (`Pending HOD → Approved HOD → Approved TPO`)

### 👨‍💼 HOD (Department Coordinator)
- Review and approve/reject student profiles
- Review and approve/reject student placement applications
- Create new student accounts with credentials
- Ban, suspend, or activate student accounts
- View all students in their department with login credentials

### 🏢 TPO (Placement Officer)
- Approve/reject student profiles after HOD approval
- Create and manage placement drives (company, role, eligibility criteria)
- Assign eligible departments to each drive
- Review and approve/reject student applications (final decision)
- Create HOD and student accounts
- View all user credentials (HODs and students)
- Upload and manage company visit records (CSV/Excel)
- Upload and manage placed students data (Excel — full inline editing)
- Full analytics and reporting dashboard

---

## 👥 User Roles

| Role | DB Value | Description |
|------|----------|-------------|
| **Student** | `student` | College students applying for placements |
| **HOD** | `department_coordinator` | Head of Department — manages dept students |
| **TPO** | `placement_officer` | Training & Placement Officer — manages all |
| **Management** | `management` | Read-only management view *(future)* |
| **Faculty** | `faculty` | Faculty reference *(future)* |

---

## 🔄 System Workflows

### 1. Student Profile Approval
```
Student signs up & fills profile
          ↓
    pending_hod  (default)
          ↓
HOD reviews → approved_by_hod
          ↓
TPO reviews → approved_by_tpo  ✅  (Student is now eligible for drives)
```

### 2. Auto Profile Creation on Signup
When a user signs up, the `handle_new_user_v5` trigger automatically:
- Creates a `profiles` record
- Assigns a `user_roles` entry
- If student → creates a `students_master` record with `pending_hod` status

### 3. Placement Drive Flow
```
TPO creates Company
          ↓
TPO creates Placement Drive
(sets eligibility: CGPA, backlogs, departments, deadline)
          ↓
TPO assigns eligible departments
          ↓
Students from eligible depts see the drive on their dashboard
(only if approved_by_tpo)
```

### 4. Student Application Flow
```
Student applies → status: pending_hod
          ↓
HOD reviews → approved_by_hod / rejected_by_hod
          ↓
TPO reviews → approved_by_tpo / rejected_by_tpo  ✅
```

### 5. Account Management
```
HOD/TPO fills Create User form
          ↓
Frontend calls Supabase Edge Function: create-user
          ↓
Edge Function creates auth user + stores credentials in:
  - student_credentials  (for students)
  - staff_credentials    (for HODs)
```

---

## 🗄️ Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | All user profiles (linked to Supabase Auth) |
| `user_roles` | Maps user → role |
| `students_master` | Extended student data + approval status |
| `departments` | Department master list |
| `companies` | Company database |
| `placement_drives` | Active placement drives |
| `drive_eligible_departments` | Department eligibility per drive |
| `placement_applications` | Student applications for drives |
| `student_placements` | Final placed student records |
| `student_credentials` | Student login credentials (for HOD/TPO view) |
| `staff_credentials` | HOD login credentials (for TPO view) |

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+
- npm or yarn
- A Supabase project (free tier works)

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/esec-placement-portal.git
cd esec-placement-portal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```
> Get these from: Supabase Dashboard → Project Settings → API

### 4. Set Up the Database
Run the following SQL files **in order** in the Supabase SQL Editor:

```
1. CREATE_STUDENT_MASTER.sql       → Core tables & triggers
2. SEED_DEPARTMENTS.sql            → Seed department data
3. FIX_RLS_POLICIES.sql            → Row Level Security policies
4. STUDENT_ACCOUNT_MANAGEMENT.sql  → student_credentials & staff_credentials tables
```

### 5. Deploy the Edge Function
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy the create-user edge function
supabase functions deploy create-user
```

### 6. Start the Development Server
```bash
npm run dev
```

Open **http://localhost:8080** in your browser.

---

## 👤 Default Admin / First-Time Setup

Since there's no super-admin UI yet, create your first **TPO account** manually via Supabase:

**Step 1 — Create auth user in Supabase Dashboard:**
1. Go to Supabase → Authentication → Users → Invite User
2. Enter the TPO's email and set a password

**Step 2 — Assign TPO role in SQL Editor:**
```sql
-- Replace with the actual user ID from auth.users
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-USER-UUID-HERE', 'placement_officer');

INSERT INTO public.profiles (id, full_name, email, department_id)
VALUES ('YOUR-USER-UUID-HERE', 'TPO Name', 'tpo@esec.ac.in', null);
```

**Step 3 — TPO logs in and creates HOD accounts via the portal.**

---

## 🔐 Security Notes

- `.env` is in `.gitignore` — never committed to Git
- `VITE_SUPABASE_PUBLISHABLE_KEY` is an **anon key** (safe for frontend)
- **Service role key** is only used inside Edge Functions (never exposed to browser)
- All tables use **Row Level Security (RLS)** policies
- Account creation (create-user) is handled by a **Supabase Edge Function** to enforce server-side auth

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # Sidebar, Header, DashboardLayout
│   └── placement/       # StudentPlacementTable, ExcelImport
├── hooks/               # useAuth, custom hooks
├── integrations/
│   └── supabase/        # Supabase client & types
└── pages/
    └── Dashboard/
        ├── Student/           # Student dashboard pages
        ├── DepartmentCoordinator/  # HOD dashboard pages
        ├── PlacementOfficer/  # TPO dashboard pages
        └── Settings.tsx
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is proprietary software developed for **Erode Sengunthar Engineering College**.

---

<p align="center">
  Built with ❤️ by <a href="https://zenetive.vercel.app">Zenetive Infotech</a>
</p>