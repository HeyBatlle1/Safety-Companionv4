import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient, UserProfile } from '@/api/client';

export type UserRole = 'safety_director' | 'project_manager' | 'foreman' | 'field_worker' | 'master_admin';

export function usePermissions() {
    const { getToken, isLoaded, userId } = useAuth();

    // Fetch User Profile from our backend
    const { data: user, isLoading, error } = useQuery({
        queryKey: ['userProfile', userId],
        queryFn: async () => {
            const token = await getToken();
            if (!token) return null;
            return apiClient.getUserProfile(token);
        },
        enabled: isLoaded && !!userId,
        staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
        retry: 1
    });

    const role = user?.role;

    // --- Permission Helpers ---

    const canCreateEAP = () => {
        if (!role) return false;
        // Only Safety Directors and PMs can create EAPs
        return ['safety_director', 'project_manager', 'master_admin'].includes(role);
    };

    const canViewReports = () => {
        // Everyone can view reports (filtered by backend)
        return !!role;
    };

    const canManageUsers = () => {
        // Only Admins
        return ['safety_director', 'master_admin'].includes(role || '');
    };

    const canUnlockJHA = () => {
        // Only Safety Director can unlock a signed-off JHA
        return ['safety_director', 'master_admin'].includes(role || '');
    };

    const isFieldWorker = role === 'field_worker';
    const isForeman = role === 'foreman';
    const isAdmin = ['safety_director', 'project_manager', 'master_admin'].includes(role || '');

    return {
        user,
        role,
        isLoading,
        isAuthenticated: !!user,
        // Capabilities
        canCreateEAP: canCreateEAP(),
        canViewReports: canViewReports(),
        canManageUsers: canManageUsers(),
        canUnlockJHA: canUnlockJHA(),
        // Role Checks
        isFieldWorker,
        isForeman,
        isAdmin
    };
}
