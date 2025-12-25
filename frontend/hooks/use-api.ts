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

// JHA Progress SSE Hook
import { useState, useEffect } from 'react';

export interface JHAProgressState {
    status: 'connecting' | 'processing' | 'completed' | 'error';
    currentAgent: string;
    agentStatus: string;
    progress: number;
    elapsedMs: number;
    finalReport: any | null;
    error: string | null;
}

export function useJHAProgress(analysisId: string | null) {
    const [state, setState] = useState<JHAProgressState>({
        status: 'connecting',
        currentAgent: 'system',
        agentStatus: 'initializing',
        progress: 0,
        elapsedMs: 0,
        finalReport: null,
        error: null,
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        if (!analysisId) return;

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const url = `${baseUrl}/api/v1/jha/${analysisId}/progress`;

        console.log(`[SSE] Connecting to: ${url}`);
        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
            console.log('[SSE] Connection opened');
            setState(prev => ({ ...prev, status: 'processing' }));
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Message:', data);

                if (data.status === 'completed') {
                    setState({
                        status: 'completed',
                        currentAgent: 'completed',
                        agentStatus: 'done',
                        progress: 100,
                        elapsedMs: data.elapsed_ms || 0,
                        finalReport: data.final_report || null,
                        error: null,
                    });
                    // Invalidate queries to refresh data
                    queryClient.invalidateQueries({ queryKey: ['jhaDetails', analysisId] });
                    eventSource.close();
                } else if (data.status === 'error' || data.status === 'failed') {
                    setState({
                        status: 'error',
                        currentAgent: data.current_agent || 'unknown',
                        agentStatus: 'error',
                        progress: data.progress || 0,
                        elapsedMs: data.elapsed_ms || 0,
                        finalReport: null,
                        error: data.error || 'Analysis failed',
                    });
                    eventSource.close();
                } else {
                    setState({
                        status: 'processing',
                        currentAgent: data.current_agent || 'system',
                        agentStatus: data.agent_status || 'processing',
                        progress: data.progress || 0,
                        elapsedMs: data.elapsed_ms || 0,
                        finalReport: null,
                        error: null,
                    });
                }
            } catch (e) {
                console.error('[SSE] Parse error:', e);
            }
        };

        eventSource.onerror = (error) => {
            console.error('[SSE] Error:', error);
            // Don't set error state for connection issues, might just be the stream ending
            eventSource.close();
        };

        return () => {
            console.log('[SSE] Closing connection');
            eventSource.close();
        };
    }, [analysisId, queryClient]);

    return state;
}
