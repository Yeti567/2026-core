'use client';

import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FieldWrapperProps {
  label: string;
  fieldCode: string;
  required?: boolean;
  helpText?: string | null;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function FieldWrapper({
  label,
  fieldCode,
  required,
  helpText,
  error,
  className,
  children,
}: FieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Label
          htmlFor={fieldCode}
          className={cn(
            'text-sm font-medium',
            error && 'text-destructive'
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default FieldWrapper;
