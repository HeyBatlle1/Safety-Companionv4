import Link from 'next/link';
import { Gauge, ClipboardCheck, ScrollText, BarChart4, Camera, Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: Gauge,
  },
  {
    label: 'JHA',
    href: '/jha/new',
    icon: ClipboardCheck,
  },
  {
    label: 'Vision',
    href: '/vision',
    icon: Camera,
    highlight: true,  // Make this stand out
  },
  {
    label: 'EAP',
    href: '/eap',
    icon: Shield,
    highlight: true,  // New feature highlight
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart4,
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
          const isHighlight = 'highlight' in item && item.highlight;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 touch-target-lg flex-1 transition-colors',
                isActive
                  ? 'text-accent'
                  : isHighlight
                    ? 'text-primary hover:text-primary/80'
                    : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-colors',
                isHighlight && !isActive && 'bg-primary/10',
                isHighlight && isActive && 'bg-primary/20'
              )}>
                <Icon className="h-5 w-5" />
              </div>
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
