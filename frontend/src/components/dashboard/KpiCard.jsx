import { motion } from 'framer-motion';
import { useCountUp } from '../../hooks';
import { formatCompactINR } from '../../utils/calculations';
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap = {
  arc:   { border: 'border-arc-400/20',     shadow: 'shadow-arc',     icon: 'bg-arc-400/10 text-arc-400',     orb: 'from-arc-400 to-arc-600',     bar: 'from-arc-400 to-arc-600'     },
  gold:  { border: 'border-aurum-400/20',   shadow: 'shadow-aurum',   icon: 'bg-aurum-400/10 text-aurum-400', orb: 'from-aurum-300 to-aurum-500', bar: 'from-aurum-300 to-aurum-500' },
  green: { border: 'border-verdant-400/20', shadow: 'shadow-verdant', icon: 'bg-verdant-400/10 text-verdant-400', orb: 'from-verdant-400 to-verdant-500', bar: 'from-verdant-400 to-verdant-500' },
  red:   { border: 'border-plasma-400/20',  shadow: 'shadow-plasma',  icon: 'bg-plasma-400/10 text-plasma-400',  orb: 'from-plasma-400 to-plasma-500',  bar: 'from-plasma-400 to-plasma-500'  },
};

const valueColor = {
  arc:   'text-gradient-arc',
  gold:  'text-gradient-gold',
  green: 'text-verdant-400',
  red:   'text-gradient-plasma',
};

export default function KpiCard({ label, value, icon: Icon, color = 'arc', subtext, trend, delay = 0, isLive = false }) {
  const animated = useCountUp(value ?? 0, 1400);
  const c = colorMap[color] || colorMap.arc;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card rounded-2xl p-5 border relative overflow-hidden ${c.border} ${c.shadow}`}>

      {/* Background orb */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 blur-2xl bg-gradient-to-br ${c.orb}`} />

      {/* Top row */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {isLive && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-verdant-400/10 border border-verdant-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-verdant-400 live-dot" />
            <span className="text-xs font-mono text-verdant-400">LIVE</span>
          </div>
        )}
        {trend !== undefined && !isLive && (
          <div className={`flex items-center gap-1 text-xs font-mono ${trend >= 0 ? 'text-verdant-400' : 'text-plasma-400'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="space-y-1 relative">
        <p className="label-text">{label}</p>
        <p className={`font-display font-bold text-2xl tracking-tight ${valueColor[color] || 'text-white'}`}>
          {formatCompactINR(animated)}
        </p>
        {subtext && <p className="text-xs text-white/30 font-body">{subtext}</p>}
      </div>

      {/* Bottom accent */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.bar} opacity-50`} />
    </motion.div>
  );
}
