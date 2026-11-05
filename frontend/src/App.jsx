import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MutasiPage from './pages/MutasiPage';

// Halaman yang hanya boleh dibuka kalau SUDAH login
function PrivateRoute({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="center-screen">Memuat...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

// Halaman yang hanya untuk yang BELUM login (login/register)
function GuestRoute({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="center-screen">Memuat...</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/mutasi" element={<PrivateRoute><MutasiPage /></PrivateRoute>} />
      <Route path="/login"element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
