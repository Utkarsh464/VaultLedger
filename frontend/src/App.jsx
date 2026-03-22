import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/ui/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LoansPage from './pages/LoansPage';
import LoanDetailPage from './pages/LoanDetailPage';
import NewLoanPage from './pages/NewLoanPage';
import SettingsPage from './pages/SettingsPage';
import EditLoanPage from './pages/EditLoanPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void-900">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-arc-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/40 font-mono text-sm tracking-widest">INITIALIZING</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  // Show children during loading so login form is always visible
  if (loading) return children;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="loans/new" element={<NewLoanPage />} />
          <Route path="loans/:id" element={<LoanDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="loans/:id/edit" element={<EditLoanPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
