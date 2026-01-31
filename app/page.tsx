import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export default async function HomePage() {
  // Check if user is authenticated
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      // Authenticated - go to COR Audit Dashboard
      redirect('/audit');
    }
  }
  
  // Not authenticated - go to login
  redirect('/login');
}
