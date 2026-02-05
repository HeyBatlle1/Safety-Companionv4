'use client';

import { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { Header } from './header';

interface AppShellProps {
    children: ReactNode;
}

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-background font-sans subpixel-antialiased selection:bg-primary/20 selection:text-primary">
            {/* Technical Header */}
            <Header />

            {/* Main content with transition depth */}
            <main className="pb-safe-bottom">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* High-Precision Navigation */}
            <BottomNav />
        </div>
    );
}
