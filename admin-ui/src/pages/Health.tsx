import { useQuery } from '@tanstack/react-query';
import { Heart, Server, Database, Cloud, CheckCircle, XCircle, RefreshCw, Zap } from 'lucide-react';
import { healthApi, apiClient } from '../api/client';
import { useState, useEffect } from 'react';

// Gateway health check URL
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

interface ServiceStatus {
    gateway: 'up' | 'down' | 'checking';
    postgres: 'up' | 'down' | 'checking';
    kafka: 'up' | 'down' | 'checking';
    hardhat: 'up' | 'down' | 'checking';
}

export function Health() {
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
        gateway: 'checking',
        postgres: 'checking',
        kafka: 'checking',
        hardhat: 'checking'
    });

    const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['health'],
        queryFn: healthApi.check,
        refetchInterval: 30000,
    });

    const health = data?.data;
    const isHealthy = health?.status === 'UP';

    // Check all services when main health check updates
    useEffect(() => {
        checkAllServices();
    }, [dataUpdatedAt]);

    const checkAllServices = async () => {
        // Check PostgreSQL from Spring Boot health
        const pgStatus = health?.components?.db?.status === 'UP' ? 'up' :
            health?.components?.db ? 'down' : 'checking';

        // Check Kafka from Spring Boot health
        const kafkaStatus = health?.components?.kafka?.status === 'UP' ? 'up' :
            health?.status === 'UP' ? 'up' : 'checking';

        // Check Gateway
        let gatewayStatus: 'up' | 'down' | 'checking' = 'checking';
        try {
            const response = await fetch(`${GATEWAY_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            gatewayStatus = response.ok ? 'up' : 'down';
        } catch {
            gatewayStatus = 'down';
        }

        // Check Hardhat (via gateway or direct)
        let hardhatStatus: 'up' | 'down' | 'checking' = 'checking';
        try {
            const response = await fetch('http://localhost:8545', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
                signal: AbortSignal.timeout(3000)
            });
            const result = await response.json();
            hardhatStatus = result.result ? 'up' : 'down';
        } catch {
            hardhatStatus = 'down';
        }

        setServiceStatus({
            gateway: gatewayStatus,
            postgres: pgStatus as 'up' | 'down' | 'checking',
            kafka: kafkaStatus as 'up' | 'down' | 'checking',
            hardhat: hardhatStatus
        });
    };

    const handleRefresh = () => {
        refetch();
        checkAllServices();
    };

    return (
        <div>
            <header className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">System Health</h1>
                        <p className="page-subtitle">Monitor platform service status</p>
                    </div>
                    <button className="btn btn-secondary" onClick={handleRefresh}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </header>

            {/* Overall Health */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className={`stat-icon ${isLoading ? 'warning' : isHealthy ? 'success' : 'danger'}`}>
                        <Heart size={32} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {isLoading ? 'Checking...' : isHealthy ? 'All Systems Operational' : 'Issues Detected'}
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                            Last checked: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Never'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Service Cards */}
            <div className="stats-grid">
                <ServiceCard
                    name="Loan Service (Spring Boot)"
                    icon={<Server size={24} />}
                    status={isLoading ? 'checking' : isHealthy ? 'up' : 'down'}
                    endpoint="http://localhost:8081"
                />
                <ServiceCard
                    name="Blockchain Gateway (Node.js)"
                    icon={<Cloud size={24} />}
                    status={serviceStatus.gateway}
                    endpoint={GATEWAY_URL}
                />
                <ServiceCard
                    name="PostgreSQL Database"
                    icon={<Database size={24} />}
                    status={isLoading ? 'checking' : serviceStatus.postgres}
                    endpoint="localhost:5432"
                />
                <ServiceCard
                    name="Kafka Message Broker"
                    icon={<Cloud size={24} />}
                    status={isLoading ? 'checking' : serviceStatus.kafka}
                    endpoint="localhost:9092"
                />
                <ServiceCard
                    name="Hardhat Blockchain"
                    icon={<Zap size={24} />}
                    status={serviceStatus.hardhat}
                    endpoint="http://localhost:8545"
                />
            </div>

            {/* Health Details */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">Health Check Details</h2>
                </div>
                {isLoading ? (
                    <div className="loading">
                        <div className="spinner" /> Checking health...
                    </div>
                ) : isError ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
                        <XCircle size={48} style={{ marginBottom: '1rem' }} />
                        <p>Unable to connect to the backend service</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                            Make sure the loan-service is running on http://localhost:8081
                        </p>
                    </div>
                ) : (
                    <pre style={{
                        background: 'var(--color-bg-tertiary)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem'
                    }}>
                        {JSON.stringify(health, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

function ServiceCard({
    name,
    icon,
    status,
    endpoint
}: {
    name: string;
    icon: React.ReactNode;
    status: 'up' | 'down' | 'checking';
    endpoint: string;
}) {
    const statusColors = {
        up: 'success',
        down: 'danger',
        checking: 'warning'
    };

    const statusLabels = {
        up: 'Online',
        down: 'Offline',
        checking: 'Checking...'
    };

    return (
        <div className="stat-card">
            <div className={`stat-icon ${statusColors[status]}`}>
                {icon}
            </div>
            <div className="stat-content" style={{ flex: 1 }}>
                <h3>{name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {status === 'up' ? (
                        <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                    ) : status === 'down' ? (
                        <XCircle size={14} style={{ color: 'var(--color-danger)' }} />
                    ) : null}
                    <span className={`badge ${status === 'up' ? 'matched' : status === 'down' ? 'mismatched' : 'pending'}`}>
                        {statusLabels[status]}
                    </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    {endpoint}
                </p>
            </div>
        </div>
    );
}
