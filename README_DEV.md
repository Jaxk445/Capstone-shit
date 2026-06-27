# Development README

## Project Overview

This repository is a Vite + React application for an internship management portal. The app uses Supabase for authentication, data storage, attendance, tasks, leave requests, notifications, performance reviews, and file uploads.

## Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project with the required tables and storage buckets
- Optional: Vercel account for deployment

## Environment Variables

Create a `.env` file in the project root and define the variables below:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_CHAT_API_URL=/api/chat
VITE_FACE_MODEL_URL=/models
VITE_YOLO_FACE_MODEL_ID=Xenova/yolov8n-face
VITE_YOLO_LOCAL_PATH=/models/yolov8n-face
VITE_YOLO_NANO_MODEL_ID=Xenova/yolov8n-face
VITE_YOLO_MEDIUM_MODEL_ID=Xenova/yolov8-medium-face
```

## Install

From the repository root:

```bash
npm install
```

If you are using Windows PowerShell in this workspace, use `npm.cmd` for build commands when necessary.

## Run Locally

Start the development server:

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build

Create a production build:

```bash
npm.cmd run build
```

If your shell allows plain npm execution, `npm run build` is equivalent.

## Install On Vercel

Use this when you want to deploy the website to Vercel from the `sanctum-sanctorum` branch or any other branch in this repo.

1. Push your latest code to the branch you want to deploy.
2. Sign in to Vercel and choose **Add New Project**.
3. Import this Git repository.
4. Set the framework preset to **Vite**.
5. Use these build settings:
	- Build Command: `npm run build`
	- Output Directory: `dist`
6. Add the required environment variables in the Vercel project settings:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
	- `VITE_CHAT_API_URL`
	- `VITE_FACE_MODEL_URL`
	- `VITE_YOLO_FACE_MODEL_ID`
	- `VITE_YOLO_LOCAL_PATH`
	- `VITE_YOLO_NANO_MODEL_ID`
	- `VITE_YOLO_MEDIUM_MODEL_ID`
7. Keep `api/chat.js` deployed as a serverless function through the existing `vercel.json`.
8. Deploy the project and verify the generated preview URL.

If you are testing locally on Windows PowerShell, `npm.cmd run build` is still the safer command, but Vercel will run the normal `npm run build` build step in its own environment.

## Preview Production Build

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Deployment Notes

- The app builds to `dist`.
- `vercel.json` serves `api/chat.js` as a serverless function.
- The chat route expects `react-markdown` to remain installed.
- The production policy already allows Supabase, Google Maps, and Anthropic API connections.

## Main Runtime Areas

- `src/App.jsx` handles auth, data loading, and role-gated routing.
- `src/views/AttendanceView.jsx` handles attendance, face verification, and geolocation checks.
- `src/views/TasksView.jsx` handles task creation, approval, revision, and uploads.
- `src/views/LeaveView.jsx` handles leave requests and approvals.
- `src/views/PerformanceReviewView.jsx` handles performance evaluations.
- `src/views/ContributionsView.jsx` handles discussion threads and replies.

## Notes For Contributors

- Keep Supabase schema changes aligned with the queries in `src/App.jsx` and the view components.
- Preserve role checks for `supervisor` and non-supervisor users.
- Verify the face model files in `public/models` remain in sync with the attendance flow.