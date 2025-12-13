import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ArrowLeft, Settings, Bell, Shield } from "lucide-react";
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

            {/* Coming Soon Card */}
            <Card className="card-highlight">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                            <User className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                            <CardTitle>User Profile</CardTitle>
                            <CardDescription>Coming with Clerk Authentication</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Profile management will include:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <User className="h-4 w-4 text-accent mt-0.5" />
                            <span><strong>Account Info:</strong> Name, email, company, role</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Settings className="h-4 w-4 text-accent mt-0.5" />
                            <span><strong>Preferences:</strong> Notifications, theme, language</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Bell className="h-4 w-4 text-accent mt-0.5" />
                            <span><strong>Notifications:</strong> Email alerts, safety updates</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-accent mt-0.5" />
                            <span><strong>Security:</strong> Password, 2FA, session management</span>
                        </li>
                    </ul>
                    <div className="pt-4">
                        <Link href="/">
                            <Button variant="outline" className="touch-target">
                                Return to Dashboard
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
