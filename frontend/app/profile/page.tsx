'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
    User as UserIcon,
    Certificate,
    MapPin,
    Phone,
    EnvelopeSimple,
    Shield,
    Buildings,
    PencilSimple,
    Check,
    X,
    HardHat,
    Gear,
    SignOut,
    CaretRight,
    UserCircle,
    IdentificationBadge,
    FileText,
} from '@phosphor-icons/react';
import { SignOutButton } from '@clerk/nextjs';
import { WorkerDocuments } from '@/components/profile/WorkerDocuments';

// Role Display Config
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    safety_director: { label: 'SAFETY DIRECTOR', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    project_manager: { label: 'PROJECT MANAGER', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    foreman: { label: 'FOREMAN', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    field_worker: { label: 'FIELD WORKER', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
    master_admin: { label: 'SYSTEM ADMIN', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
};

export default function ProfilePage() {
    const { user, role, isLoading } = usePermissions();
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        bio: '',
        department: '',
    });

    // Initialize form data when user loads
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: (user as any)?.phone || '',
                bio: (user as any)?.bio || '',
                department: (user as any)?.department || '',
            });
        }
    }, [user]);

    // Fetch sites
    const { data: sites = [] } = useQuery({
        queryKey: ['mySites'],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/me/sites`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return [];
            return response.json();
        },
        enabled: !!user,
    });

    // Update mutation
    const updateProfile = useMutation({
        mutationFn: async (data: typeof formData) => {
            const token = await getToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            setIsEditing(false);
        },
    });

    const handleSave = () => {
        updateProfile.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const roleConfig = ROLE_CONFIG[role || 'field_worker'];

    return (
        <div className="min-h-screen pb-24 px-4 pt-4">
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-lg font-semibold tracking-tight">Profile</h1>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-primary font-medium flex items-center gap-1"
                        >
                            <PencilSimple size={14} />
                            Edit
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-xs text-muted-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={updateProfile.isPending}
                                className="text-xs text-primary font-medium"
                            >
                                {updateProfile.isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">Manage your account settings</p>
            </div>

            {/* Identity Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-card border border-white/5 overflow-hidden mb-4"
            >
                {/* Top Bar with Role */}
                <div className={cn(
                    "px-4 py-2 border-b border-white/5 flex items-center justify-between",
                    roleConfig.bg
                )}>
                    <div className="flex items-center gap-2">
                        <Shield size={14} weight="fill" className={roleConfig.color} />
                        <span className={cn("text-[10px] font-bold tracking-wider", roleConfig.color)}>
                            {roleConfig.label}
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                        ID: {user?.id?.slice(0, 8)}
                    </span>
                </div>

                {/* Main Content */}
                <div className="p-4">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <UserCircle size={32} weight="duotone" className="text-primary" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="text-base font-semibold bg-transparent border-b border-white/20 focus:border-primary outline-none w-full mb-1"
                                    placeholder="Full Name"
                                />
                            ) : (
                                <h2 className="text-base font-semibold truncate">{user?.name || 'Unknown'}</h2>
                            )}
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>

                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                    className="text-xs text-muted-foreground bg-transparent border-b border-white/10 focus:border-primary outline-none w-full mt-2"
                                    placeholder="Department / Position"
                                />
                            ) : (
                                (user as any)?.department && (
                                    <p className="text-xs text-muted-foreground mt-1">{(user as any).department}</p>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-xl bg-card border border-white/5 mb-4"
            >
                <div className="px-4 py-3 border-b border-white/5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</span>
                </div>
                <div className="divide-y divide-white/5">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <EnvelopeSimple size={16} className="text-muted-foreground" />
                        <span className="text-sm flex-1">{user?.email}</span>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-3">
                        <Phone size={16} className="text-muted-foreground" />
                        {isEditing ? (
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                className="text-sm flex-1 bg-transparent border-b border-white/10 focus:border-primary outline-none"
                                placeholder="Add phone number"
                            />
                        ) : (
                            <span className="text-sm flex-1 text-muted-foreground">
                                {(user as any)?.phone || 'Not set'}
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Bio */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl bg-card border border-white/5 mb-4"
            >
                <div className="px-4 py-3 border-b border-white/5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bio</span>
                </div>
                <div className="p-4">
                    {isEditing ? (
                        <textarea
                            value={formData.bio}
                            onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Write a short bio..."
                            className="w-full bg-transparent text-sm resize-none h-16 outline-none placeholder:text-muted-foreground/50"
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {(user as any)?.bio || 'No bio added.'}
                        </p>
                    )}
                </div>
            </motion.div>

            {/* Worker Documents - Certifications, Drug Tests, HazCom */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-4"
            >
                <WorkerDocuments />
            </motion.div>

            {/* Active Sites */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl bg-card border border-white/5 mb-4"
            >
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Active Sites</span>
                    <span className="text-[10px] text-muted-foreground">{sites.length}</span>
                </div>
                <div className="divide-y divide-white/5">
                    {sites.length > 0 ? (
                        sites.map((site: any) => (
                            <div key={site.id} className="px-4 py-3 flex items-center gap-3">
                                <Buildings size={16} className="text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{site.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{site.address}</p>
                                </div>
                                <CaretRight size={14} className="text-muted-foreground" />
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3">
                            <p className="text-sm text-muted-foreground">No active assignments.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Sign Out */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-xl bg-card border border-white/5"
            >
                <SignOutButton>
                    <button className="w-full px-4 py-3 flex items-center gap-3 text-destructive">
                        <SignOut size={16} />
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </SignOutButton>
            </motion.div>
        </div>
    );
}
