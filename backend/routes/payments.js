import express from 'express';
import { serverError } from '../utils/serverError.js';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Loan from '../models/Loan.js';
import { protect } from '../middleware/auth.js';
import { calculateLoanState } from '../utils/interestCalc.js';

const router = express.Router();
router.use(protect);

// Validate ObjectId format before any :id route
router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid payment ID format.' });
  }
  next();
});

// GET /api/payments?loanId=xxx&page=1&limit=50
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const filter = { owner: req.user._id };
    if (req.query.loanId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.loanId)) {
        return res.status(400).json({ error: 'Invalid loanId format.' });
      }
      filter.loan = req.query.loanId;
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter).populate('loan', 'borrowerName').sort({ paymentDate: -1 }).skip(skip).limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.json({
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    if (!req.body.loan || !mongoose.Types.ObjectId.isValid(req.body.loan))
      return res.status(400).json({ error: 'Invalid or missing loan ID.' });

    const loan = await Loan.findOne({ _id: req.body.loan, owner: req.user._id });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    // Whitelist — prevent mass assignment of internal fields
    const PAYMENT_ALLOWED = ['loan', 'amount', 'paymentDate', 'type', 'note',
      'principalComponent', 'interestComponent', 'penaltyComponent'];
    const paymentData = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => PAYMENT_ALLOWED.includes(k))
    );
    const payment = await Payment.create({ ...paymentData, owner: req.user._id });

    // Auto-close only when explicitly marked 'full' AND total paid covers principal + interest
    if (req.body.type === 'full') {
      const allPayments = await Payment.find({ loan: loan._id });
      const state = calculateLoanState(loan.toObject(), allPayments);
      if (state.remaining <= 0) {
        loan.status = 'closed';
        loan.closedDate = new Date();
        await loan.save();
      }
    }

    res.status(201).json(payment);
  } catch (err) {
    const msg = err.name === 'ValidationError' ? err.message : 'Invalid payment data.';
    res.status(400).json({ error: msg });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

export default router;
