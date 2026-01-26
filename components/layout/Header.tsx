'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[#21262d] bg-[#0d1117]/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo Section */}
                <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#238636] to-[#2ea043] flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-lg leading-none">C</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">
                        COR<span className="text-[#2ea043] font-light">Pathways</span>
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-6">
                    <Link
                        href="/"
                        className={`text-sm font-medium transition-colors hover:text-[#2ea043] ${pathname === '/' ? 'text-[#2ea043]' : 'text-[#8b949e]'
                            }`}
                    >
                        Home
                    </Link>
                    <Link
                        href="/login"
                        className="text-sm font-medium text-[#8b949e] hover:text-[#2ea043] transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/register"
                        className="hidden sm:inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#238636] text-white hover:bg-[#2ea043] h-9 px-4 py-2 shadow-sm"
                    >
                        Get Started
                    </Link>
                </nav>
            </div>
        </header>
    );
}
