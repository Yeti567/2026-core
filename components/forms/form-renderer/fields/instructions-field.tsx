'use client';

interface InstructionsFieldProps {
  content: string;
  variant?: 'info' | 'warning' | 'danger';
}

export function InstructionsField({
  content,
  variant = 'info',
}: InstructionsFieldProps) {
  const variantStyles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
    danger: 'bg-red-500/10 border-red-500/30 text-red-600',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '🚨',
  };

  return (
    <div
      className={`p-4 rounded-xl border ${variantStyles[variant]}`}
      role="note"
    >
      <div className="flex gap-3">
        <span className="text-xl">{icons[variant]}</span>
        <div className="flex-1 text-sm whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
