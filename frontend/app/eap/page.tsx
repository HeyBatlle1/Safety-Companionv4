'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    MapPin,
    Users,
    AlertTriangle,
    Phone,
    CheckCircle,
    Shield,
    Loader2,
    FileText,
    Radio,
    Hospital,
    Flag
} from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';

// Form step configuration
const STEPS = [
    { id: 1, title: 'Company Info', icon: Building2, description: 'Basic company information' },
    { id: 2, title: 'Site Details', icon: MapPin, description: 'Site type and hazards' },
    { id: 3, title: 'Emergency Contacts', icon: Phone, description: 'Coordinators and facilities' },
    { id: 4, title: 'Assembly Areas', icon: Flag, description: 'Evacuation meeting points' },
    { id: 5, title: 'Safety Systems', icon: Radio, description: 'Alarms and rescue' },
    { id: 6, title: 'Review', icon: CheckCircle, description: 'Review and generate' },
];

// Hazard options
const HAZARDS = [
    { id: 'fall_from_height', label: 'Fall from Height', severity: 'high' },
    { id: 'confined_space', label: 'Confined Space', severity: 'critical' },
    { id: 'excavation', label: 'Excavation/Trenching', severity: 'critical' },
    { id: 'electrical', label: 'Electrical Work', severity: 'high' },
    { id: 'hazardous_materials', label: 'Hazardous Materials', severity: 'high' },
    { id: 'crane_operations', label: 'Crane Operations', severity: 'high' },
    { id: 'hot_work', label: 'Hot Work (Welding/Cutting)', severity: 'medium' },
    { id: 'heavy_equipment', label: 'Heavy Equipment', severity: 'medium' },
    { id: 'noise', label: 'Noise Exposure', severity: 'low' },
    { id: 'dust', label: 'Dust/Silica', severity: 'low' },
];

const SITE_TYPES = [
    { value: 'construction', label: 'Construction' },
    { value: 'general_industry', label: 'General Industry' },
    { value: 'maritime', label: 'Maritime' },
];

const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function EAPGeneratorPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        // Company Info
        company_name: '',
        site_address: '',
        city: '',
        state: 'IN',
        zip_code: '',

        // Site Details
        site_type: 'construction',
        building_type: '',
        building_height: 0,
        work_elevation: 0,
        total_employees: 1,
        project_description: '',
        construction_phase: '',

        // Hazards
        hazards: {} as Record<string, boolean>,
        equipment: [] as string[],
        weather_concerns: [] as string[],

        // Emergency Coordinator
        emergency_coordinator: {
            name: '',
            title: '',
            phone: '',
            email: ''
        },
        alternate_coordinator: {
            name: '',
            title: '',
            phone: '',
            email: ''
        },

        // Facilities
        nearest_hospital: {
            name: '',
            address: '',
            phone: '',
            distance: ''
        },
        fire_station: {
            name: '',
            address: '',
            phone: '',
            distance: ''
        },
        local_police: {
            name: '',
            address: '',
            phone: '',
            distance: ''
        },

        // Assembly Areas
        primary_assembly: {
            location: '',
            description: '',
            capacity: 0
        },
        secondary_assembly: {
            location: '',
            description: '',
            capacity: 0
        },

        // Safety Systems
        alarm_systems: [] as Array<{ type: string; location: string; activation: string }>,
        radio_channel: '',
        rescue_option: 'external',
        rescue_capability: ''
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateNestedField = (parent: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [parent]: { ...(prev[parent as keyof typeof prev] as object), [field]: value }
        }));
    };

    const toggleHazard = (hazardId: string) => {
        setFormData(prev => ({
            ...prev,
            hazards: {
                ...prev.hazards,
                [hazardId]: !prev.hazards[hazardId]
            }
        }));
    };

    const addAlarmSystem = () => {
        setFormData(prev => ({
            ...prev,
            alarm_systems: [...prev.alarm_systems, { type: '', location: '', activation: '' }]
        }));
    };

    const updateAlarmSystem = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newAlarms = [...prev.alarm_systems];
            newAlarms[index] = { ...newAlarms[index], [field]: value };
            return { ...prev, alarm_systems: newAlarms };
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/v1/eap/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to generate EAP');
            }

            const result = await response.json();
            router.push(`/eap/${result.id}`);

        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return formData.company_name && formData.site_address && formData.city && formData.state;
            case 2:
                return formData.site_type && formData.total_employees > 0;
            case 3:
                return formData.emergency_coordinator.name && formData.emergency_coordinator.phone;
            case 4:
                return formData.primary_assembly.location;
            case 5:
                return true;
            case 6:
                return true;
            default:
                return true;
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label htmlFor="company_name">Company Name *</Label>
                                <Input
                                    id="company_name"
                                    value={formData.company_name}
                                    onChange={(e) => updateField('company_name', e.target.value)}
                                    placeholder="ABC Construction LLC"
                                    className="mt-1"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="site_address">Site Address *</Label>
                                <Input
                                    id="site_address"
                                    value={formData.site_address}
                                    onChange={(e) => updateField('site_address', e.target.value)}
                                    placeholder="123 Construction Way"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    placeholder="Indianapolis"
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label htmlFor="state">State *</Label>
                                    <select
                                        id="state"
                                        value={formData.state}
                                        onChange={(e) => updateField('state', e.target.value)}
                                        className="w-full mt-1 h-10 px-3 rounded-md border border-slate-600 bg-slate-800 text-white"
                                    >
                                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="zip_code">ZIP</Label>
                                    <Input
                                        id="zip_code"
                                        value={formData.zip_code}
                                        onChange={(e) => updateField('zip_code', e.target.value)}
                                        placeholder="46201"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="site_type">Site Type *</Label>
                                <select
                                    id="site_type"
                                    value={formData.site_type}
                                    onChange={(e) => updateField('site_type', e.target.value)}
                                    className="w-full mt-1 h-10 px-3 rounded-md border border-slate-600 bg-slate-800 text-white"
                                >
                                    {SITE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="total_employees">Total Employees *</Label>
                                <Input
                                    id="total_employees"
                                    type="number"
                                    min="1"
                                    value={formData.total_employees}
                                    onChange={(e) => updateField('total_employees', parseInt(e.target.value) || 1)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="work_elevation">Max Work Elevation (ft)</Label>
                                <Input
                                    id="work_elevation"
                                    type="number"
                                    min="0"
                                    value={formData.work_elevation}
                                    onChange={(e) => updateField('work_elevation', parseInt(e.target.value) || 0)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="construction_phase">Construction Phase</Label>
                                <Input
                                    id="construction_phase"
                                    value={formData.construction_phase}
                                    onChange={(e) => updateField('construction_phase', e.target.value)}
                                    placeholder="Foundation, Framing, etc."
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-base font-semibold">Site Hazards</Label>
                            <p className="text-sm text-slate-400 mb-3">Select all hazards present at this site</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {HAZARDS.map(hazard => (
                                    <button
                                        key={hazard.id}
                                        type="button"
                                        onClick={() => toggleHazard(hazard.id)}
                                        className={`p-3 rounded-lg border text-left transition-all ${formData.hazards[hazard.id]
                                                ? hazard.severity === 'critical'
                                                    ? 'bg-red-500/20 border-red-500 text-red-300'
                                                    : hazard.severity === 'high'
                                                        ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                                                        : 'bg-teal-500/20 border-teal-500 text-teal-300'
                                                : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{hazard.label}</span>
                                        {formData.hazards[hazard.id] && (
                                            <CheckCircle className="inline h-4 w-4 ml-2" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-teal-400" />
                                Emergency Coordinator *
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>Name *</Label>
                                    <Input
                                        value={formData.emergency_coordinator.name}
                                        onChange={(e) => updateNestedField('emergency_coordinator', 'name', e.target.value)}
                                        placeholder="John Smith"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Title</Label>
                                    <Input
                                        value={formData.emergency_coordinator.title}
                                        onChange={(e) => updateNestedField('emergency_coordinator', 'title', e.target.value)}
                                        placeholder="Site Safety Manager"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Phone *</Label>
                                    <Input
                                        value={formData.emergency_coordinator.phone}
                                        onChange={(e) => updateNestedField('emergency_coordinator', 'phone', e.target.value)}
                                        placeholder="(555) 123-4567"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.emergency_coordinator.email}
                                        onChange={(e) => updateNestedField('emergency_coordinator', 'email', e.target.value)}
                                        placeholder="john@company.com"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                            <h3 className="font-semibold text-white mb-3">Alternate Coordinator</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>Name</Label>
                                    <Input
                                        value={formData.alternate_coordinator.name}
                                        onChange={(e) => updateNestedField('alternate_coordinator', 'name', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.alternate_coordinator.phone}
                                        onChange={(e) => updateNestedField('alternate_coordinator', 'phone', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <Hospital className="h-4 w-4 text-red-400" />
                                Nearest Hospital *
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>Hospital Name</Label>
                                    <Input
                                        value={formData.nearest_hospital.name}
                                        onChange={(e) => updateNestedField('nearest_hospital', 'name', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.nearest_hospital.phone}
                                        onChange={(e) => updateNestedField('nearest_hospital', 'phone', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Address</Label>
                                    <Input
                                        value={formData.nearest_hospital.address}
                                        onChange={(e) => updateNestedField('nearest_hospital', 'address', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="bg-teal-500/10 p-4 rounded-lg border border-teal-500/30">
                            <h3 className="font-semibold text-teal-400 mb-3 flex items-center gap-2">
                                <Flag className="h-4 w-4" />
                                Primary Assembly Area *
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <Label>Location *</Label>
                                    <Input
                                        value={formData.primary_assembly.location}
                                        onChange={(e) => updateNestedField('primary_assembly', 'location', e.target.value)}
                                        placeholder="North parking lot, near main entrance"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Input
                                        value={formData.primary_assembly.description}
                                        onChange={(e) => updateNestedField('primary_assembly', 'description', e.target.value)}
                                        placeholder="Clearly marked with green flags"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Capacity</Label>
                                    <Input
                                        type="number"
                                        value={formData.primary_assembly.capacity || ''}
                                        onChange={(e) => updateNestedField('primary_assembly', 'capacity', parseInt(e.target.value) || 0)}
                                        placeholder="100"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                            <h3 className="font-semibold text-white mb-3">Secondary Assembly Area</h3>
                            <div className="space-y-3">
                                <div>
                                    <Label>Location</Label>
                                    <Input
                                        value={formData.secondary_assembly.location}
                                        onChange={(e) => updateNestedField('secondary_assembly', 'location', e.target.value)}
                                        placeholder="South side of building"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Input
                                        value={formData.secondary_assembly.description}
                                        onChange={(e) => updateNestedField('secondary_assembly', 'description', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">Alarm Systems</Label>
                            <div className="mt-3 space-y-3">
                                {formData.alarm_systems.map((alarm, idx) => (
                                    <div key={idx} className="grid grid-cols-3 gap-2 p-3 bg-slate-800/50 rounded-lg">
                                        <Input
                                            placeholder="Type (Air horn, PA...)"
                                            value={alarm.type}
                                            onChange={(e) => updateAlarmSystem(idx, 'type', e.target.value)}
                                        />
                                        <Input
                                            placeholder="Location"
                                            value={alarm.location}
                                            onChange={(e) => updateAlarmSystem(idx, 'location', e.target.value)}
                                        />
                                        <Input
                                            placeholder="Activation"
                                            value={alarm.activation}
                                            onChange={(e) => updateAlarmSystem(idx, 'activation', e.target.value)}
                                        />
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={addAlarmSystem} className="w-full">
                                    + Add Alarm System
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Radio Channel</Label>
                                <Input
                                    value={formData.radio_channel}
                                    onChange={(e) => updateField('radio_channel', e.target.value)}
                                    placeholder="Channel 7 Emergency"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Rescue Option</Label>
                                <select
                                    value={formData.rescue_option}
                                    onChange={(e) => updateField('rescue_option', e.target.value)}
                                    className="w-full mt-1 h-10 px-3 rounded-md border border-slate-600 bg-slate-800 text-white"
                                >
                                    <option value="external">External (Fire Dept/EMS)</option>
                                    <option value="internal">Internal Rescue Team</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 6:
                const hazardCount = Object.values(formData.hazards).filter(Boolean).length;
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-teal-500/20 to-emerald-500/20 p-6 rounded-xl border border-teal-500/30">
                            <h3 className="text-xl font-bold text-white mb-4">Ready to Generate EAP</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-teal-400">{formData.company_name ? '✓' : '—'}</p>
                                    <p className="text-xs text-slate-400">Company</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-teal-400">{formData.total_employees}</p>
                                    <p className="text-xs text-slate-400">Employees</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-400">{hazardCount}</p>
                                    <p className="text-xs text-slate-400">Hazards</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-400">{formData.alarm_systems.length}</p>
                                    <p className="text-xs text-slate-400">Alarms</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-3 text-white">Summary</h4>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Company:</dt>
                                    <dd className="text-white">{formData.company_name || '—'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Location:</dt>
                                    <dd className="text-white">{formData.city}, {formData.state}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Site Type:</dt>
                                    <dd className="text-white capitalize">{formData.site_type.replace('_', ' ')}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Emergency Coordinator:</dt>
                                    <dd className="text-white">{formData.emergency_coordinator.name || '—'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-400">Primary Assembly:</dt>
                                    <dd className="text-white">{formData.primary_assembly.location || '—'}</dd>
                                </div>
                            </dl>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
                                {error}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                        Emergency Action Plan Generator
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Create an OSHA-compliant EAP in minutes
                    </p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between overflow-x-auto pb-2">
                {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isComplete = currentStep > step.id;

                    return (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => isComplete && setCurrentStep(step.id)}
                                className={`flex flex-col items-center min-w-[80px] p-2 rounded-lg transition-all ${isActive
                                        ? 'bg-teal-500/20 text-teal-400'
                                        : isComplete
                                            ? 'text-emerald-400 cursor-pointer hover:bg-slate-700'
                                            : 'text-slate-500'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${isActive
                                        ? 'bg-teal-500 text-white'
                                        : isComplete
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-700 text-slate-400'
                                    }`}>
                                    {isComplete ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                                </div>
                                <span className="text-xs font-medium hidden md:block">{step.title}</span>
                            </button>
                            {idx < STEPS.length - 1 && (
                                <div className={`w-8 h-0.5 mx-1 ${isComplete ? 'bg-emerald-500' : 'bg-slate-700'
                                    }`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Form Card */}
            <Card className="border-slate-600 bg-slate-800/40">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        {(() => { const Icon = STEPS[currentStep - 1].icon; return <Icon className="h-5 w-5 text-teal-400" />; })()}
                        {STEPS[currentStep - 1].title}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        {STEPS[currentStep - 1].description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderStep()}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    disabled={currentStep === 1}
                    className="border-slate-600 text-slate-300"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                </Button>

                {currentStep < 6 ? (
                    <Button
                        onClick={() => setCurrentStep(prev => prev + 1)}
                        disabled={!canProceed()}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canProceed()}
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating EAP...
                            </>
                        ) : (
                            <>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate EAP
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
