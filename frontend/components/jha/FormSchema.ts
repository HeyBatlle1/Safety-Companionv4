// File: components/jha/FormSchema.ts
// 4 Cards × 5 Questions = 20 Total Questions
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
                    placeholder: 'List competent persons by specialty (fall protection, crane operations, electrical, excavation, etc.). Include names, certifications (OSHA 10/30, crane operator, qualified rigger, etc.), and responsibilities...',
                    hint: '📋 EXAMPLE: Mike Johnson - OSHA 30, Site Supervisor, Competent Person for Fall Protection. Carlos Martinez - OSHA 30, Competent Person Crane Operations, NCCCO Certified Crane Operator #456789. Sarah Williams - OSHA 10, Qualified Rigger, Signal Person certified. Tom Brown - OSHA 30, Competent Person Scaffolding, 15 years experience. All workers have current OSHA 10 certification.',
                    validationRules: [
                        { keyword: 'OSHA', message: 'Include OSHA certification levels (10/30)' },
                        { keyword: 'fall|crane|electrical|excavation', message: 'Specify competent person specialty areas' }
                    ]
                },

                {
                    id: 'safety_meetings_jha',
                    label: 'Safety Meetings & JHA Review',
                    type: 'textarea',
                    required: true,
                    minLength: 80,
                    placeholder: 'When was the last toolbox talk? Has the JHA been reviewed with the crew? Who signed off? Are there any safety concerns that have been raised?...',
                    hint: '📋 EXAMPLE: Daily toolbox talk held at 6:45 AM today (12/27/2025) led by Mike Johnson. All 8 crew members attended and signed the attendance sheet. Topics covered: wind conditions forecast for afternoon (15-20mph), proper harness inspection procedure, communication protocol for crane operations. JHA reviewed with crew on Monday 12/23. Safety concern raised by Carlos: swing stage cable showing wear on west side unit - replaced before work began.',
                    validationRules: [
                        { keyword: 'toolbox|meeting|briefing', message: 'Include when safety meeting occurred' }
                    ]
                },

                {
                    id: 'permits_compliance',
                    label: 'Permits & OSHA Compliance',
                    type: 'textarea',
                    required: true,
                    minLength: 80,
                    placeholder: 'What permits have been obtained? Are you familiar with applicable OSHA standards (1926 Subpart M, N, etc.)? Any known violations from previous jobs?...',
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
                    label: 'Major Equipment List',
                    type: 'textarea',
                    required: true,
                    minLength: 120,
                    placeholder: 'List all major equipment (tower cranes, spider cranes, boom lifts, swing stages, scaffolding, etc.). For each piece: Manufacturer, Model, Load Capacity, Last Inspection Date...',
                    hint: '📋 EXAMPLE: Tower Crane - Liebherr 71 EC-B 5, 4-ton max capacity at 130ft radius, annual inspection completed 11/15/2024, monthly inspection 12/15/2024 by ABC Crane Inspection. Spider Crane - Jekko SPX532, 2.7-ton capacity, inspected 12/20/2024. Swing Stage - Spider SC1500, 1500lb capacity, inspected 12/22/2024. JLG 600S Boom Lift, 500lb basket capacity, inspected 12/01/2024.',
                    validationRules: [
                        { keyword: 'crane|lift|scaffold|stage', message: 'Include equipment type' },
                        { keyword: 'inspect', message: 'Include last inspection dates' },
                        { keyword: 'capacity|load', message: 'Include load capacity ratings' }
                    ]
                },

                {
                    id: 'fall_protection_pfas',
                    label: 'Fall Protection & PFAS Details',
                    type: 'textarea',
                    required: true,
                    minLength: 150,
                    placeholder: 'Describe your fall protection system: PFAS types (full-body harness, shock-absorbing lanyard, self-retracting lifeline), anchor points, inspection schedule, competent person for inspections, rescue plan and equipment...',
                    hint: '📋 EXAMPLE: Full-body harnesses: 3M DBI-SALA ExoFit X300 for all workers, inspected daily by worker before use, weekly by competent person (Mike Johnson). Shock-absorbing lanyards: 3M 6ft twin-leg with rebar hooks. Self-retracting lifelines: DBI-SALA Nano-Lok 9ft on each swing stage. Anchor points: engineered beam clamps rated 5000lbs on steel I-beams, certified by structural engineer 12/10/2024. Rescue plan: suspension trauma rescue within 6 minutes, tripod rescue system available on each floor, Carlos Martinez trained in rescue procedures.',
                    validationRules: [
                        { keyword: 'harness|lanyard|lifeline', message: 'Specify PFAS equipment types' },
                        { keyword: 'anchor', message: 'Include anchor point details and ratings' },
                        { keyword: 'inspect', message: 'Include inspection schedule and responsible person' },
                        { keyword: 'rescue', message: 'Describe rescue plan and equipment' }
                    ]
                },

                {
                    id: 'materials_storage',
                    label: 'Materials & Storage',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'What materials are being handled (glass panels, steel beams, etc.)? Dimensions and weights? How are materials stored on site? Storage location and securing methods?...',
                    hint: '📋 EXAMPLE: Glass panels: Insulated glass units (IGU), 10ft x 6ft, approximately 450lbs each. Steel mullions: 12ft lengths, 85lbs each. All glass stored in A-frame racks on level compacted gravel pad on north side of building. Racks secured with ratchet straps to ground anchors. Caulk and sealants stored in job trailer, MSDS sheets on file. Exclusion zone marked around glass storage area.',
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
                    placeholder: 'List specific PPE required with ratings/standards: hard hats (Type I/II, Class E/G), safety glasses (ANSI Z87.1), cut-resistant gloves (Level X), high-visibility vests, steel-toe boots, specialized PPE (arc flash, fall arrest, etc.)...',
                    hint: '📋 EXAMPLE: Hard hats: MSA V-Gard Type I Class E. Safety glasses: 3M SecureFit ANSI Z87.1+ rated. Cut-resistant gloves: Mechanix CutResist A4 Level for glass handling. High-vis vests: ANSI 107 Class 2 for all workers. Steel-toe boots: ASTM F2413-18 rated. Fall protection: full-body harness as described above. Hearing protection: 3M E-A-R plugs NRR 32dB for crane operations.',
                    validationRules: [
                        { keyword: 'ANSI|Type|Class|Level', message: 'Include PPE ratings and standards' },
                        { keyword: 'hard hat|safety glasses|gloves|vest|boots', message: 'List all required PPE types' }
                    ]
                },

                {
                    id: 'equipment_certifications',
                    label: 'Equipment Certifications & Load Charts',
                    type: 'textarea',
                    required: true,
                    minLength: 80,
                    placeholder: 'Crane operator certifications (NCCCO, etc.)? Signal person qualified? Rigger certifications? Are load charts present and reviewed? Equipment rated for the loads?...',
                    hint: '📋 EXAMPLE: Crane operator: Carlos Martinez, NCCCO Certified TLL (Tower Crane) #456789, CCO Certification valid through 8/2025. Signal person: Sarah Williams, NCCCO Certified Signal Person #234567. Qualified rigger: Tom Brown, NCCCO Rigger #789012. Load charts for Liebherr 71 EC-B posted in crane cab and reviewed daily. All lifts pre-planned using load chart - heaviest lift is 450lb glass panel at 85ft radius (well within 2.4-ton capacity at that radius).',
                    validationRules: [
                        { keyword: 'NCCCO|certified|qualified', message: 'Include operator certifications' },
                        { keyword: 'load chart|capacity', message: 'Confirm load charts present and reviewed' }
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
                    placeholder: 'List the 3 highest-risk hazards with SPECIFIC details. For each: exact height/distance, equipment involved, materials, environmental conditions. Example: "1. Fall from 30ft swing stage while installing 12ft × 8ft glass panels during 28mph winds. 2. Glass panel dropped on ground worker from tower crane rigging failure..."',
                    hint: '📋 EXAMPLE: 1. Fall from 120ft swing stage while installing 10ft x 6ft glass panels (450lbs each) in 18mph wind gusts. Risk: worker loses balance while positioning panel, falls outside platform guardrail. 2. Struck-by falling glass panel during tower crane lift - rigging failure or wind gust causes panel to swing into worker on floor below. 3. Crushing injury during glass panel installation - panel slips from suction cups and crushes worker hands/feet against frame.',
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
                    placeholder: 'For EACH of the 3 hazards above, list controls using the Hierarchy of Controls (Elimination > Substitution > Engineering > Administrative > PPE). Example: "Hazard 1 - Fall from swing stage: Engineering: guardrails on swing stage platform, fall arrest anchor points; Administrative: daily weather monitoring, work stoppage at 25mph; PPE: full-body harness with shock-absorbing lanyard..."',
                    hint: '📋 EXAMPLE: Hazard 1 (Fall from swing stage): Engineering - guardrails on all sides of swing stage platform, fall arrest anchor points at each position. Administrative - weather monitoring, work stops at 25mph sustained wind, toolbox talk on fall prevention. PPE - full-body harness with shock-absorbing lanyard, 100% tie-off required. Hazard 2 (Struck-by): Engineering - tag lines on all crane loads, exclusion zone below lift. Administrative - lift plan reviewed, qualified rigger on every lift. Hazard 3 (Crushing): Engineering - suction cup lifters rated 2x panel weight, panel cart for transport. PPE - steel-toe boots, cut-resistant gloves.',
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
                    placeholder: 'Working at height? How high? Near power lines? How far? In confined space? Near traffic or public areas? How close is the public? Any overhead hazards? Underground utilities?...',
                    hint: '📋 EXAMPLE: Working at heights between 80-120 feet on building exterior. No power lines within 100ft. Public sidewalk on east side of building 25ft from work zone - protected by barricades and overhead netting. Underground utility locate completed via 811 on 12/15/2024 - no conflicts found. Active traffic on Main Street controlled by flaggers during crane operations. Adjacent occupied building 40ft west - windows covered with protective film.',
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
                    placeholder: 'How are ground-level workers and public protected from falling objects? Barricades type and location? Exclusion zone size? Warning signage? Controlled access? Who monitors the area below? Overhead protection (canopies)?...',
                    hint: '📋 EXAMPLE: 50ft exclusion zone established around building perimeter with 6ft chain-link fencing and jersey barriers at entry points. Warning signs posted every 25ft: "DANGER - Overhead Work - Hard Hat Area - Authorized Personnel Only". Debris netting installed at floors 3, 6, and 9 to catch any dropped materials. Full-time safety watch (Tom Brown) monitors ground level during all crane operations with air horn for emergency alerts. Pedestrian walkway on east side has covered canopy rated for 150lbs/sqft impact.',
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
            description: 'Worker experience, schedule pressure, supervision, and incident history',
            agentMapping: 'Agent 3 & 4 - Incident Prediction & Synthesis',
            questions: [
                {
                    id: 'crew_experience',
                    label: 'Crew Experience & Qualifications',
                    type: 'textarea',
                    required: true,
                    minLength: 120,
                    placeholder: 'Average crew experience level? How many workers have >5 years experience? How many are new (<1 year)? Have workers done this specific task before? Any language barriers on crew? Specialized skills?...',
                    hint: '📋 EXAMPLE: 8-person crew. Experience breakdown: 3 workers with >10 years glass installation experience (Mike, Carlos, Tom), 3 workers with 3-5 years experience, 2 workers with <1 year experience (assigned to ground-level material handling only, not elevated work). All workers have done curtain wall installation before except the 2 new workers. No language barriers - all English speaking. Specialized skills: Carlos is trained spider crane operator, Sarah is qualified rigger.',
                    validationRules: [
                        { keyword: 'year|experience|new|veteran', message: 'Describe crew experience levels' },
                        { keyword: 'language|communication', message: 'Address language barriers if present' }
                    ]
                },

                {
                    id: 'schedule_pressure',
                    label: 'Schedule Pressure & Overtime',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'Are you behind schedule? Is there deadline pressure (weather window closing, owner move-in date, contractual penalties)? Are workers doing overtime? How many hours per day? How many consecutive days worked without a day off?...',
                    hint: '📋 EXAMPLE: Currently on schedule - no deadline pressure. Standard 8-hour days (7AM-3:30PM), no overtime planned. Workers have had 2 days off in last 7 days (weekend). If weather delays occur, may need to extend to 10-hour days next week to meet building enclosure deadline of 1/15/2025. No contractual penalties for delay. Owner is flexible on timeline.',
                    validationRules: [
                        { keyword: 'hours|overtime|consecutive|days', message: 'Include work hours and consecutive days' },
                        { keyword: 'deadline|schedule|behind|pressure', message: 'Address schedule pressure honestly' }
                    ]
                },

                {
                    id: 'supervision_oversight',
                    label: 'Supervision & Safety Oversight',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'Who is the onsite supervisor (name)? Is a competent person present at all times? How often are safety inspections conducted (daily, weekly)? Are daily toolbox talks held? Who leads them? Is there active safety oversight?...',
                    hint: '📋 EXAMPLE: Mike Johnson is onsite supervisor, present 100% of workday. Carlos Martinez is competent person for fall protection and crane operations. Daily safety inspections at 6:30AM before work starts and 2PM before afternoon shift. Toolbox talks held daily at 6:45AM led by Mike - topics rotate based on day activities. Weekly formal inspection by safety manager every Friday. All inspections documented in safety log book.',
                    validationRules: [
                        { keyword: 'supervisor|competent person|oversight', message: 'Identify supervisor and competent persons' },
                        { keyword: 'daily|inspection|toolbox', message: 'Include inspection and meeting frequency' }
                    ]
                },

                {
                    id: 'incident_history',
                    label: 'Incident History & Near-Misses',
                    type: 'textarea',
                    required: true,
                    minLength: 100,
                    placeholder: 'Any near-misses on this job? Any previous incidents or injuries (first aid, recordable, lost time)? Equipment failures? Safety concerns raised by workers? Similar incidents on past jobs?...',
                    hint: '📋 EXAMPLE: One near-miss on 12/20/2024: glass panel swung within 4 feet of worker during lift when wind gusted to 22mph - operation stopped immediately, reviewed lift plan with crew. No injuries on this project. One first-aid incident on previous job (cut finger, bandaged onsite). Concern raised by Tom Brown about swing stage cable wear - inspected and replaced 12/22/2024. No OSHA citations on any previous company projects.',
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
                    placeholder: 'How do workers communicate (two-way radios, hand signals, verbal)? Is there a designated signal person for crane operations? How are weather alerts communicated? Emergency communication protocol? Radio channels/frequencies?...',
                    hint: '📋 EXAMPLE: Two-way radios (Motorola T800) for all crew members, Channel 1 for operations, Channel 2 for emergencies only. Sarah Williams is designated signal person for crane operations using OSHA standard hand signals. Voice communication via radio for crane ops when visual signals insufficient. Weather alerts sent via text message to all crew from Mike Johnson who monitors weather.com hourly. Emergency protocol: 3 long air horn blasts = evacuate to assembly point. Radio check every morning at 6:45AM.',
                    validationRules: [
                        { keyword: 'radio|signal|communication|alert', message: 'Describe communication methods' },
                        { keyword: 'signal person|spotter|crane', message: 'Identify signal person for crane ops if applicable' }
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
