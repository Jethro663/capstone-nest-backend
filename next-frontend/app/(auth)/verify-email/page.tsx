import { Suspense } from 'react';
import { EmailVerificationForm } from '@/components/auth/EmailVerificationForm';

export const metadata = {
  title: 'Verify Email - Nexora',
  description: 'Verify your email address',
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <EmailVerificationForm />
    </Suspense>
  );
}
