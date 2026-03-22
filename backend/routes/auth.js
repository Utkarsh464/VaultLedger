import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendEmailOtp } from '../utils/otp.js';

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond success — don't reveal if email exists
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    // Throttle — 1 OTP per 60 seconds
    if (user.otpExpiry && user.otpExpiry > new Date(Date.now() - 9 * 60 * 1000)) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = user.generateOTP();
    await user.save();
    await sendEmailOtp(email, otp, 'password_reset');

    res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send reset OTP.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ error: 'Email, OTP and new password are required.' });
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: 'Invalid request.' });

    const valid = user.verifyOTP(otp);
    if (!valid) {
      await user.save();
      const expired = !user.otpExpiry || new Date() > user.otpExpiry;
      if (expired) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      const left = 5 - (user.otpAttempts || 0);
      return res.status(400).json({ error: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.` });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

// ── PUT /api/auth/update-profile ──────────────────────────────────────────────
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: 'Current password is required.' });
      if (!user.password)
        return res.status(400).json({ error: 'No password set on this account.' });
      const match = await user.comparePassword(currentPassword);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
      if (newPassword.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      user.password = newPassword;
    }

    if (name) user.name = name.trim();
    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(400).json({ error: 'That email is already in use.' });
      user.email = email.toLowerCase().trim();
    }

    await user.save();
    res.json({ user, token: signToken(user._id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/auth/register (first-time setup only) ───────────────────────────
router.post('/register', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0)
      return res.status(403).json({ error: 'Registration closed. Admin already exists.' });
    const { email, password, name } = req.body;
    const user = await User.create({ email: email.toLowerCase(), password, name });
    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Reminder settings ─────────────────────────────────────────────────────────
router.get('/reminder-settings', protect, (req, res) => {
  const { reminderEnabled, reminderDaysBefore, reminderTime, reminderWhatsappKey, reminderLastRun } = req.user;
  res.json({ reminderEnabled, reminderDaysBefore, reminderTime, reminderWhatsappKey, reminderLastRun });
});

router.put('/reminder-settings', protect, async (req, res) => {
  try {
    const { reminderEnabled, reminderDaysBefore, reminderTime, reminderWhatsappKey } = req.body;
    const user = await User.findById(req.user._id);
    if (typeof reminderEnabled   === 'boolean') user.reminderEnabled    = reminderEnabled;
    if (reminderDaysBefore !== undefined)        user.reminderDaysBefore = Math.min(30, Math.max(1, Number(reminderDaysBefore)));
    if (reminderTime !== undefined)              user.reminderTime       = reminderTime;
    if (reminderWhatsappKey !== undefined)       user.reminderWhatsappKey = reminderWhatsappKey.trim();
    await user.save();
    res.json({ reminderEnabled: user.reminderEnabled, reminderDaysBefore: user.reminderDaysBefore, reminderTime: user.reminderTime, reminderWhatsappKey: user.reminderWhatsappKey });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reminder-test', protect, async (req, res) => {
  try {
    const { runReminderJob } = await import('../utils/scheduler.js');
    await runReminderJob();
    res.json({ success: true, message: 'Test run complete. Check server logs.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
