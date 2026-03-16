import { ClassRecordReportsPage } from '@/components/reports/class-record-reports-page';

export default function TeacherReportsPage() {
  return (
    <ClassRecordReportsPage
      heading="Teacher Reports"
      description="Review class averages, grade distributions, and intervention lists using existing class record data."
      scope="teacher"
    />
  );
}
