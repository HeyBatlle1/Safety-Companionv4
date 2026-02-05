'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';

interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
    timestamp: number;
}

export function LocationWidget() {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported by browser');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const locationData: LocationData = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                // Optional: Reverse geocode to get address
                try {
                    const address = await reverseGeocode(
                        locationData.latitude,
                        locationData.longitude
                    );
                    locationData.address = address;
                } catch (err) {
                    console.log('Reverse geocoding failed:', err);
                }

                setLocation(locationData);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
        // Using OpenStreetMap Nominatim (free, no API key needed)
        // If you get Google Geocoding API, replace this endpoint
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );
        const data = await response.json();

        if (data.address) {
            const parts = [];
            if (data.address.city) parts.push(data.address.city);
            if (data.address.state) parts.push(data.address.state);
            if (data.address.country) parts.push(data.address.country);
            return parts.join(', ');
        }

        return 'Unknown location';
    };

    useEffect(() => {
        // Auto-detect location on mount
        detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const copyCoordinates = () => {
        if (location) {
            const coords = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
            navigator.clipboard.writeText(coords);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Current Location
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={detectLocation}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading && (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                )}

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                        {error}
                    </div>
                )}

                {location && !loading && (
                    <div className="space-y-3">
                        {/* Address */}
                        {location.address && (
                            <div className="flex items-start gap-2">
                                <Navigation className="h-4 w-4 mt-1 text-primary" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{location.address}</p>
                                    <p className="text-xs text-muted-foreground">Detected location</p>
                                </div>
                            </div>
                        )}

                        {/* Coordinates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Latitude</p>
                                <p className="text-sm font-mono font-semibold">
                                    {location.latitude.toFixed(6)}°
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Longitude</p>
                                <p className="text-sm font-mono font-semibold">
                                    {location.longitude.toFixed(6)}°
                                </p>
                            </div>
                        </div>

                        {/* Accuracy */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    ±{Math.round(location.accuracy)}m accuracy
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={copyCoordinates}
                                className="text-xs"
                            >
                                Copy Coords
                            </Button>
                        </div>

                        {/* Timestamp */}
                        <p className="text-xs text-muted-foreground text-center">
                            Updated {new Date(location.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                )}

                {!location && !loading && !error && (
                    <div className="text-center py-6">
                        <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Click refresh to detect location
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
