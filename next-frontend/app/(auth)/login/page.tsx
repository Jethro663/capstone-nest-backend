import { LoginForm } from '@/components-next/auth/LoginForm';

export const metadata = {
  title: 'Sign In - Nexora',
  description: 'Sign in to your Nexora account',
};

export default function LoginPage() {
  return <LoginForm />;
}
