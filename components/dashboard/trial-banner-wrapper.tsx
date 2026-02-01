'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrialBanner } from './trial-banner';

export function TrialBannerWrapper() {
  const [subscriptionData, setSubscriptionData] = useState<{
    subscriptionStatus: string;
    trialEndsAt: string | null;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchSubscriptionStatus() {
      try {
        const res = await fetch('/api/subscription/status');
        if (res.ok) {
          const data = await res.json();
          setSubscriptionData(data);
          
          // Redirect to expired page if trial is expired
          if (data.subscriptionStatus === 'expired') {
            router.push('/trial-expired');
          }
        }
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      }
    }

    fetchSubscriptionStatus();
  }, [router]);

  if (!subscriptionData) {
    return null;
  }

  return (
    <TrialBanner
      trialEndsAt={subscriptionData.trialEndsAt}
      subscriptionStatus={subscriptionData.subscriptionStatus}
    />
  );
}
