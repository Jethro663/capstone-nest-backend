import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexora - Learning Experience Platform',
  description: 'A comprehensive LMS for educators and learners',
  icons: {
    icon: '/NexoraHome.png',
    shortcut: '/NexoraHome.png',
    apple: '/NexoraHome.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const version = process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA
    ? process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA.substring(0, 7)
    : 'dev';

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <div className="fixed bottom-1 right-2 text-[10px] font-mono text-muted-foreground/30 pointer-events-none z-[9999]">
                {version}
              </div>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
