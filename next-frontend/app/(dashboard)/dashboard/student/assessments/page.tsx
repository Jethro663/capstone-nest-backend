import { redirect } from 'next/navigation';

export default function StudentAssessmentsIndexPage() {
  redirect('/dashboard/student/assessment-history');
}
