import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface User {
    email: string;
    name: string;
    role: UserRole;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
    logout: () => void;
    canApprove: boolean;
    canCreate: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Simulated user store (localStorage-backed for dev)
const USERS_KEY = 'dab_users';
const SESSION_KEY = 'dab_session';

function getStoredUsers(): Array<User & { password: string }> {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch { return []; }
}

function storeUser(user: User & { password: string }) {
    const users = getStoredUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Restore session
        try {
            const session = localStorage.getItem(SESSION_KEY);
            if (session) setUser(JSON.parse(session));
        } catch { /* ignore */ }
    }, []);

    const login = async (email: string, password: string) => {
        // Check stored users
        const users = getStoredUsers();
        const found = users.find(u => u.email === email && u.password === password);
        if (!found) {
            throw new Error('Invalid email or password');
        }
        const sessionUser: User = { email: found.email, name: found.name, role: found.role };
        setUser(sessionUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    };

    const signup = async (name: string, email: string, password: string, role: UserRole) => {
        const users = getStoredUsers();
        if (users.find(u => u.email === email)) {
            throw new Error('Email already registered');
        }
        storeUser({ name, email, password, role });
        const sessionUser: User = { name, email, role };
        setUser(sessionUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(SESSION_KEY);
    };

    const canApprove = user?.role === 'ADMIN';
    const canCreate = user?.role === 'ADMIN' || user?.role === 'ANALYST';

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, canApprove, canCreate }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
