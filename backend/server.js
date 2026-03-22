import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import authRoutes     from './routes/auth.js';
import { startScheduler } from './utils/scheduler.js';
import loanRoutes     from './routes/loans.js';
import paymentRoutes  from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import reminderRoutes from './routes/reminders.js';


// ── Validate required env vars at startup ────────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Check your .env file or deployment environment settings.');
  process.exit(1);
}

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // API-only, no HTML served
}));

// ── CORS — reads from env, supports multiple origins ─────────────────────────
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

if (allowedOrigins.includes('*') && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: ALLOWED_ORIGINS=* — all origins are permitted. Verify this is intentional.');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── NoSQL injection sanitization ──────────────────────────────────────────────
app.use(mongoSanitize());

// ── Global rate limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', globalLimiter);

// ── Stricter limiter for auth routes ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/loans',     loanRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reminders', reminderRoutes);

// ── Health check (for Render, uptime monitors) ────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbOk ? 'connected' : 'disconnected',
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // CORS errors
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join('. ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ error: `${field} already exists.` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  return res.status(401).json({ error: 'Invalid token.' });
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ error: 'Token expired. Please log in again.' });

  // Generic
  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}: ${err.message}`);
  res.status(status).json({ error: message });
});

// ── Database + Server startup ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`🔑 CORS allowed origins: ${allowedOrigins.join(', ')}`);
    startScheduler();
  });
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.error('   Check MONGODB_URI in your environment variables.');
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received. Closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  // Log but do not exit — unhandled rejections from third-party libs (nodemailer,
  // CallMeBot, google-auth-library) should not crash the whole server.
  // Route-level try/catch handles expected failures; this is a last-resort safety net.
  console.error('❌ Unhandled promise rejection:', err?.message || err);
});

export default app;
