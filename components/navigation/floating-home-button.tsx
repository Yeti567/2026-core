'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Floating Home Button that appears on all pages except the home page.
 * Allows users to navigate back to the main overview from anywhere in the app.
 */
export function FloatingHomeButton() {
    const pathname = usePathname();

    // Don't show on home page
    if (pathname === '/') {
        return null;
    }

    return (
        <Link
            href="/"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[var(--primary)] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            title="Go to Home"
        >
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
            </svg>
            <span className="text-sm font-medium">Home</span>
        </Link>
    );
}
