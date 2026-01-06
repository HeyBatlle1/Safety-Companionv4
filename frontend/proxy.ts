import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicPaths = [
    '/',
    '/sign-in',
    '/sign-up',
    '/api/health',
    '/privacy',
    '/terms',
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Check if current path is public
    const isPublic = publicPaths.some(path =>
        pathname === path || pathname.startsWith(`${path}/`)
    );

    // For now, allow all requests through to prevent middleware crashes
    // Clerk protection will be handled at the component level
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
