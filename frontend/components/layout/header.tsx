'use client';

import { Bell, ShieldCheck, User } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';

export function Header() {
    return (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
                {/* Precision Logo */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 transition-all group-hover:bg-primary/20 group-hover:border-primary/40">
                        <ShieldCheck weight="bold" size={18} className="text-primary" />
                    </div>
                    <div className="hidden sm:block">
                        <span className="font-semibold text-foreground text-sm tracking-tight">
                            Safety Companion
                        </span>
                        <span className="block text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
                            High-Precision JHA
                        </span>
                    </div>
                </div>

                {/* Right side - Contextual Controls */}
                <div className="flex items-center gap-2">
                    {/* Status Indicators (Technical) */}
                    <div className="hidden md:flex items-center gap-4 mr-4 px-4 h-8 border-x border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-success" />
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">System Online</span>
                        </div>
                    </div>

                    {/* Notification Precision Control */}
                    <button className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-white/5 hover:bg-white/5 transition-all group">
                        <Bell weight="bold" size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
                        <span className="sr-only">Notifications</span>
                    </button>

                    {/* Technical Profile Link */}
                    <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-white/5 hover:bg-white/5 transition-all group">
                        <User weight="bold" size={18} className="text-muted-foreground group-hover:text-foreground" />
                        <span className="sr-only">User profile</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
