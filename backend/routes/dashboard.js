import express from 'express';
import { serverError } from '../utils/serverError.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import { protect } from '../middleware/auth.js';
import { calculateLoanState } from '../utils/interestCalc.js';

const router = express.Router();
router.use(protect);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const loans = await Loan.find({ owner: req.user._id, isDeleted: { $ne: true } });
    const payments = await Payment.find({ owner: req.user._id });

    let totalGiven = 0;
    let totalInterestEarned = 0;
    let totalRecovered = 0;
    let totalPending = 0;
    const loanSummaries = [];

    for (const loan of loans) {
      const loanPayments = payments.filter(p => p.loan.toString() === loan._id.toString());
      const state = calculateLoanState(loan.toObject(), loanPayments);

      totalGiven += loan.principal;
      totalInterestEarned += state.interest;
      totalRecovered += state.totalPaid;
      totalPending += state.remaining;

      loanSummaries.push({
        _id: loan._id,
        borrowerName: loan.borrowerName,
        principal: loan.principal,
        status: loan.status,
        recoveryPercent: state.recoveryPercent,
        remaining: state.remaining,
        totalAmount: state.totalAmount,
        interest: state.interest,
      });
    }

    // Recent payments
    const recentPayments = await Payment.find({ owner: req.user._id })
      .populate('loan', 'borrowerName')
      .sort({ paymentDate: -1 })
      .limit(10);

    // Monthly recovery trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrend = await Payment.aggregate([
      {
        $match: {
          owner: req.user._id,
          paymentDate: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
          },
          totalRecovered: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      kpis: {
        totalGiven: Math.round(totalGiven * 100) / 100,
        totalRecovered: Math.round(totalRecovered * 100) / 100,
        totalInterestEarned: Math.round(totalInterestEarned * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        activeLoans: loans.filter(l => l.status === 'active').length,
        closedLoans: loans.filter(l => l.status === 'closed').length,
        totalLoans: loans.length,
      },
      loanSummaries,
      recentPayments,
      monthlyTrend,
    });
  } catch (err) {
    return serverError(res, err);
  }
});

export default router;
