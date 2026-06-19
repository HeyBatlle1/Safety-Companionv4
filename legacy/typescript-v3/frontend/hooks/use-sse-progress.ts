import { useState, useEffect, useCallback, useRef } from 'react';

interface ProgressEvent {
    status: string;
    current_agent: string;
    agent_status: string;
    progress: number;
    elapsed_ms: number;
    analysis_id?: string;
}

interface UseSSEProgressOptions {
    onComplete?: (finalProgress: ProgressEvent) => void;
    onError?: (error: string) => void;
}

export function useSSEProgress(
    analysisId: string | null,
    options: UseSSEProgressOptions = {}
) {
    const [progress, setProgress] = useState<ProgressEvent | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Cleanup function
    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setIsConnected(false);
        }
    }, []);

    useEffect(() => {
        if (!analysisId) {
            disconnect();
            return;
        }

        // Close any existing connection
        disconnect();

        // Create new EventSource connection
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const url = `${apiUrl}/api/v1/jha/stream/${analysisId}`;

        console.log(`🔗 Connecting to SSE stream: ${url}`);
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('✅ SSE connection established');
            setIsConnected(true);
            setError(null);
        };

        eventSource.onmessage = (event) => {
            try {
                const data: ProgressEvent = JSON.parse(event.data);
                console.log('📡 SSE event:', data);

                // Ignore keepalive pings
                if (data.status === 'keepalive') return;

                setProgress(data);

                // Handle completion
                if (data.status === 'completed' || data.status === 'error' || data.status === 'failed') {
                    if (data.status === 'completed' && options.onComplete) {
                        options.onComplete(data);
                    }
                    if ((data.status === 'error' || data.status === 'failed') && options.onError) {
                        options.onError(data.status);
                    }
                    disconnect();
                }
            } catch (e) {
                console.error('Failed to parse SSE event:', e);
            }
        };

        eventSource.onerror = (e) => {
            console.error('❌ SSE connection error:', e);
            setError('Connection lost - retrying...');
            setIsConnected(false);
            // EventSource will automatically retry
        };

        // Cleanup on unmount or analysisId change
        return () => {
            disconnect();
        };
    }, [analysisId, disconnect, options.onComplete, options.onError]);

    return {
        progress,
        isConnected,
        error,
        disconnect
    };
}
