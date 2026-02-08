'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  HardhatHomeIcon,
  HazardClipboardIcon,
  AIVisionIcon,
  EmergencyBeaconIcon,
  TrendDocumentIcon,
  WorkerProfileIcon,
} from '@/components/ui/custom-icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; weight?: 'regular' | 'fill' }>;
  activeColor: string;
  glowColor: string;
}

const navItems: NavItem[] = [
  {
    label: 'Base',
    href: '/',
    icon: HardhatHomeIcon,
    activeColor: 'text-sky-400',
    glowColor: 'shadow-sky-500/50',
  },
  {
    label: 'JHA',
    href: '/jha/new',
    icon: HazardClipboardIcon,
    activeColor: 'text-amber-400',
    glowColor: 'shadow-amber-500/50',
  },
  {
    label: 'Vision',
    href: '/vision',
    icon: AIVisionIcon,
    activeColor: 'text-violet-400',
    glowColor: 'shadow-violet-500/50',
  },
  {
    label: 'EAP',
    href: '/eap',
    icon: EmergencyBeaconIcon,
    activeColor: 'text-red-400',
    glowColor: 'shadow-red-500/50',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: TrendDocumentIcon,
    activeColor: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/50',
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: WorkerProfileIcon,
    activeColor: 'text-orange-400',
    glowColor: 'shadow-orange-500/50',
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#0a0e14]/95 backdrop-blur-xl">
      <div className="max-w-lg mx-auto px-2 h-16 flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-3 transition-all duration-300 group",
                active ? "opacity-100" : "opacity-50 hover:opacity-80"
              )}
            >
              {/* Active glow background */}
              <div className={cn(
                "absolute inset-0 rounded-xl transition-all duration-300",
                active
                  ? `bg-gradient-to-t from-white/5 to-transparent shadow-lg ${item.glowColor}`
                  : "bg-transparent"
              )} />

              {/* Active indicator bar */}
              <div className={cn(
                "absolute -top-[1px] w-8 h-[3px] rounded-full transition-all duration-300",
                active
                  ? `${item.activeColor} bg-current shadow-lg ${item.glowColor}`
                  : "opacity-0 scale-50 bg-white/20"
              )} />

              {/* Icon container with hover effect */}
              <div className={cn(
                "relative mb-0.5 transition-all duration-300",
                active && "scale-110 -translate-y-0.5"
              )}>
                <Icon
                  weight={active ? "fill" : "regular"}
                  size={22}
                  className={cn(
                    "transition-all duration-300",
                    active
                      ? item.activeColor
                      : "text-gray-400 group-hover:text-gray-300"
                  )}
                />
              </div>

              {/* Label */}
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider relative z-10 transition-all duration-300",
                active
                  ? item.activeColor
                  : "text-gray-500 group-hover:text-gray-400"
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
