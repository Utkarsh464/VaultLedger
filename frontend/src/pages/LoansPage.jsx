import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLoans } from '../hooks';
import LoanCard from '../components/loans/LoanCard';
import { Search, Plus, CreditCard, SlidersHorizontal, ChevronDown } from 'lucide-react';

const STATUS_FILTERS = ['all', 'active', 'closed', 'paused', 'defaulted'];

export default function LoansPage() {
  const { loans, loading } = useLoans();
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy,       setSortBy]       = useState('newest');
  const [showFilters,  setShowFilters]  = useState(false);

  const filtered = loans
    .filter(l => {
      const matchSearch = l.borrowerName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')         return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest')         return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'principal_high') return b.principal - a.principal;
      if (sortBy === 'principal_low')  return a.principal - b.principal;
      if (sortBy === 'recovery')       return (b.computed?.recoveryPercent || 0) - (a.computed?.recoveryPercent || 0);
      return 0;
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px]">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-white mb-0.5">
            Loan Portfolio
          </h1>
          <p className="text-white/30 text-xs sm:text-sm">
            {loans.length} total · {loans.filter(l => l.status === 'active').length} active
          </p>
        </div>
        <Link to="/loans/new">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 sm:px-5">
            <Plus size={14} />
            <span className="hidden sm:inline">New Loan</span>
            <span className="sm:hidden">New</span>
          </motion.button>
        </Link>
      </motion.div>

      {/* Search + filter toggle */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="space-y-3">

        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search borrower..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 w-full text-sm"
            />
          </div>
          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`btn-ghost flex items-center gap-1.5 text-xs px-3 flex-shrink-0 ${showFilters ? 'border-arc-400/40 text-arc-400' : ''}`}>
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDown size={11} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter / sort row */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map(status => (
                <button key={status} onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                    statusFilter === status
                      ? 'bg-arc-400 text-void-900 font-semibold'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                  }`}>
                  {status}
                </button>
              ))}
            </div>
            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="select-field text-xs py-1.5 w-auto">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="principal_high">Highest ₹</option>
              <option value="principal_low">Lowest ₹</option>
              <option value="recovery">Recovery %</option>
            </select>
          </motion.div>
        )}

        {/* Active filter indicator */}
        {(statusFilter !== 'all' || search) && (
          <div className="flex items-center gap-2">
            {search && (
              <span className="px-2 py-1 rounded-lg bg-arc-400/10 border border-arc-400/20 text-xs text-arc-400 font-mono">
                "{search}"
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="px-2 py-1 rounded-lg bg-arc-400/10 border border-arc-400/20 text-xs text-arc-400 font-mono capitalize">
                {statusFilter}
              </span>
            )}
            <button onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Clear
            </button>
          </div>
        )}
      </motion.div>

      {/* Loans grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-52 shimmer rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
          <CreditCard size={40} className="text-white/10 mb-4" strokeWidth={1} />
          <p className="text-white/30 text-base sm:text-lg mb-2">No loans found</p>
          <p className="text-white/15 text-sm mb-6">
            {search ? 'Try a different search' : 'Create your first loan to get started'}
          </p>
          {!search && (
            <Link to="/loans/new">
              <button className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={14} /> Create Loan
              </button>
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((loan, i) => <LoanCard key={loan._id} loan={loan} index={i} />)}
        </div>
      )}
    </div>
  );
}
