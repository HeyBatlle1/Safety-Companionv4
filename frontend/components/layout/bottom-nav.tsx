'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  House,
  ClipboardText,
  Eye,
  Shield,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

interface NavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
  gradient: string;
  shadowColor: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: House,
    gradient: 'from-primary/20 to-primary/5',
    shadowColor: 'shadow-primary/10',
  },
  {
    label: 'New Analysis',
    href: '/jha/new',
    icon: ClipboardText,
    gradient: 'from-primary/20 to-primary/5',
    shadowColor: 'shadow-primary/10',
  },
  {
    label: 'Vision HUD',
    href: '/vision',
    icon: Eye,
    gradient: 'from-primary/20 to-primary/5',
    shadowColor: 'shadow-primary/10',
  },
  {
    label: 'Protocol',
    href: '/eap',
    icon: Shield,
    gradient: 'from-primary/20 to-primary/5',
    shadowColor: 'shadow-primary/10',
  },
  {
    label: 'Archive',
    href: '/reports',
    icon: ClockCounterClockwise,
    gradient: 'from-primary/20 to-primary/5',
    shadowColor: 'shadow-primary/10',
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-lg mx-auto px-6 h-18 flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 transition-all duration-200",
                active ? "opacity-100" : "opacity-40 hover:opacity-70"
              )}
            >
              {/* Technical Indicator Line */}
              <div className={cn(
                "absolute -top-[1px] w-8 h-[2px] bg-primary rounded-full transition-all duration-300",
                active ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )} />

              <div className="relative mb-1">
                <Icon
                  weight={active ? "bold" : "regular"}
                  size={20}
                  className={cn(
                    "transition-transform duration-200",
                    active && "scale-110 text-primary"
                  )}
                />
              </div>

              <span className={cn(
                "text-[9px] font-medium uppercase tracking-[0.05em]",
                active ? "text-primary" : "text-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Precision Spacing for Mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
