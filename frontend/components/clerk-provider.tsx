"use client";

import { ReactNode, useEffect, useState } from "react";

export function ClerkClientProvider({ children }: { children: ReactNode }) {
    const [ClerkProvider, setClerkProvider] = useState<any>(null);
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    useEffect(() => {
        // Only load Clerk at runtime in the browser
        if (publishableKey && typeof window !== 'undefined') {
            import('@clerk/nextjs').then((mod) => {
                setClerkProvider(() => mod.ClerkProvider);
            });
        }
    }, [publishableKey]);

    // During SSR or if no key, render without Clerk
    if (!ClerkProvider || !publishableKey) {
        return <>{children}</>;
    }

    // At runtime with key, render with Clerk
    return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
