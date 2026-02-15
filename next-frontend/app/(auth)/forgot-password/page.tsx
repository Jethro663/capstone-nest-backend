import { ForgotPasswordForm } from '@/components-next/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Forgot Password - Nexora',
  description: 'Reset your Nexora password',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
