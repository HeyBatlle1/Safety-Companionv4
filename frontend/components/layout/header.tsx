'use client';

import Link from 'next/link';
import { Bell, ShieldCheck } from '@phosphor-icons/react';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export function Header() {
    return (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
                {/* Precision Logo */}
                <Link href="/" className="flex items-center gap-3 group cursor-pointer">
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
                </Link>

                {/* Right side - Contextual Controls */}
                <div className="flex items-center gap-3">
                    {/* Status Indicators (Technical) */}
                    <div className="hidden md:flex items-center gap-4 mr-2 px-4 h-8 border-x border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Online</span>
                        </div>
                    </div>

                    {/* Notification Control */}
                    <button className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-white/5 hover:bg-white/5 transition-all group">
                        <Bell weight="bold" size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
                        <span className="sr-only">Notifications</span>
                    </button>

                    {/* User Button with Sign Out */}
                    <SignedIn>
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-9 h-9 rounded-lg border border-white/10",
                                    userButtonPopoverCard: "bg-card border border-white/10",
                                    userButtonPopoverActionButton: "hover:bg-white/5",
                                    userButtonPopoverActionButtonText: "text-foreground",
                                    userButtonPopoverFooter: "hidden",
                                }
                            }}
                        />
                    </SignedIn>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="h-9 px-4 flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                </div>
            </div>
        </header>
    );
}
