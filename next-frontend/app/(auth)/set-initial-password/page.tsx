import { Suspense } from 'react';
import { SetInitialPasswordForm } from '@/components/auth/SetInitialPasswordForm';

export const metadata = {
  title: 'Set Password - Nexora',
  description: 'Set your initial password',
};

export default function SetInitialPasswordPage() {
  return (
    <Suspense>
      <SetInitialPasswordForm />
    </Suspense>
  );
}
