// This is a completely static HTML test file
// Place this in the public folder and access it directly

export default function MinimalTest() {
    return (
        <html>
            <head>
                <title>Minimal Test</title>
            </head>
            <body style={{ margin: 0, padding: '50px', background: '#000', color: '#fff', fontFamily: 'system-ui' }}>
                <h1 style={{ color: '#10b981' }}>✅ MINIMAL TEST WORKS</h1>
                <p>If you see this, the Next.js server is running.</p>
                <p>Time: {new Date().toISOString()}</p>
            </body>
        </html>
    )
}
