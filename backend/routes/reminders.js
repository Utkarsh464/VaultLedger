import express from 'express';
import { serverError } from '../utils/serverError.js';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import { protect } from '../middleware/auth.js';
import { calculateLoanState } from '../utils/interestCalc.js';

const router = express.Router();
router.use(protect);

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildMessage(loan, computed, type = 'whatsapp') {
  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const br = type === 'email' ? '<br>' : '\n';
  const bold = (t) => type === 'email' ? `<strong>${t}</strong>` : `*${t}*`;

  return type === 'email'
    ? `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#020408;color:#fff;border-radius:12px;overflow:hidden">
        <div style="background:#00e5ff;padding:16px 24px">
          <h2 style="margin:0;color:#020408;font-size:18px">💰 Loan Repayment Reminder</h2>
        </div>
        <div style="padding:24px">
          <p style="color:#aaa;margin-top:0">Dear <strong style="color:#fff">${loan.borrowerName}</strong>,</p>
          <p style="color:#ccc">This is a friendly reminder regarding your outstanding loan.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            ${[
              ['Principal', fmt(loan.principal)],
              ['Interest Rate', `${loan.interestRate}% p.a. (${loan.interestType})`],
              ['Current Interest', fmt(computed.interest)],
              ['Total Amount Due', fmt(computed.totalAmount)],
              ['Amount Paid', fmt(computed.totalPaid)],
              ['Remaining Balance', fmt(computed.remaining)],
            ].map(([k, v]) => `
              <tr style="border-bottom:1px solid #1a2a3a">
                <td style="padding:10px 0;color:#888;font-size:13px">${k}</td>
                <td style="padding:10px 0;color:#00e5ff;font-size:13px;text-align:right;font-weight:bold">${v}</td>
              </tr>`).join('')}
          </table>
          ${loan.emiEnabled ? `<p style="color:#ffbb33;font-size:13px">📅 Your monthly EMI is <strong>${fmt(loan.emiAmount)}</strong>. Please ensure timely payment to avoid penalties.</p>` : ''}
          <p style="color:#888;font-size:12px;margin-top:24px">Please contact us if you have any questions or need to discuss payment arrangements.</p>
        </div>
        <div style="background:#0a1628;padding:12px 24px;text-align:center">
          <p style="color:#444;font-size:11px;margin:0">VaultLedger — Private Loan Management</p>
        </div>
      </div>
    `
    : `${bold('💰 Loan Reminder — VaultLedger')}${br}${br}Dear ${bold(loan.borrowerName)},${br}${br}This is a reminder about your outstanding loan:${br}${br}• Principal: ${bold(fmt(loan.principal))}${br}• Interest Rate: ${loan.interestRate}% p.a. (${loan.interestType})${br}• Interest Accrued: ${bold(fmt(computed.interest))}${br}• Total Amount Due: ${bold(fmt(computed.totalAmount))}${br}• Amount Paid: ${fmt(computed.totalPaid)}${br}• ${bold('Remaining Balance: ' + fmt(computed.remaining))}${br}${loan.emiEnabled ? `${br}📅 Monthly EMI: ${bold(fmt(loan.emiAmount))}${br}` : ''}${br}Please make your payment at the earliest to avoid penalties.${br}${br}_VaultLedger_`;
}

// ── Send WhatsApp via CallMeBot ───────────────────────────────────────────────
async function sendWhatsApp(phone, message, apiKey) {
  // Normalize phone: remove spaces, dashes, ensure + prefix
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const normalized = cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
  const encoded = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${normalized}&text=${encoded}&apikey=${apiKey}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || text.toLowerCase().includes('error')) {
    throw new Error(`CallMeBot error: ${text}`);
  }
  return text;
}

// ── Send Email via Nodemailer ─────────────────────────────────────────────────
async function sendEmail(to, subject, html, smtpConfig) {
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port || 587,
    secure: smtpConfig.port === 465,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });
  await transporter.verify();
  const info = await transporter.sendMail({
    from: `"VaultLedger" <${smtpConfig.user}>`,
    to,
    subject,
    html,
  });
  return info.messageId;
}

// ── POST /api/reminders/whatsapp ─────────────────────────────────────────────
router.post('/whatsapp', async (req, res) => {
  try {
    const { loanId, phone, apiKey, customMessage } = req.body;
    if (!loanId || !phone || !apiKey)
      return res.status(400).json({ error: 'loanId, phone, and apiKey are required.' });
    if (!mongoose.Types.ObjectId.isValid(loanId))
      return res.status(400).json({ error: 'Invalid loanId format.' });

    const loan = await Loan.findOne({ _id: loanId, owner: req.user._id });
    if (!loan) return res.status(404).json({ error: 'Loan not found.' });

    const payments = await Payment.find({ loan: loan._id });
    const computed = calculateLoanState(loan.toObject(), payments);

    const message = customMessage || buildMessage(loan, computed, 'whatsapp');
    await sendWhatsApp(phone, message, apiKey);

    res.json({ success: true, message: 'WhatsApp reminder sent successfully.' });
  } catch (err) {
    return serverError(res, err);
  }
});

// ── POST /api/reminders/email ─────────────────────────────────────────────────
router.post('/email', async (req, res) => {
  try {
    const { loanId, toEmail, customMessage, smtp } = req.body;
    if (!loanId || !toEmail || !smtp?.user || !smtp?.pass)
      return res.status(400).json({ error: 'loanId, toEmail, and smtp credentials are required.' });
    if (!mongoose.Types.ObjectId.isValid(loanId))
      return res.status(400).json({ error: 'Invalid loanId format.' });

    const loan = await Loan.findOne({ _id: loanId, owner: req.user._id });
    if (!loan) return res.status(404).json({ error: 'Loan not found.' });

    const payments = await Payment.find({ loan: loan._id });
    const computed = calculateLoanState(loan.toObject(), payments);

    const html = customMessage
      ? `<div style="font-family:sans-serif;color:#fff;background:#020408;padding:24px;border-radius:8px">${customMessage}</div>`
      : buildMessage(loan, computed, 'email');

    const subject = `Loan Repayment Reminder — ${loan.borrowerName}`;
    // SMTP host allowlist — prevents SSRF via arbitrary host injection
    const SMTP_ALLOWED_HOSTS = [
      'smtp.gmail.com', 'smtp.outlook.com', 'smtp.office365.com',
      'smtp.yahoo.com', 'smtp.zoho.com', 'smtp.mail.yahoo.com',
    ];
    const smtpHost = smtp.host || 'smtp.gmail.com';
    if (!SMTP_ALLOWED_HOSTS.includes(smtpHost)) {
      return res.status(400).json({ error: `SMTP host '${smtpHost}' is not allowed.` });
    }

    const messageId = await sendEmail(toEmail, subject, html, {
      host: smtpHost,
      port: smtp.port || 587,
      user: smtp.user,
      pass: smtp.pass,
    });

    res.json({ success: true, message: 'Email reminder sent successfully.', messageId });
  } catch (err) {
    return serverError(res, err);
  }
});

// ── POST /api/reminders/bulk ──────────────────────────────────────────────────
// Send reminders to all active loans that have phone numbers.
// Responds immediately with 202 to avoid Render's 30s HTTP timeout on large portfolios.
// Results are processed async — check server logs or add a webhook for completion status.
router.post('/bulk-whatsapp', async (req, res) => {
  const { apiKey, onlyOverdue } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey is required.' });

  try {
    const loans = await Loan.find({ owner: req.user._id, status: 'active' });

    // Respond immediately — don't block on N × 1.5s sends
    res.status(202).json({
      success: true,
      queued: loans.length,
      message: `Processing ${loans.length} loans in background. Check server logs for results.`,
    });

    // Process async after response is sent
    const results = [];
    for (const loan of loans) {
      if (!loan.borrowerPhone) {
        results.push({ borrower: loan.borrowerName, status: 'skipped', reason: 'No phone number' });
        continue;
      }

      const payments = await Payment.find({ loan: loan._id });
      const computed = calculateLoanState(loan.toObject(), payments);

      if (onlyOverdue && computed.remaining <= 0) {
        results.push({ borrower: loan.borrowerName, status: 'skipped', reason: 'Fully paid' });
        continue;
      }

      try {
        const message = buildMessage(loan, computed, 'whatsapp');
        await sendWhatsApp(loan.borrowerPhone, message, apiKey);
        results.push({ borrower: loan.borrowerName, status: 'sent', phone: loan.borrowerPhone });
        await new Promise(r => setTimeout(r, 1500)); // Avoid CallMeBot rate limiting
      } catch (err) {
        results.push({ borrower: loan.borrowerName, status: 'failed', error: err.message });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    console.log(`[Bulk WhatsApp] Done: ${sent}/${loans.length} sent.`, JSON.stringify(results));
  } catch (err) {
    // Only reachable if res hasn't been sent yet (e.g. DB error before the loan query)
    if (!res.headersSent) return serverError(res, err);
    else console.error('[Bulk WhatsApp] Post-response error:', err.message);
  }
});

export default router;
