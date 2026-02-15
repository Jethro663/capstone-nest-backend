import { useAuth } from '@/providers/AuthProvider';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // This will be replaced by role-specific layouts in Phase 2
  // For now, just redirect to a placeholder
  redirect('/dashboard/student');
}
