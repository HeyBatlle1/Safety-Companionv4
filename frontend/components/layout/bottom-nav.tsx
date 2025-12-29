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
    icon: Camera,
  },
  {
    label: 'EAP',
    href: '/eap',
    icon: Shield,
  },
  {
    label: 'History',
    href: '/reports',
    icon: ClockCounterClockwise,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Clean dark background with subtle border */}
      <div className="bg-gray-900 border-t border-gray-700/60">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "w-16 h-14 rounded-xl",
                  "transition-all duration-200",
                  "group"
                )}
              >
                {/* Icon container with subtle shadow on active */}
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  active
                    ? "bg-gray-700/80 shadow-lg shadow-gray-900/50"
                    : "group-hover:bg-gray-800/60"
                )}>
                  <Icon
                    weight={active ? "fill" : "regular"}
                    size={24}
                    className={cn(
                      "transition-all duration-200",
                      active
                        ? "text-white"
                        : "text-gray-500 group-hover:text-gray-300"
                    )}
                  />
                </div>

                {/* Label */}
                <span className={cn(
                  "text-[10px] mt-1 font-medium transition-colors",
                  active
                    ? "text-white"
                    : "text-gray-500 group-hover:text-gray-300"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Safe area for modern devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-gray-900" />
      </div>
    </nav>
  );
}
