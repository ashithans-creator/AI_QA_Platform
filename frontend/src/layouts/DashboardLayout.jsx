import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, TestTube2, AlertTriangle, Network, 
  PlayCircle, Database, Settings, Sun, Moon, Menu, X, Sparkles, TableProperties
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Test Generator', path: '/test-generator', icon: TestTube2 },
    { name: 'Defect Reporter', path: '/defect-reporter', icon: AlertTriangle },
    { name: 'API Assistant', path: '/api-assistant', icon: Network },
    { name: 'Automation Run', path: '/automation-run', icon: PlayCircle },
    { name: 'Data Driven', path: '/data-driven', icon: TableProperties },
    { name: 'DB Assistant', path: '/db-assistant', icon: Database },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="app-container" style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      {/* Sidebar CSS implementation directly to ensure reliability */}
      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          background-color: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: transform 0.3s ease;
        }
        
        .sidebar-brand {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border-color);
        }

        .sidebar-brand-text {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sidebar-menu {
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
          overflow-y: auto;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.8rem 1rem;
          border-radius: 8px;
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .sidebar-link:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .sidebar-link.active {
          background-color: var(--primary-light);
          color: var(--primary);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .user-badge {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-family: var(--font-display);
        }

        .top-navbar {
          height: 64px;
          background: var(--glass-bg);
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: var(--glass-blur);
          position: fixed;
          top: 0;
          right: 0;
          left: var(--sidebar-width);
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          transition: left 0.3s;
        }

        .page-content-wrapper {
          padding-top: 84px; /* navbar height + padding */
          width: 100%;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(${mobileOpen ? '0' : '-100%'});
          }
          .top-navbar {
            left: 0;
            padding: 0 1rem;
          }
        }
      `}</style>

      {/* Sidebar Component */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="user-avatar" style={{ width: '32px', height: '32px' }}>
            <Sparkles size={16} />
          </div>
          <span className="sidebar-brand-text">AI QA Platform</span>
        </div>

        <nav className="sidebar-menu">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.name} 
                to={item.path} 
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.username}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Top Navbar */}
      <header className="top-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            className="mobile-toggle-btn"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            {navItems.find(i => i.path === location.pathname)?.name || 'QA Platform'}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Light/Dark mode switcher */}
          <button 
            onClick={toggleTheme} 
            className="btn btn-secondary" 
            style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Toggle helper injection */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle-btn {
            display: block !important;
          }
        }
      `}</style>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="page-content-wrapper animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
