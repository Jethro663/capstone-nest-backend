import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AppOrbitLoader } from '@/components/shared/AppOrbitLoader';

export const metadata = {
  title: 'Sign In - Nexora',
  description: 'Sign in to your Nexora account',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AppOrbitLoader variant="calm" />}>
      <LoginForm />
    </Suspense>
  );
}
