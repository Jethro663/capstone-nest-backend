import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
