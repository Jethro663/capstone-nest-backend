import { RoleProfilePage } from '@/components/profile/RoleProfilePage';

export default function AdminProfileRoute() {
  return (
    <RoleProfilePage
      roleLabel="Admin"
      title="Admin Profile"
      subtitle="Admin profile details stay simple for now. Use this page for account review and password management while role-specific admin profile features are still pending."
    />
  );
}
