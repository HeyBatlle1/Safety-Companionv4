"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";

export function ClerkClientProvider({ children }: { children: ReactNode }) {
    // During build, Clerk keys might not be available for static pages
    // This is fine since auth is only needed at runtime
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    // If no key during build (SSG), just render children without Clerk
    // At runtime, the key will be available and Clerk will work
    if (!publishableKey) {
        return <>{children}</>;
    }

    return (
        <ClerkProvider publishableKey={publishableKey}>
            {children}
        </ClerkProvider>
    );
}
