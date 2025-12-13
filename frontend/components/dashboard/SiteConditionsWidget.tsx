'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    MapPin,
    Thermometer,
    Wind,
    Droplets,
    Cloud,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Navigation
} from 'lucide-react';

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
}

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

export function SiteConditionsWidget() {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        detectSiteConditions();
        // Refresh every 10 minutes
        const interval = setInterval(detectSiteConditions, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const detectSiteConditions = async () => {
        setLoading(true);
        setError(null);

        try {
            // Step 1: Get location
            const locationData = await getLocation();
            setLocation(locationData);

            // Step 2: Get weather for that location
            if (locationData.address) {
                const city = locationData.address.split(',')[0].trim();
                const weatherData = await getWeather(city);
                setWeather(weatherData);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getLocation = (): Promise<LocationData> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const locationData: LocationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };

                    // Reverse geocode
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}`
                        );
                        const data = await response.json();

                        if (data.address) {
                            const parts = [];
                            if (data.address.city) parts.push(data.address.city);
                            if (data.address.state) parts.push(data.address.state);
                            locationData.address = parts.join(', ');
                        }
                    } catch (err) {
                        console.log('Reverse geocoding failed:', err);
                    }

                    resolve(locationData);
                },
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    const getWeather = async (location: string): Promise<WeatherData> => {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/weather/current/${location}`
        );
        if (!response.ok) throw new Error('Failed to fetch weather');
        return response.json();
    };

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

    const copyData = () => {
        if (location && weather) {
            const data = `Location: ${location.address}\nCoordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\nTemperature: ${weather.temperature}°F\nWind: ${weather.windSpeed} mph\nConditions: ${weather.conditions}`;
            navigator.clipboard.writeText(data);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        Site Conditions
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {weather && (
                            <Badge variant={getStatusColor(weather.safetyStatus.overall) as any}>
                                {getStatusIcon(weather.safetyStatus.overall)}
                                <span className="ml-1">{weather.safetyStatus.overall}</span>
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={detectSiteConditions}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading && (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                )}

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                        {error}
                    </div>
                )}

                {!loading && location && weather && (
                    <div className="space-y-4">
                        {/* Location Info */}
                        <div className="flex items-start gap-2 pb-3 border-b">
                            <MapPin className="h-4 w-4 mt-1 text-primary" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">{location.address || 'Unknown location'}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°
                                </p>
                            </div>
                        </div>

                        {/* Weather Conditions */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Thermometer className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">{weather.temperature}°F</p>
                                    <p className="text-xs text-muted-foreground">Feels {weather.feelsLike}°F</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Wind className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">{weather.windSpeed} mph</p>
                                    <p className="text-xs text-muted-foreground">Wind Speed</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-cyan-500/10">
                                    <Droplets className="h-4 w-4 text-cyan-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">{weather.humidity}%</p>
                                    <p className="text-xs text-muted-foreground">Humidity</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-slate-500/10">
                                    <Cloud className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{weather.conditions}</p>
                                    <p className="text-xs text-muted-foreground">Conditions</p>
                                </div>
                            </div>
                        </div>

                        {/* Safety Thresholds */}
                        <div className="space-y-2 pt-2 border-t">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Safety Status</h4>

                            <div className="flex items-start gap-2 text-xs">
                                <Badge variant={getStatusColor(weather.safetyStatus.wind.status) as any} className="mt-0.5">
                                    Wind
                                </Badge>
                                <p className="text-muted-foreground flex-1">
                                    {weather.safetyStatus.wind.message}
                                </p>
                            </div>

                            <div className="flex items-start gap-2 text-xs">
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
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                                    Active Alerts
                                </h4>
                                {weather.alerts.map((alert, i) => (
                                    <div key={i} className="text-xs bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded p-2">
                                        {alert}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                                Auto-updates every 10 min
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={copyData}
                                className="text-xs h-7"
                            >
                                Copy Data
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
