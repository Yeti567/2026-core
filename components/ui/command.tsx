'use client';

/**
 * Minimal Command (command palette) primitives.
 *
 * The app uses these as lightweight building blocks for searchable lists.
 * This is intentionally simple (no complex keyboard navigation) but keeps
 * the API shape similar to shadcn/ui's Command components.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function Command({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground', className)}
      {...props}
    />
  );
}

export function CommandDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden">{children}</DialogContent>
    </Dialog>
  );
}

type CommandInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onValueChange?: (value: string) => void;
};

export function CommandInput({ className, ...props }: CommandInputProps) {
  const { onValueChange, ...rest } = props;
  return (
    <div className="border-b px-3 py-2">
      <input
        className={cn('w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground', className)}
        onChange={(e) => {
          (rest as any).onChange?.(e);
          onValueChange?.(e.target.value);
        }}
        {...rest}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('max-h-72 overflow-auto p-2', className)} {...props} />;
}

export function CommandEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-2 py-3 text-sm text-muted-foreground', className)} {...props} />;
}

export function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { heading?: React.ReactNode }) {
  return (
    <div className={cn('py-1', className)} {...props}>
      {heading ? <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">{heading}</div> : null}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function CommandItem({
  className,
  onSelect,
  disabled,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  onSelect?: () => void;
  disabled?: boolean;
  value?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        'flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function CommandSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('my-2 h-px bg-border', className)} {...props} />;
}

