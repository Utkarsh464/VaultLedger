/**
 * Core interest calculation engine
 * Supports SI, CI with pause periods and penalty
 */

/**
 * Get effective time in years, excluding pause periods
 */
export function getEffectiveTimeYears(startDate, endDate, pausePeriods = []) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  let totalMs = end - start;

  // Subtract pause periods
  for (const pause of pausePeriods) {
    const pauseStart = new Date(pause.startDate);
    const pauseEnd = pause.endDate ? new Date(pause.endDate) : new Date();

    // Clamp pause period within loan period
    const overlapStart = Math.max(start, pauseStart);
    const overlapEnd = Math.min(end, pauseEnd);

    if (overlapEnd > overlapStart) {
      totalMs -= overlapEnd - overlapStart;
    }
  }

  if (totalMs < 0) totalMs = 0;

  // Convert ms to years
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return totalMs / msPerYear;
}

/**
 * Simple Interest: SI = (P × R × T) / 100
 */
export function calculateSI(principal, rate, timeYears) {
  return (principal * rate * timeYears) / 100;
}

/**
 * Compound Interest: A = P(1 + R/n)^(nT)
 * n = compounding frequency per year
 */
export function calculateCI(principal, rate, timeYears, frequency = 'monthly') {
  const frequencyMap = { daily: 365, monthly: 12, yearly: 1 };
  const n = frequencyMap[frequency] || 12;
  const r = rate / 100;
  const amount = principal * Math.pow(1 + r / n, n * timeYears);
  return amount - principal;
}

/**
 * Full loan calculation at a given timestamp
 */
export function calculateLoanState(loan, payments = [], asOf = new Date()) {
  const {
    principal,
    interestRate,
    interestType,
    compoundingFrequency,
    startDate,
    pausePeriods = [],
    penaltyEnabled,
    penaltyType,
    penaltyRate,
    penaltyGraceDays = 0,
    emiEnabled,
    emiAmount,
    tenure,
  } = loan;

  const timeYears = getEffectiveTimeYears(startDate, asOf, pausePeriods);

  let interest;
  if (interestType === 'SI') {
    interest = calculateSI(principal, interestRate, timeYears);
  } else {
    interest = calculateCI(principal, interestRate, timeYears, compoundingFrequency);
  }

  const totalAmount = principal + interest;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totalAmount - totalPaid);
  const recoveryPercent = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;

  // Penalty calculation
  let penalty = 0;
  if (penaltyEnabled && emiEnabled && emiAmount) {
    const monthsElapsed = Math.floor(timeYears * 12);
    const expectedPayments = Math.min(monthsElapsed, tenure || 999);
    const expectedTotal = expectedPayments * emiAmount;
    const deficit = Math.max(0, expectedTotal - totalPaid);

    if (deficit > 0) {
      if (penaltyType === 'flat') {
        penalty = penaltyRate * Math.floor(deficit / emiAmount);
      } else {
        penalty = (deficit * penaltyRate) / 100;
      }
    }
  }

  // EMI breakdown
  let emiInfo = null;
  if (emiEnabled && principal && interestRate && tenure) {
    emiInfo = calculateEMI(principal, interestRate, tenure);
  }

  return {
    principal,
    interest: Math.round(interest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    remaining: Math.round((remaining + penalty) * 100) / 100,
    penalty: Math.round(penalty * 100) / 100,
    recoveryPercent: Math.round(recoveryPercent * 100) / 100,
    timeYears,
    emiInfo,
  };
}

/**
 * EMI = [P × r × (1+r)^n] / [(1+r)^n - 1]
 * r = monthly rate, n = tenure in months
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  const r = annualRate / 100 / 12;
  if (r === 0) return { emi: principal / tenureMonths, totalPayable: principal, totalInterest: 0 };

  const pow = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * pow) / (pow - 1);
  const totalPayable = emi * tenureMonths;
  const totalInterest = totalPayable - principal;

  return {
    emi: Math.round(emi * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    monthlyBreakdown: generateAmortization(principal, r, tenureMonths, emi),
  };
}

/**
 * Generate amortization schedule
 */
function generateAmortization(principal, monthlyRate, tenure, emi) {
  const schedule = [];
  let balance = principal;

  for (let month = 1; month <= Math.min(tenure, 60); month++) {
    const interestPaid = balance * monthlyRate;
    const principalPaid = emi - interestPaid;
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      month,
      emi: Math.round(emi * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interestPaid * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }
  return schedule;
}

/**
 * Generate growth snapshots for chart (monthly points)
 */
export function generateGrowthData(loan, payments = []) {
  const start = new Date(loan.startDate);
  const now = new Date();
  const points = [];

  let current = new Date(start);
  current.setDate(1);

  while (current <= now) {
    const paymentsUpTo = payments.filter(p => new Date(p.paymentDate) <= current);
    const state = calculateLoanState(loan, paymentsUpTo, current);

    points.push({
      date: current.toISOString().split('T')[0],
      totalAmount: state.totalAmount,
      principal: state.principal,
      interest: state.interest,
      remaining: state.remaining,
    });

    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return points;
}
