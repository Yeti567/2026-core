'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show on dashboard (it's the home page)
  if (pathname === '/dashboard') {
    return null;
  }

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      // No history, go to dashboard
      router.push('/dashboard');
    }
  };

  // Generate breadcrumb-style title from pathname
  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    
    // Get the last meaningful segment
    let lastSegment = segments[segments.length - 1];
    
    // Skip dynamic segments like [id]
    if (lastSegment.startsWith('[') || /^[a-f0-9-]{36}$/.test(lastSegment)) {
      lastSegment = segments[segments.length - 2] || 'Details';
    }
    
    // Format the segment name
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            
            <div className="h-4 w-px bg-slate-700" />
            
            <span className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-none">
              {getPageTitle()}
            </span>
          </div>
          
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
