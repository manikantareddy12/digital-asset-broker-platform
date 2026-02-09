import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { reconciliationApi } from '../api/client';

const statusFilters = ['ALL', 'PENDING', 'MATCHED', 'MISMATCHED', 'NOT_FOUND', 'RECONCILED', 'IGNORED'];

export function Events() {
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const pageSize = 20;
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['events', page, statusFilter],
        queryFn: () => statusFilter === 'ALL'
            ? reconciliationApi.listEvents(page, pageSize)
            : reconciliationApi.listEventsByStatus(statusFilter, page, pageSize),
    });

    const { data: statsData } = useQuery({
        queryKey: ['reconciliation-stats'],
        queryFn: reconciliationApi.getStats,
    });

    const retryMutation = useMutation({
        mutationFn: reconciliationApi.retryMismatched,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-stats'] });
        },
    });

    const events = data?.data?.content || [];
    const totalPages = data?.data?.totalPages || 0;
    const totalElements = data?.data?.totalElements || 0;
    const stats = statsData?.data;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'MATCHED':
            case 'RECONCILED':
                return <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />;
            case 'PENDING':
                return <Clock size={14} style={{ color: 'var(--color-warning)' }} />;
            case 'MISMATCHED':
                return <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />;
            case 'NOT_FOUND':
                return <XCircle size={14} style={{ color: 'var(--color-text-muted)' }} />;
            default:
                return <Activity size={14} />;
        }
    };

    return (
        <div>
            <header className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Blockchain Events</h1>
                        <p className="page-subtitle">Monitor and reconcile blockchain events</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={() => refetch()}>
                            <RefreshCw size={16} /> Refresh
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => retryMutation.mutate()}
                            disabled={retryMutation.isPending}
                        >
                            {retryMutation.isPending ? 'Retrying...' : 'Retry Mismatched'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <Activity size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Total Events</h3>
                        <div className="value">{stats?.totalEvents || 0}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Matched</h3>
                        <div className="value">{stats?.matched || 0}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Pending</h3>
                        <div className="value">{stats?.pending || 0}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-content">
                        <h3>Mismatched</h3>
                        <div className="value">{stats?.mismatched || 0}</div>
                    </div>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="tabs">
                {statusFilters.map((s) => (
                    <button
                        key={s}
                        className={`tab ${statusFilter === s ? 'active' : ''}`}
                        onClick={() => { setStatusFilter(s); setPage(0); }}
                    >
                        {s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Events Table */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{totalElements} Events</h2>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Event Type</th>
                                <th>Loan ID</th>
                                <th>Block</th>
                                <th>Tx Hash</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th>Received</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="loading">
                                        <div className="spinner" /> Loading events...
                                    </td>
                                </tr>
                            ) : events.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                                        No events found
                                    </td>
                                </tr>
                            ) : (
                                events.map((event) => (
                                    <tr key={event.id}>
                                        <td>
                                            <code style={{
                                                background: 'var(--color-bg-tertiary)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem'
                                            }}>
                                                {event.eventType}
                                            </code>
                                        </td>
                                        <td>
                                            {event.loanId ? (
                                                <span className="hash">{event.loanId.slice(0, 12)}...</span>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td>{event.blockNumber.toLocaleString()}</td>
                                        <td>
                                            <span className="hash">{event.transactionHash.slice(0, 12)}...</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${event.reconciliationStatus.toLowerCase()}`}>
                                                {getStatusIcon(event.reconciliationStatus)}
                                                <span style={{ marginLeft: '0.25rem' }}>{event.reconciliationStatus}</span>
                                            </span>
                                        </td>
                                        <td>
                                            {event.reconciliationNotes ? (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }} title={event.reconciliationNotes}>
                                                    {event.reconciliationNotes.slice(0, 30)}...
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            {new Date(event.receivedAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                            Previous
                        </button>
                        <span>Page {page + 1} of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
