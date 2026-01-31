'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from './button';

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
}

export function BackButton({ 
  fallbackHref = '/dashboard', 
  label = 'Back',
  className = ''
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      // No history, go to fallback (dashboard)
      router.push(fallbackHref);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-2 text-slate-400 hover:text-white ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function DashboardButton({ className = '' }: { className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={`gap-2 text-slate-400 hover:text-white ${className}`}
    >
      <a href="/dashboard">
        <Home className="h-4 w-4" />
        Dashboard
      </a>
    </Button>
  );
}
