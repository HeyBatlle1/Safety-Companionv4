import { ReactNode } from 'react';
import { usePermissions, UserRole } from '@/hooks/use-permissions';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles?: UserRole[];
    requireAdmin?: boolean;
    requireEAP?: boolean;
    fallback?: ReactNode;
}

export function RoleGuard({
    children,
    allowedRoles,
    requireAdmin,
    requireEAP,
    fallback = null
}: RoleGuardProps) {
    const {
        role,
        isLoading,
        isAdmin,
        canCreateEAP
    } = usePermissions();

    if (isLoading) return null; // Or a streamlined spinner

    if (requireAdmin && !isAdmin) return fallback;

    if (requireEAP && !canCreateEAP) return fallback;

    if (allowedRoles && role && !allowedRoles.includes(role as UserRole)) {
        return fallback;
    }

    return <>{children}</>;
}
