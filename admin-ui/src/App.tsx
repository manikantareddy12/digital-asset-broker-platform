import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Loans } from './pages/Loans';
import { Events } from './pages/Events';
import { Health } from './pages/Health';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/repayments" element={<Repayments />} />
        <Route path="/events" element={<Events />} />
        <Route path="/health" element={<Health />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Placeholder pages
function Repayments() {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Repayments</h1>
        <p className="page-subtitle">View repayment history and timeline</p>
      </header>
      <div className="card">
        <p style={{ color: 'var(--color-text-secondary)', padding: '2rem', textAlign: 'center' }}>
          Select a loan from the Loans page to view its repayment history.
        </p>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure application preferences</p>
      </header>
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '1rem' }}>API Configuration</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Backend API URL
            </label>
            <input
              type="text"
              value="http://localhost:8081/api"
              disabled
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Blockchain Gateway URL
            </label>
            <input
              type="text"
              value="http://localhost:3000"
              disabled
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
