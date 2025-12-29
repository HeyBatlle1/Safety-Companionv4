'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  House,
  ClipboardText,
  Camera,
  Shield,
  ClockCounterClockwise,
  User
} from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

interface NavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
  type: 'utility' | 'primary';
  gradient?: string;
  shadowColor?: string;
}

const navItems: NavItem[] = [
  // Left utility
  {
    label: 'Home',
    href: '/',
    icon: House,
    type: 'utility',
  },
  // Primary actions (center, elevated)
  {
    label: 'JHA',
    href: '/jha/new',
    icon: ClipboardText,
    type: 'primary',
    gradient: 'from-blue-500 via-blue-600 to-blue-700',
    shadowColor: 'shadow-blue-500/40',
  },
  {
    label: 'Vision',
    href: '/vision',
    icon: Camera,
    type: 'primary',
    gradient: 'from-orange-500 via-orange-600 to-orange-700',
    shadowColor: 'shadow-orange-500/40',
  },
  {
    label: 'EAP',
    href: '/eap',
    icon: Shield,
    type: 'primary',
    gradient: 'from-emerald-500 via-emerald-600 to-emerald-700',
    shadowColor: 'shadow-emerald-500/40',
  },
  // Right utility
  {
    label: 'History',
    href: '/reports',
    icon: ClockCounterClockwise,
    type: 'utility',
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    type: 'utility',
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const utilityLeft = navItems.filter(i => i.type === 'utility').slice(0, 1);
  const primaryItems = navItems.filter(i => i.type === 'primary');
  const utilityRight = navItems.filter(i => i.type === 'utility').slice(1);

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient background */}
      <div className="bg-gradient-to-t from-gray-900 via-gray-900 to-gray-800 border-t border-gray-700/50">
        <div className="flex items-end justify-between px-4 py-2 pb-safe max-w-lg mx-auto">

          {/* Left utility buttons */}
          <div className="flex items-center gap-2">
            {utilityLeft.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "w-12 h-12 rounded-xl",
                    "transition-all duration-200",
                    active
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon weight={active ? "fill" : "bold"} size={24} />
                  <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Primary action buttons (elevated) */}
          <div className="flex items-end gap-3 -mb-1">
            {primaryItems.map((item, idx) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isCenter = idx === 1; // Make Vision (camera) the biggest

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "rounded-2xl",
                    "transform transition-all duration-200",
                    "hover:-translate-y-1",
                    isCenter ? "w-16 h-16 -mb-4" : "w-14 h-14 -mb-2",
                    `bg-gradient-to-br ${item.gradient}`,
                    `shadow-lg ${item.shadowColor}`,
                    active && "ring-2 ring-white/30 shadow-xl"
                  )}
                >
                  <Icon
                    weight="bold"
                    size={isCenter ? 32 : 28}
                    className="text-white"
                  />
                  <span className={cn(
                    "text-white font-semibold",
                    isCenter ? "text-[10px] mt-1" : "text-[9px] mt-0.5"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right utility buttons */}
          <div className="flex items-center gap-2">
            {utilityRight.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "w-12 h-12 rounded-xl",
                    "transition-all duration-200",
                    active
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon weight={active ? "fill" : "bold"} size={24} />
                  <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Safe area for modern devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-gray-900" />
      </div>
    </nav>
  );
}
