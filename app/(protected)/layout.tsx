import { NavHeader } from '@/components/layout/nav-header';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavHeader />
      {children}
    </>
  );
}
