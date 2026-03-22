import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoan } from '../hooks';
import AddPaymentModal from '../components/loans/AddPaymentModal';
import ReminderModal from '../components/loans/ReminderModal';
import { formatCurrency, formatCompactINR, calculateLoanState } from '../utils/calculations';
import { exportLoanPDF } from '../utils/pdfExport';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Download, Plus, Pause, Play, Trash2, Bell, Edit2,
  TrendingUp, Calendar, Phone, MapPin, AlertTriangle,
  CheckCircle, Clock, CreditCard, Activity
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';

function LiveLoanCounter({ loan, payments }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!loan) return;
    const tick = () => setState(calculateLoanState(loan, payments));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loan, payments]);

  if (!state) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {[
        { label: 'Principal', value: state.principal, color: 'arc', fmt: formatCurrency },
        { label: 'Interest Accrued', value: state.interest, color: 'gold', fmt: formatCurrency, live: true },
        { label: 'Total Amount', value: state.totalAmount, color: 'arc', fmt: formatCurrency, live: true },
        { label: 'Remaining', value: state.remaining, color: state.remaining <= 0 ? 'green' : 'red', fmt: formatCurrency },
      ].map(item => (
        <div key={item.label} className={`glass-card rounded-xl p-4 border ${
          item.color === 'arc' ? 'border-arc-400/15' :
          item.color === 'gold' ? 'border-aurum-400/15' :
          item.color === 'green' ? 'border-verdant-400/15' : 'border-plasma-400/15'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="label-text">{item.label}</p>
            {item.live && <div className="w-1.5 h-1.5 rounded-full bg-verdant-400 live-dot" />}
          </div>
          <p className={`font-display font-bold text-xl font-mono ${
            item.color === 'arc' ? 'text-gradient-arc' :
            item.color === 'gold' ? 'text-gradient-gold' :
            item.color === 'green' ? 'text-verdant-400' : 'text-gradient-plasma'
          }`}>
            {item.fmt(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

const statusConfig = {
  active: { label: 'ACTIVE', icon: Activity, class: 'badge-active' },
  closed: { label: 'CLOSED', icon: CheckCircle, class: 'badge-closed' },
  paused: { label: 'PAUSED', icon: Pause, class: 'badge-paused' },
  defaulted: { label: 'DEFAULTED', icon: AlertTriangle, class: 'badge-defaulted' },
};

export default function LoanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useLoan(id);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="h-10 w-48 shimmer rounded-xl" />
      <div className="h-48 shimmer rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 shimmer rounded-xl" />)}
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="p-4 sm:p-8 flex items-center justify-center py-16 sm:py-24">
      <div className="text-center">
        <AlertTriangle size={48} className="text-plasma-400 mx-auto mb-4" />
        <p className="text-white/50">{error || 'Loan not found'}</p>
        <button onClick={() => navigate('/loans')} className="btn-ghost mt-4">Back to Loans</button>
      </div>
    </div>
  );

  const { payments = [], growthData = [], computed } = data;
  const loan = data;
  const status = statusConfig[loan.status] || statusConfig.active;
  const StatusIcon = status.icon;

  const handlePause = async () => {
    setActionLoading(true);
    try {
      if (loan.status === 'paused') {
        await api.post(`/loans/${id}/resume`);
        toast.success('Loan resumed');
      } else {
        await api.post(`/loans/${id}/pause`, { reason: 'Manual pause' });
        toast.success('Loan paused — interest halted');
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this loan and all payment records? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.delete(`/loans/${id}`);
      toast.success('Loan deleted');
      navigate('/loans');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportLoanPDF(loan, payments, computed);
      toast.success('PDF exported!');
    } catch (err) {
      toast.error('PDF export failed');
    }
  };

  const chartData = growthData.slice(-24); // Last 24 months

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6 max-w-[1200px]">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate('/loans')}
          className="flex items-center gap-2 text-white/30 hover:text-white font-body text-sm mb-4 transition-colors">
          <ArrowLeft size={14} /> All Loans
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-white">{loan.borrowerName}</h1>
              <span className={status.class}>
                <StatusIcon size={10} />
                {status.label}
              </span>
              {loan.interestType === 'CI' && (
                <span className="badge bg-arc-400/10 text-arc-400 border border-arc-400/20">COMPOUND</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-white/30 font-mono">
              {loan.borrowerPhone && (
                <span className="flex items-center gap-1"><Phone size={11} /> {loan.borrowerPhone}</span>
              )}
              {loan.borrowerAddress && (
                <span className="flex items-center gap-1"><MapPin size={11} /> {loan.borrowerAddress}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {format(new Date(loan.startDate), 'dd MMM yyyy')}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {loan.status !== 'closed' && (
              <button onClick={() => navigate(`/loans/${id}/edit`)}
                className="btn-ghost flex items-center gap-2 text-xs">
                <Edit2 size={13} /> Edit Loan
              </button>
            )}
            <button onClick={() => setShowReminderModal(true)}
              className="btn-ghost flex items-center gap-2 text-xs text-aurum-300 border-aurum-400/20 hover:border-aurum-400/40 hover:bg-aurum-400/10">
              <Bell size={13} /> Send Reminder
            </button>
            <button onClick={handleExportPDF} className="btn-ghost flex items-center gap-2 text-xs">
              <Download size={13} /> Export PDF
            </button>
            {loan.status !== 'closed' && (
              <button onClick={handlePause} disabled={actionLoading}
                className={`btn-ghost flex items-center gap-2 text-xs ${
                  loan.status === 'paused' ? 'text-verdant-400 border-verdant-400/20' : 'text-aurum-300 border-aurum-400/20'
                }`}>
                {loan.status === 'paused' ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}
              </button>
            )}
            {loan.status !== 'closed' && (
              <button onClick={() => setShowPaymentModal(true)}
                className="btn-primary flex items-center gap-2 text-xs">
                <Plus size={13} /> Add Payment
              </button>
            )}
            <button onClick={handleDelete} disabled={actionLoading} className="btn-danger flex items-center gap-2 text-xs">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </motion.div>

      {/* Live counters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <LiveLoanCounter loan={loan} payments={payments} />
      </motion.div>

      {/* Recovery progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">Recovery Progress</p>
          <p className="font-display font-bold text-2xl text-gradient-arc">{(computed?.recoveryPercent || 0).toFixed(1)}%</p>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #ff4d6d, #00e5ff, #00e676)' }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, computed?.recoveryPercent || 0)}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs font-mono text-white/30">
          <span>₹0</span>
          <span>Paid: {formatCurrency(computed?.totalPaid || 0)}</span>
          <span>{formatCurrency(computed?.totalAmount || 0)}</span>
        </div>
      </motion.div>

      {/* Loan details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

        {/* Loan parameters */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
          <p className="section-title">Loan Parameters</p>
          {[
            { label: 'Principal', value: formatCurrency(loan.principal) },
            { label: 'Interest Rate', value: `${loan.interestRate}% p.a.` },
            { label: 'Type', value: loan.interestType === 'SI' ? 'Simple Interest' : `CI (${loan.compoundingFrequency})` },
            { label: 'Start Date', value: format(new Date(loan.startDate), 'dd MMM yyyy') },
            loan.tenure && { label: 'Tenure', value: `${loan.tenure} months` },
            loan.emiEnabled && { label: 'Monthly EMI', value: formatCurrency(loan.emiAmount) },
            loan.penaltyEnabled && { label: 'Penalty', value: `${loan.penaltyRate}% (${loan.penaltyType})` },
          ].filter(Boolean).map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="label-text">{item.label}</span>
              <span className="font-mono text-sm text-white">{item.value}</span>
            </div>
          ))}
        </motion.div>

        {/* EMI breakdown (if enabled) */}
        {computed?.emiInfo && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-2xl p-5 border border-arc-400/15">
            <p className="section-title mb-4">EMI Breakdown</p>
            <div className="space-y-3 mb-4">
              {[
                { label: 'Monthly EMI', value: formatCurrency(computed.emiInfo.emi), color: 'text-arc-400' },
                { label: 'Total Payable', value: formatCurrency(computed.emiInfo.totalPayable), color: 'text-white' },
                { label: 'Total Interest', value: formatCurrency(computed.emiInfo.totalInterest), color: 'text-aurum-300' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="label-text">{item.label}</span>
                  <span className={`font-display font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            {/* Amortization mini table */}
            {computed.emiInfo.monthlyBreakdown?.length > 0 && (
              <div className="mt-4">
                <p className="label-text mb-2">First 6 EMIs</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {computed.emiInfo.monthlyBreakdown.slice(0, 6).map(row => (
                    <div key={row.month} className="flex justify-between text-xs font-mono text-white/40 py-1">
                      <span>M{row.month}</span>
                      <span className="text-verdant-400">P:{formatCompactINR(row.principal)}</span>
                      <span className="text-aurum-300">I:{formatCompactINR(row.interest)}</span>
                      <span>Bal:{formatCompactINR(row.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Pause periods */}
        {loan.pausePeriods?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-5 border border-aurum-400/15">
            <p className="section-title mb-4">Pause History</p>
            <div className="space-y-3">
              {loan.pausePeriods.map((p, i) => (
                <div key={i} className="p-3 rounded-xl bg-aurum-400/5 border border-aurum-400/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-aurum-300">Pause #{i + 1}</span>
                    {p.isActive && !p.endDate && (
                      <span className="badge bg-aurum-400/15 text-aurum-300 border border-aurum-400/20 text-xs">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-white/50">
                    {format(new Date(p.startDate), 'dd MMM yyyy')}
                    {p.endDate ? ` → ${format(new Date(p.endDate), 'dd MMM yyyy')}` : ' → ongoing'}
                  </p>
                  {p.reason && <p className="text-xs text-white/30 mt-1">{p.reason}</p>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Growth chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-5 border border-white/5">
          <p className="section-title mb-4">Amount Growth Over Time</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={d => format(new Date(d), 'MMM yy')} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => formatCompactINR(v)} width={65} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="glass-card rounded-xl p-3 border border-arc-400/20 text-xs space-y-1">
                        <p className="text-white/40 font-mono">{label}</p>
                        <p className="text-arc-400 font-semibold">Total: {formatCurrency(payload[0]?.value)}</p>
                      </div>
                    );
                  }}
                  cursor={{ stroke: 'rgba(0,229,255,0.2)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="totalAmount" stroke="#00e5ff" strokeWidth={2}
                  fill="url(#totalGrad)" dot={false}
                  activeDot={{ r: 4, fill: '#00e5ff', stroke: '#020408', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Payment history */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <p className="section-title">Payment History</p>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-white/30">{payments.length} TRANSACTIONS</span>
            <button onClick={() => setShowPaymentModal(true)}
              className="btn-primary text-xs py-1.5 flex items-center gap-1.5">
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard size={36} className="text-white/10 mb-3" />
            <p className="text-white/30 font-body">No payments recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {payments.map((p, i) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    p.type === 'penalty' ? 'bg-plasma-400/10' : 'bg-verdant-400/10'
                  }`}>
                    <CreditCard size={13} className={p.type === 'penalty' ? 'text-plasma-400' : 'text-verdant-400'} />
                  </div>
                  <div>
                    <p className="text-sm font-body text-white capitalize">{p.type.replace('_', ' ')} Payment</p>
                    <p className="text-xs text-white/30 font-mono">
                      {format(new Date(p.paymentDate), 'dd MMM yyyy, HH:mm')}
                      {p.note && ` · ${p.note}`}
                    </p>
                  </div>
                </div>
                <p className={`font-display font-bold ${p.type === 'penalty' ? 'text-plasma-400' : 'text-verdant-400'}`}>
                  {p.type === 'penalty' ? '' : '+'}
                  {formatCurrency(p.amount)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Notes */}
      {loan.notes && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="glass-card rounded-2xl p-5 border border-white/5">
          <p className="label-text mb-2">Notes</p>
          <p className="text-sm text-white/50 font-body">{loan.notes}</p>
        </motion.div>
      )}

      {/* Payment modal */}
      <AddPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        loan={data}
        onSuccess={refetch}
      />

      {/* Reminder modal */}
      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        loan={data}
        computed={computed}
      />
    </div>
  );
}
