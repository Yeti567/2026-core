'use client';

export default function TestPage() {
    return (
        <div style={{ padding: '50px', textAlign: 'center', background: '#080a0c', minHeight: '100vh', color: 'white' }}>
            <h1 style={{ fontSize: '48px', color: '#10b981' }}>✅ IT WORKS!</h1>
            <p style={{ fontSize: '24px', color: '#94a3b8' }}>Your COR Pathway app is running successfully.</p>
            <div style={{ margin: '20px 0', padding: '15px', background: '#1e293b', borderRadius: '8px', display: 'inline-block' }}>
                <p style={{ margin: 0 }}>Current time: {new Date().toLocaleString()}</p>
            </div>
            <div style={{ marginTop: '30px' }}>
                <a href="/" style={{ fontSize: '20px', color: '#6366f1', textDecoration: 'none', fontWeight: 'bold' }}>
                    ← Go to Home
                </a>
            </div>
        </div>
    )
}
