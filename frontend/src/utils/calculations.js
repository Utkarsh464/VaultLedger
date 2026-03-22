/**
 * Client-side interest calculation for live counter
 * Mirrors server logic for real-time UI updates
 */

export function getEffectiveTimeYears(startDate, endDate, pausePeriods = []) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  let totalMs = end - start;

  for (const pause of pausePeriods) {
    const pauseStart = new Date(pause.startDate);
    const pauseEnd = pause.endDate ? new Date(pause.endDate) : new Date();
    const overlapStart = Math.max(start.getTime(), pauseStart.getTime());
    const overlapEnd = Math.min(end.getTime(), pauseEnd.getTime());
    if (overlapEnd > overlapStart) totalMs -= overlapEnd - overlapStart;
  }

  if (totalMs < 0) totalMs = 0;
  return totalMs / (365.25 * 24 * 60 * 60 * 1000);
}

export function calculateInterest(principal, rate, timeYears, type, frequency = 'monthly') {
  if (type === 'SI') {
    return (principal * rate * timeYears) / 100;
  }
  const n = { daily: 365, monthly: 12, yearly: 1 }[frequency] || 12;
  const r = rate / 100;
  return principal * (Math.pow(1 + r / n, n * timeYears) - 1);
}

export function calculateLoanState(loan, payments = []) {
  const timeYears = getEffectiveTimeYears(loan.startDate, null, loan.pausePeriods || []);
  const interest = calculateInterest(loan.principal, loan.interestRate, timeYears, loan.interestType, loan.compoundingFrequency);
  const totalAmount = loan.principal + interest;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, totalAmount - totalPaid);
  const recoveryPercent = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;
  return {
    interest,
    totalAmount,
    totalPaid,
    remaining,
    recoveryPercent,
    timeYears,
  };
}

export function calculateEMI(principal, annualRate, tenureMonths) {
  const r = annualRate / 100 / 12;
  if (r === 0) return { emi: principal / tenureMonths, totalPayable: principal, totalInterest: 0 };
  const pow = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * pow) / (pow - 1);
  return {
    emi,
    totalPayable: emi * tenureMonths,
    totalInterest: emi * tenureMonths - principal,
  };
}

export function formatCurrency(amount, compact = false) {
  if (amount === null || amount === undefined) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (compact) {
    if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
    if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
    if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompactINR(amount) {
  return formatCurrency(amount, true);
}

export function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function getLoanDuration(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (months < 1) return `${Math.floor((now - start) / 86400000)}d`;
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
}
