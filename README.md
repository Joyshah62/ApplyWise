# ApplyWise — AI-Powered Job Application Tracker

Stop losing track of where you applied. ApplyWise lets you save job postings in one click from any career page, then uses AI to tailor your resume and generate cover letters — all in one dashboard.

**Live app:** [apply-wise-gamma.vercel.app](https://apply-wise-gamma.vercel.app)

---

## What it does

- **Save jobs in one click** — click the extension on any job posting (LinkedIn, Greenhouse, Lever, Workday, or any company site) to instantly capture the company, role, URL, and full job description
- **AI resume tailoring** — paste your resume and get a fit score + line-by-line rewrite suggestions optimized for ATS
- **AI cover letter generation** — get a personalized cover letter written from your resume and the job description in seconds
- **Track every application** — see all your applications in a dashboard with status columns (Applied → Interviewing → Offer / Rejected)
- **Resume version management** — upload multiple PDF resumes and track which version you sent for each role

---

## Getting started

### 1. Create an account
Go to [apply-wise-gamma.vercel.app](https://apply-wise-gamma.vercel.app) and sign up for free.

### 2. Install the Chrome Extension

1. Download the latest extension from the [Releases page](https://github.com/Joyshah62/ApplyWise/releases)
2. Unzip the downloaded file
3. Open Chrome and go to `chrome://extensions/`
4. Turn on **Developer mode** (toggle in the top right)
5. Click **Load unpacked** and select the unzipped `extension` folder
6. Pin the ApplyWise icon to your Chrome toolbar

### 3. Start tracking

1. Click the ApplyWise icon in your toolbar and log in with your account
2. Browse to any job posting and click the icon to save it
3. Head to the dashboard to view, manage, and analyze your applications

---

## Using the AI features

### Resume Tailoring
1. Go to an application in your dashboard
2. Click **Analyze Resume**
3. Paste your resume text (or select an uploaded resume version)
4. Get an instant fit score and suggested rewrites for each bullet point

### Cover Letter Generation
1. Open any saved application
2. Click **Generate Cover Letter**
3. Your personalized cover letter is generated based on your resume and the job description
4. Copy, edit, and send

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, React Router, Lucide Icons |
| **Backend** | Python, Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Limiter, Gunicorn |
| **AI** | Groq API (LLaMA-3.3-70b-versatile) |
| **Database** | PostgreSQL (Supabase) |
| **Extension** | Vanilla JavaScript, Chrome Extension Manifest V3 |
| **Deployment** | Render (backend) · Vercel (frontend) |

---

## Self-hosting / Local Development

Want to run your own instance? See the instructions below.

### Prerequisites
- Python 3.10+
- Node.js 20+
- A [Groq API key](https://console.groq.com)

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in SECRET_KEY, JWT_SECRET_KEY, GROQ_API_KEY
FLASK_APP=wsgi.py flask db upgrade
python run.py
```
Runs on `http://localhost:5000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`

### Chrome Extension
Load the `extension/` folder via **Load unpacked** in `chrome://extensions/`. In the extension's Options page, set the API URL to `http://localhost:5000/api`.

### Environment variables
See `backend/.env.example` and `frontend/.env.example` for all available configuration options.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

MIT
