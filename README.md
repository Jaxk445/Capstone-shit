# DJBC Capstone Project

A split frontend/backend monorepo for the employee dashboard used in the DJBC capstone project.

## Project Layout

- `frontend/` - React + Vite application with the dashboard UI, Supabase client, charts, maps, and chatbot features.
- `backend/` - Express server for API routes such as authentication and AI chat.

For the full frontend feature guide, setup notes, and UI-specific documentation, see [frontend/README.md](frontend/README.md).

## Quick Start

Clone the repository and install dependencies in the folder you want to work on.

```bash
git clone <repository-url>
cd Capstone-shit
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Start the backend:

```bash
cd backend
npm install
node index.js
```

## Available Scripts

Frontend scripts are defined in [frontend/package.json](frontend/package.json):

- `npm run dev` - start the Vite development server
- `npm run build` - build the production bundle
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint

Backend scripts are defined in [backend/package.json](backend/package.json):

- `npm start` - start the Express server

## Environment Variables

The frontend expects a `.env` file in `frontend/` with Supabase credentials. The backend uses its own `.env` file for the Anthropic API key.

Example frontend variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Backend

The backend currently exposes:

- `POST /api/auth/login`
- `POST /api/ai/chat`
- `GET /health`

## Deployment

The repository includes `vercel.json` for deployment support. Connect the project to Vercel or your preferred host and point the frontend and backend to the correct environment variables.

## License

This project is part of the DJBC Capstone Project.
