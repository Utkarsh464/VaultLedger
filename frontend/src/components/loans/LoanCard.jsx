import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatCompactINR, getLoanDuration } from '../../utils/calculations';
import { Calendar, Phone, ChevronRight, Pause, TrendingUp } from 'lucide-react';

const statusConfig = {
  active:   { label: 'ACTIVE',   cls: 'badge-active'   },
  closed:   { label: 'CLOSED',   cls: 'badge-closed'   },
  paused:   { label: 'PAUSED',   cls: 'badge-paused'   },
  defaulted:{ label: 'DEFAULTED',cls: 'badge-defaulted'},
};

export default function LoanCard({ loan, index }) {
  const navigate = useNavigate();
  const computed  = loan.computed || {};
  const recovery  = computed.recoveryPercent || 0;
  const status    = statusConfig[loan.status] || statusConfig.active;

  const progressColor =
    recovery >= 100 ? '#00e676' :
    recovery >= 60  ? 'linear-gradient(90deg,#00e5ff,#00e676)' :
                      'linear-gradient(90deg,#ff4d6d,#00e5ff)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/loans/${loan._id}`)}
      className="glass-card rounded-2xl p-4 sm:p-5 border border-white/5 cursor-pointer
                 hover:border-arc-400/25 transition-all duration-300 group relative overflow-hidden">

      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.04) 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-display font-semibold text-base text-white truncate group-hover:text-arc-400 transition-colors">
              {loan.borrowerName}
            </h3>
            {loan.status === 'paused' && <Pause size={11} className="text-aurum-300 flex-shrink-0" />}
          </div>
          {loan.borrowerPhone && (
            <p className="text-xs text-white/25 font-mono flex items-center gap-1">
              <Phone size={9} /> {loan.borrowerPhone}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={status.cls}>{status.label}</span>
          <ChevronRight size={14} className="text-white/20 group-hover:text-arc-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Amounts grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="label-text mb-1">Principal</p>
          <p className="font-display font-semibold text-xs sm:text-sm text-white">{formatCompactINR(loan.principal)}</p>
        </div>
        <div>
          <p className="label-text mb-1">Interest</p>
          <p className="font-display font-semibold text-sm text-gradient-gold">{formatCompactINR(computed.interest || 0)}</p>
        </div>
        <div>
          <p className="label-text mb-1">Remaining</p>
          <p className={`font-display font-semibold text-sm ${(computed.remaining || 0) <= 0 ? 'text-verdant-400' : 'text-plasma-400'}`}>
            {formatCompactINR(Math.max(0, computed.remaining || 0))}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <p className="label-text">Recovery</p>
          <p className="text-xs font-mono text-white/40">{recovery.toFixed(1)}%</p>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: progressColor }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, recovery)}%` }}
            transition={{ duration: 1, delay: index * 0.06 + 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1 text-xs text-white/25 font-mono">
          <Calendar size={9} />
          <span>{getLoanDuration(loan.startDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-xs text-white/40">
            {loan.interestType}
          </span>
          <span className="font-mono text-xs text-white/30">{loan.interestRate}% p.a.</span>
        </div>
      </div>
    </motion.div>
  );
}
