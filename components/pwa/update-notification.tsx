'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { Download, Loader2 } from 'lucide-react';

export function UpdateNotification() {
  const {
    shouldShowUpdate,
    isUpdating,
    showUpdatedToast,
    versionLabel,
    updateNow,
    dismissUpdate
  } = usePwaUpdate();

  return (
    <>
      {showUpdatedToast && (
        <Card className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-3 shadow-lg z-50 bg-emerald-50 border border-emerald-200">
          <div className="text-xs font-medium text-emerald-700">✅ Updated to the latest version.</div>
        </Card>
      )}

      {shouldShowUpdate && (
        <Card className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4 shadow-lg z-50 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-blue-100 p-2">
              <Download className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-blue-900 mb-1">🔄 New version available! Tap to update.</h3>
              <p className="text-xs text-blue-700 mb-3">
                {versionLabel ? `Version ${versionLabel} is ready.` : 'A fresh build of COR Pathways is ready.'}
                {isUpdating ? ' Updating now…' : ' Update for the latest fixes and improvements.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => updateNow()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating…
                    </span>
                  ) : (
                    'Update Now'
                  )}
                </Button>
                <Button
                  onClick={dismissUpdate}
                  size="sm"
                  variant="outline"
                  disabled={isUpdating}
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
