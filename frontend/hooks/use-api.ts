import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { apiClient, JHAAnalysisRequest } from '@/api/client';

// JHA Analysis Mutation
export function useAnalyzeJHA() {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();

    return useMutation({
        mutationFn: async (data: JHAAnalysisRequest) => {
            const token = await getToken();
            return apiClient.analyzeJHA(data, token || undefined);
        },
        onSuccess: () => {
            // Invalidate recent JHAs to refresh the list
            queryClient.invalidateQueries({ queryKey: ['recentJHAs'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

// Dashboard Stats Query
export function useDashboardStats() {
    const { getToken } = useAuth();
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const token = await getToken();
            return apiClient.getDashboardStats(token || undefined);
        },
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
    const { getToken } = useAuth();
    return useQuery({
        queryKey: ['recentJHAs', limit, offset],
        queryFn: async () => {
            const token = await getToken();
            const data = await apiClient.getRecentJHAs(limit, offset, token || undefined);
            return data.jhas; // Return just the array for compatibility
        },
        retry: 1,
    });
}

// Saved Reports Query (only explicitly saved reports)
export function useSavedReports(limit: number = 50, offset: number = 0) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { getToken } = useAuth();
    return useQuery({
        queryKey: ['savedReports', limit, offset],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${apiUrl}/api/v1/reports/saved?limit=${limit}&offset=${offset}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch saved reports');
            }
            const data = await response.json();
            return data;
        },
        retry: 1,
    });
}

// Delete Report Mutation (removes from saved reports)
export function useDeleteReport() {
    const queryClient = useQueryClient();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { getToken } = useAuth();

    return useMutation({
        mutationFn: async (reportId: string) => {
            const token = await getToken();
            const response = await fetch(`${apiUrl}/api/v1/reports/${reportId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                }
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Failed to delete report' }));
                throw new Error(error.detail || 'Failed to delete report');
            }
            return response.json();
        },
        onSuccess: () => {
            // Invalidate saved reports to refresh the list
            queryClient.invalidateQueries({ queryKey: ['savedReports'] });
        },
    });
}

// JHA Details Query
export function useJHADetails(id: string, options?: { refetchInterval?: number | false | ((data: any) => number | false) }) {
    const { getToken } = useAuth();
    return useQuery({
        queryKey: ['jhaDetails', id],
        queryFn: async () => {
            const token = await getToken();
            return apiClient.getJHADetails(id, token || undefined);
        },
        enabled: !!id && id !== 'undefined',
        retry: 1,
        refetchInterval: options?.refetchInterval,
    });
}

// Weather Query - takes city name (e.g., "Indianapolis" or "Indianapolis,IN,US")
export function useWeather(location?: string) {
    return useQuery({
        queryKey: ['weather', location],
        queryFn: () => apiClient.getWeather(location!),
        enabled: !!location, // Only fetch if location is provided
        // Fallback to mock data
        placeholderData: {
            temperature: 72,
            windSpeed: 8,
            humidity: 50,
            conditions: 'Clear',
            alerts: [],
            safetyStatus: {
                overall: 'SAFE',
                wind: { status: 'SAFE', message: 'Wind conditions acceptable', limit: 20 },
                temperature: { status: 'SAFE', message: 'Temperature within safe range' },
            },
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
        const url = `${baseUrl}/api/v1/jha/stream/${analysisId}`;

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

                // Ignore non-progress events
                if (data.status === 'connected' || data.status === 'keepalive') {
                    return;
                }

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
                } else if (data.status === 'processing') {
                    // Only update if progress is moving forward (handles replay)
                    setState(prev => {
                        const newProgress = data.progress || 0;
                        // Always take the higher progress to handle rapid replay
                        if (newProgress >= prev.progress || data.current_agent !== prev.currentAgent) {
                            return {
                                status: 'processing',
                                currentAgent: data.current_agent || 'system',
                                agentStatus: data.agent_status || 'processing',
                                progress: Math.max(newProgress, prev.progress),
                                elapsedMs: data.elapsed_ms || 0,
                                finalReport: null,
                                error: null,
                            };
                        }
                        return prev;
                    });
                }
            } catch (e) {
                console.error('[SSE] Parse error:', e);
            }
        };

        eventSource.onerror = (error) => {
            console.error('[SSE] Error:', error);
            // CRITICAL: Do NOT close on error. Let EventSource auto-retry.
            // If connection drops (e.g. timeout), it will reconnect.
            // Upon reconnect, backend will check DB and send 'completed' if done.
        };

        return () => {
            console.log('[SSE] Closing connection');
            eventSource.close();
        };
    }, [analysisId, queryClient]);

    return state;
}

