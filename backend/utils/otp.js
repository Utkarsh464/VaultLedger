/**
 * OTP delivery
 * - Phone login  → WhatsApp via Twilio Sandbox (free, reliable, no DLT)
 * - Forgot password → Email via Nodemailer / Gmail
 */

import nodemailer from 'nodemailer';
import twilio from 'twilio';

// ── Send OTP via Twilio WhatsApp ──────────────────────────────────────────────
export async function sendSmsOtp(phone, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number

  if (!accountSid || !authToken)
    throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');

  // Normalize to E.164 with +91
  const cleaned    = phone.replace(/[\s\-()]/g, '');
  const normalized = cleaned.startsWith('+') ? cleaned
    : cleaned.startsWith('91') && cleaned.length === 12 ? `+${cleaned}`
    : `+91${cleaned}`;

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    from: from,
    to:   `whatsapp:${normalized}`,
    body: `🔐 Your VaultLedger OTP is: *${otp}*\n\nValid for 10 minutes. Do not share with anyone.`,
  });

  return true;
}

// ── Send OTP via Email (Nodemailer / Gmail) ───────────────────────────────────
export async function sendEmailOtp(email, otp, purpose = 'login') {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');

  if (!smtpUser || !smtpPass)
    throw new Error('Email not configured. Set SMTP_USER and SMTP_PASS in environment.');

  const transporter = nodemailer.createTransport({
    host:   smtpHost,
    port:   smtpPort,
    secure: smtpPort === 465,
    auth:   { user: smtpUser, pass: smtpPass },
  });

  const subject = purpose === 'password_reset'
    ? 'VaultLedger — Password Reset OTP'
    : 'VaultLedger — Login OTP';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#020408;border-radius:16px;overflow:hidden">
      <div style="background:#00e5ff;padding:20px 24px">
        <h2 style="margin:0;color:#020408;font-size:18px;font-weight:700">VaultLedger</h2>
        <p style="margin:4px 0 0;color:#020408;opacity:0.7;font-size:12px">PRIVATE LOAN MANAGEMENT</p>
      </div>
      <div style="padding:32px 24px">
        <p style="color:#aaa;margin:0 0 8px">
          Your ${purpose === 'password_reset' ? 'password reset' : 'login'} OTP is:
        </p>
        <div style="background:#0a1628;border:1px solid rgba(0,229,255,0.2);border-radius:12px;padding:24px;text-align:center;margin:16px 0">
          <span style="font-family:monospace;font-size:40px;font-weight:700;color:#00e5ff;letter-spacing:12px">${otp}</span>
        </div>
        <p style="color:#666;font-size:13px;margin:0">
          Valid for <strong style="color:#aaa">10 minutes</strong>. Do not share this OTP with anyone.
        </p>
      </div>
      <div style="background:#0a1628;padding:12px 24px;text-align:center">
        <p style="color:#333;font-size:11px;margin:0">VaultLedger — Confidential</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from:    `"VaultLedger" <${smtpUser}>`,
    to:      email,
    subject,
    html,
  });
  return true;
}
