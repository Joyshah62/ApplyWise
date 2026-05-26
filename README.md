# ApplyWise - AI-Powered Job Application Tracker

ApplyWise is a full-stack, AI-powered job application tracker designed to help job seekers automatically log applications via a Chrome Extension and manage them in a centralized React dashboard. By leveraging advanced LLMs (Groq / LLaMA-3), ApplyWise not only tracks your progress but actively helps you improve your resume and generate tailored cover letters for every application.

## 🚀 Features

- **Chrome Extension (Manifest V3):** One-click metadata and job description extraction from Greenhouse, Lever, LinkedIn, and generic career pages.
- **AI Resume Tailoring:** An intelligent RAG pipeline that compares your resume text against a job description, providing a fit score and actionable line-by-line rewrite suggestions to bypass ATS.
- **Dynamic Cover Letter Generation:** Automatically generates a personalized, highly relevant cover letter based on your specific resume experiences and the job description.
- **Resume Version Management:** Upload and parse PDF resumes directly into the platform to track which resume version was used for which application.
- **Frontend Dashboard (React + Tailwind CSS):** A clean, modern UI with a Bento-grid dashboard, application tracking Kanban/Table, and rich AI analysis modals.
- **Backend API (Flask):** RESTful endpoints with JWT authentication, PyMuPDF for document parsing, and an SQLite database (easily configurable for Postgres).

## 🛠️ Architecture & Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, React Router, Lucide Icons.
- **Backend**: Python, Flask, SQLAlchemy, JWT Extended, PyMuPDF (PDF parsing), Groq API (LLaMA-3.3-70b-versatile).
- **Extension**: Vanilla JavaScript, Chrome Extension Manifest V3.

## 💻 Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up your environment variables:
   Copy the example environment file and add your actual API keys.
   ```bash
   cp .env.example .env
   ```
   **Important:** You must add your Groq API Key and a JWT secret to the `.env` file!

4. Initialize the database:
   ```bash
   export FLASK_APP=run.py
   flask db init
   flask db migrate -m "Init"
   flask db upgrade
   ```
5. Run the development server:
   ```bash
   python run.py
   ```
   *The backend runs on `http://localhost:5000`*

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend runs on `http://localhost:5173`*

### 3. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `extension` folder located inside the `ApplyWise` repository directory.
5. Pin the ApplyWise icon to your browser toolbar. Click the icon, log in to your account, and start using it on any job posting!

### 4. Docker Setup (Recommended / Simplified)

Instead of setting up Python virtual environments and Node modules manually on your host machine, you can run the entire full-stack application with a single command using Docker Compose.

1. Make sure **Docker Desktop** is running.
2. Configure your environment variables in `backend/.env` (ensure `GROQ_API_KEY` is set).
3. Build and launch all services in detached mode:
   ```bash
   docker compose up --build -d
   ```
4. Access the applications:
   - **React Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
   - **Flask Backend API**: [http://localhost:5000](http://localhost:5000)
5. To view real-time logs, run:
   ```bash
   docker compose logs -f
   ```
6. To shut down the services, run:
   ```bash
   docker compose down
   ```

## 📄 Resume Highlights
- **Chrome Extension Integration**: Built a Manifest V3 extension that captures job application metadata in one click, extracting company name, job title, portal URL, and job description with user confirmation.
- **AI/LLM Pipeline Integration**: Integrated Groq API and LLaMA-3 models to build an intelligent RAG pipeline that evaluates job descriptions against candidate resumes, generating dynamic fit-scores and ATS-optimized rewrite suggestions.
- **Full-Stack Analytics Dashboard**: Developed a React + Flask dashboard to track job applications, resume versions, and response analytics across multiple application portals, implementing PDF parsing logic to streamline user onboarding.
