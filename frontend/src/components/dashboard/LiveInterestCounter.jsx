import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { calculateLoanState } from '../../utils/calculations';

function TickingDigit({ digit }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={digit}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="inline-block tabular-nums">
        {digit}
      </motion.span>
    </AnimatePresence>
  );
}

function LiveNumber({ value }) {
  const str = value.toFixed(2);
  return (
    <span className="inline-flex">
      {str.split('').map((char, i) =>
        /\d/.test(char)
          ? <TickingDigit key={i} digit={char} />
          : <span key={i}>{char}</span>
      )}
    </span>
  );
}

export default function LiveInterestCounter({ loans = [] }) {
  const [totals, setTotals] = useState({ interest: 0, totalAmount: 0, activeCount: 0 });

  useEffect(() => {
    const tick = () => {
      let interest = 0;
      let totalAmount = 0;
      let activeCount = 0;
      for (const loan of loans) {
        if (loan.status !== 'active') continue;
        activeCount++;
        const state = calculateLoanState(loan, []);
        interest += state.interest;
        totalAmount += state.totalAmount;
      }
      setTotals({ interest, totalAmount, activeCount });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loans]);

  const fmt = (n) => {
    const [int, dec] = n.toFixed(2).split('.');
    return { int: Number(int).toLocaleString('en-IN'), dec };
  };

  const amount = fmt(totals.totalAmount);
  const interest = fmt(totals.interest);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-4 sm:p-6 border border-arc-400/20 relative overflow-hidden"
      style={{ boxShadow: '0 0 40px rgba(0,229,255,0.08)' }}>

      {/* Subtle scan lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,1) 4px)', backgroundSize: '100% 4px' }} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-arc-400" />
            <span className="label-text">Live Portfolio Tracker</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-arc-400/30 bg-arc-400/5">
            <div className="w-1.5 h-1.5 rounded-full bg-arc-400 live-dot" />
            <span className="text-xs font-mono text-arc-400 tracking-widest">LIVE</span>
          </div>
        </div>

        {/* Total amount */}
        <div className="mb-5">
          <p className="label-text mb-1.5">TOTAL AMOUNT DUE</p>
          <div className="font-display font-bold leading-none text-3xl sm:text-4xl lg:text-[2.4rem]">
            <span className="text-gradient-arc font-mono">
              ₹<LiveNumber value={totals.totalAmount} />
            </span>
          </div>
        </div>

        {/* Interest sub-counter */}
        <div className="p-4 rounded-xl border border-aurum-400/15" style={{ background: 'rgba(255,187,51,0.04)' }}>
          <p className="label-text mb-1">INTEREST ACCUMULATED</p>
          <div className="font-display font-semibold text-xl sm:text-2xl font-mono">
            <span className="text-gradient-gold">
              +₹<LiveNumber value={totals.interest} />
            </span>
          </div>
          <p className="text-xs text-white/20 font-body mt-1.5">
            Ticking across {totals.activeCount} active loan{totals.activeCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
