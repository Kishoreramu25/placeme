# ESEC Placement Portal

End-to-end placement workflow platform for Erode Sengunthar Engineering College.

This portal supports the complete operational flow across Student, HOD, and TPO dashboards:
- profile verification
- drive management
- eligibility tracking
- application approvals
- attendance tracking
- notifications with direct action routing

## Tech Stack

- Frontend: React 18, TypeScript, Vite
- UI: Tailwind CSS, shadcn/ui
- State/Data Fetching: TanStack Query
- Backend/Auth: Supabase
- Build/Deploy: Vite + Vercel compatible

## User Roles

- Student
- Department Coordinator (HOD)
- Placement Officer (TPO)
- Management

## Core Product Flows

### 1) Student Profile Verification Flow

1. Student fills profile and submits for verification.
2. HOD reviews pending student profiles and approves/rejects.
3. TPO performs final verification.
4. Student is ready for placement workflow after final verification.

### 2) Drive Lifecycle

1. TPO creates and schedules drives.
2. Eligibility is evaluated for students.
3. HOD and TPO can open `Eligible Student Roster` for each drive.
4. Roster supports export, filters, and status segmentation.

### 3) Application Approval Flow

1. Eligible student applies for a drive.
2. HOD reviews drive applications.
3. TPO performs final approval/rejection.
4. Student sees final status updates in dashboard notifications and drive status.

### 4) Attendance and Reason Tracking

Inside drive eligibility/attendance views:
- Applied/Present/Absent/Not Applied states are tracked.
- HOD can send reasons to TPO for not-applied and absent cases.
- Sent reasons are marked in UI as `Marked as Sent`.

## Notification System (Current Behavior)

The app sends targeted notifications to the right person and includes `Open Action` routing.

Examples:
- Student submits profile -> HOD receives verification request.
- HOD approves profile -> TPO receives final verification request.
- HOD/TPO decision -> Student receives status notification.
- Student applies to drive -> HOD receives application notification.
- HOD approves drive application -> TPO receives final approval notification.
- HOD reason submission for not-applied/absent -> TPO receives follow-up notification.

## UI Highlights Added

- Notifications page simplified to a single `All Notifications` feed.
- Notification sorting: `New To Old` / `Old To New`.
- Bell dropdown + full notifications page both support:
  - mark as seen
  - open action
  - role-aware notification cards
- TPO Student Master `Configure Grid` includes case-insensitive field search.
- Drive roster export is now Excel (`.xlsx`) instead of CSV.

## Run Locally

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

Create `.env` in project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

### Start

```bash
npm run dev -- --host 0.0.0.0 --port 8081
```

Open:
- http://localhost:8081/

### Production Build

```bash
npm run build
```

## Project Structure

```text
src/
  components/
    dashboard/
    layout/
    ui/
  hooks/
  integrations/
  lib/
  pages/
    Dashboard/
      Student/
      DepartmentCoordinator/
      PlacementOfficer/
```

## Notes

- `.env` is ignored by git.
- Use role-specific test accounts to validate each dashboard flow.
- If UI shows stale code during development, do a hard refresh (`Ctrl+Shift+R`).
