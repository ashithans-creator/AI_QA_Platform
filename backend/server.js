require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const db = require('./config/db');
const sanitizeMiddleware = require('./middleware/sanitize');
const errorHandler = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const testCaseRoutes = require('./routes/testCaseRoutes');
const defectRoutes = require('./routes/defectRoutes');
const apiRoutes = require('./routes/apiRoutes');
const dbRoutes = require('./routes/dbRoutes');
const jiraRoutes = require('./routes/jiraRoutes');
const executionRoutes = require('./routes/executionRoutes');
const dataDrivenRoutes = require('./routes/dataDrivenRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for local dev/simplicity in reports viewing
}));
app.use(cors({
  origin: '*', // Allows requests from Vite React app on any port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiter: Max 200 requests per 15 minutes from one IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Request Parsing & Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Input Sanitization (blocks basic XSS payloads)
app.use(sanitizeMiddleware);

// Serve static reports/screenshots from automation workspace
const automationReportsPath = path.join(__dirname, '..', 'automation', 'reports');
if (!fs.existsSync(automationReportsPath)) {
  fs.mkdirSync(automationReportsPath, { recursive: true });
}
app.use('/reports', express.static(automationReportsPath));

// REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/testcases', testCaseRoutes);
app.use('/api/defects', defectRoutes);
app.use('/api/api-assistant', apiRoutes);
app.use('/api/db-assistant', dbRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/data-driven', dataDrivenRoutes);
app.use('/api/jira', jiraRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'AI QA Engineering Platform API',
    database: db.getDbType()
  });
});

// Status Route — shows active AI provider and key presence
app.get('/api/status', (req, res) => {
  const provider = process.env.AI_PROVIDER || 'mock';
  const hasOpenAI  = !!process.env.OPENAI_API_KEY;
  const hasGemini  = !!process.env.GEMINI_API_KEY;
  const hasGroq    = !!process.env.GROQ_API_KEY;
  const hasOllama  = !!(process.env.OLLAMA_HOST);

  // Determine what provider is ACTUALLY running (mirrors ai.service.js logic)
  let activeProvider = provider;
  if (provider === 'openai'  && !hasOpenAI)  activeProvider = 'mock';
  if (provider === 'gemini'  && !hasGemini)  activeProvider = 'mock';
  if (provider === 'groq'    && !hasGroq)    activeProvider = 'mock';

  const maskKey = (key) => key ? `${key.substring(0, 6)}${'*'.repeat(10)}` : null;

  res.json({
    status: 'online',
    database: db.getDbType(),
    ai: {
      configuredProvider: provider,
      activeProvider,
      isMock: activeProvider === 'mock',
      keys: {
        openai:  hasOpenAI  ? maskKey(process.env.OPENAI_API_KEY)  : null,
        gemini:  hasGemini  ? maskKey(process.env.GEMINI_API_KEY)  : null,
        groq:    hasGroq    ? maskKey(process.env.GROQ_API_KEY)    : null,
        ollama:  hasOllama  ? (process.env.OLLAMA_HOST)            : null,
      }
    }
  });
});


// Error handling middleware (must be after routes)
app.use(errorHandler);

// Boot Server and Init DB
db.initDatabase()
  .then(async () => {
    // ── Startup Cleanup ─────────────────────────────────────────────────────
    // Any executions still marked RUNNING from a previous session are orphaned
    // (the server restarted / process crashed before they could finish).
    // Reset them to FAILED so the UI doesn't show a permanently-stuck run.
    try {
      const staleResult = await db.query(
        `UPDATE executions
         SET status = 'FAILED', logs = CONCAT(IFNULL(logs,''), '\n[SERVER RESTART] Execution was interrupted and marked FAILED.'), finished_at = CURRENT_TIMESTAMP
         WHERE status = 'RUNNING'`
      );
      if (staleResult.affectedRows > 0) {
        console.warn(`⚠️  Cleaned up ${staleResult.affectedRows} stale RUNNING execution(s) from the previous session.`);
      }
    } catch (err) {
      console.error('❌ Failed to cleanup stale executions on startup:', err.message);
    }
    // ────────────────────────────────────────────────────────────────────────

    app.listen(PORT, () => {
      console.log(`🚀 AI QA Platform Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
      console.log(`📡 Base API endpoint: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database: ', err.message);
    process.exit(1);
  });
