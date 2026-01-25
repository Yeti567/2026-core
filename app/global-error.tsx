'use client';

/**
 * Global Error Handler for React Errors
 * 
 * This component catches React rendering errors in the App Router
 * and reports them to Sentry for monitoring.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-global-errors
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Report the error to Sentry
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff',
                    fontFamily: 'system-ui, sans-serif',
                }}>
                    <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>
                        Something went wrong!
                    </h1>
                    <p style={{ fontSize: '18px', color: '#888', marginBottom: '24px', textAlign: 'center', maxWidth: '500px' }}>
                        An unexpected error occurred. Our team has been notified and is working to fix it.
                    </p>
                    {error.digest && (
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                            Error ID: {error.digest}
                        </p>
                    )}
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
