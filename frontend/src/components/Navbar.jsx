import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Bar atas yang dipakai di semua halaman setelah login
export default function Navbar() {
  const { user, logout } = useAuth();

  // NavLink otomatis memberi class "active" pada menu halaman yang sedang dibuka
  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">💳 Mini Wallet</div>
        <nav className="nav">
          <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/mutasi" className={linkClass}>Mutasi</NavLink>
        </nav>
      </div>
      <div className="topbar-right">
        <span className="muted hide-mobile">Halo, <strong>{user.username}</strong></span>
        <button className="btn btn-ghost" onClick={logout}>Keluar</button>
      </div>
    </header>
  );
}
