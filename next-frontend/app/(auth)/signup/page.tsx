import { SignupForm } from '@/components-next/auth/SignupForm';

export const metadata = {
  title: 'Sign Up - Nexora',
  description: 'Create a new Nexora account',
};

export default function SignupPage() {
  return <SignupForm />;
}
