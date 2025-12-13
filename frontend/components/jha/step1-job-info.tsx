'use client';

import { useJHAStore } from '@/stores/jha-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Briefcase, Users, Calendar, UserCheck } from 'lucide-react';

export function Step1JobInfo() {
    const { jobInfo, updateJobInfo, nextStep } = useJHAStore();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const isValid = jobInfo.projectName && jobInfo.location && jobInfo.workType && jobInfo.crewSize > 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="card-highlight">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-accent" />
                        Job Information
                    </CardTitle>
                    <CardDescription>
                        Basic details about the construction project and work being performed
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Project Name */}
                    <div className="space-y-2">
                        <Label htmlFor="projectName" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            Project Name *
                        </Label>
                        <Input
                            id="projectName"
                            value={jobInfo.projectName}
                            onChange={(e) => updateJobInfo({ projectName: e.target.value })}
                            placeholder="e.g., Downtown Office Building Renovation"
                            required
                            className="touch-target"
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Label htmlFor="location" className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            Location *
                        </Label>
                        <Input
                            id="location"
                            value={jobInfo.location}
                            onChange={(e) => updateJobInfo({ location: e.target.value })}
                            placeholder="e.g., 123 Main St, City, State"
                            required
                            className="touch-target"
                        />
                    </div>

                    {/* Work Type */}
                    <div className="space-y-2">
                        <Label htmlFor="workType" className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            Work Type *
                        </Label>
                        <Input
                            id="workType"
                            value={jobInfo.workType}
                            onChange={(e) => updateJobInfo({ workType: e.target.value })}
                            placeholder="e.g., Roofing, Electrical, Scaffolding"
                            required
                            className="touch-target"
                        />
                    </div>

                    {/* Crew Size */}
                    <div className="space-y-2">
                        <Label htmlFor="crewSize" className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Crew Size *
                        </Label>
                        <Input
                            id="crewSize"
                            type="number"
                            min="1"
                            value={jobInfo.crewSize || ''}
                            onChange={(e) => updateJobInfo({ crewSize: parseInt(e.target.value) || 0 })}
                            placeholder="Number of workers"
                            required
                            className="touch-target"
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="date" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            Date *
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={jobInfo.date}
                            onChange={(e) => updateJobInfo({ date: e.target.value })}
                            required
                            className="touch-target"
                        />
                    </div>

                    {/* Supervisor */}
                    <div className="space-y-2">
                        <Label htmlFor="supervisor" className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            Supervisor
                        </Label>
                        <Input
                            id="supervisor"
                            value={jobInfo.supervisor}
                            onChange={(e) => updateJobInfo({ supervisor: e.target.value })}
                            placeholder="Site supervisor name"
                            className="touch-target"
                        />
                    </div>

                    {/* Company */}
                    <div className="space-y-2">
                        <Label htmlFor="company" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            Company
                        </Label>
                        <Input
                            id="company"
                            value={jobInfo.company}
                            onChange={(e) => updateJobInfo({ company: e.target.value })}
                            placeholder="Company name"
                            className="touch-target"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={!isValid}
                    className="touch-target-lg"
                >
                    Continue to Hazard Identification →
                </Button>
            </div>
        </form>
    );
}
