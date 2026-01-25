'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

// Simple Select components without Radix
interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const Select = ({ value, defaultValue, onValueChange, disabled, children }: SelectProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const [open, setOpen] = React.useState(false);
  
  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };
  
  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen, disabled }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectTrigger must be used within Select');
    
    return (
      <button
        type="button"
        ref={ref}
        onClick={() => {
          if (context.disabled || props.disabled) return;
          context.setOpen(!context.open);
        }}
        disabled={context.disabled || props.disabled}
        className={cn(
          'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

const SelectValue = ({ placeholder, children }: SelectValueProps) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');
  
  return (
    <span className={!context.value ? 'text-muted-foreground' : ''}>
      {children ?? (context.value || placeholder)}
    </span>
  );
};

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectContent must be used within Select');
    
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (!(e.target as Element).closest('.select-content') && 
            !(e.target as Element).closest('button')) {
          context.setOpen(false);
        }
      };
      
      if (context.open) {
        document.addEventListener('click', handleClickOutside);
      }
      return () => document.removeEventListener('click', handleClickOutside);
    }, [context.open, context]);
    
    if (!context.open) return null;
    
    return (
      <div
        ref={ref}
        className={cn(
          'select-content absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
          className
        )}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  }
);
SelectContent.displayName = 'SelectContent';

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, disabled, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectItem must be used within Select');
    
    const isSelected = context.value === value;
    
    return (
      <div
        ref={ref}
        aria-disabled={disabled || context.disabled}
        onClick={() => {
          if (disabled || context.disabled) return;
          context.onValueChange(value);
        }}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
          isSelected && 'bg-accent',
          (disabled || context.disabled) && 'pointer-events-none opacity-50',
          className
        )}
        {...props}
      >
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
        </span>
        {children}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
