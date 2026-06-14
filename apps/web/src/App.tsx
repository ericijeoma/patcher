import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './lib/auth';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import AdminPage from './pages/AdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={
          <ProtectedRoute>
            <ScanPage />
          </ProtectedRoute>
        } />
        <Route path="/sign-in" element={<div>Sign In Page</div>} />
        <Route path="/sign-up" element={<div>Sign Up Page</div>} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <div>Dashboard Page</div>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/keys" element={
          <ProtectedRoute>
            <div>API Keys Page</div>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <div>Settings Page</div>
          </ProtectedRoute>
        } />
        <Route path="/docs" element={<div>Docs Page</div>} />
        <Route path="/pricing" element={<div>Pricing Page</div>} />
        <Route path="/privacy" element={<div>Privacy Page</div>} />
        <Route path="/terms" element={<div>Terms Page</div>} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
