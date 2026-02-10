import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';

export function Login() {
    const { login, signup } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('ANALYST');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isSignup) {
                await signup(name, email, password, role);
            } else {
                await login(email, password);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        <img src="/image.png" alt="DAB" width={48} height={48} />
                    </div>
                    <h1>Digital Asset Broker</h1>
                    <p>{isSignup ? 'Create your account' : 'Sign in to your account'}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {isSignup && (
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@dab.io"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={4}
                        />
                    </div>
                    {isSignup && (
                        <div className="form-group">
                            <label htmlFor="role">Role</label>
                            <select
                                id="role"
                                value={role}
                                onChange={e => setRole(e.target.value as UserRole)}
                            >
                                <option value="ADMIN">Admin — Full access</option>
                                <option value="ANALYST">Analyst — Create & view loans</option>
                                <option value="VIEWER">Viewer — Read-only access</option>
                            </select>
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    {isSignup ? (
                        <p>Already have an account? <button className="auth-toggle" onClick={() => { setIsSignup(false); setError(''); }}>Sign In</button></p>
                    ) : (
                        <p>Don't have an account? <button className="auth-toggle" onClick={() => { setIsSignup(true); setError(''); }}>Sign Up</button></p>
                    )}
                </div>
            </div>
        </div>
    );
}
