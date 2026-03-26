import { ClassRecordReportsPage } from '@/components/reports/class-record-reports-page';

export default function AdminReportsPage() {
  return (
    <div className="theme-admin-bridge">
      <ClassRecordReportsPage
        heading="Reports"
        description="Inspect class records, performance, intervention, and usage views across the platform."
        scope="admin"
      />
    </div>
  );
}
