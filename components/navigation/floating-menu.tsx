'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, Info, Settings, Menu, X, HelpCircle } from 'lucide-react';

/**
 * Floating Menu Button with quick access to key pages
 */
export function FloatingMenu() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Don't show on home page
    if (pathname === '/') {
        return null;
    }

    const menuItems = [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/about', label: 'About', icon: Info },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
        { href: '/help', label: 'Help', icon: HelpCircle },
    ];

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Menu Items */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 ${
                                    isActive
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                                }`}
                                title={item.label}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                title={isOpen ? 'Close menu' : 'Open menu'}
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <Menu className="w-6 h-6" />
                )}
            </button>
        </>
    );
}
