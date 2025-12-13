import Link from 'next/link';
import { Gauge, ClipboardCheck, ScrollText, BarChart4, UserCircle2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: Gauge, // Speedometer/gauge for monitoring
  },
  {
    label: 'New JHA',
    href: '/jha/new',
    icon: ClipboardCheck, // Clipboard with checkmark for creating JHAs
  },
  {
    label: 'History',
    href: '/jha',
    icon: ScrollText, // Scroll/document for history
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart4, // Advanced bar chart for analytics
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: UserCircle2, // User circle for profile
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-lg">
      <div className="flex items-center justify-around bottom-nav-height">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 touch-target-lg flex-1 transition-colors',
                isActive
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for modern mobile devices */}
      <div className="h-[env(safe-area-inset-bottom)] bg-card" />
    </nav>
  );
}
