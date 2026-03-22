import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/calculations';

const PAYMENT_TYPES = [
  { value: 'partial',       label: 'Partial Payment' },
  { value: 'emi',           label: 'EMI Payment' },
  { value: 'full',          label: 'Full Settlement' },
  { value: 'interest_only', label: 'Interest Only' },
  { value: 'penalty',       label: 'Penalty' },
];

export default function AddPaymentModal({ isOpen, onClose, loan, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const remaining = loan?.computed?.remaining ?? 0;
  const emiAmount = loan?.computed?.emiInfo?.emi ?? loan?.emiAmount ?? '';

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      amount: emiAmount || '',
      type: loan?.emiEnabled ? 'emi' : 'partial',
      paymentDate: new Date().toISOString().split('T')[0],
      note: '',
    }
  });

  const onSubmit = async (data) => {
    if (!loan?._id) return;
    setLoading(true);
    try {
      await api.post('/payments', {
        loan: loan._id,
        amount: parseFloat(data.amount),
        type: data.type,
        paymentDate: data.paymentDate,
        note: data.note || undefined,
      });
      toast.success('Payment recorded successfully');
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add payment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">

            <div className="glass-card sm:rounded-2xl rounded-t-2xl border border-verdant-400/20 w-full sm:max-w-md"
              style={{ boxShadow: '0 0 40px rgba(0,230,118,0.08)' }}>

              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-verdant-400/10 flex items-center justify-center">
                    <DollarSign size={16} className="text-verdant-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-base text-white">Record Payment</h2>
                    <p className="text-xs text-white/30 font-mono">{loan?.borrowerName || '—'}</p>
                  </div>
                </div>
                <button onClick={handleClose} className="text-white/30 hover:text-white transition-colors p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Outstanding balance hint */}
              {remaining > 0 && (
                <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-plasma-400/5 border border-plasma-400/15 flex items-center justify-between">
                  <p className="text-xs text-white/40 font-mono">OUTSTANDING BALANCE</p>
                  <p className="font-display font-bold text-plasma-400">{formatCurrency(remaining)}</p>
                </div>
              )}
              {remaining <= 0 && loan?._id && (
                <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-verdant-400/5 border border-verdant-400/15">
                  <p className="text-xs text-verdant-400 font-mono">✓ LOAN FULLY REPAID</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
                {/* Amount */}
                <div>
                  <label className="label-text block mb-2">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Enter amount"
                    className={`input-field ${errors.amount ? 'border-plasma-400/50 focus:border-plasma-400/70' : ''}`}
                    {...register('amount', {
                      required: 'Amount is required',
                      min: { value: 0.01, message: 'Must be greater than 0' },
                    })}
                  />
                  {errors.amount && <p className="text-xs text-plasma-400 mt-1">{errors.amount.message}</p>}
                </div>

                {/* Type */}
                <div>
                  <label className="label-text block mb-2">Payment Type *</label>
                  <select className="select-field" {...register('type', { required: true })}>
                    {PAYMENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="label-text block mb-2">Payment Date *</label>
                  <input
                    type="date"
                    className={`input-field ${errors.paymentDate ? 'border-plasma-400/50' : ''}`}
                    {...register('paymentDate', { required: 'Date is required' })}
                  />
                  {errors.paymentDate && <p className="text-xs text-plasma-400 mt-1">{errors.paymentDate.message}</p>}
                </div>

                {/* Note */}
                <div>
                  <label className="label-text block mb-2">Note <span className="text-white/20">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Bank transfer, Cash in hand"
                    className="input-field"
                    {...register('note')}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleClose} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {loading
                      ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
                      : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
