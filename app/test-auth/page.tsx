'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
    status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
    user: {
        id: string;
        email: string;
        role?: string;
    } | null;
    error: string | null;
}

export default function TestAuthPage() {
    const [authState, setAuthState] = useState<AuthState>({
        status: 'loading',
        user: null,
        error: null,
    });

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const supabase = createClient();

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                setAuthState({
                    status: 'error',
                    user: null,
                    error: error.message,
                });
                return;
            }

            if (session?.user) {
                setAuthState({
                    status: 'authenticated',
                    user: {
                        id: session.user.id,
                        email: session.user.email || 'No email',
                        role: session.user.role,
                    },
                    error: null,
                });
            } else {
                setAuthState({
                    status: 'unauthenticated',
                    user: null,
                    error: null,
                });
            }
        } catch (err) {
            setAuthState({
                status: 'error',
                user: null,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }

    function goToLogin() {
        window.location.href = '/login';
    }

    return (
        <div style={{
            padding: '50px',
            textAlign: 'center',
            background: '#080a0c',
            minHeight: '100vh',
            color: 'white',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h1 style={{ fontSize: '36px', marginBottom: '30px' }}>Authentication Test</h1>

            {authState.status === 'loading' && (
                <p style={{ fontSize: '24px', color: '#94a3b8' }}>Checking authentication...</p>
            )}

            {authState.status === 'authenticated' && authState.user && (
                <div style={{
                    background: '#064e3b',
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    border: '2px solid #10b981',
                    textAlign: 'left'
                }}>
                    <h2 style={{ fontSize: '36px', color: '#10b981', margin: 0, textAlign: 'center' }}>
                        ✅ Logged In
                    </h2>
                    <div style={{ marginTop: '20px' }}>
                        <p style={{ fontSize: '16px', color: '#6ee7b7', margin: '10px 0' }}>
                            <strong>User ID:</strong> {authState.user.id}
                        </p>
                        <p style={{ fontSize: '16px', color: '#6ee7b7', margin: '10px 0' }}>
                            <strong>Email:</strong> {authState.user.email}
                        </p>
                        {authState.user.role && (
                            <p style={{ fontSize: '16px', color: '#6ee7b7', margin: '10px 0' }}>
                                <strong>Role:</strong> {authState.user.role}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {authState.status === 'unauthenticated' && (
                <div style={{
                    background: '#1e293b',
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    border: '2px solid #64748b'
                }}>
                    <h2 style={{ fontSize: '36px', color: '#f59e0b', margin: 0 }}>
                        ⚠️ Not Logged In
                    </h2>
                    <p style={{ fontSize: '18px', color: '#94a3b8', marginTop: '15px' }}>
                        No active session found.
                    </p>
                    <button
                        onClick={goToLogin}
                        style={{
                            marginTop: '20px',
                            padding: '12px 30px',
                            fontSize: '18px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        Go to Login
                    </button>
                </div>
            )}

            {authState.status === 'error' && (
                <div style={{
                    background: '#7f1d1d',
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    border: '2px solid #ef4444'
                }}>
                    <h2 style={{ fontSize: '36px', color: '#ef4444', margin: 0 }}>
                        ❌ Auth Error
                    </h2>
                    <p style={{ fontSize: '18px', color: '#fca5a5', marginTop: '15px' }}>
                        Could not check authentication status.
                    </p>
                    {authState.error && (
                        <div style={{
                            background: '#450a0a',
                            padding: '15px',
                            borderRadius: '8px',
                            marginTop: '15px',
                            textAlign: 'left'
                        }}>
                            <p style={{ fontSize: '14px', color: '#fecaca', margin: 0 }}>
                                <strong>Error:</strong> {authState.error}
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '40px' }}>
                <button
                    onClick={checkAuth}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        background: '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginRight: '15px',
                    }}
                >
                    🔄 Refresh Status
                </button>
            </div>

            <div style={{ marginTop: '30px' }}>
                <a href="/" style={{
                    fontSize: '18px',
                    color: '#6366f1',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    ← Go to Home
                </a>
                <span style={{ margin: '0 20px', color: '#475569' }}>|</span>
                <a href="/test-db" style={{
                    fontSize: '18px',
                    color: '#6366f1',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    Test Database
                </a>
                <span style={{ margin: '0 20px', color: '#475569' }}>|</span>
                <a href="/test-page" style={{
                    fontSize: '18px',
                    color: '#6366f1',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    Test Page
                </a>
            </div>
        </div>
    );
}
