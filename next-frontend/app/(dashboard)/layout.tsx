import { ReactNode } from 'react';

/**
 * Dashboard Layout
 * 
 * This will be enhanced in Phase 2 with:
 * - Sidebar navigation
 * - Top navigation bar
 * - Role-based layout routing
 * 
 * For now, it's a simple flex layout
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Placeholder for Sidebar - coming in Phase 2 */}
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <div className="text-sm text-muted-foreground">
          [Sidebar - Coming in Phase 2]
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Placeholder for TopBar - coming in Phase 2 */}
        <header className="border-b border-slate-200 bg-white p-4">
          <div className="text-sm text-muted-foreground">
            [Top Navigation - Coming in Phase 2]
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
