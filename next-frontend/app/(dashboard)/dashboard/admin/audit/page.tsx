'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditTrailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground">Track system activity and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm mt-1">Audit trail functionality will be available in a future update.</p>
        </CardContent>
      </Card>
    </div>
  );
}
