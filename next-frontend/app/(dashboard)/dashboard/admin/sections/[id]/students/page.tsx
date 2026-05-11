import { redirect } from 'next/navigation';

type StudentsLandingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentsLandingPage({ params }: StudentsLandingPageProps) {
  const { id } = await params;
  redirect(`/dashboard/admin/sections/${id}/students/add`);
}

