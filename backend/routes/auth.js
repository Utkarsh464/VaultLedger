import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendSmsOtp, sendEmailOtp } from '../utils/otp.js';

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL + PASSWORD LOGIN
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PHONE OTP — STEP 1: Send OTP
// POST /api/auth/phone/send-otp   { phone: "9876543210" }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/phone/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    const user = await User.findOne({ phone: phone.trim() });
    if (!user)
      return res.status(403).json({ error: 'This phone number is not registered. Contact the administrator.' });

    // Throttle — max 1 OTP per 60 seconds
    if (user.otpExpiry && user.otpExpiry > new Date(Date.now() - 9 * 60 * 1000)) {
      const wait = Math.ceil((user.otpExpiry - Date.now() + 9 * 60 * 1000) / 1000 - 60);
      if (wait > 0) return res.status(429).json({ error: `Please wait ${wait}s before requesting another OTP.` });
    }

    const otp = user.generateOTP('phone_login');
    await user.save();
    await sendSmsOtp(phone, otp);

    res.json({ success: true, message: `OTP sent to ${phone.slice(0, 5)}*****` });
  } catch (err) {
    console.error('send-otp error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send OTP.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHONE OTP — STEP 2: Verify OTP
// POST /api/auth/phone/verify-otp  { phone, otp }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/phone/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required.' });

    const user = await User.findOne({ phone: phone.trim() });
    if (!user) return res.status(404).json({ error: 'Phone number not found.' });

    const valid = user.verifyOTP(otp, 'phone_login');
    await user.save();

    if (!valid) {
      const expired = !user.otpExpiry || new Date() > user.otpExpiry;
      if (expired) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      const left = 5 - (user.otpAttempts || 0);
      return res.status(400).json({ error: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.` });
    }

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — STEP 1: Send reset OTP to email
// POST /api/auth/forgot-password  { email }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond with success — don't reveal if email exists
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    // Throttle
    if (user.otpExpiry && user.otpExpiry > new Date(Date.now() - 9 * 60 * 1000)) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = user.generateOTP('password_reset');
    await user.save();
    await sendEmailOtp(email, otp, 'password_reset');

    res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send reset OTP.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — STEP 2: Verify OTP + set new password
// POST /api/auth/reset-password  { email, otp, newPassword }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ error: 'Email, OTP and new password are required.' });
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: 'Invalid request.' });

    const valid = user.verifyOTP(otp, 'password_reset');
    if (!valid) {
      await user.save(); // save incremented attempts
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

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required.' });
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google login is not configured.' });

    const ticket  = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;

    if (!email_verified) return res.status(401).json({ error: 'Google account email is not verified.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(403).json({ error: 'This Google account is not authorized. Contact the administrator.' });

    user.name    = name    || user.name;
    user.picture = picture || user.picture;
    await user.save();

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token'))
      return res.status(401).json({ error: 'Google session expired. Please try again.' });
    res.status(500).json({ error: 'Google authentication failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES (require JWT)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: 'Current password is required to set a new one.' });
      if (!user.password)
        return res.status(400).json({ error: 'This account uses Google login and has no password set.' });
      const match = await user.comparePassword(currentPassword);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      user.password = newPassword;
    }

    if (name)  user.name  = name.trim();
    if (phone) {
      const existing = await User.findOne({ phone: phone.trim(), _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ error: 'That phone number is already in use.' });
      user.phone = phone.trim();
    }
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

router.post('/register', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.status(403).json({ error: 'Registration closed. Admin already exists.' });
    const { email, password, name, phone } = req.body;
    const user = await User.create({ email: email?.toLowerCase(), password, name, phone });
    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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
