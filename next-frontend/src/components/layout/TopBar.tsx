/**
 * TopBar — welcome text, notifications, messages, profile
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, MessageSquare, Menu } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfileRoute } from '@/utils/profile';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role } = useAuth();
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email ?? 'User';
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const profileHref = getProfileRoute(role);

  return (
    <header className={`flex h-16 items-center justify-between border-b bg-white px-4 ${isStudentRoute ? 'border-red-100 bg-gradient-to-r from-white to-red-50/40' : ''}`}>
      {/* Left — mobile menu + welcome */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="hidden text-sm text-muted-foreground sm:block">
          Welcome, <span className="font-medium text-slate-900">{displayName}</span>
        </span>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/messages')}
          title="Messages"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/notifications')}
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <div className={`mx-2 h-6 w-px ${isStudentRoute ? 'bg-red-200' : 'bg-slate-200'}`} />

        <button
          onClick={() => router.push(profileHref)}
          className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors ${isStudentRoute ? 'hover:bg-red-50' : 'hover:bg-slate-100'}`}
        >
          <Avatar className="h-8 w-8">
            {user?.profilePicture ? <AvatarImage src={user.profilePicture} alt={displayName} /> : null}
            <AvatarFallback className={`text-xs font-medium ${isStudentRoute ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-slate-700 md:block">Profile</span>
        </button>
      </div>
    </header>
  );
}
