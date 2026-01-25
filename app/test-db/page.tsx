import { createClient } from '@/lib/supabase/server';

export default async function TestDbPage() {
    let status = 'checking...';
    let error: string | null = null;
    let details: string | null = null;

    try {
        const supabase = await createClient();

        // Try a simple query to test connection
        const { data, error: queryError } = await supabase
            .from('companies')
            .select('id')
            .limit(1);

        if (queryError) {
            status = 'error';
            error = queryError.message;
            details = queryError.code || 'Unknown error code';
        } else {
            status = 'connected';
            details = `Query successful. Found ${data?.length ?? 0} record(s).`;
        }
    } catch (err) {
        status = 'error';
        error = err instanceof Error ? err.message : 'Unknown error occurred';
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
            <h1 style={{ fontSize: '36px', marginBottom: '30px' }}>Database Connection Test</h1>

            {status === 'connected' ? (
                <div style={{
                    background: '#064e3b',
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    border: '2px solid #10b981'
                }}>
                    <h2 style={{ fontSize: '48px', color: '#10b981', margin: 0 }}>✅ Connected!</h2>
                    <p style={{ fontSize: '18px', color: '#6ee7b7', marginTop: '15px' }}>
                        Supabase connection is working properly.
                    </p>
                    {details && (
                        <p style={{ fontSize: '14px', color: '#a7f3d0', marginTop: '10px' }}>
                            {details}
                        </p>
                    )}
                </div>
            ) : status === 'error' ? (
                <div style={{
                    background: '#7f1d1d',
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    border: '2px solid #ef4444'
                }}>
                    <h2 style={{ fontSize: '48px', color: '#ef4444', margin: 0 }}>❌ Connection Failed</h2>
                    <p style={{ fontSize: '18px', color: '#fca5a5', marginTop: '15px' }}>
                        Could not connect to Supabase.
                    </p>
                    {error && (
                        <div style={{
                            background: '#450a0a',
                            padding: '15px',
                            borderRadius: '8px',
                            marginTop: '15px',
                            textAlign: 'left'
                        }}>
                            <p style={{ fontSize: '14px', color: '#fecaca', margin: 0 }}>
                                <strong>Error:</strong> {error}
                            </p>
                            {details && (
                                <p style={{ fontSize: '12px', color: '#fca5a5', margin: '10px 0 0 0' }}>
                                    <strong>Code:</strong> {details}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <p style={{ fontSize: '24px', color: '#94a3b8' }}>Checking connection...</p>
            )}

            <div style={{ marginTop: '40px' }}>
                <a href="/" style={{
                    fontSize: '18px',
                    color: '#6366f1',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    ← Go to Home
                </a>
                <span style={{ margin: '0 20px', color: '#475569' }}>|</span>
                <a href="/test-page" style={{
                    fontSize: '18px',
                    color: '#6366f1',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    View Test Page
                </a>
            </div>
        </div>
    );
}
