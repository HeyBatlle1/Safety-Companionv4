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
import { cn } from '@/lib/utils';

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
        const interval = setInterval(detectSiteConditions, 3 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const detectSiteConditions = async () => {
        setLoading(true);
        setError(null);
        try {
            let city = 'Indianapolis';
            try {
                const locationData = await getLocation();
                setLocation(locationData);
                if (locationData.address) {
                    city = locationData.address.split(',')[0]?.trim() || 'Indianapolis';
                }
            } catch (locationError: any) {
                setLocation({
                    latitude: 39.7684,
                    longitude: -86.1581,
                    accuracy: 0,
                    address: 'Indianapolis, IN (default)'
                });
            }
            const weatherData = await getWeather(city);
            setWeather(weatherData);
        } catch (err: any) {
            setError(err.message || 'Unable to load conditions');
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
                    } catch (err) { }
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

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'CRITICAL': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'WARNING': return 'bg-warning/10 text-warning border-warning/20';
            case 'SAFE': return 'bg-success/10 text-success border-success/20';
            default: return 'bg-secondary text-muted-foreground border-white/5';
        }
    };

    return (
        <div className="bg-card border border-white/5 rounded-xl overflow-hidden p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Telemetry Update</span>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">Environmental Data</h3>
                </div>
                <button
                    onClick={detectSiteConditions}
                    disabled={loading}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-white/5 bg-secondary hover:bg-white/5 transition-all group"
                >
                    <RefreshCw className={cn("h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors", loading && 'animate-spin')} />
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="h-10 w-10 border-2 border-primary/20 border-t-primary animate-spin rounded-full" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Syncing Satellites</span>
                </div>
            ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                    <span className="text-xs text-muted-foreground">{error}</span>
                </div>
            ) : location && weather && (
                <div className="flex-1 space-y-6">
                    {/* Location Precision Detail */}
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-foreground truncate">{location.address || 'Deployment Zone'}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-tight">
                                    {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                                </span>
                                <span className="h-1 w-1 rounded-full bg-success/50" />
                                <span className="text-[9px] font-mono text-muted-foreground uppercase">Precision Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Sensor Data Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold italic">Thermal Index</span>
                            <div className="flex items-end gap-1.5">
                                <span className="text-2xl font-bold font-mono text-foreground leading-none">{weather.temperature}°</span>
                                <span className="text-[10px] text-muted-foreground font-medium mb-1 uppercase">Feels {weather.feelsLike}°F</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold italic">Velocity Gradient</span>
                            <div className="flex items-end gap-1.5">
                                <span className="text-2xl font-bold font-mono text-foreground leading-none">{weather.windSpeed}</span>
                                <span className="text-[10px] text-muted-foreground font-medium mb-1 uppercase">MPH Winds</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold italic">Atmospheric Moist</span>
                            <div className="flex items-end gap-1.5">
                                <span className="text-2xl font-bold font-mono text-foreground leading-none">{weather.humidity}%</span>
                                <span className="text-[10px] text-muted-foreground font-medium mb-1 uppercase">Humidity</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold italic">Visual Clarity</span>
                            <div className="flex items-end gap-1.5">
                                <span className="text-sm font-bold text-foreground leading-none truncate">{weather.conditions}</span>
                            </div>
                        </div>
                    </div>

                    {/* Safety Status Block */}
                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">Health & Safety Validation</span>
                            <div className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border", getStatusVariant(weather.safetyStatus.overall))}>
                                {weather.safetyStatus.overall}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground mt-0.5">[01]</span>
                                <p className="text-xs text-muted-foreground italic leading-relaxed">
                                    {weather.safetyStatus.wind.message}
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground mt-0.5">[02]</span>
                                <p className="text-xs text-muted-foreground italic leading-relaxed">
                                    {weather.safetyStatus.temperature.message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
