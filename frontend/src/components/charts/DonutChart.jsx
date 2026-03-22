import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCompactINR, formatCurrency } from '../../utils/calculations';
import { PieChart as PieIcon } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="glass-card rounded-xl px-4 py-3 border border-white/10 text-xs">
      <p className="font-mono text-white/40 mb-1">{d.name.toUpperCase()}</p>
      <p className="font-display font-bold text-base" style={{ color: d.payload.fill }}>
        {formatCurrency(d.value)}
      </p>
      <p className="text-white/30 mt-0.5">{d.payload.pct?.toFixed(1)}% of total</p>
    </div>
  );
};

export default function DonutChart({ recovered = 0, pending = 0, total = 0 }) {
  const safeTotal = total || 1;
  const recovPct  = Math.min(100, (recovered / safeTotal) * 100);
  const pendPct   = Math.min(100, (pending  / safeTotal) * 100);
  const hasData   = recovered > 0 || pending > 0;

  const data = [
    { name: 'Recovered', value: recovered, fill: '#00e676', pct: recovPct },
    { name: 'Pending',   value: pending,   fill: '#ff4d6d', pct: pendPct  },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card rounded-2xl border border-white/5 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-arc-400/10 flex items-center justify-center">
            <PieIcon size={14} className="text-arc-400" />
          </div>
          <div>
            <p className="section-title">Recovery Split</p>
            <p className="text-xs text-white/30 font-mono">ALL LOANS</p>
          </div>
        </div>
        <p className="font-display font-bold text-xl text-gradient-arc">{recovPct.toFixed(0)}%</p>
      </div>

      {/* Donut */}
      <div className="px-5 pt-2 pb-0" style={{ height: 180 }}>
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <PieIcon size={32} className="text-white/10" />
            <p className="text-white/20 text-sm font-body">No loan data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={76}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-px border-t border-white/5">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
            <div className="min-w-0">
              <p className="text-xs text-white/35 font-mono">{d.name.toUpperCase()}</p>
              <p className="font-display font-bold text-sm truncate" style={{ color: d.fill }}>
                {formatCompactINR(d.value)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
