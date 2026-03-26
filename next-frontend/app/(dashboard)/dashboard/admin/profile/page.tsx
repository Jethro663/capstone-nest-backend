import { RoleProfilePage } from '@/components/profile/RoleProfilePage';

export default function AdminProfileRoute() {
  return (
    <RoleProfilePage
      roleLabel="Admin"
      title="My Profile"
      subtitle="Review your admin account details, contact information, and password settings from a single profile view."
      appearance="admin"
    />
  );
}
