import { redirect } from 'next/navigation';

/**
 * Signup page - Redirects to company registration
 * 
 * Individual user signup is not allowed. Users must either:
 * 1. Register a new company at /register
 * 2. Accept an invitation from their company admin
 * 
 * This redirect ensures users don't bypass the controlled onboarding process.
 */
export default function SignupPage() {
  redirect('/register');
}
