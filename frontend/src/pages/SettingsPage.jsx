import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Lock, Save, Eye, EyeOff, Shield, CheckCircle, AlertTriangle, Bell, Send, Clock } from 'lucide-react';

function FormSection({ title, icon: Icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-arc-400/10 flex items-center justify-center">
          <Icon size={15} className="text-arc-400" />
        </div>
        <h3 className="font-display font-semibold text-base text-white">{title}</h3>
      </div>
      <div className="p-4 sm:p-6 space-y-4">{children}</div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileLoading,  setProfileLoading]  = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSaved,   setReminderSaved]   = useState(false);
  const [testLoading,     setTestLoading]     = useState(false);

  const profileForm  = useForm({ defaultValues: { name: user?.name || '', email: user?.email || '' } });
  const passwordForm  = useForm();
  const reminderForm  = useForm({
    defaultValues: {
      reminderEnabled:    false,
      reminderDaysBefore: 3,
      reminderTime:       '09:00',
      reminderWhatsappKey: '',
    }
  });

  // Load current reminder settings on mount
  useState(() => {
    api.get('/auth/reminder-settings').then(res => {
      reminderForm.reset(res.data);
    }).catch(() => {});
  });

  const handleReminderSave = async (data) => {
    setReminderLoading(true);
    setReminderSaved(false);
    try {
      await api.put('/auth/reminder-settings', {
        reminderEnabled:     data.reminderEnabled,
        reminderDaysBefore:  Number(data.reminderDaysBefore),
        reminderTime:        data.reminderTime,
        reminderWhatsappKey: data.reminderWhatsappKey,
      });
      setReminderSaved(true);
      toast.success('Reminder settings saved');
      setTimeout(() => setReminderSaved(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save reminder settings');
    } finally {
      setReminderLoading(false);
    }
  };

  const handleReminderTest = async () => {
    setTestLoading(true);
    try {
      await api.post('/auth/reminder-test');
      toast.success('Test triggered! Check server logs or watch for WhatsApp messages.');
    } catch (err) {
      toast.error('Failed to trigger test');
    } finally {
      setTestLoading(false);
    }
  };

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleProfileSave = async (data) => {
    if (data.name === user?.name && data.email === user?.email) {
      toast('No changes detected', { icon: 'ℹ️' });
      return;
    }
    setProfileLoading(true);
    try {
      const res = await api.put('/auth/update-profile', {
        name:  data.name.trim(),
        email: data.email.trim().toLowerCase(),
        });
      updateUser(res.data.user, res.data.token);
      toast.success('Profile updated');

      // If email changed, token refreshed — no logout needed
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handlePasswordSave = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (data.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put('/auth/update-profile', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      });
      toast.success('Password changed. Please log in again.');
      setTimeout(() => logout(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Password change failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-white mb-1">Settings</h1>
        <p className="text-white/30 text-sm">Manage your account credentials</p>
      </motion.div>

      {/* Current account */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex items-center gap-4 p-4 rounded-2xl border border-arc-400/15"
        style={{ background: 'rgba(0,229,255,0.03)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-display font-bold text-void-900"
          style={{ background: 'linear-gradient(135deg, #ffd873, #f59e0b)' }}>
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </div>
        <div>
          <p className="font-display font-semibold text-lg text-white">{user?.name}</p>
          <p className="text-sm text-white/40 font-mono">{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Shield size={10} className="text-arc-400" />
            <span className="text-xs text-arc-400 font-mono tracking-widest">ADMINISTRATOR</span>
          </div>
        </div>
      </motion.div>

      {/* Profile */}
      <FormSection title="Profile Information" icon={User} delay={0.1}>
        <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
          <div>
            <label className="label-text block mb-2">Display Name</label>
            <input className="input-field" placeholder="Your name"
              {...profileForm.register('name', { required: 'Name is required' })} />
            {profileForm.formState.errors.name && (
              <p className="text-xs text-plasma-400 mt-1">{profileForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="label-text block mb-2">Email Address</label>
            <input type="email" className="input-field" placeholder="admin@example.com"
              {...profileForm.register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
              })} />
            {profileForm.formState.errors.email && (
              <p className="text-xs text-plasma-400 mt-1">{profileForm.formState.errors.email.message}</p>
            )}
            <p className="text-xs text-white/25 mt-1.5">
              Changing your email re-issues your session token automatically.
            </p>
          </div>
          <button type="submit" disabled={profileLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-60">
            {profileLoading
              ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
              : <><Save size={14} /> Save Profile</>}
          </button>
        </form>
      </FormSection>

      {/* Password */}
      <FormSection title="Change Password" icon={Lock} delay={0.2}>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSave)} className="space-y-4">
          {[
            { name: 'currentPassword', label: 'Current Password', show: showCurrent, toggle: () => setShowCurrent(v => !v), placeholder: 'Enter current password' },
            { name: 'newPassword',     label: 'New Password',     show: showNew,     toggle: () => setShowNew(v => !v),     placeholder: 'Min. 8 characters' },
            { name: 'confirmPassword', label: 'Confirm New Password', show: showConfirm, toggle: () => setShowConfirm(v => !v), placeholder: 'Repeat new password' },
          ].map(field => (
            <div key={field.name}>
              <label className="label-text block mb-2">{field.label}</label>
              <div className="relative">
                <input
                  type={field.show ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder={field.placeholder}
                  autoComplete={field.name === 'currentPassword' ? 'current-password' : 'new-password'}
                  {...passwordForm.register(field.name, { required: true })}
                />
                <button type="button" onClick={field.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors" tabIndex={-1}>
                  {field.show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-start gap-2 p-3 rounded-xl bg-aurum-400/5 border border-aurum-400/15">
            <AlertTriangle size={13} className="text-aurum-300 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/40">
              You will be logged out after changing your password.
            </p>
          </div>

          <button type="submit" disabled={passwordLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-60">
            {passwordLoading
              ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
              : <><Lock size={14} /> Change Password</>}
          </button>
        </form>
      </FormSection>

      {/* ── Auto Reminders ── */}
      <FormSection title="Auto WhatsApp Reminders" icon={Bell} delay={0.3}>
        <form onSubmit={reminderForm.handleSubmit(handleReminderSave)} className="space-y-5">

          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8">
            <div>
              <p className="text-sm font-body text-white">Enable automatic reminders</p>
              <p className="text-xs text-white/35 mt-0.5">
                Sends WhatsApp to all active EMI borrowers automatically every day
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
              <input type="checkbox" className="sr-only peer"
                {...reminderForm.register('reminderEnabled')} />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer
                peer-checked:after:translate-x-full peer-checked:after:border-white
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                peer-checked:bg-arc-400" />
            </label>
          </div>

          {/* Days before */}
          <div>
            <label className="label-text block mb-2">
              Send reminder how many days before EMI?
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min="1" max="30"
                className="input-field w-24 text-center font-mono text-lg"
                {...reminderForm.register('reminderDaysBefore', { min: 1, max: 30 })}
              />
              <span className="text-sm text-white/40">days before EMI date</span>
            </div>
            <p className="text-xs text-white/25 mt-1.5">
              Set to 0 to send on the due date itself. Max 30 days.
            </p>
          </div>

          {/* Time */}
          <div>
            <label className="label-text block mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Send at (24h time)
            </label>
            <input
              type="time"
              className="input-field w-36 font-mono"
              {...reminderForm.register('reminderTime')}
            />
            <p className="text-xs text-white/25 mt-1.5">Server timezone (UTC). 09:00 = 2:30 PM IST.</p>
          </div>

          {/* CallMeBot API key */}
          <div>
            <label className="label-text block mb-2">CallMeBot API Key</label>
            <input
              type="text"
              className="input-field font-mono"
              placeholder="Your CallMeBot API key"
              {...reminderForm.register('reminderWhatsappKey')}
            />
            <p className="text-xs text-white/25 mt-1.5">
              Get your free key at{' '}
              <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                target="_blank" rel="noreferrer"
                className="text-arc-400 hover:underline">callmebot.com</a>
              {' '}— send "I allow callmebot to send me messages" to +34 644 59 78 42 on WhatsApp. This same key enables both auto-reminders and your WhatsApp OTP login.
            </p>
          </div>

          {/* How it works note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-arc-400/5 border border-arc-400/15">
            <Bell size={13} className="text-arc-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-white/50 space-y-1">
              <p>Each borrower with a phone number and active EMI loan will receive a WhatsApp message automatically.</p>
              <p>Their phone number must be saved on the loan. Only loans with EMI enabled are included.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={reminderLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {reminderLoading
                ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
                : reminderSaved
                ? <><CheckCircle size={14} /> Saved!</>
                : <><Save size={14} /> Save Settings</>}
            </button>

            <button type="button" onClick={handleReminderTest} disabled={testLoading}
              className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50">
              {testLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                : <><Send size={13} /> Send Test Now</>}
            </button>
          </div>

        </form>
      </FormSection>

    </div>
  );
}
