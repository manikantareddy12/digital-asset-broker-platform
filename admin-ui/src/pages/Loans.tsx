import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Calendar, Plus, X, CheckCircle, Play, Ban } from 'lucide-react';
import { loansApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CreateLoanRequest } from '../api/client';

const statuses = ['ALL', 'PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'];

export function Loans() {
    const [page, setPage] = useState(0);
    const [status, setStatus] = useState('ALL');
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const pageSize = 10;
    const queryClient = useQueryClient();
    const { canApprove, canCreate } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['loans', page, status],
        queryFn: () => status === 'ALL'
            ? loansApi.list(page, pageSize)
            : loansApi.listByStatus(status, page, pageSize),
    });

    const createMutation = useMutation({
        mutationFn: loansApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['loans'] });
            setShowModal(false);
        },
    });

    const handleAction = async (externalId: string, action: 'approve' | 'activate' | 'cancel') => {
        setActionLoading(`${externalId}-${action}`);
        try {
            if (action === 'approve') {
                await loansApi.approve(externalId);
            } else if (action === 'activate') {
                await loansApi.activate(externalId);
            } else if (action === 'cancel') {
                await loansApi.cancel(externalId);
            }
            queryClient.invalidateQueries({ queryKey: ['loans'] });
        } catch (err) {
            console.error(`Failed to ${action} loan:`, err);
            alert(`Failed to ${action} loan. Check console for details.`);
        } finally {
            setActionLoading(null);
        }
    };

    const loans = data?.data?.content || [];
    const totalPages = data?.data?.totalPages || 0;
    const totalElements = data?.data?.totalElements || 0;

    return (
        <div>
            <header className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Loans</h1>
                        <p className="page-subtitle">Manage and monitor all loans in the platform</p>
                    </div>
                    {canCreate && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> New Loan
                        </button>
                    )}
                </div>
            </header>

            {/* Status Tabs */}
            <div className="tabs">
                {statuses.map((s) => (
                    <button
                        key={s}
                        className={`tab ${status === s ? 'active' : ''}`}
                        onClick={() => { setStatus(s); setPage(0); }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Loans Table */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        {totalElements} Loan{totalElements !== 1 ? 's' : ''} {status !== 'ALL' && `(${status})`}
                    </h2>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Loan ID</th>
                                <th>Borrower</th>
                                <th>Lender</th>
                                <th>Principal</th>
                                <th>Rate</th>
                                <th>Term</th>
                                <th>Outstanding</th>
                                <th>Status</th>
                                <th>Blockchain</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="loading">
                                        <div className="spinner" /> Loading loans...
                                    </td>
                                </tr>
                            ) : loans.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                                        No loans found. Click "New Loan" to create one.
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id}>
                                        <td><span className="hash">{loan.externalId}</span></td>
                                        <td>{loan.borrowerName}</td>
                                        <td>{loan.lenderName}</td>
                                        <td>
                                            <DollarSign size={14} style={{ display: 'inline' }} />
                                            {loan.principalAmount.toLocaleString()}
                                        </td>
                                        <td>{loan.interestRate}%</td>
                                        <td>
                                            <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                                            {loan.termDays}d
                                        </td>
                                        <td>
                                            {loan.outstandingBalance !== null ? (
                                                <>${loan.outstandingBalance.toLocaleString()}</>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${loan.status.toLowerCase()}`}>
                                                {loan.status}
                                            </span>
                                        </td>
                                        <td>
                                            {loan.blockchainLoanId ? (
                                                <span className="hash" title={loan.blockchainLoanId}>
                                                    {loan.blockchainLoanId.slice(0, 10)}...
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)' }}>Not on chain</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                {loan.status === 'PENDING' && canApprove && (
                                                    <>
                                                        <button
                                                            className="btn-action btn-approve"
                                                            onClick={() => handleAction(loan.externalId, 'approve')}
                                                            disabled={actionLoading === `${loan.externalId}-approve`}
                                                            title="Approve this loan"
                                                        >
                                                            <CheckCircle size={14} />
                                                            {actionLoading === `${loan.externalId}-approve` ? '...' : 'Approve'}
                                                        </button>
                                                        <button
                                                            className="btn-action btn-cancel"
                                                            onClick={() => handleAction(loan.externalId, 'cancel')}
                                                            disabled={actionLoading === `${loan.externalId}-cancel`}
                                                            title="Cancel this loan"
                                                        >
                                                            <Ban size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                {loan.status === 'APPROVED' && canApprove && (
                                                    <>
                                                        <button
                                                            className="btn-action btn-activate"
                                                            onClick={() => handleAction(loan.externalId, 'activate')}
                                                            disabled={actionLoading === `${loan.externalId}-activate`}
                                                            title="Activate this loan"
                                                        >
                                                            <Play size={14} />
                                                            {actionLoading === `${loan.externalId}-activate` ? '...' : 'Activate'}
                                                        </button>
                                                        <button
                                                            className="btn-action btn-cancel"
                                                            onClick={() => handleAction(loan.externalId, 'cancel')}
                                                            disabled={actionLoading === `${loan.externalId}-cancel`}
                                                            title="Cancel this loan"
                                                        >
                                                            <Ban size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                {loan.status === 'ACTIVE' && (
                                                    <span className="badge active" style={{ fontSize: '0.7rem' }}>Live</span>
                                                )}
                                                {loan.status === 'COMPLETED' && (
                                                    <span style={{ color: 'var(--color-success)', fontSize: '0.75rem' }}>✓ Done</span>
                                                )}
                                                {loan.status === 'CANCELLED' && (
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Cancelled</span>
                                                )}
                                            </div>
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

            {/* New Loan Modal */}
            {showModal && (
                <NewLoanModal
                    onClose={() => setShowModal(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isLoading={createMutation.isPending}
                    error={createMutation.error?.message}
                />
            )}
        </div>
    );
}

// New Loan Modal Component
function NewLoanModal({
    onClose,
    onSubmit,
    isLoading,
    error,
}: {
    onClose: () => void;
    onSubmit: (data: CreateLoanRequest) => void;
    isLoading: boolean;
    error?: string;
}) {
    const [formData, setFormData] = useState<CreateLoanRequest>({
        borrowerId: '',
        lenderId: '',
        principalAmount: 10000,
        interestRate: 5.5,
        termDays: 365,
        purpose: 'Personal Loan',
        currency: 'USD',
    });

    const handleChange = (field: keyof CreateLoanRequest, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Loan</h2>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                {error && <div className="modal-error">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Borrower ID</label>
                            <input
                                type="text"
                                value={formData.borrowerId}
                                onChange={e => handleChange('borrowerId', e.target.value)}
                                placeholder="e.g. CUST001"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Lender ID</label>
                            <input
                                type="text"
                                value={formData.lenderId}
                                onChange={e => handleChange('lenderId', e.target.value)}
                                placeholder="e.g. BANK001"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Principal Amount ($)</label>
                            <input
                                type="number"
                                value={formData.principalAmount}
                                onChange={e => handleChange('principalAmount', Number(e.target.value))}
                                min={1}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Interest Rate (%)</label>
                            <input
                                type="number"
                                value={formData.interestRate}
                                onChange={e => handleChange('interestRate', Number(e.target.value))}
                                step="0.1"
                                min={0}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Term (Days)</label>
                            <input
                                type="number"
                                value={formData.termDays}
                                onChange={e => handleChange('termDays', Number(e.target.value))}
                                min={1}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Currency</label>
                            <input
                                type="text"
                                value={formData.currency}
                                onChange={e => handleChange('currency', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Purpose</label>
                        <input
                            type="text"
                            value={formData.purpose}
                            onChange={e => handleChange('purpose', e.target.value)}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            <Plus size={16} /> {isLoading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
