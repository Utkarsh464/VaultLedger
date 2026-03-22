import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDashboard, useLoans } from '../hooks';
import KpiCard from '../components/dashboard/KpiCard';
import LiveInterestCounter from '../components/dashboard/LiveInterestCounter';
import DonutChart from '../components/charts/DonutChart';
import GrowthChart from '../components/charts/GrowthChart';
import { formatCompactINR, formatCurrency } from '../utils/calculations';
import {
  Wallet, TrendingUp, Coins, AlertCircle,
  RefreshCw, Clock, User, ChevronRight, Plus
} from 'lucide-react';
import { format } from 'date-fns';

function BorrowerProgressRow({ loan, index }) {
  const navigate = useNavigate();
  const recovery = loan.recoveryPercent || 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => navigate(`/loans/${loan._id}`)}
      className="group cursor-pointer hover:bg-white/2 rounded-xl p-2.5 -mx-2.5 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-display font-bold text-void-900"
            style={{ background: 'linear-gradient(135deg, #00e5ff, #00a8bc)' }}>
            {loan.borrowerName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-body font-medium text-white group-hover:text-arc-400 transition-colors truncate">
              {loan.borrowerName}
            </p>
            <p className="text-xs text-white/30 font-mono">{formatCompactINR(loan.remaining)} left</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <span className="text-xs font-mono text-white/40">{recovery.toFixed(0)}%</span>
          <ChevronRight size={12} className="text-white/20 group-hover:text-arc-400 transition-colors" />
        </div>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: recovery >= 100 ? '#00e676' : 'linear-gradient(90deg,#ff4d6d,#00e5ff)' }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, recovery)}%` }}
          transition={{ duration: 0.8, delay: index * 0.08 + 0.2 }}
        />
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, refetch } = useDashboard();
  const { loans } = useLoans();
  const navigate = useNavigate();
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = () => {
    const h = clock.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="h-10 w-48 shimmer rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => <div key={i} className="h-32 shimmer rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => <div key={i} className="h-56 shimmer rounded-2xl" />)}
      </div>
    </div>
  );

  const kpis           = data?.kpis           || {};
  const loanSummaries  = data?.loanSummaries  || [];
  const recentPayments = data?.recentPayments || [];
  const monthlyTrend   = data?.monthlyTrend   || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-8 max-w-[1400px]">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-white mb-0.5 truncate">
            {greeting()}, <span className="text-gradient-arc">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-white/30 text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
            <Clock size={12} />
            <span className="hidden sm:inline">{format(clock, 'EEEE, dd MMM yyyy')}</span>
            <span className="sm:hidden">{format(clock, 'dd MMM')}</span>
            <span className="font-mono text-arc-400/50">{format(clock, 'HH:mm:ss')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/loans/new">
            <button className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 sm:px-4">
              <Plus size={13} />
              <span className="hidden sm:inline">New Loan</span>
              <span className="sm:hidden">New</span>
            </button>
          </Link>
          <button onClick={refetch} className="btn-ghost flex items-center gap-1.5 text-xs py-2 px-3">
            <RefreshCw size={12} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* KPI Cards — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard label="Disbursed"    value={kpis.totalGiven || 0}          icon={Wallet}       color="arc"   subtext={`${kpis.totalLoans || 0} loans`}     delay={0}   />
        <KpiCard label="Recovered"    value={kpis.totalRecovered || 0}       icon={TrendingUp}   color="green" subtext={`${kpis.closedLoans || 0} closed`}   delay={0.08}/>
        <KpiCard label="Interest"     value={kpis.totalInterestEarned || 0}  icon={Coins}        color="gold"  subtext="Accrued"                              delay={0.16} isLive />
        <KpiCard label="Outstanding"  value={kpis.totalPending || 0}         icon={AlertCircle}  color="red"   subtext={`${kpis.activeLoans || 0} active`}   delay={0.24}/>
      </div>

      {/* Main grid — stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <LiveInterestCounter loans={loans} />
        <DonutChart
          recovered={kpis.totalRecovered || 0}
          pending={kpis.totalPending || 0}
          total={(kpis.totalRecovered || 0) + (kpis.totalPending || 0)}
        />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-4 sm:p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title text-sm sm:text-base">Borrower Progress</p>
            <button onClick={() => navigate('/loans')}
              className="text-xs text-arc-400 hover:text-arc-400/70 font-mono transition-colors">
              ALL →
            </button>
          </div>
          <div className="space-y-0.5">
            {loanSummaries.length === 0
              ? <p className="text-white/20 text-sm text-center py-8">No loans yet</p>
              : loanSummaries.slice(0, 5).map((loan, i) => (
                  <BorrowerProgressRow key={loan._id} loan={loan} index={i} />
                ))
            }
          </div>
        </motion.div>
      </div>

      {/* Growth chart */}
      <GrowthChart monthlyTrend={monthlyTrend} />

      {/* Recent payments */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5">
          <p className="section-title text-sm sm:text-base">Recent Transactions</p>
          <span className="text-xs font-mono text-white/30">LAST 10</span>
        </div>
        <div className="divide-y divide-white/5">
          {recentPayments.length === 0 && (
            <p className="text-white/20 text-sm text-center py-10">No payments yet</p>
          )}
          {recentPayments.map((p, i) => (
            <motion.div key={p._id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              onClick={() => p.loan?._id && navigate(`/loans/${p.loan._id}`)}
              className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-white/2 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-verdant-400/10 flex items-center justify-center flex-shrink-0">
                  <User size={13} className="text-verdant-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-body text-white truncate">{p.loan?.borrowerName || '—'}</p>
                  <p className="text-xs text-white/30 font-mono capitalize">
                    {p.type} · {format(new Date(p.paymentDate), 'dd MMM yy')}
                  </p>
                </div>
              </div>
              <p className="font-display font-semibold text-verdant-400 text-sm flex-shrink-0 ml-3">
                +{formatCompactINR(p.amount)}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
