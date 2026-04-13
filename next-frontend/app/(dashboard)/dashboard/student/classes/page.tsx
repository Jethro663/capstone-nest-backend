import { redirect } from 'next/navigation';

export default function StudentClassesIndexPage() {
  redirect('/dashboard/student/courses');
}
