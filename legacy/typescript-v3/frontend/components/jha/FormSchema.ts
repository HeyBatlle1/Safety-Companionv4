// File: components/jha/FormSchema.ts
// Consolidating 20 questions into 16 high-value questions
// Reverse-engineered from V1 agent outputs to ensure rich data capture

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
    required?: boolean;
}

export interface ValidationRule {
    keyword?: string;
    minCount?: number;
    message: string;
}

export interface Question {
    id: string;
    label: string;
    type: 'textarea' | 'structured' | 'text';
    required: boolean;
    minLength?: number;
    placeholder?: string;
    hint?: string;
    fields?: FormField[];
    validationRules?: ValidationRule[];
}

export interface FormCard {
    id: string;
    title: string;
    description: string;
    agentMapping: string;
    questions: Question[];
}

export interface JHAFormSchema {
    cards: FormCard[];
}

export const JHA_FORM_SCHEMA: JHAFormSchema = {
    cards: [
        {
            id: 'card_1_project_safety',
            title: 'Project & Safety Planning',
            description: 'Basic project details and emergency preparedness',
            agentMapping: 'Agent 1 - Data Validator',
            questions: [
                {
                    id: 'project_details',
                    label: 'Project Details',
                    type: 'structured',
                    required: true,
                    fields: [
                        { name: 'projectName', label: 'Project Name', type: 'text', required: true },
                        { name: 'location', label: 'Location (address)', type: 'text', required: true },
                        { name: 'buildingHeight', label: 'Building Height (feet)', type: 'number', required: true },
                        {
                            name: 'workType', label: 'Work Type', type: 'select', options: [
                                'Glass & Glazing Installation',
                                'Curtain Wall Installation',
                                'Structural Steel Erection',
                                'Roofing',
                                'Electrical Work',
                                'General Construction',
                                'Other'
                            ], required: true
                        },
                        { name: 'duration', label: 'Expected Duration (days)', type: 'number', required: true },
                        { name: 'crewSize', label: 'Crew Size', type: 'number', required: true },
                        { name: 'crewExperience', label: 'Avg Crew Exp (years)', type: 'number', required: false },
                        { name: 'supervisor', label: 'Onsite Supervisor Name', type: 'text', required: true }
                    ],
                    hint: '📋 EXAMPLE: Project Name: "Downtown Tower Glass Replacement", Location: "450 Main Street, Boston MA 02108", Height: 120, Work Type: Glass & Glazing Installation, Duration: 14, Crew Size: 8, Supervisor: "Mike Johnson"'
                },

                {
                    id: 'emergency_response',
                    label: 'Emergency Response Plan',
                    type: 'textarea',
                    required: true,
                    minLength: 150,
                    placeholder: 'Describe your emergency evacuation plan, assembly point, emergency contacts, first aid resources, and onsite rescue capabilities...',
                    hint: '📋 EXAMPLE: Emergency assembly point is the parking lot at 452 Main Street (east side of building). Emergency contacts: Mike Johnson (Site Supervisor) 617-555-1234, Fire Dept 911, Boston Medical Center 617-638-6000. First aid kit located in job trailer and on each floor in the red supply box. Rescue equipment includes a tripod rescue system, 2 rescue harnesses, and a stokes basket. Competent rescue person: Carlos Martinez (trained in suspension trauma and rescue).',
                    validationRules: [
                        { keyword: 'assembly', message: 'Include specific assembly point location' },
                        { keyword: 'contact', message: 'Include emergency contact names and phone numbers' },
                        { keyword: 'first aid', message: 'Specify first aid kit location' }
                    ]
                },

                {
                    id: 'competent_persons',
                    label: 'Competent Person Designations',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'List competent persons by specialty (fall protection, crane operations, electrical, excavation, etc.). Include certifications (OSHA 10/30, NCCCO) and responsibilities...',
                    hint: '📋 EXAMPLE: Mike Johnson - OSHA 30, Site Supervisor, Competent Person for Fall Protection. Carlos Martinez - OSHA 30, Competent Person Crane Operations, NCCCO Certified Crane Operator #456789. Sarah Williams - OSHA 10, Qualified Rigger, Signal Person certified. Tom Brown - OSHA 30, Competent Person Scaffolding, 15 years experience. All workers have current OSHA 10 certification.',
                    validationRules: [
                        { keyword: 'OSHA', message: 'Include OSHA certification levels (10/30)' },
                        { keyword: 'fall|crane|electrical|excavation', message: 'Specify competent person specialty areas' }
                    ]
                },

                {
                    id: 'safety_meetings_jha',
                    label: 'Safety Meetings & Daily Inspections',
                    type: 'textarea',
                    required: true,
                    minLength: 80,
                    placeholder: 'Identify frequency of toolbox talks, JHA review sign-offs, and daily site safety inspections...',
                    hint: '📋 EXAMPLE: Daily toolbox talk held at 6:45 AM today (12/27/2025) led by Mike Johnson. All 8 crew members attended and signed the attendance sheet. Topics covered: wind conditions forecast for afternoon (15-20mph), proper harness inspection procedure, communication protocol for crane operations. JHA reviewed with crew on Monday 12/23. Safety concern raised by Carlos: swing stage cable showing wear on west side unit - replaced before work began.',
                    validationRules: [
                        { keyword: 'toolbox|meeting|briefing', message: 'Include when safety meeting occurred' },
                        { keyword: 'inspection|daily|check', message: 'Confirm daily safety inspection protocols' }
                    ]
                },

                {
                    id: 'permits_compliance',
                    label: 'Permits & OSHA Compliance',
                    type: 'textarea',
                    required: true,
                    minLength: 80,
                    placeholder: 'What permits have been obtained (Crane, Building, Street)? Are you following applicable OSHA standards (1926 Subpart M, N, etc.)?...',
                    hint: '📋 EXAMPLE: Building permit #BP-2024-5678 obtained. Crane operation permit from City of Boston valid through 1/15/2025. Familiar with OSHA 1926 Subpart M (Fall Protection) - 6ft trigger height, 5000lb anchor requirement. Familiar with OSHA 1926 Subpart N (Cranes) - annual inspection requirements, load chart review. Familiar with ANSI/IWCA I-14.1 for suspended platform operations. No previous OSHA violations on record.',
                    validationRules: [
                        { keyword: 'permit|OSHA', message: 'Specify permits obtained and OSHA standards reviewed' }
                    ]
                }
            ]
        },

        {
            id: 'card_2_equipment_materials',
            title: 'Equipment & Materials',
            description: 'Equipment specifications, PPE, and material handling',
            agentMapping: 'Agent 1 & 2 - Validation & Risk Assessment',
            questions: [
                {
                    id: 'major_equipment',
                    label: 'Major Equipment & Certifications',
                    type: 'textarea',
                    required: true,
                    minLength: 120,
                    placeholder: 'List major equipment (crane, lift, swing stage) with Manufacturer, Model, Capacity, Last Inspection, and Load Chart presence...',
                    hint: '📋 EXAMPLE: Tower Crane - Liebherr 71 EC-B 5, 4-ton max capacity at 130ft radius, annual inspection 11/15/2024, load charts posted in cab. Spider Crane - Jekko SPX532, 2.7-ton capacity, inspected 12/20/2024. Swing Stage - Spider SC1500, 1500lb capacity, inspected 12/22/2024. JLG 600S Boom Lift, 500lb basket capacity, inspected 12/01/2024.',
                    validationRules: [
                        { keyword: 'crane|lift|scaffold|stage', message: 'Include equipment type' },
                        { keyword: 'inspect', message: 'Include last inspection dates' },
                        { keyword: 'capacity|load', message: 'Include load capacity ratings' },
                        { keyword: 'chart', message: 'Confirm availability of load charts' }
                    ]
                },

                {
                    id: 'fall_protection_pfas',
                    label: 'Fall Protection & PFAS Details',
                    type: 'textarea',
                    required: true,
                    minLength: 150,
                    placeholder: 'Describe PFAS types (harness, lanyard, SRL), anchor points (ratings/certification), inspection schedule, and rescue plan...',
                    hint: '📋 EXAMPLE: Full-body harnesses: 3M DBI-SALA ExoFit X300 for all workers, inspected daily. Shock-absorbing lanyards: 3M 6ft twin-leg. Self-retracting lifelines: DBI-SALA Nano-Lok 9ft. Anchor points: engineered beam clamps rated 5000lbs, certified 12/10/2024. Rescue plan: suspension trauma rescue within 6 minutes, tripod rescue system available, Carlos Martinez trained in rescue.',
                    validationRules: [
                        { keyword: 'harness|lanyard|lifeline', message: 'Specify PFAS equipment types' },
                        { keyword: 'anchor', message: 'Include anchor point details and ratings' },
                        { keyword: 'inspect', message: 'Include inspection schedule' },
                        { keyword: 'rescue', message: 'Describe rescue plan and equipment' }
                    ]
                },

                {
                    id: 'materials_storage',
                    label: 'Materials & Storage',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'What materials are being handled (glass, steel)? Dimensions and weights? How are they stored and secured on site?...',
                    hint: '📋 EXAMPLE: Glass panels: Insulated glass units (IGU), 10ft x 6ft, approx 450lbs each. Steel mullions: 12ft lengths, 85lbs each. All glass stored in A-frame racks on north side. Racks secured with ratchet straps. Caulk and sealants in job trailer. Exclusion zone marked around glass storage.',
                    validationRules: [
                        { keyword: 'glass|steel|material', message: 'Specify material types' },
                        { keyword: 'feet|ft|inches|lbs|pounds', message: 'Include dimensions and weights' },
                        { keyword: 'storage|stored|crate|rack', message: 'Describe storage method and location' }
                    ]
                },

                {
                    id: 'ppe_requirements',
                    label: 'Personal Protective Equipment (PPE)',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'List PPE required with ratings: hard hats (Type/Class), safety glasses (ANSI Z87.1), gloves (Cut Level), high-vis, etc...',
                    hint: '📋 EXAMPLE: Hard hats: MSA V-Gard Type I Class E. Safety glasses: 3M SecureFit ANSI Z87.1+ rated. Cut-resistant gloves: Mechanix CutResist A4 Level. High-vis vests: ANSI 107 Class 2. Steel-toe boots: ASTM F2413-18 rated. Hearing protection: 3M E-A-R plugs NRR 32dB.',
                    validationRules: [
                        { keyword: 'ANSI|Type|Class|Level', message: 'Include PPE ratings and standards' },
                        { keyword: 'hard hat|safety glasses|gloves|vest|boots', message: 'List all required PPE types' }
                    ]
                }
            ]
        },

        {
            id: 'card_3_hazards_controls',
            title: 'Hazards & Controls',
            description: 'Specific hazards, existing controls, and environmental conditions',
            agentMapping: 'Agent 2 & 3 - Risk Assessment & Incident Prediction',
            questions: [
                {
                    id: 'top_three_hazards',
                    label: 'Top 3 Specific Hazards',
                    type: 'textarea',
                    required: true,
                    minLength: 200,
                    placeholder: 'List the 3 highest-risk hazards with SPECIFIC details (height, equipment, materials, environment)...',
                    hint: '📋 EXAMPLE: 1. Fall from 120ft swing stage while installing 10ft x 6ft glass panels (450lbs each) in 18mph wind gusts. 2. Struck-by falling glass panel during tower crane lift - rigging failure or wind gust. 3. Crushing injury during glass panel installation - panel slips from suction cups.',
                    validationRules: [
                        { keyword: 'feet|ft|height', message: 'Include specific heights/distances' },
                        { keyword: 'while|during|using', message: 'Include activity context and conditions' },
                        { minCount: 3, message: 'List all 3 hazards separately' }
                    ]
                },

                {
                    id: 'existing_controls',
                    label: 'Existing Safety Controls',
                    type: 'textarea',
                    required: true,
                    minLength: 200,
                    placeholder: 'For EACH hazard above, list controls using Hierarchy of Controls (Elimination > Substitution > Engineering > Administrative > PPE)...',
                    hint: '📋 EXAMPLE: Hazard 1 (Fall): Engineering - guardrails, anchor points. Administrative - weather monitoring (stop at 25mph). PPE - 100% tie-off. Hazard 2 (Struck-by): Engineering - tag lines, exclusion zone. Administrative - lift plan review. Hazard 3 (Crushing): Engineering - 2x rated suction lifters, panel cart. PPE - steel-toe boots.',
                    validationRules: [
                        { keyword: 'elimination|engineering|administrative|PPE', message: 'Organize controls by hierarchy' },
                        { keyword: 'guardrail|anchor|monitor|harness|procedure', message: 'Include specific control measures' }
                    ]
                },

                {
                    id: 'work_environment',
                    label: 'Work Environment & Proximity Hazards',
                    type: 'textarea',
                    required: true,
                    minLength: 120,
                    placeholder: 'Working at height? Proximity to power lines? Confined spaces? Traffic or public areas overhead hazards?...',
                    hint: '📋 EXAMPLE: Working at heights between 80-120 feet. No power lines within 100ft. Public sidewalk 25ft from work zone - protected by barricades and netting. Underground utility locate completed via 811. Adjacent occupied building 40ft west.',
                    validationRules: [
                        { keyword: 'feet|ft|height', message: 'Include working heights' },
                        { keyword: 'power line|utility|811', message: 'Address utility proximity if applicable' },
                        { keyword: 'public|traffic|pedestrian', message: 'Address public safety if applicable' }
                    ]
                },

                {
                    id: 'ground_protection',
                    label: 'Ground-Level Protection Systems',
                    type: 'textarea',
                    required: true,
                    minLength: 150,
                    placeholder: 'How are ground workers and public protected from falling objects? Barricades, exclusion zones, safety watches, netting?...',
                    hint: '📋 EXAMPLE: 50ft exclusion zone with 6ft chain-link fencing. Warning signs: "DANGER - Overhead Work". Debris netting at floors 3, 6, and 9. Full-time safety watch (Tom Brown) with air horn for alerts. Pedestrian walkway has 150lb/sqft impact-rated canopy.',
                    validationRules: [
                        { keyword: 'barricade|barrier|fence', message: 'Describe physical barriers' },
                        { keyword: 'feet|ft|zone', message: 'Include exclusion zone dimensions' },
                        { keyword: 'sign|warning', message: 'Include warning signage' },
                        { keyword: 'monitor|watch|spotter', message: 'Identify who monitors the area' }
                    ]
                }
            ]
        },

        {
            id: 'card_4_crew_schedule',
            title: 'Crew & Schedule',
            description: 'Insights into schedule pressure, incident history, and communication',
            agentMapping: 'Agent 3 & 4 - Incident Prediction & Synthesis',
            questions: [
                {
                    id: 'schedule_pressure',
                    label: 'Schedule Pressure & Overtime',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'Are you behind schedule? Deadline pressure? Overtime or high consecutive days worked?...',
                    hint: '📋 EXAMPLE: Currently on schedule - no deadline pressure. Standard 8-hour days (7AM-3:30PM), no overtime planned. Workers have had 2 days off in last 7 days. If weather delays occur, may need to extend to 10-hour days next week to meet 1/15 deadline.',
                    validationRules: [
                        { keyword: 'hours|overtime|consecutive|days', message: 'Include work hours and consecutive days' },
                        { keyword: 'deadline|schedule|behind|pressure', message: 'Address schedule pressure honestly' }
                    ]
                },

                {
                    id: 'incident_history',
                    label: 'Incident History & Near-Misses',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'Near-misses on this job? Previous injuries? Equipment failures? Worker-raised concerns?...',
                    hint: '📋 EXAMPLE: One near-miss on 12/20/2024: glass panel swung within 4 feet of worker in wind gust. No injuries on this project. Concern raised by Tom Brown about swing stage cable wear - inspected and replaced 12/22/2024. No OSHA citations on previous projects.',
                    validationRules: [
                        { keyword: 'near-miss|incident|injury|concern|failure', message: 'Document any incidents or concerns' }
                    ]
                },

                {
                    id: 'communication_coordination',
                    label: 'Communication & Coordination',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'Communication methods (radios, signals)? Signal persons identified? Weather alert protocol?...',
                    hint: '📋 EXAMPLE: Two-way radios (Channel 1 ops, Channel 2 emergency). Sarah Williams is designated signal person using OSHA standards. Weather alerts via text from Mike Johnson. Emergency protocol: 3 long air horn blasts = evacuate. Radio check daily at 6:45AM.',
                    validationRules: [
                        { keyword: 'radio|signal|communication|alert', message: 'Describe communication methods' },
                        { keyword: 'signal person|spotter|crane', message: 'Identify signal person for crane ops' }
                    ]
                }
            ]
        }
    ]
};

// Helper function to get total question count
export function getTotalQuestionCount(): number {
    return JHA_FORM_SCHEMA.cards.reduce((acc, card) => acc + card.questions.length, 0);
}

// Helper to get card by index
export function getCardByIndex(index: number): FormCard | undefined {
    return JHA_FORM_SCHEMA.cards[index];
}
