'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ClassWorkspaceTabItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}

export interface ClassWorkspaceMetaItem {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface ClassWorkspaceShellProps {
  className?: string;
  backHref: string;
  backLabel: ReactNode;
  icon: ReactNode;
  title: string;
  subtitle: string;
  metaItems: ClassWorkspaceMetaItem[];
  tabs: ClassWorkspaceTabItem[];
  children: ReactNode;
}

export function ClassWorkspaceShell({
  className,
  backHref,
  backLabel,
  icon,
  title,
  subtitle,
  metaItems,
  tabs,
  children,
}: ClassWorkspaceShellProps) {
  return (
    <section className={cn('teacher-class-workspace', className)}>
      <header className="teacher-class-workspace__hero">
        <Link href={backHref} className="teacher-class-workspace__back">
          {backLabel}
        </Link>
        <div className="teacher-class-workspace__hero-row">
          <div className="teacher-class-workspace__hero-icon">{icon}</div>
          <div className="teacher-class-workspace__hero-copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <div className="teacher-class-workspace__hero-meta">
              {metaItems.map((item) => (
                <span key={item.key}>
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav className="teacher-class-workspace__tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className="teacher-class-workspace__tab"
              data-active={tab.active}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="teacher-class-workspace__body">{children}</section>
    </section>
  );
}
