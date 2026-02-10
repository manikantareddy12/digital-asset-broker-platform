import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    CreditCard,
    Activity,
    Heart,
    Settings,
    LogOut,
    Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src="/image.png" alt="DAB" className="sidebar-logo-img" width={36} height={36} />
                    <div className="sidebar-title">Digital Asset Broker</div>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                        <LayoutDashboard size={20} />
                        Dashboard
                    </NavLink>

                    <NavLink to="/loans" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <FileText size={20} />
                        Loans
                    </NavLink>

                    <NavLink to="/repayments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <CreditCard size={20} />
                        Repayments
                    </NavLink>

                    <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Activity size={20} />
                        Blockchain Events
                    </NavLink>

                    <NavLink to="/health" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Heart size={20} />
                        System Health
                    </NavLink>

                    <div style={{ flex: 1 }} />

                    {/* User info */}
                    {user && (
                        <div className="sidebar-user">
                            <div className="sidebar-user-info">
                                <div className="sidebar-user-avatar">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="sidebar-user-details">
                                    <span className="sidebar-user-name">{user.name}</span>
                                    <span className="sidebar-user-role">
                                        <Shield size={10} />
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                            <button className="sidebar-logout" onClick={logout} title="Sign out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}

                    <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Settings size={20} />
                        Settings
                    </NavLink>
                </nav>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
