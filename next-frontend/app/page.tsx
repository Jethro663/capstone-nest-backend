import type { Metadata } from 'next';
import { SchoolLandingPage } from '@/components/landing/SchoolLandingPage';

export const metadata: Metadata = {
  title: 'Gat Andres Bonifacio High School | Nexora Digital Campus',
  description:
    'Discover Gat Andres Bonifacio High School, its learning community, DepEd direction, and Nexora digital campus.',
  icons: {
    icon: '/taguigpic.png',
    shortcut: '/taguigpic.png',
    apple: '/taguigpic.png',
  },
};

export default function LandingPage() {
  return <SchoolLandingPage />;
}
