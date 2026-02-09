import { useQuery } from '@tanstack/react-query';
import {
    FileText,
    CheckCircle,
    AlertTriangle,
    XCircle,
    DollarSign,
    TrendingUp
} from 'lucide-react';
import { loansApi, reconciliationApi } from '../api/client';

export function Dashboard() {
    const { data: loansData, isLoading: loansLoading } = useQuery({
        queryKey: ['loans'],
        queryFn: () => loansApi.list(0, 5),
    });

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['reconciliation-stats'],
        queryFn: reconciliationApi.getStats,
    });

    const loans = loansData?.data?.content || [];
    const stats = statsData?.data;

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of loan platform operations</p>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Total Loans</h3>
                        <div className="value">{loansLoading ? '...' : loansData?.data?.totalElements || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Matched Events</h3>
                        <div className="value">{statsLoading ? '...' : stats?.matched || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Pending</h3>
                        <div className="value">{statsLoading ? '...' : stats?.pending || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger">
                        <XCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Mismatched</h3>
                        <div className="value">{statsLoading ? '...' : stats?.mismatched || 0}</div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* Recent Loans */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Recent Loans</h2>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Borrower</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loansLoading ? (
                                    <tr>
                                        <td colSpan={4} className="loading">
                                            <div className="spinner" /> Loading...
                                        </td>
                                    </tr>
                                ) : loans.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            No loans found
                                        </td>
                                    </tr>
                                ) : (
                                    loans.map((loan) => (
                                        <tr key={loan.id}>
                                            <td><span className="hash">{loan.externalId}</span></td>
                                            <td>{loan.borrowerName}</td>
                                            <td>
                                                <DollarSign size={14} style={{ display: 'inline', marginRight: 2 }} />
                                                {loan.principalAmount.toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={`badge ${loan.status.toLowerCase()}`}>
                                                    {loan.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Reconciliation Stats */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Reconciliation Overview</h2>
                    </div>
                    {statsLoading ? (
                        <div className="loading">
                            <div className="spinner" /> Loading...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <StatBar label="Matched" value={stats?.matched || 0} total={stats?.totalEvents || 1} color="var(--color-success)" />
                            <StatBar label="Pending" value={stats?.pending || 0} total={stats?.totalEvents || 1} color="var(--color-warning)" />
                            <StatBar label="Mismatched" value={stats?.mismatched || 0} total={stats?.totalEvents || 1} color="var(--color-danger)" />
                            <StatBar label="Not Found" value={stats?.notFound || 0} total={stats?.totalEvents || 1} color="var(--color-text-muted)" />

                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
                                    <TrendingUp size={16} />
                                    <span>Latest Block: {stats?.latestBlock?.toLocaleString() || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{value}</span>
            </div>
            <div style={{ height: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percentage}%`, background: color, borderRadius: '4px', transition: 'width 0.3s ease' }} />
            </div>
        </div>
    );
}
