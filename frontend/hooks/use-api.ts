import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, JHAAnalysisRequest } from '@/api/client';

// JHA Analysis Mutation
export function useAnalyzeJHA() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: JHAAnalysisRequest) => apiClient.analyzeJHA(data),
        onSuccess: () => {
            // Invalidate recent JHAs to refresh the list
            queryClient.invalidateQueries({ queryKey: ['recentJHAs'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

// Dashboard Stats Query
export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: () => apiClient.getDashboardStats(),
        // Fallback to mock data if endpoint doesn't exist yet
        placeholderData: {
            jhasThisWeek: 12,
            complianceScore: 94,
            activeAlerts: 2,
            teamSize: 24,
        },
        retry: false, // Don't retry if endpoint doesn't exist
    });
}

// Recent JHAs Query
export function useRecentJHAs(limit: number = 10, offset: number = 0) {
    return useQuery({
        queryKey: ['recentJHAs', limit, offset],
        queryFn: async () => {
            const data = await apiClient.getRecentJHAs(limit, offset);
            return data.jhas; // Return just the array for compatibility
        },
        retry: 1,
    });
}

// JHA Details Query
export function useJHADetails(id: string, options?: { refetchInterval?: number | false | ((data: any) => number | false) }) {
    return useQuery({
        queryKey: ['jhaDetails', id],
        queryFn: () => apiClient.getJHADetails(id),
        enabled: !!id && id !== 'undefined',
        retry: 1,
        refetchInterval: options?.refetchInterval,
    });
}

// Weather Query
export function useWeather(lat?: number, lon?: number) {
    return useQuery({
        queryKey: ['weather', lat, lon],
        queryFn: () => apiClient.getWeather(lat!, lon!),
        enabled: !!lat && !!lon, // Only fetch if coordinates are provided
        // Fallback to mock data
        placeholderData: {
            temperature: 72,
            windSpeed: 8,
            precipitation: 0,
            conditions: 'Clear',
            alerts: [],
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // Weather data is fresh for 5 minutes
    });
}

// JHA Health Check Query
export function useJHAHealth() {
    return useQuery({
        queryKey: ['jhaHealth'],
        queryFn: () => apiClient.getJHAHealth(),
        retry: 1,
        staleTime: 30 * 1000, // Health check is fresh for 30 seconds
    });
}
