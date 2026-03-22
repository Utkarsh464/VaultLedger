import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Mail, Send, Phone, Key, Server, ChevronDown, ChevronUp, Zap, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/calculations';

const TABS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-verdant-400' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-arc-400' },
  { id: 'bulk', label: 'Bulk WhatsApp', icon: Users, color: 'text-aurum-300' },
];

function InfoBox({ children }) {
  return (
    <div className="p-3 rounded-xl bg-arc-400/5 border border-arc-400/15 text-xs text-white/40 font-body leading-relaxed">
      {children}
    </div>
  );
}

export default function ReminderModal({ isOpen, onClose, loan, computed }) {
  const [tab, setTab] = useState('whatsapp');
  const [loading, setLoading] = useState(false);
  const [showSmtp, setShowSmtp] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const waForm = useForm({
    defaultValues: { phone: loan?.borrowerPhone || '', apiKey: '', customMessage: '' }
  });
  const emailForm = useForm({
    defaultValues: { toEmail: '', smtpUser: '', smtpPass: '', smtpHost: 'smtp.gmail.com', smtpPort: 587, customMessage: '' }
  });
  const bulkForm = useForm({ defaultValues: { apiKey: '', onlyOverdue: true } });

  const sendWhatsApp = async (data) => {
    setLoading(true);
    try {
      await api.post('/reminders/whatsapp', {
        loanId: loan._id,
        phone: data.phone,
        apiKey: data.apiKey,
        customMessage: data.customMessage || undefined,
      });
      toast.success('WhatsApp reminder sent!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (data) => {
    setLoading(true);
    try {
      await api.post('/reminders/email', {
        loanId: loan._id,
        toEmail: data.toEmail,
        customMessage: data.customMessage || undefined,
        smtp: {
          host: data.smtpHost,
          port: Number(data.smtpPort),
          user: data.smtpUser,
          pass: data.smtpPass,
        },
      });
      toast.success('Email reminder sent!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const sendBulk = async (data) => {
    setLoading(true);
    setBulkResult(null);
    try {
      const res = await api.post('/reminders/bulk-whatsapp', {
        apiKey: data.apiKey,
        onlyOverdue: data.onlyOverdue,
      });
      setBulkResult(res.data);
      toast.success(`Sent to ${res.data.sent} borrowers`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk send failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="glass-card sm:rounded-2xl rounded-t-2xl border border-arc-400/20 w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
              style={{ boxShadow: '0 0 40px rgba(0,229,255,0.1)' }}>

              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 glass-card z-10">
                <div>
                  <h2 className="font-display font-semibold text-base text-white">Send Reminder</h2>
                  {loan && <p className="text-xs text-white/30 font-mono mt-0.5">{loan.borrowerName} · Remaining: {formatCurrency(computed?.remaining || 0)}</p>}
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-mono transition-all
                      ${tab === t.id ? `${t.color} border-b-2 border-current bg-white/3` : 'text-white/30 hover:text-white/60'}`}>
                    <t.icon size={13} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* ── WhatsApp Tab ── */}
                {tab === 'whatsapp' && (
                  <form onSubmit={waForm.handleSubmit(sendWhatsApp)} className="space-y-4">
                    <InfoBox>
                      Uses <strong className="text-white/60">CallMeBot</strong> free API.{' '}
                      The borrower must first send <em>"I allow callmebot to send me messages"</em>{' '}
                      to <strong className="text-white/60">+34 644 59 78 42</strong> on WhatsApp.{' '}
                      Then they'll receive their personal API key.{' '}
                      <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                        target="_blank" rel="noreferrer"
                        className="text-arc-400 underline">Get API key →</a>
                    </InfoBox>

                    <div>
                      <label className="label-text block mb-2">
                        <Phone size={11} className="inline mr-1" />Borrower's WhatsApp Number
                      </label>
                      <input className="input-field" placeholder="+91 9876543210"
                        {...waForm.register('phone', { required: 'Phone number is required' })} />
                    </div>

                    <div>
                      <label className="label-text block mb-2">
                        <Key size={11} className="inline mr-1" />CallMeBot API Key
                      </label>
                      <input className="input-field" placeholder="e.g. 1234567"
                        {...waForm.register('apiKey', { required: 'API key is required' })} />
                    </div>

                    <div>
                      <label className="label-text block mb-2">Custom Message (optional)</label>
                      <textarea rows={3} className="input-field resize-none text-xs"
                        placeholder="Leave blank to use the auto-generated loan reminder message..."
                        {...waForm.register('customMessage')} />
                    </div>

                    <button type="submit" disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      {loading
                        ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
                        : <><MessageSquare size={14} /> Send WhatsApp</>}
                    </button>
                  </form>
                )}

                {/* ── Email Tab ── */}
                {tab === 'email' && (
                  <form onSubmit={emailForm.handleSubmit(sendEmail)} className="space-y-4">
                    <InfoBox>
                      Sends via your own SMTP server. For Gmail, use your Gmail address and an{' '}
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
                        className="text-arc-400 underline">App Password</a>{' '}
                      (not your regular password). Enable 2FA first.
                    </InfoBox>

                    <div>
                      <label className="label-text block mb-2">Send To (Borrower's Email)</label>
                      <input type="email" className="input-field" placeholder="borrower@example.com"
                        {...emailForm.register('toEmail', { required: true })} />
                    </div>

                    {/* SMTP config collapsible */}
                    <div>
                      <button type="button" onClick={() => setShowSmtp(v => !v)}
                        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors font-mono">
                        <Server size={12} />
                        SMTP Configuration
                        {showSmtp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      <AnimatePresence>
                        {showSmtp && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label-text block mb-1.5">SMTP Host</label>
                                <input className="input-field text-xs" placeholder="smtp.gmail.com"
                                  {...emailForm.register('smtpHost')} />
                              </div>
                              <div>
                                <label className="label-text block mb-1.5">Port</label>
                                <input type="number" className="input-field text-xs" placeholder="587"
                                  {...emailForm.register('smtpPort')} />
                              </div>
                            </div>
                            <div>
                              <label className="label-text block mb-1.5">Your Email (sender)</label>
                              <input type="email" className="input-field text-xs" placeholder="you@gmail.com"
                                {...emailForm.register('smtpUser', { required: true })} />
                            </div>
                            <div>
                              <label className="label-text block mb-1.5">App Password</label>
                              <input type="password" className="input-field text-xs" placeholder="Gmail App Password"
                                {...emailForm.register('smtpPass', { required: true })} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!showSmtp && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="label-text block mb-1.5">Your Email (sender)</label>
                            <input type="email" className="input-field" placeholder="you@gmail.com"
                              {...emailForm.register('smtpUser', { required: true })} />
                          </div>
                          <div>
                            <label className="label-text block mb-1.5">Gmail App Password</label>
                            <input type="password" className="input-field" placeholder="xxxx xxxx xxxx xxxx"
                              {...emailForm.register('smtpPass', { required: true })} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="label-text block mb-2">Custom Message (optional)</label>
                      <textarea rows={3} className="input-field resize-none text-xs"
                        placeholder="Leave blank to use the auto-generated HTML email..."
                        {...emailForm.register('customMessage')} />
                    </div>

                    <button type="submit" disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      {loading
                        ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
                        : <><Mail size={14} /> Send Email</>}
                    </button>
                  </form>
                )}

                {/* ── Bulk WhatsApp Tab ── */}
                {tab === 'bulk' && (
                  <form onSubmit={bulkForm.handleSubmit(sendBulk)} className="space-y-4">
                    <InfoBox>
                      Sends WhatsApp reminders to <strong className="text-white/60">all active borrowers</strong> who have a phone number stored.
                      Each borrower must have activated CallMeBot individually.
                      Messages are sent with a 1.5s delay between each to avoid rate limiting.
                    </InfoBox>

                    <div>
                      <label className="label-text block mb-2">
                        <Key size={11} className="inline mr-1" />Your CallMeBot API Key
                      </label>
                      <input className="input-field" placeholder="e.g. 1234567"
                        {...bulkForm.register('apiKey', { required: true })} />
                      <p className="text-xs text-white/25 mt-1">Note: Each borrower needs their own API key. This sends from YOUR number.</p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-arc-400"
                        {...bulkForm.register('onlyOverdue')} />
                      <span className="text-sm text-white/70 font-body">Only send to borrowers with outstanding balance</span>
                    </label>

                    <button type="submit" disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" /><span>Sending...</span></>
                        : <><Zap size={14} /> Send Bulk Reminders</>}
                    </button>

                    {/* Bulk results */}
                    {bulkResult && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-white/3 border border-white/10 space-y-2">
                        <p className="text-sm font-semibold text-white">
                          Results: {bulkResult.sent} sent / {bulkResult.total} total
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {bulkResult.results?.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs font-mono">
                              <span className="text-white/50">{r.borrower}</span>
                              <span className={
                                r.status === 'sent' ? 'text-verdant-400' :
                                r.status === 'failed' ? 'text-plasma-400' : 'text-white/30'
                              }>{r.status}{r.reason ? ` (${r.reason})` : ''}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
