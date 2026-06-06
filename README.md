# ApplyWise — AI-Powered Job Application Tracker

ApplyWise is a full-stack, AI-powered job application tracker that helps job seekers automatically log applications via a Chrome Extension and manage them in a centralized React dashboard. Powered by Groq / LLaMA-3, it provides resume fit scoring, ATS-optimized rewrite suggestions, and tailored cover letter generation.

## Features

- **Chrome Extension (Manifest V3):** One-click metadata and job description extraction from Greenhouse, Lever, LinkedIn, and generic career pages.
- **AI Resume Tailoring:** RAG pipeline that compares your resume against a job description, providing a fit score and line-by-line rewrite suggestions to bypass ATS filters.
- **Dynamic Cover Letter Generation:** Generates a personalized cover letter based on your resume and the job description.
- **Resume Version Management:** Upload and parse PDF resumes to track which version was used for each application.
- **Frontend Dashboard (React + Tailwind CSS):** Bento-grid dashboard, Kanban/Table application tracker, and AI analysis modals.
- **Backend API (Flask):** RESTful endpoints with JWT authentication, PDF parsing, rate limiting, and Postgres/SQLite support.

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, React Router, Lucide Icons |
| **Backend** | Python, Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-Limiter, Gunicorn |
| **AI** | Groq API (LLaMA-3.3-70b-versatile) |
| **Database** | PostgreSQL (Supabase) · SQLite for local dev |
| **Extension** | Vanilla JavaScript, Chrome Extension Manifest V3 |
| **Deployment** | Render (backend) · Vercel (frontend) |

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 20+
- A [Groq API key](https://console.groq.com)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in your values
FLASK_APP=wsgi.py flask db upgrade
python run.py
```

The backend runs on `http://localhost:5000`.

> **Required `.env` values:** `SECRET_KEY`, `JWT_SECRET_KEY`, `GROQ_API_KEY`
> Leave `DATABASE_URL` unset to use a local SQLite file.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # set VITE_API_URL if needed
npm run dev
```

The frontend runs on `http://localhost:5173`.

### 3. Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder
4. Pin the ApplyWise icon to your toolbar
5. Click the icon on any job posting to start tracking

### 4. Docker (full stack)

```bash
cp backend/.env.example backend/.env   # fill in your values
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |

```bash
docker compose logs -f   # stream logs
docker compose down      # stop services
```

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Set **Root Directory** to `backend`
3. Set **Build Command** to `pip install -r requirements.txt`
4. Set **Start Command** to `flask db upgrade && gunicorn -w 4 -b 0.0.0.0:$PORT wsgi:app`
5. Add all environment variables from `backend/.env.example` in Render's dashboard

### Frontend → Vercel

1. Import the repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add `VITE_API_URL=https://your-backend.onrender.com/api` as an environment variable
4. Deploy — Vercel handles the build automatically

> After deploying both, update `ALLOWED_ORIGINS` in your Render backend environment to your Vercel frontend URL.

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all required and optional variables with descriptions.
