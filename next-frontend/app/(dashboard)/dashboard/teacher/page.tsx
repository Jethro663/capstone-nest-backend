import { redirect } from 'next/navigation';

export default function TeacherDashboardRedirectPage() {
  redirect('/dashboard/teacher/classes');
}
