import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    CreditCard,
    Activity,
    Heart,
    Settings
} from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">D</div>
                    <div className="sidebar-title">Digital Asset Broker</div>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
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
