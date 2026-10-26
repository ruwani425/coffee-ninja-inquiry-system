import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Coffee, LogOut, User as UserIcon, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Coffee size={24} />
        </div>
        <div>
          <span className="brand-title">Coffee Ninja</span>
          <span className="brand-badge" style={{ marginLeft: '8px' }}>Inquiries</span>
        </div>
      </div>

      {user && (
        <div className="nav-user-panel">
          <div className="user-badge">
            {user.role === 'supervisor' ? (
              <Shield size={16} color="#f59e0b" />
            ) : (
              <UserIcon size={16} color="#93c5fd" />
            )}
            <span style={{ fontWeight: 600 }}>{user.name}</span>
            <span className={`role-pill ${user.role}`}>
              {user.role}
            </span>
          </div>

          <button 
            onClick={logout} 
            className="btn-logout"
            title="Sign out of workspace"
            id="logout-button"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </nav>
  );
};
