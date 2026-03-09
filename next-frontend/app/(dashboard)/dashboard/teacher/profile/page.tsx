import { RoleProfilePage } from '@/components/profile/RoleProfilePage';

export default function TeacherProfileRoute() {
  return (
    <RoleProfilePage
      roleLabel="Teacher"
      title="Teacher Profile"
      subtitle="Teacher profile management is being expanded. Your account identity is read-only here for now, while password updates remain available."
    />
  );
}
