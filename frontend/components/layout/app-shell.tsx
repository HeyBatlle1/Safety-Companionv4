'use client';

import { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { Header } from './header';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="min-h-screen bg-background" style={{ backgroundColor: '#141414', color: '#F8F9FA' }}>
            {/* Header - minimal on mobile */}
            <Header />

            {/* Main content with bottom nav padding */}
            <main className="pb-safe-bottom">
                <div className="container mx-auto px-4 py-6 max-w-7xl">
                    {children}
                </div>
            </main>

            {/* Bottom navigation - mobile only */}
            <BottomNav />
        </div>
    );
}
