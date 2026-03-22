/**
 * Automatic WhatsApp Reminder Scheduler
 * Runs daily — checks all users with reminders enabled,
 * finds loans with EMI due within their configured days,
 * sends WhatsApp messages via CallMeBot automatically.
 */

import cron from 'node-cron';
import fetch from 'node-fetch';
import User from '../models/User.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import { calculateLoanState } from './interestCalc.js';

// ── Message builder ───────────────────────────────────────────────────────────
function buildReminderMessage(loan, computed, daysUntilDue) {
  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const due = daysUntilDue === 0 ? 'TODAY' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;

  return (
    `*💰 EMI Reminder — VaultLedger*\n\n` +
    `Dear *${loan.borrowerName}*,\n\n` +
    `Your EMI of *${fmt(loan.emiAmount)}* is due *${due}*.\n\n` +
    `• Principal: ${fmt(loan.principal)}\n` +
    `• Interest Accrued: ${fmt(computed.interest)}\n` +
    `• Total Due: *${fmt(computed.remaining)}*\n\n` +
    `Please ensure timely payment to avoid penalties.\n\n` +
    `_VaultLedger — Private Loan Management_`
  );
}

// ── Send via CallMeBot ────────────────────────────────────────────────────────
async function sendWhatsApp(phone, message, apiKey) {
  const cleaned    = phone.replace(/[\s\-()]/g, '');
  const normalized = cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${normalized}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;

  const res  = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  if (!res.ok || text.toLowerCase().includes('error')) {
    throw new Error(`CallMeBot: ${text.slice(0, 120)}`);
  }
  return true;
}

// ── Core job — runs for all users with reminders enabled ─────────────────────
async function runReminderJob() {
  const now = new Date();
  console.log(`[Scheduler] Running reminder job at ${now.toISOString()}`);

  const users = await User.find({
    reminderEnabled: true,
    reminderWhatsappKey: { $ne: '' },
  });

  if (users.length === 0) {
    console.log('[Scheduler] No users with reminders enabled.');
    return;
  }

  for (const user of users) {
    try {
      const loans = await Loan.find({
        owner: user._id,
        status: 'active',
        isDeleted: { $ne: true },
        emiEnabled: true,
        borrowerPhone: { $ne: '' },
      });

      let sent = 0, skipped = 0, failed = 0;

      for (const loan of loans) {
        try {
          // Calculate days until next EMI
          const today        = new Date();
          const emiDay       = loan.emiDayOfMonth || 1;
          let   nextEmi      = new Date(today.getFullYear(), today.getMonth(), emiDay);
          if (nextEmi < today) {
            // EMI day already passed this month — next one is next month
            nextEmi = new Date(today.getFullYear(), today.getMonth() + 1, emiDay);
          }
          const msPerDay     = 24 * 60 * 60 * 1000;
          const daysUntilDue = Math.round((nextEmi - today) / msPerDay);

          // Only send if within the configured days-before window
          if (daysUntilDue > user.reminderDaysBefore || daysUntilDue < 0) {
            skipped++;
            continue;
          }

          const payments = await Payment.find({ loan: loan._id });
          const computed  = calculateLoanState(loan.toObject(), payments);

          // Skip if already fully paid
          if (computed.remaining <= 0) { skipped++; continue; }

          const message = buildReminderMessage(loan, computed, daysUntilDue);
          await sendWhatsApp(loan.borrowerPhone, message, user.reminderWhatsappKey);
          sent++;

          // Avoid CallMeBot rate limiting
          await new Promise(r => setTimeout(r, 1500));

        } catch (loanErr) {
          console.error(`[Scheduler] Failed for loan ${loan._id} (${loan.borrowerName}):`, loanErr.message);
          failed++;
        }
      }

      // Update last run timestamp
      user.reminderLastRun = now;
      await user.save();

      console.log(`[Scheduler] User ${user.email}: ${sent} sent, ${skipped} skipped, ${failed} failed`);

    } catch (userErr) {
      console.error(`[Scheduler] Error processing user ${user.email}:`, userErr.message);
    }
  }

  console.log('[Scheduler] Job complete.');
}

// ── Start scheduler ───────────────────────────────────────────────────────────
export function startScheduler() {
  // Run every day at 09:00 server time
  // The cron expression: minute hour * * *
  cron.schedule('0 9 * * *', async () => {
    try {
      await runReminderJob();
    } catch (err) {
      console.error('[Scheduler] Unhandled error in reminder job:', err.message);
    }
  });

  console.log('✅ Reminder scheduler started — runs daily at 09:00');
}

// ── Manual trigger (for testing via API) ─────────────────────────────────────
export { runReminderJob };
