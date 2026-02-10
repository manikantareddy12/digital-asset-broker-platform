import { useQuery } from '@tanstack/react-query';
import { Heart, Server, Database, Cloud, CheckCircle, XCircle, RefreshCw, Zap } from 'lucide-react';
import { healthApi } from '../api/client';
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
                    name="Loan Service"
                    description="Spring Boot Backend"
                    icon={<Server size={24} />}
                    status={isLoading ? 'checking' : isHealthy ? 'up' : 'down'}
                />
                <ServiceCard
                    name="Blockchain Gateway"
                    description="Node.js Service"
                    icon={<Cloud size={24} />}
                    status={serviceStatus.gateway}
                />
                <ServiceCard
                    name="PostgreSQL"
                    description="Database"
                    icon={<Database size={24} />}
                    status={isLoading ? 'checking' : serviceStatus.postgres}
                />
                <ServiceCard
                    name="Kafka"
                    description="Message Broker"
                    icon={<Cloud size={24} />}
                    status={isLoading ? 'checking' : serviceStatus.kafka}
                />
                <ServiceCard
                    name="Hardhat"
                    description="Local Blockchain"
                    icon={<Zap size={24} />}
                    status={serviceStatus.hardhat}
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
                    <div style={{ padding: '0.5rem 0' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Component</th>
                                    <th>Status</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Overall</strong></td>
                                    <td>
                                        <span className={`badge ${health?.status === 'UP' ? 'matched' : 'mismatched'}`}>
                                            {health?.status || 'Unknown'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>Application health status</td>
                                </tr>
                                {health?.components?.db && (
                                    <tr>
                                        <td><strong>Database</strong></td>
                                        <td>
                                            <span className={`badge ${health.components.db.status === 'UP' ? 'matched' : 'mismatched'}`}>
                                                {health.components.db.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>
                                            {health.components.db.details?.database || 'PostgreSQL'}
                                        </td>
                                    </tr>
                                )}
                                {health?.components?.diskSpace && (
                                    <tr>
                                        <td><strong>Disk Space</strong></td>
                                        <td>
                                            <span className={`badge ${health.components.diskSpace.status === 'UP' ? 'matched' : 'mismatched'}`}>
                                                {health.components.diskSpace.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>
                                            {health.components.diskSpace.details?.free
                                                ? `${(health.components.diskSpace.details.free / 1073741824).toFixed(1)} GB free`
                                                : 'Available'}
                                        </td>
                                    </tr>
                                )}
                                {health?.components?.ping && (
                                    <tr>
                                        <td><strong>Ping</strong></td>
                                        <td>
                                            <span className={`badge ${health.components.ping.status === 'UP' ? 'matched' : 'mismatched'}`}>
                                                {health.components.ping.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>Application responding</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function ServiceCard({
    name,
    description,
    icon,
    status
}: {
    name: string;
    description: string;
    icon: React.ReactNode;
    status: 'up' | 'down' | 'checking';
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
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {status === 'up' ? (
                        <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                    ) : status === 'down' ? (
                        <XCircle size={14} style={{ color: 'var(--color-danger)' }} />
                    ) : null}
                    <span className={`badge ${status === 'up' ? 'matched' : status === 'down' ? 'mismatched' : 'pending'}`}>
                        {statusLabels[status]}
                    </span>
                </div>
            </div>
        </div>
    );
}
