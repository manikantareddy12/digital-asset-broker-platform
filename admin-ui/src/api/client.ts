import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Types
export interface Loan {
    id: number;
    externalId: string;
    blockchainLoanId: string | null;
    borrowerId: string;
    borrowerName: string;
    lenderId: string;
    lenderName: string;
    principalAmount: number;
    interestRate: number;
    termDays: number;
    outstandingBalance: number | null;
    status: string;
    purpose: string | null;
    currency: string;
    approvedAt: string | null;
    activatedAt: string | null;
    maturityDate: string | null;
    createdAt: string;
}

export interface Repayment {
    id: number;
    externalReference: string;
    blockchainRepaymentId: string | null;
    paymentHash: string | null;
    loanExternalId: string;
    amount: number;
    principalPortion: number;
    interestPortion: number;
    feePortion: number;
    paymentType: string;
    status: string;
    paymentMethod: string | null;
    processedAt: string | null;
    recordedOnChainAt: string | null;
    createdAt: string;
}

export interface BlockchainEvent {
    id: number;
    eventId: string;
    eventType: string;
    loanId: string | null;
    repaymentId: string | null;
    transactionHash: string;
    blockNumber: number;
    logIndex: number;
    eventHash: string | null;
    reconciliationStatus: string;
    reconciliationNotes: string | null;
    eventTimestamp: string;
    receivedAt: string;
}

export interface ReconciliationStats {
    totalEvents: number;
    pending: number;
    matched: number;
    mismatched: number;
    notFound: number;
    latestBlock: number | null;
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

// API Functions
export const loansApi = {
    list: (page = 0, size = 10) =>
        apiClient.get<Page<Loan>>(`/loans?page=${page}&size=${size}`),

    getById: (externalId: string) =>
        apiClient.get<Loan>(`/loans/${externalId}`),

    listByStatus: (status: string, page = 0, size = 10) =>
        apiClient.get<Page<Loan>>(`/loans/status/${status}?page=${page}&size=${size}`),
};

export const repaymentsApi = {
    listByLoan: (loanExternalId: string, page = 0, size = 10) =>
        apiClient.get<Page<Repayment>>(`/repayments/loan/${loanExternalId}?page=${page}&size=${size}`),

    getById: (externalRef: string) =>
        apiClient.get<Repayment>(`/repayments/${externalRef}`),
};

export const reconciliationApi = {
    getStats: () =>
        apiClient.get<ReconciliationStats>('/reconciliation/stats'),

    listEvents: (page = 0, size = 20) =>
        apiClient.get<Page<BlockchainEvent>>(`/reconciliation/events?page=${page}&size=${size}`),

    listEventsByStatus: (status: string, page = 0, size = 20) =>
        apiClient.get<Page<BlockchainEvent>>(`/reconciliation/events/status/${status}?page=${page}&size=${size}`),

    listEventsByLoan: (loanId: string) =>
        apiClient.get<BlockchainEvent[]>(`/reconciliation/events/loan/${loanId}`),

    reconcileEvent: (eventId: number) =>
        apiClient.post(`/reconciliation/events/${eventId}/reconcile`),

    retryMismatched: () =>
        apiClient.post('/reconciliation/retry-mismatched'),
};

export const healthApi = {
    check: () => apiClient.get('/actuator/health'),
};
