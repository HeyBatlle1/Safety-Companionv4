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
  User,
} from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

interface NavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: House,
  },
  {
    label: 'JHA',
    href: '/jha/new',
    icon: ClipboardText,
  },
  {
    label: 'Vision',
    href: '/vision',
    icon: Eye,
  },
  {
    label: 'EAP',
    href: '/eap',
    icon: Shield,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: ClockCounterClockwise,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-2 transition-all duration-200",
                active ? "opacity-100" : "opacity-40 hover:opacity-70"
              )}
            >
              {/* Active Indicator */}
              <div className={cn(
                "absolute -top-[1px] w-6 h-[2px] bg-primary rounded-full transition-all duration-300",
                active ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )} />

              <div className="relative mb-0.5">
                <Icon
                  weight={active ? "fill" : "regular"}
                  size={18}
                  className={cn(
                    "transition-transform duration-200",
                    active && "scale-110 text-primary"
                  )}
                />
              </div>

              <span className={cn(
                "text-[8px] font-medium uppercase tracking-wider",
                active ? "text-primary" : "text-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe Area for Mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
