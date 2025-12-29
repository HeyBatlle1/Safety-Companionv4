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
    label: 'Home',
    href: '/',
    icon: House,
    gradient: 'from-slate-400 via-slate-300 to-slate-500',
    shadowColor: 'shadow-slate-400/40',
  },
  {
    label: 'JHA',
    href: '/jha/new',
    icon: ClipboardText,
    gradient: 'from-cyan-400 via-cyan-300 to-cyan-500',
    shadowColor: 'shadow-cyan-400/40',
  },
  {
    label: 'Agent 5',
    href: '/vision',
    icon: Eye,
    gradient: 'from-violet-400 via-purple-300 to-fuchsia-500',
    shadowColor: 'shadow-violet-400/40',
  },
  {
    label: 'EAP',
    href: '/eap',
    icon: Shield,
    gradient: 'from-emerald-400 via-emerald-300 to-teal-500',
    shadowColor: 'shadow-emerald-400/40',
  },
  {
    label: 'History',
    href: '/reports',
    icon: ClockCounterClockwise,
    gradient: 'from-amber-400 via-amber-300 to-orange-500',
    shadowColor: 'shadow-amber-400/40',
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Pure black background for AMOLED */}
      <div className="bg-black border-t border-gray-800/50">
        <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "w-16 h-14",
                  "transition-all duration-300",
                  "group"
                )}
              >
                {/* 3D Bubble Icon Container */}
                <div className={cn(
                  "relative p-2.5 rounded-2xl",
                  "transition-all duration-300",
                  "transform group-hover:scale-110",
                  active && "scale-110"
                )}>
                  {/* Glow effect behind */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl blur-md transition-opacity duration-300",
                    active
                      ? `bg-gradient-to-br ${item.gradient} opacity-60`
                      : "opacity-0 group-hover:opacity-30"
                  )} />

                  {/* Main bubble with 3D gradient */}
                  <div className={cn(
                    "relative w-10 h-10 rounded-2xl",
                    "flex items-center justify-center",
                    "transition-all duration-300",
                    active
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.shadowColor}`
                      : "bg-gray-900 group-hover:bg-gray-800"
                  )}>
                    {/* Inner highlight for 3D effect */}
                    {active && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 via-transparent to-black/20" />
                    )}

                    {/* Icon */}
                    <Icon
                      weight={active ? "fill" : "regular"}
                      size={22}
                      className={cn(
                        "relative z-10 transition-all duration-300",
                        active
                          ? "text-white drop-shadow-lg"
                          : "text-gray-500 group-hover:text-gray-300"
                      )}
                    />
                  </div>
                </div>

                {/* Label with glow on active */}
                <span className={cn(
                  "text-[10px] mt-0.5 font-semibold tracking-wide transition-all duration-300",
                  active
                    ? "text-white"
                    : "text-gray-600 group-hover:text-gray-400"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Safe area for modern devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-black" />
      </div>
    </nav>
  );
}
