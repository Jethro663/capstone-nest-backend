import { Suspense } from 'react';
import AnimatedLoginWrapper from '@/components/auth/AnimatedLoginWrapper';

export const metadata = {
  title: 'Sign In - Nexora',
  description: 'Sign in to your Nexora account',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Loading…</div>}>
      <AnimatedLoginWrapper />
    </Suspense>
  );
}
