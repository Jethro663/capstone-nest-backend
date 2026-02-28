/**
 * TopBar — welcome text, notifications, messages, profile
 */

'use client';

import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, Menu, User } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email ?? 'User';
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4">
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

        <div className="mx-2 h-6 w-px bg-slate-200" />

        <button
          onClick={() => router.push('/dashboard/profile')}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-slate-100"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-slate-700 md:block">Profile</span>
        </button>
      </div>
    </header>
  );
}
