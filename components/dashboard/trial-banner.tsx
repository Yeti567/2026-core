'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, AlertTriangle, CreditCard, X } from 'lucide-react';

interface TrialBannerProps {
  trialEndsAt: string | null;
  subscriptionStatus: string;
}

export function TrialBanner({ trialEndsAt, subscriptionStatus }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!trialEndsAt || subscriptionStatus !== 'trial') {
      setDaysLeft(null);
      return;
    }

    const endDate = new Date(trialEndsAt);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysLeft(diffDays);
  }, [trialEndsAt, subscriptionStatus]);

  // Don't show if not on trial or dismissed
  if (subscriptionStatus !== 'trial' || dismissed || daysLeft === null) {
    return null;
  }

  // Determine urgency level
  const isUrgent = daysLeft <= 2;
  const isWarning = daysLeft <= 3 && daysLeft > 2;
  const isExpired = daysLeft <= 0;

  if (isExpired) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-400">Trial Expired</h3>
              <p className="text-sm text-red-300/80">
                Your free trial has ended. Subscribe now to continue using COR Pathway.
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold text-white transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Subscribe Now
          </Link>
        </div>
      </div>
    );
  }

  const bgColor = isUrgent 
    ? 'bg-orange-500/20 border-orange-500/50' 
    : isWarning 
      ? 'bg-amber-500/20 border-amber-500/50'
      : 'bg-blue-500/20 border-blue-500/50';

  const textColor = isUrgent 
    ? 'text-orange-400' 
    : isWarning 
      ? 'text-amber-400'
      : 'text-blue-400';

  const subTextColor = isUrgent 
    ? 'text-orange-300/80' 
    : isWarning 
      ? 'text-amber-300/80'
      : 'text-blue-300/80';

  return (
    <div className={`${bgColor} border rounded-xl p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${isUrgent ? 'bg-orange-500/20' : isWarning ? 'bg-amber-500/20' : 'bg-blue-500/20'} flex items-center justify-center`}>
            <Clock className={`w-5 h-5 ${textColor}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${textColor}`}>
              {daysLeft === 1 ? '1 Day Left' : `${daysLeft} Days Left`} in Your Free Trial
            </h3>
            <p className={`text-sm ${subTextColor}`}>
              {isUrgent 
                ? 'Your trial is ending soon! Subscribe now to keep access.'
                : 'Enjoying COR Pathway? Choose a plan to continue after your trial.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pricing"
            className={`flex items-center gap-2 px-4 py-2 ${isUrgent ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} rounded-lg font-semibold text-white transition-colors`}
          >
            <CreditCard className="w-4 h-4" />
            View Plans
          </Link>
          {!isUrgent && (
            <button
              onClick={() => setDismissed(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
