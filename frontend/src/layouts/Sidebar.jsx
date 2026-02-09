import React from 'react';
import { cn } from '@/components/ui/utils';
import {
  LayoutDashboard,
  User,
  LogOut,
  BookOpen,
  Users,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = ({ role, currentPage, onNavigate }) => {
  const { logout } = useAuth();

  const getNavItems = () => {
    const dashboardItem = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="h-5 w-5" />
      }
    ];

    const roleSpecificItems = {
      student: [
        { id: 'courses', label: 'My Courses', icon: <BookOpen className="h-5 w-5" /> },
        { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> }
      ],
      teacher: [
        { id: 'sections', label: 'My Sections', icon: <Users className="h-5 w-5" /> },
        { id: 'classes', label: 'My Classes', icon: <Users className="h-5 w-5" /> }
      ],
      admin: [
        { id: 'users', label: 'Manage Users', icon: <Users className="h-5 w-5" /> },
        { id: 'sections', label: 'Manage Sections', icon: <Users className="h-5 w-5" /> },
        { id: 'classes', label: 'Manage Classes', icon: <BookOpen className="h-5 w-5" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> }
      ]
    };

    // Combine dashboard + role-specific items
    return [...dashboardItem, ...(roleSpecificItems[role] || [])];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-full shrink-0">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary">Nexora</h1>
        <p className="text-xs text-muted-foreground mt-1 capitalize">{role} Portal</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 transform',
                  currentPage === item.id
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:shadow hover:scale-105'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10 hover:shadow hover:scale-105"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
