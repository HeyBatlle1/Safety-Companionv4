'use client';

import { UserProfile } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="touch-target">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-high-contrast">
                        Profile & Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your account and preferences
                    </p>
                </div>
            </div>

            {/* Clerk UserProfile */}
            <div className="flex justify-center">
                <UserProfile
                    appearance={{
                        elements: {
                            card: "bg-slate-800 border-slate-700",
                            navbarButton: "text-slate-300 hover:text-white hover:bg-slate-700",
                            navbarButtonActive: "text-white bg-slate-700",
                            profileSectionTitle: "text-white",
                            profileSectionPrimaryButton: "bg-teal-600 hover:bg-teal-700",
                            formFieldLabel: "text-slate-300",
                            formFieldInput: "bg-slate-700 border-slate-600 text-white",
                        }
                    }}
                />
            </div>
        </div>
    );
}
