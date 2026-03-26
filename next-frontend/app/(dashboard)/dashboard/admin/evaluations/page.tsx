import { SystemEvaluationsPage } from '@/components/evaluations/system-evaluations-page';

export default function AdminEvaluationsPage() {
  return (
    <div className="theme-admin-bridge">
      <SystemEvaluationsPage
        heading="Evaluations"
        description="Review submitted LMS and LXP evaluation responses from across the platform."
      />
    </div>
  );
}
