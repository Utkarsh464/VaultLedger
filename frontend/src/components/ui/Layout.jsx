import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, CreditCard, PlusCircle, LogOut,
  Shield, ChevronRight, Settings, Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/loans',     icon: CreditCard,      label: 'All Loans'  },
  { to: '/loans/new', icon: PlusCircle,      label: 'New Loan'   },
  { to: '/settings',  icon: Settings,        label: 'Settings'   },
];

function NavContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  return (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-arc flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00e5ff, #00a8bc)' }}>
              <Shield size={17} className="text-void-900" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display font-bold text-base text-white tracking-tight">VaultLedger</h1>
              <p className="text-xs text-white/25 font-mono">PRIVATE</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button onClick={onClose}
              className="lg:hidden text-white/30 hover:text-white p-1 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Live indicator */}
      <div className="px-5 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-verdant-400 live-dot" />
          <span className="text-xs font-mono text-white/25 tracking-widest">SYSTEM LIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body transition-all duration-200
               ${isActive ? 'text-void-900 font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'}`
            }
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(135deg, #00e5ff, #00a8bc)',
              boxShadow: '0 0 20px rgba(0,229,255,0.25)',
            } : {}}>
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={13} strokeWidth={2.5} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-display font-bold text-void-900"
            style={{ background: 'linear-gradient(135deg, #ffd873, #f59e0b)' }}>
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-white/25 truncate font-mono">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/40
                     hover:text-plasma-400 hover:bg-plasma-400/10 transition-all duration-200">
          <LogOut size={14} />
          <span className="font-body">Sign Out</span>
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close on escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen">

      {/* ── Desktop sidebar (always visible lg+) ─────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-white/5 fixed top-0 left-0 h-full z-30"
        style={{ background: 'rgba(2,4,8,0.97)', backdropFilter: 'blur(20px)' }}>
        <NavContent />
      </aside>

      {/* ── Mobile overlay backdrop ───────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* ── Mobile sidebar (slide in) ─────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="lg:hidden fixed top-0 left-0 h-full w-72 flex flex-col border-r border-white/5 z-50"
            style={{ background: 'rgba(2,4,8,0.99)' }}>
            <NavContent onClose={() => setSidebarOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 z-20"
          style={{ background: 'rgba(2,4,8,0.97)', backdropFilter: 'blur(20px)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl glass-card border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00e5ff, #00a8bc)' }}>
              <Shield size={12} className="text-void-900" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-sm text-white">VaultLedger</span>
          </div>

          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-display font-bold text-void-900"
            style={{ background: 'linear-gradient(135deg, #ffd873, #f59e0b)' }}>
            A
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
