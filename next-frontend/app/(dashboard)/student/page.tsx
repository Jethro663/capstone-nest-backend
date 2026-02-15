import { useAuth } from '@/providers/AuthProvider';

export const metadata = {
  title: 'Dashboard - Nexora',
};

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome to Nexora</h1>
        <p className="mt-2 text-muted-foreground">
          This is a placeholder for the Student Dashboard. Phase 2 will build out the full dashboard layout.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-6 w-24 rounded bg-slate-100"></div>
            <div className="mt-3 h-4 w-16 rounded bg-slate-100"></div>
          </div>
        ))}
      </div>

      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <p className="text-muted-foreground">
          Dashboard content will be rendered here in Phase 2
        </p>
      </div>
    </div>
  );
}
