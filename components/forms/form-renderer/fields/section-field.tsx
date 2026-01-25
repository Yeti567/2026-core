'use client';

interface SectionFieldProps {
  title: string;
  description?: string;
}

export function SectionField({ title, description }: SectionFieldProps) {
  return (
    <div className="border-b border-[var(--border)] pb-2 pt-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--muted)] mt-1">{description}</p>
      )}
    </div>
  );
}
