import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { calculateLoanState } from '../utils/calculations';

// ── Live interest counter (updates every second) ──────────────────────────────
export function useLiveCounter(loan, payments = []) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!loan) return;

    const tick = () => {
      const s = calculateLoanState(loan, payments);
      setState(s);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loan, payments]);

  return state;
}

// ── Count-up animation ─────────────────────────────────────────────────────────
export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const startValRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined) return;

    startValRef.current = value;
    startRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(startValRef.current + (target - startValRef.current) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return value;
}

// ── Loans data ────────────────────────────────────────────────────────────────
export function useLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/loans');
      // Handle both paginated ({ data: [...] }) and legacy array responses
      setLoans(Array.isArray(res.data) ? res.data : (res.data.data || []));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  return { loans, loading, error, refetch: fetchLoans };
}

// ── Single loan detail ────────────────────────────────────────────────────────
export function useLoan(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLoan = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/loans/${id}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch loan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLoan(); }, [fetchLoan]);

  return { data, loading, error, refetch: fetchLoan };
}

// ── Dashboard summary ─────────────────────────────────────────────────────────
export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/summary');
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

// ── Payments for a loan ───────────────────────────────────────────────────────
export function usePayments(loanId) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const res = await api.get(`/payments?loanId=${loanId}`);
      setPayments(Array.isArray(res.data) ? res.data : (res.data.data || []));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return { payments, loading, error, refetch: fetchPayments };
}
