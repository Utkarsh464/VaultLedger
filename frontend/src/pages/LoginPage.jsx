import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Eye, EyeOff, Lock, WifiOff,
  Mail, Hash, ArrowLeft, RefreshCw, CheckCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// ── Shared helpers ────────────────────────────────────────────────────────────
function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-plasma-400/10 border border-plasma-400/20">
      <WifiOff size={13} className="text-plasma-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-plasma-400 leading-relaxed">{message}</p>
    </motion.div>
  );
}

function SuccessBox({ message }) {
  if (!message) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-verdant-400/10 border border-verdant-400/20">
      <CheckCircle size={13} className="text-verdant-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-verdant-400 leading-relaxed">{message}</p>
    </motion.div>
  );
}

// ── Forgot Password ───────────────────────────────────────────────────────────
function ForgotPasswordPanel({ onBack }) {
  const [step,    setStep]    = useState('email');
  const [email,   setEmail]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('otp');
      setSuccess('OTP sent to your email. Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length < 6)    { setError('Enter the 6-digit OTP.'); return; }
    if (newPass.length < 8){ setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack}
          className="text-white/30 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </button>
        <p className="text-xs font-mono text-white/30 tracking-wider">RESET PASSWORD</p>
      </div>

      <ErrorBox message={error} />
      <SuccessBox message={success} />

      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.form key="email"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="label-text block mb-1.5">Your Email Address</label>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                className="input-field" autoComplete="email" disabled={loading} />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50">
              {loading
                ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
                : <><Mail size={14} /><span>Send Reset OTP</span></>}
            </button>
          </motion.form>
        )}

        {step === 'otp' && (
          <motion.form key="otp"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="label-text block mb-1.5">OTP from Email</label>
              <input type="text" inputMode="numeric" maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="6-digit OTP"
                className="input-field tracking-[0.5em] text-center font-mono text-lg"
                disabled={loading} autoFocus />
            </div>
            <div>
              <label className="label-text block mb-1.5">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={newPass}
                  onChange={e => { setNewPass(e.target.value); setError(''); }}
                  placeholder="Min. 8 characters"
                  className="input-field pr-10" disabled={loading} />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit"
              disabled={loading || otp.length < 6 || newPass.length < 8}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50">
              {loading
                ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
                : 'Reset Password'}
            </button>
          </motion.form>
        )}

        {step === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-verdant-400/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-verdant-400" />
            </div>
            <p className="font-display font-semibold text-white mb-1">Password Reset!</p>
            <p className="text-sm text-white/40 mb-6">You can now sign in with your new password.</p>
            <button onClick={onBack} className="btn-primary flex items-center gap-2 mx-auto">
              <ArrowLeft size={14} /> Back to Login
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Login Page ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [view,     setView]     = useState('login'); // 'login' | 'forgot'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.');    return; }
    if (!password)     { setError('Password is required.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(!err.response
        ? 'Cannot reach server. Check your connection.'
        : err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00e5ff, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ffbb33, transparent)' }} />
        <div className="absolute inset-0 opacity-20 bg-grid-pattern" />
      </div>

      <div className="relative w-full max-w-sm sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}>

          {/* Logo */}
          <div className="text-center mb-7">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
              className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4 glow-arc"
              style={{ background: 'linear-gradient(135deg, #00e5ff, #00a8bc)' }}>
              <Shield size={25} className="text-void-900" strokeWidth={2.5} />
            </motion.div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">VaultLedger</h1>
            <p className="text-xs text-white/25 font-mono tracking-widest">PRIVATE LOAN MANAGEMENT</p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="glass-card rounded-2xl p-5 sm:p-7 border border-white/8"
            style={{ boxShadow: '0 0 60px rgba(0,229,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

            <AnimatePresence mode="wait">

              {/* ── FORGOT PASSWORD ── */}
              {view === 'forgot' && (
                <motion.div key="forgot"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ForgotPasswordPanel onBack={() => { setView('login'); setError(''); }} />
                </motion.div>
              )}

              {/* ── LOGIN ── */}
              {view === 'login' && (
                <motion.div key="login"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-5">

                  <div className="flex items-center gap-2 mb-1">
                    <Lock size={12} className="text-arc-400" />
                    <span className="text-xs font-mono text-white/25 tracking-widest">SECURE ACCESS</span>
                  </div>

                  <ErrorBox message={error} />

                  <form onSubmit={handleLogin} className="space-y-4" noValidate>
                    <div>
                      <label className="label-text block mb-1.5">Email Address</label>
                      <input
                        type="email" value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com"
                        className="input-field"
                        autoComplete="email"
                        disabled={loading}
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="label-text">Password</label>
                        <button type="button"
                          onClick={() => { setView('forgot'); setError(''); }}
                          className="text-xs text-arc-400 hover:text-arc-400/70 transition-colors">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'} value={password}
                          onChange={e => { setPassword(e.target.value); setError(''); }}
                          placeholder="••••••••••"
                          className="input-field pr-10"
                          autoComplete="current-password"
                          disabled={loading}
                          required
                        />
                        <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" /><span>Signing in...</span></>
                        : <><Shield size={14} /><span>Sign In</span></>}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <p className="text-center mt-5 text-xs text-white/15 font-body">
            Access restricted to authorized users only
          </p>
        </motion.div>
      </div>
    </div>
  );
}
