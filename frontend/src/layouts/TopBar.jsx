import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, User, Menu } from 'lucide-react';

const TopBar = ({ userName, onProfile, onNotifications, onMessages }) => {
  return (
    <header className="h-16 bg-white border-b px-4 md:px-6 flex justify-between items-center shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h2 className="text-sm md:text-lg font-semibold truncate">
          Welcome, {userName || 'User'}
        </h2>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {/* Messages button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMessages}
          className="transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
        >
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Notifications button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onNotifications}
          className="transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Divider */}
        <div className="h-8 w-px bg-border mx-1" />

        {/* Profile button */}
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 pl-2 transition-all duration-200 transform hover:scale-105 hover:bg-gray-100 hover:shadow"
          onClick={onProfile}
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-200 transform hover:scale-110">
            <User className="h-5 w-5 text-primary" />
          </div>
          <span className="hidden md:inline text-sm font-medium">Profile</span>
        </Button>
      </div>
    </header>
  );
};

export default TopBar;
