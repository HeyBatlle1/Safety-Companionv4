"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";

export function ClerkClientProvider({ children }: { children: ReactNode }) {
    // During build, Clerk keys might not be available for static pages
    // This is fine since auth is only needed at runtime
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

    return (
        <ClerkProvider publishableKey={publishableKey}>
            {children}
        </ClerkProvider>
    );
}
