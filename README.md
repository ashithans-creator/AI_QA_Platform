# AI QA Engineering Platform

A production-grade, enterprise-ready centralized AI-driven QA platform. 
This platform combines AI Test Case Generation, AI Defect Reporting (with Jira Integration), an API Testing Assistant, a Database NL-to-SQL Assistant, and Playwright Automation test execution for the SauceDemo application.

## 🚀 Features

- **AI Test Case Generation:** Upload PRDs/Requirements or paste text to generate detailed test suites using OpenAI, Gemini, Groq, or Ollama.
- **AI Defect Reporting:** Log bugs with AI-generated Root Cause Analysis (RCA) and automatically push them to Jira.
- **API Testing Assistant:** Upload Swagger/OpenAPI specs to automatically generate RestAssured (Java) API automation code.
- **AI Database Assistant:** Query your database using Natural Language. The AI safely translates your prompt into SQL and executes it securely.
- **Automation Runner & Dashboard:** Trigger Playwright E2E automation suites (Smoke, Sanity, Regression) directly from the UI and watch the execution logs stream in real-time.
- **Analytics Dashboard:** Visualize pass/fail test execution metrics and defect trends with beautiful charts.

## 🏗 Architecture

The application is structured into three main components:
- **`frontend/`**: Vite + React + React Router v6 frontend using Lucide Icons and Recharts. Built with stunning glassmorphism CSS design.
- **`backend/`**: Node.js + Express backend that serves REST APIs, integrates with AI Services, parses files, and triggers child processes for automation runs.
- **`automation/`**: Playwright automation framework containing Page Object Models (POM), CSV data-driven test specs, and report generation for the SauceDemo app.

## 🛠 Prerequisites

- Node.js (v18+)
- Docker and Docker Compose (if deploying via containers)
- API Keys (Optional but recommended for AI features):
  - `OPENAI_API_KEY`
  - `GEMINI_API_KEY`
  - `GROQ_API_KEY`
  - `JIRA_API_TOKEN`, `JIRA_EMAIL`, `JIRA_BASE_URL`

## ⚙️ Setup and Deployment

You can run this application locally in development mode (using an embedded SQLite database) or via Docker (with a MySQL 8.0 database).

### Option 1: Local Development (Embedded SQLite)

If you don't have MySQL installed, the platform automatically falls back to an embedded SQLite database (`backend/qa_platform.db`) for a zero-configuration developer experience.

1. Run the setup script to install all dependencies:
   - **Windows:** Double click or run `start.bat`
   - **Unix/Mac:** Run `bash start.sh`

2. Start the Backend server:
   ```bash
   cd backend
   npm run dev
   ```
   *The backend will be available at http://localhost:5001*

3. Start the Frontend server (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   *The frontend will be available at http://localhost:3001*

### Option 2: Docker Compose (Production-like with MySQL)

1. Open your terminal in the root project directory.
2. Run the following command to build and spin up the MySQL, Backend, and Frontend containers:
   ```bash
   docker-compose up --build
   ```
3. Access the platform at **http://localhost:3001**
4. *Default Admin Login:* 
   - **Username:** `admin`
   - **Password:** `admin123`

## 🧪 Testing Logs & Execution

The backend automatically streams stdout and stderr logs from Playwright executions into the `executions` table. Real-time updates can be viewed on the **Execution** page in the frontend UI.
Test execution reports (JSON) are parsed to provide a line-by-line breakdown of Test Specs in the UI.

## 🛡 Security & Design Principles

- **Security:** The backend enforces JWT authentication, SQL Injection defenses via input sanitization, API rate limiting, and CORS headers. Write-destructive SQL queries (DROP, DELETE, TRUNCATE) are explicitly blocked in the DB Assistant module.
- **Aesthetics:** The UI is designed to wow users, featuring rich modern aesthetics, elegant dark mode palettes, gradient buttons, interactive hover states, and smooth slide-in animations.

---
*Built as a modular, scalable, and enterprise-ready AI QA Automation Platform.*
