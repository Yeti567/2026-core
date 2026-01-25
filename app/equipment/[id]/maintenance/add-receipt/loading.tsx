export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-2">⏳</div>
        <p className="text-[var(--muted)]">Loading...</p>
      </div>
    </div>
  );
}
