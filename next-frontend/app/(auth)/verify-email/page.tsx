import { EmailVerificationForm } from '@/components-next/auth/EmailVerificationForm';

export const metadata = {
  title: 'Verify Email - Nexora',
  description: 'Verify your email address',
};

export default function VerifyEmailPage() {
  return <EmailVerificationForm />;
}
