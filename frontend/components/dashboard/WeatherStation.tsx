'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Wind, Droplets, Thermometer, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface WeatherData {
    location: string;
    country: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    conditions: string;
    icon: string;
    safetyStatus: {
        overall: string;
        wind: {
            status: string;
            message: string;
            limit: number;
        };
        temperature: {
            status: string;
            message: string;
        };
    };
    alerts: string[];
}

export function WeatherStation({ location = 'Indianapolis' }: { location?: string }) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWeather();
        // Refresh every 10 minutes
        const interval = setInterval(fetchWeather, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [location]);

    const fetchWeather = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/weather/current/${location}`);
            if (!response.ok) throw new Error('Failed to fetch weather');
            const data = await response.json();
            setWeather(data);
            setError(null);
        } catch (err) {
            setError('Unable to load weather data');
            console.error('Weather fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        Weather Station
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !weather) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        Weather Station
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CRITICAL': return 'destructive';
            case 'WARNING': return 'secondary';
            case 'SAFE': return 'default';
            default: return 'outline';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />;
            case 'WARNING': return <AlertTriangle className="h-4 w-4" />;
            case 'SAFE': return <CheckCircle2 className="h-4 w-4" />;
            default: return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        Weather Station
                    </CardTitle>
                    <Badge variant={getStatusColor(weather.safetyStatus.overall) as any}>
                        {getStatusIcon(weather.safetyStatus.overall)}
                        <span className="ml-1">{weather.safetyStatus.overall}</span>
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {weather.location}, {weather.country} • Live Conditions
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Conditions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Thermometer className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{weather.temperature}°F</p>
                            <p className="text-xs text-muted-foreground">Feels {weather.feelsLike}°F</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Wind className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{weather.windSpeed} mph</p>
                            <p className="text-xs text-muted-foreground">Wind Speed</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                            <Droplets className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{weather.humidity}%</p>
                            <p className="text-xs text-muted-foreground">Humidity</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-500/10">
                            <Cloud className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">{weather.conditions}</p>
                            <p className="text-xs text-muted-foreground">Conditions</p>
                        </div>
                    </div>
                </div>

                {/* Safety Thresholds */}
                <div className="space-y-2 pt-2 border-t">
                    <h4 className="text-sm font-semibold">Construction Safety</h4>

                    {/* Wind Status */}
                    <div className="flex items-start gap-2 text-sm">
                        <Badge variant={getStatusColor(weather.safetyStatus.wind.status) as any} className="mt-0.5">
                            Wind
                        </Badge>
                        <p className="text-muted-foreground flex-1">
                            {weather.safetyStatus.wind.message}
                            <span className="block text-xs mt-1">
                                Crane limit: {weather.safetyStatus.wind.limit} mph
                            </span>
                        </p>
                    </div>

                    {/* Temperature Status */}
                    <div className="flex items-start gap-2 text-sm">
                        <Badge variant={getStatusColor(weather.safetyStatus.temperature.status) as any} className="mt-0.5">
                            Temp
                        </Badge>
                        <p className="text-muted-foreground flex-1">
                            {weather.safetyStatus.temperature.message}
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {weather.alerts.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            Active Alerts
                        </h4>
                        {weather.alerts.map((alert, i) => (
                            <div key={i} className="text-xs bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded p-2">
                                {alert}
                            </div>
                        ))}
                    </div>
                )}

                {/* Last Updated */}
                <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                    Updates every 10 minutes
                </p>
            </CardContent>
        </Card>
    );
}
