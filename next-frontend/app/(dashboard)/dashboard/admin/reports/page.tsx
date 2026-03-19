import { ClassRecordReportsPage } from '@/components/reports/class-record-reports-page';

export default function AdminReportsPage() {
  return (
    <div className="theme-admin-bridge">
      <ClassRecordReportsPage
        heading="Admin Reports"
        description="Inspect teacher class record outcomes and intervention lists across available classes."
        scope="admin"
      />
    </div>
  );
}
