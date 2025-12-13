'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Header() {
    return (
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
                {/* Logo / Brand */}
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <span className="text-sm font-bold">SC</span>
                    </div>
                    <span className="hidden font-semibold text-foreground sm:inline-block">
                        Safety Companion
                    </span>
                </div>

                {/* Right side - notifications and user */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative touch-target">
                        <Bell className="h-5 w-5" />
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                        >
                            3
                        </Badge>
                        <span className="sr-only">Notifications</span>
                    </Button>

                    {/* User avatar placeholder - will be replaced with Clerk */}
                    <Button variant="ghost" size="icon" className="touch-target">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-xs font-medium text-secondary-foreground">JD</span>
                        </div>
                        <span className="sr-only">User menu</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
