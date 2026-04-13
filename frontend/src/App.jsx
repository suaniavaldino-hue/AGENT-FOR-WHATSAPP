import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import CRM from './pages/CRM';
import Automations from './pages/Automations';
import Admin from './pages/Admin';
import Connections from './pages/Connections';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
      <Route path="/crm" element={<PrivateRoute><CRM /></PrivateRoute>} />
      <Route path="/automations" element={<PrivateRoute><Automations /></PrivateRoute>} />
      <Route path="/connections" element={<PrivateRoute><Connections /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute adminOnly><Admin /></PrivateRoute>} />
    </Routes>
  );
}
