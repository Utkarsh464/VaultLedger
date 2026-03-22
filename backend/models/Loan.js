import mongoose from 'mongoose';

const pausePeriodSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  reason: { type: String },
  isActive: { type: Boolean, default: true },
});

const loanSchema = new mongoose.Schema({
  // Borrower
  borrowerName: { type: String, required: true, trim: true, maxlength: 120 },
  borrowerPhone: { type: String, trim: true, maxlength: 30 },
  borrowerAddress: { type: String, trim: true, maxlength: 300 },
  notes: { type: String, maxlength: 2000 },

  // Loan terms
  principal: { type: Number, required: true, min: 0 },
  interestRate: { type: Number, required: true, min: 0, max: 1000 },
  interestType: { type: String, enum: ['SI', 'CI'], default: 'SI' },
  compoundingFrequency: { type: String, enum: ['daily', 'monthly', 'yearly'], default: 'monthly' },
  startDate: { type: Date, required: true, default: Date.now },

  // EMI
  emiEnabled: { type: Boolean, default: false },
  emiAmount: { type: Number },
  emiDayOfMonth: { type: Number, min: 1, max: 31, default: 1 },
  tenure: { type: Number }, // months

  // Penalty
  penaltyEnabled: { type: Boolean, default: false },
  penaltyType: { type: String, enum: ['flat', 'percentage'], default: 'percentage' },
  penaltyRate: { type: Number, default: 0 },
  penaltyGraceDays: { type: Number, default: 0 },

  // Status
  status: { type: String, enum: ['active', 'closed', 'defaulted', 'paused'], default: 'active' },
  closedDate: { type: Date },

  // Pause periods
  pausePeriods: [pausePeriodSchema],

  // Snapshots for growth chart (stored monthly)
  growthSnapshots: [{
    date: Date,
    totalAmount: Number,
    principal: Number,
    interest: Number,
  }],

  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Soft delete — financial records are never hard-deleted
  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date },
}, { timestamps: true });

// Indexes for query performance
loanSchema.index({ owner: 1, isDeleted: 1 });
loanSchema.index({ owner: 1, status: 1 });
loanSchema.index({ createdAt: -1 });

// Virtual: Total paid (computed from payments)
loanSchema.virtual('totalPaid').get(function () {
  return 0; // Populated via aggregation
});

export default mongoose.model('Loan', loanSchema);
