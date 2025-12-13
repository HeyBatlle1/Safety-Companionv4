import { create } from 'zustand';

// Step 1: Job Information
export interface JobInfo {
    projectName: string;
    location: string;
    workType: string;
    crewSize: number;
    date: string;
    supervisor: string;
    company: string;
}

// Step 2: Hazard Identification
export interface HazardItem {
    id: string;
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

// Step 3: Control Measures
export interface ControlMeasures {
    ppe: string[];
    procedures: string[];
    emergencyPlan: string;
    additionalNotes: string;
}

// Complete JHA Form State
export interface JHAFormState {
    currentStep: number;
    jobInfo: JobInfo;
    hazards: HazardItem[];
    controlMeasures: ControlMeasures;
}

interface JHAStore extends JHAFormState {
    // Actions
    setCurrentStep: (step: number) => void;
    nextStep: () => void;
    previousStep: () => void;

    // Job Info actions
    updateJobInfo: (info: Partial<JobInfo>) => void;

    // Hazard actions
    addHazard: (hazard: HazardItem) => void;
    removeHazard: (id: string) => void;
    updateHazard: (id: string, updates: Partial<HazardItem>) => void;

    // Control Measures actions
    updateControlMeasures: (measures: Partial<ControlMeasures>) => void;

    // Reset
    resetForm: () => void;
}

const initialState: JHAFormState = {
    currentStep: 1,
    jobInfo: {
        projectName: '',
        location: '',
        workType: '',
        crewSize: 0,
        date: new Date().toISOString().split('T')[0],
        supervisor: '',
        company: '',
    },
    hazards: [],
    controlMeasures: {
        ppe: [],
        procedures: [],
        emergencyPlan: '',
        additionalNotes: '',
    },
};

export const useJHAStore = create<JHAStore>((set) => ({
    ...initialState,

    setCurrentStep: (step) => set({ currentStep: step }),

    nextStep: () => set((state) => ({
        currentStep: Math.min(state.currentStep + 1, 4)
    })),

    previousStep: () => set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 1)
    })),

    updateJobInfo: (info) => set((state) => ({
        jobInfo: { ...state.jobInfo, ...info }
    })),

    addHazard: (hazard) => set((state) => ({
        hazards: [...state.hazards, hazard]
    })),

    removeHazard: (id) => set((state) => ({
        hazards: state.hazards.filter((h) => h.id !== id)
    })),

    updateHazard: (id, updates) => set((state) => ({
        hazards: state.hazards.map((h) =>
            h.id === id ? { ...h, ...updates } : h
        )
    })),

    updateControlMeasures: (measures) => set((state) => ({
        controlMeasures: { ...state.controlMeasures, ...measures }
    })),

    resetForm: () => set(initialState),
}));
