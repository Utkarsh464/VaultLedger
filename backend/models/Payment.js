import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, default: Date.now },
  type: { type: String, enum: ['emi', 'partial', 'full', 'penalty', 'interest_only'], default: 'partial' },
  note: { type: String },
  principalComponent: { type: Number, default: 0 },
  interestComponent: { type: Number, default: 0 },
  penaltyComponent: { type: Number, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Indexes for query performance
paymentSchema.index({ loan: 1 });
paymentSchema.index({ owner: 1 });
paymentSchema.index({ paymentDate: -1 });

export default mongoose.model('Payment', paymentSchema);
