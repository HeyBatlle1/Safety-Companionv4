'use client';

import { Bell, ShieldCheck, User } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';

export function Header() {
    return (
        <header className="sticky top-0 z-40 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/80">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
                {/* Logo / Brand */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                        <ShieldCheck weight="bold" size={24} className="text-white" />
                    </div>
                    <div className="hidden sm:block">
                        <span className="font-bold text-white text-lg">
                            Safety Companion
                        </span>
                        <span className="block text-xs text-gray-400">
                            AI-Powered JHA Analysis
                        </span>
                    </div>
                </div>

                {/* Right side - notifications and user */}
                <div className="flex items-center gap-3">
                    {/* Notifications */}
                    <button className="relative p-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors group">
                        <Bell weight="bold" size={22} className="text-gray-400 group-hover:text-white transition-colors" />
                        <Badge
                            className="absolute -right-1 -top-1 h-5 min-w-[20px] rounded-full p-0 text-xs flex items-center justify-center bg-red-500 text-white border-2 border-gray-900"
                        >
                            3
                        </Badge>
                        <span className="sr-only">Notifications</span>
                    </button>

                    {/* User avatar */}
                    <button className="p-1.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors group">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <User weight="bold" size={20} className="text-white" />
                        </div>
                        <span className="sr-only">User menu</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
