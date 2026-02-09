import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { loansApi } from '../api/client';

const statuses = ['ALL', 'PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'];

export function Loans() {
    const [page, setPage] = useState(0);
    const [status, setStatus] = useState('ALL');
    const pageSize = 10;

    const { data, isLoading } = useQuery({
        queryKey: ['loans', page, status],
        queryFn: () => status === 'ALL'
            ? loansApi.list(page, pageSize)
            : loansApi.listByStatus(status, page, pageSize),
    });

    const loans = data?.data?.content || [];
    const totalPages = data?.data?.totalPages || 0;
    const totalElements = data?.data?.totalElements || 0;

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Loans</h1>
                <p className="page-subtitle">Manage and monitor all loans in the platform</p>
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
                                <th></th>
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
                                        No loans found
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
                                            <Link to={`/loans/${loan.externalId}`} className="btn btn-secondary btn-sm">
                                                <ArrowRight size={14} />
                                            </Link>
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
