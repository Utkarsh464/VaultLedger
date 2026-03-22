import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { calculateEMI, formatCurrency } from '../utils/calculations';
import { ArrowLeft, Save, Calculator } from 'lucide-react';

function FormSection({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-2xl p-4 sm:p-6 border border-white/5 space-y-4">
      <h3 className="font-display font-semibold text-base text-white border-b border-white/5 pb-3">{title}</h3>
      {children}
    </motion.div>
  );
}

function FormRow({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{children}</div>;
}

function Field({ label, error, hint, children }) {
  return (
    <div>
      <label className="label-text block mb-2">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-white/25 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-plasma-400 mt-1">{error.message}</p>}
    </div>
  );
}

export default function EditLoanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [emiPreview, setEmiPreview] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm();

  const [interestType, emiEnabled, penaltyEnabled, principal, interestRate, tenure] =
    watch(['interestType', 'emiEnabled', 'penaltyEnabled', 'principal', 'interestRate', 'tenure']);

  useEffect(() => {
    api.get(`/loans/${id}`)
      .then(res => {
        const loan = res.data;
        reset({
          borrowerName:        loan.borrowerName || '',
          borrowerPhone:       loan.borrowerPhone || '',
          borrowerAddress:     loan.borrowerAddress || '',
          notes:               loan.notes || '',
          principal:           loan.principal,
          interestRate:        loan.interestRate,
          interestType:        loan.interestType || 'SI',
          compoundingFrequency: loan.compoundingFrequency || 'monthly',
          startDate:           loan.startDate?.split('T')[0] || '',
          emiEnabled:          loan.emiEnabled ? 'true' : 'false',
          tenure:              loan.tenure || '',
          emiDayOfMonth:       loan.emiDayOfMonth || 1,
          penaltyEnabled:      loan.penaltyEnabled ? 'true' : 'false',
          penaltyType:         loan.penaltyType || 'percentage',
          penaltyRate:         loan.penaltyRate || '',
          penaltyGraceDays:    loan.penaltyGraceDays || 5,
        });
      })
      .catch(() => { toast.error('Failed to load loan'); navigate('/loans'); })
      .finally(() => setFetching(false));
  }, [id]);

  const showEmiPreview = () => {
    if (principal && interestRate && tenure) {
      setEmiPreview(calculateEMI(parseFloat(principal), parseFloat(interestRate), parseInt(tenure)));
    } else {
      toast.error('Enter principal, rate and tenure first');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        principal:         parseFloat(data.principal),
        interestRate:      parseFloat(data.interestRate),
        tenure:            data.tenure ? parseInt(data.tenure) : undefined,
        emiAmount:         emiPreview?.emi,
        penaltyRate:       data.penaltyRate ? parseFloat(data.penaltyRate) : 0,
        penaltyGraceDays:  parseInt(data.penaltyGraceDays) || 0,
        emiEnabled:        data.emiEnabled === 'true',
        penaltyEnabled:    data.penaltyEnabled === 'true',
      };
      await api.put(`/loans/${id}`, payload);
      toast.success('Loan updated successfully');
      navigate(`/loans/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="h-10 w-48 shimmer rounded-xl" />
      {Array(3).fill(0).map((_, i) => <div key={i} className="h-48 shimmer rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <button onClick={() => navigate(`/loans/${id}`)}
          className="w-9 h-9 rounded-xl glass-card border border-white/10 flex items-center justify-center hover:border-arc-400/30 transition-colors">
          <ArrowLeft size={16} className="text-white/50" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-white">Edit Loan</h1>
          <p className="text-white/30 text-sm">Modify loan terms and borrower details</p>
        </div>
      </motion.div>

      {isDirty && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-aurum-400/10 border border-aurum-400/20">
          <div className="w-2 h-2 rounded-full bg-aurum-300 live-dot" />
          <p className="text-xs text-aurum-300 font-mono">UNSAVED CHANGES</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Borrower */}
        <FormSection title="Borrower Information" delay={0.05}>
          <FormRow>
            <Field label="Borrower Name *" error={errors.borrowerName}>
              <input className="input-field" placeholder="Full name"
                {...register('borrowerName', { required: 'Name is required' })} />
            </Field>
            <Field label="Phone Number">
              <input className="input-field" placeholder="+91 9876543210"
                {...register('borrowerPhone')} />
            </Field>
          </FormRow>
          <Field label="Address">
            <input className="input-field" placeholder="City, State"
              {...register('borrowerAddress')} />
          </Field>
          <Field label="Notes">
            <textarea rows={2} className="input-field resize-none" placeholder="Purpose, special terms..."
              {...register('notes')} />
          </Field>
        </FormSection>

        {/* Loan Terms */}
        <FormSection title="Loan Terms" delay={0.1}>
          <div className="p-3 rounded-xl bg-aurum-400/5 border border-aurum-400/15">
            <p className="text-xs text-aurum-300 font-mono">⚠️  NOTE — Changing principal or start date will affect all historical interest calculations.</p>
          </div>
          <FormRow>
            <Field label="Principal Amount (₹) *" error={errors.principal}>
              <input type="number" step="1" className="input-field" placeholder="500000"
                {...register('principal', { required: 'Principal is required', min: { value: 1, message: 'Must be > 0' } })} />
            </Field>
            <Field label="Annual Interest Rate (%) *" error={errors.interestRate}>
              <input type="number" step="0.01" className="input-field" placeholder="12"
                {...register('interestRate', { required: 'Rate is required', min: { value: 0, message: 'Must be ≥ 0' } })} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Interest Type">
              <select className="select-field" {...register('interestType')}>
                <option value="SI">Simple Interest (SI)</option>
                <option value="CI">Compound Interest (CI)</option>
              </select>
            </Field>
            {interestType === 'CI' && (
              <Field label="Compounding Frequency">
                <select className="select-field" {...register('compoundingFrequency')}>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </Field>
            )}
          </FormRow>
          <Field label="Start Date *" error={errors.startDate}>
            <input type="date" className="input-field w-full sm:w-64"
              {...register('startDate', { required: 'Start date is required' })} />
          </Field>
        </FormSection>

        {/* EMI */}
        <FormSection title="EMI Configuration" delay={0.15}>
          <Field label="Enable EMI?">
            <div className="flex gap-6 mt-1">
              {[['false','No'],['true','Yes']].map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={v} className="accent-arc-400" {...register('emiEnabled')} />
                  <span className="text-sm text-white/70">{l}</span>
                </label>
              ))}
            </div>
          </Field>
          {emiEnabled === 'true' && (
            <>
              <FormRow>
                <Field label="Loan Tenure (months)">
                  <input type="number" className="input-field" placeholder="24" {...register('tenure')} />
                </Field>
                <Field label="EMI Due Day">
                  <input type="number" min={1} max={31} className="input-field" placeholder="1" {...register('emiDayOfMonth')} />
                </Field>
              </FormRow>
              <button type="button" onClick={showEmiPreview}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-arc-400/30 text-arc-400 text-sm hover:bg-arc-400/10 transition-colors">
                <Calculator size={14} /> Recalculate EMI
              </button>
              {emiPreview && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-arc-400/5 border border-arc-400/15">
                  {[
                    { label: 'Monthly EMI',   value: formatCurrency(emiPreview.emi),          color: 'text-arc-400'   },
                    { label: 'Total Payable', value: formatCurrency(emiPreview.totalPayable),  color: 'text-white'     },
                    { label: 'Total Interest',value: formatCurrency(emiPreview.totalInterest), color: 'text-aurum-300' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="label-text mb-1">{item.label}</p>
                      <p className={`font-display font-bold text-lg ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </FormSection>

        {/* Penalty */}
        <FormSection title="Penalty Configuration" delay={0.2}>
          <Field label="Enable Penalty?">
            <div className="flex gap-6 mt-1">
              {[['false','No'],['true','Yes']].map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={v} className="accent-arc-400" {...register('penaltyEnabled')} />
                  <span className="text-sm text-white/70">{l}</span>
                </label>
              ))}
            </div>
          </Field>
          {penaltyEnabled === 'true' && (
            <FormRow>
              <Field label="Penalty Type">
                <select className="select-field" {...register('penaltyType')}>
                  <option value="percentage">% of outstanding</option>
                  <option value="flat">Flat amount per missed EMI</option>
                </select>
              </Field>
              <Field label="Penalty Rate">
                <input type="number" step="0.01" className="input-field" placeholder="2"
                  {...register('penaltyRate')} />
              </Field>
              <Field label="Grace Period (days)">
                <input type="number" className="input-field" placeholder="5"
                  {...register('penaltyGraceDays')} />
              </Field>
            </FormRow>
          )}
        </FormSection>

        {/* Submit */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-3 pb-6 sm:pb-8">
          <button type="button" onClick={() => navigate(`/loans/${id}`)} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center sm:px-8">
            {loading
              ? <div className="w-4 h-4 border-2 border-void-900 border-t-transparent rounded-full animate-spin" />
              : <><Save size={15} /> Save Changes</>}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
