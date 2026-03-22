import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCompactINR, formatCurrency } from '../../utils/calculations';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-4 py-3 border border-verdant-400/20 space-y-1.5 text-xs">
      <p className="font-mono text-white/40">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-verdant-400" />
        <span className="text-white/50">Recovered</span>
        <span className="font-display font-semibold text-verdant-400 ml-auto">{formatCurrency(payload[0]?.value || 0)}</span>
      </div>
    </div>
  );
};

export default function GrowthChart({ monthlyTrend = [] }) {
  const chartData = monthlyTrend.map(item => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      month: `${monthNames[item._id.month - 1]} ${String(item._id.year).slice(2)}`,
      recovered: Math.round(item.totalRecovered),
    };
  });

  const hasData = chartData.length > 0;
  const totalThisYear = chartData.reduce((s, d) => s + d.recovered, 0);
  const lastMonth = chartData[chartData.length - 1]?.recovered || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl border border-white/5 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-verdant-400/10 flex items-center justify-center">
            <TrendingUp size={15} className="text-verdant-400" />
          </div>
          <div>
            <p className="section-title">Monthly Recovery Trend</p>
            <p className="text-xs text-white/30 font-mono">LAST 12 MONTHS</p>
          </div>
        </div>
        {hasData && (
          <div className="text-right">
            <p className="label-text">Last Month</p>
            <p className="font-display font-bold text-verdant-400">{formatCompactINR(lastMonth)}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-4 py-4" style={{ height: 220 }}>
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <TrendingUp size={32} className="text-white/10" />
            <p className="text-white/20 text-sm font-body">No payment data yet</p>
            <p className="text-white/10 text-xs">Record payments to see trends</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="recovGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e676" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => formatCompactINR(v)}
                width={62}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,230,118,0.15)', strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="recovered"
                stroke="#00e676" strokeWidth={2}
                fill="url(#recovGrad)" dot={false}
                activeDot={{ r: 4, fill: '#00e676', stroke: '#020408', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer summary */}
      {hasData && (
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-white/20 font-mono">TOTAL RECOVERED (PERIOD)</p>
          <p className="font-display font-semibold text-sm text-verdant-400">{formatCompactINR(totalThisYear)}</p>
        </div>
      )}
    </motion.div>
  );
}
