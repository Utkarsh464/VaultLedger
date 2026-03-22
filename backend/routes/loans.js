import express from 'express';
import { serverError } from '../utils/serverError.js';
import mongoose from 'mongoose';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import { protect } from '../middleware/auth.js';
import { calculateLoanState, generateGrowthData } from '../utils/interestCalc.js';

const router = express.Router();
router.use(protect);

// Validate ObjectId format before any :id route
router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid loan ID format.' });
  }
  next();
});

// ── Shared field whitelist — used by both POST and PUT ────────────────────────
const LOAN_UPDATABLE_FIELDS = [
  'borrowerName', 'borrowerPhone', 'borrowerAddress', 'notes',
  'principal', 'interestRate', 'interestType', 'compoundingFrequency',
  'startDate', 'status', 'closedDate',
  'emiEnabled', 'emiAmount', 'emiDayOfMonth', 'tenure',
  'penaltyEnabled', 'penaltyType', 'penaltyRate', 'penaltyGraceDays',
  'pausePeriods', 'growthSnapshots',
];

// GET /api/loans?page=1&limit=20&status=active&search=name
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const filter = { owner: req.user._id, isDeleted: { $ne: true } };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.search) filter.borrowerName = { $regex: req.query.search, $options: 'i' };

    const [loans, total] = await Promise.all([
      Loan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Loan.countDocuments(filter),
    ]);

    const enriched = await Promise.all(loans.map(async (loan) => {
      const payments = await Payment.find({ loan: loan._id });
      const state = calculateLoanState(loan.toObject(), payments);
      return { ...loan.toObject(), computed: state };
    }));

    res.json({
      data: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/loans/:id
router.get('/:id', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: { $ne: true } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const payments = await Payment.find({ loan: loan._id }).sort({ paymentDate: 1 });
    const state = calculateLoanState(loan.toObject(), payments);
    const growthData = generateGrowthData(loan.toObject(), payments);

    res.json({ ...loan.toObject(), computed: state, payments, growthData });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/loans
router.post('/', async (req, res) => {
  try {
    const body = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => LOAN_UPDATABLE_FIELDS.includes(key))
    );
    const loan = await Loan.create({ ...body, owner: req.user._id });
    res.status(201).json(loan);
  } catch (err) {
    const msg = err.name === 'ValidationError' ? err.message : 'Invalid loan data.';
    res.status(400).json({ error: msg });
  }
});

// PUT /api/loans/:id
router.put('/:id', async (req, res) => {
  try {
    // Whitelist — prevent mass assignment of internal fields (owner, _id, etc.)
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => LOAN_UPDATABLE_FIELDS.includes(key))
    );
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (err) {
    const msg = err.name === 'ValidationError' ? err.message : 'Invalid loan data.';
    res.status(400).json({ error: msg });
  }
});

// DELETE /api/loans/:id — soft delete only (financial records are never hard-deleted)
router.delete('/:id', async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json({ message: 'Loan archived successfully. Data is retained for records.' });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/loans/:id/pause
router.post('/:id/pause', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: { $ne: true } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    loan.pausePeriods.push({ startDate: new Date(), reason: req.body.reason, isActive: true });
    loan.status = 'paused';
    await loan.save();
    res.json(loan);
  } catch (err) {
    const msg = err.name === 'ValidationError' ? err.message : 'Could not pause loan.';
    res.status(400).json({ error: msg });
  }
});

// POST /api/loans/:id/resume
router.post('/:id/resume', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: { $ne: true } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const activePause = loan.pausePeriods.find(p => p.isActive && !p.endDate);
    if (activePause) {
      activePause.endDate = new Date();
      activePause.isActive = false;
    }
    loan.status = 'active';
    await loan.save();
    res.json(loan);
  } catch (err) {
    const msg = err.name === 'ValidationError' ? err.message : 'Could not resume loan.';
    res.status(400).json({ error: msg });
  }
});

// GET /api/loans/:id/state — real-time state for live counter
router.get('/:id/state', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: { $ne: true } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    const payments = await Payment.find({ loan: loan._id });
    const state = calculateLoanState(loan.toObject(), payments);
    res.json(state);
  } catch (err) {
    return serverError(res, err);
  }
});

export default router;
