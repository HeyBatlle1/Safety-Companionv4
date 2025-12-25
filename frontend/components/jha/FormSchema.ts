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
                    hint: 'This information helps identify applicable OSHA standards and industry baseline risks.'
                },

                {
                    id: 'emergency_response',
                    label: 'Emergency Response Plan',
                    type: 'textarea',
                    required: true,
                    minLength: 150,
                    placeholder: 'Describe your emergency evacuation plan, assembly point, emergency contacts, first aid resources, and onsite rescue capabilities...',
                    hint: 'V1 flagged: "No emergency evacuation plan documented", "No assembly point identified", "First aid kit location not documented", "Emergency contacts not listed". Be specific: include assembly point ADDRESS, emergency contact NAMES and PHONE NUMBERS, first aid kit LOCATION, and rescue equipment/personnel available.',
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
                    hint: 'V1 output analyzed: "Verify that all workers have received the required training (OSHA 10, OSHA 30, fall protection, crane safety, etc.)". List each competent person with their certification type and specialization. Example: "John Smith - OSHA 30, Competent Person Fall Protection; Jane Doe - NCCCO Crane Operator Certification"',
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
                    hint: 'V1 recommended: "Conduct daily toolbox talks to discuss specific hazards and safe work practices for the day\'s activities" and "Review and update the JHA/AHA regularly". Document when crew was briefed, who attended, and any concerns raised.',
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
                    hint: 'V1 assessed compliance with: "OSHA 1926 Subpart N (Cranes & Derricks)", "OSHA 1926 Subpart M (Fall Protection)", "ANSI/IWCA I-14.1 (Window Cleaning Safety)". List permits (building, crane, electrical, etc.) and confirm familiarity with relevant OSHA standards.',
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
                    hint: 'V1 flagged: "Equipment last inspected 90 days ago (30-day max required)" and noted "Tower crane, spider crane". Be specific: "Tower Crane - Liebherr 71 EC-B, 4-ton capacity, inspected 12/20/2025; Spider Crane - Jekko SPX527, 2.7-ton capacity, inspected 12/23/2025"',
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
                    hint: 'V1 identified: "Fall Hazards: Working at height is a primary risk. While fall protection is mentioned, specific details are crucial" and noted "PFAS inspection: Visual inspections alone are insufficient". Specify: PFAS type and manufacturer, anchor point locations and ratings (5,000 lbs minimum), inspection frequency (daily pre-use + competent person inspections), rescue plan with timeframe (<6 minutes), rescue equipment available.',
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
                    hint: 'V1 noted: "Glass Handling: Large glass panels pose a risk of cuts, crushing injuries, and dropped object hazards" and questioned: "\'Dry wood crate\' is not descriptive enough. Is the storage area level, secure, and protected from the elements? How are the crates secured to prevent tipping?" Be specific about material specs, storage location, ground conditions, and anti-tip measures.',
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
                    hint: 'V1 referenced: "ANSI Z87.1 (Eye and Face Protection): Referenced in the equipment section, ensuring all workers are wearing proper ANSI Z87.1 rated eye protection" and noted "\'Cut gloves\' are good, but specify the cut level rating needed". Be specific: "Hard hats: Type I, Class E; Safety glasses: ANSI Z87.1+; Cut gloves: ANSI A4 Level; High-vis vests: ANSI 107 Class 2"',
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
                    hint: 'V1 action items included: "Verify Crane Operator Qualifications: Confirm that the crane operator(s) are certified and qualified to operate the specific type of crane being used" and "Review Rigging Plan: Ensure a qualified rigger has developed and approved the rigging plan". Document operator certs, signal person qualifications, rigging plan approval, and load chart review.',
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
                    hint: 'V1 identified specific hazards: "Fall from swing stage during wind", "Crane operation with tower/spider cranes", "Glass handling - cuts/crushing/dropped objects". DO NOT say generic "fall hazard" - say "Fall from [HEIGHT] while [ACTIVITY] using [EQUIPMENT] during [CONDITIONS]". Agent 2 uses this to calculate risk scores with OSHA Fatal Four multipliers (Falls ×2.8, Struck-by ×1.6).',
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
                    hint: 'V1 assessed controls: "Control Adequacy Multiplier: Comprehensive (3+ levels of hierarchy): ×0.3, Adequate (2 levels): ×0.7, Minimal (PPE only): ×1.5, None identified: ×3.0". Agent 2 scores risk based on control adequacy. List controls by hierarchy level for each hazard. V1 flagged: "PPE-only approach (should have engineering)" as inadequate.',
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
                    hint: 'V1 assessed: "Working at height with glass installation presents significant fall hazards" and noted "The public must be protected from falling objects". Specify: exact working height, distance to power lines (if applicable), public proximity and protection measures, underground utility locate status (call 811 completion), overhead hazards.',
                    validationRules: [
                        { keyword: 'feet|ft|height', message: 'Include working heights' },
                        { keyword: 'power line|utility|811', message: 'Address utility proximity if applicable' },
                        { keyword: 'public|traffic|pedestrian', message: 'Address public safety if applicable' }
                    ]
                },

                {
                    id: 'weather_monitoring',
                    label: 'Weather Conditions & Monitoring Plan',
                    type: 'textarea',
                    required: true,
                    minLength: 150,
                    placeholder: 'Current conditions: temperature, wind speed, precipitation. Weather monitoring method: onsite anemometer, weather service, weather app? Work stoppage triggers: what wind speed? What temperature extremes? Who monitors? How are workers alerted?...',
                    hint: 'V1 flagged: "Review Wind Speed Limitations: Verify that current and forecasted wind conditions are within the safe operating limits specified by ANSI/IWCA I-14.1 and crane manufacturer recommendations. Establish a clear protocol for stopping work if wind speeds exceed these limits." and "Weather Conditions: Wind, temperature extremes, and precipitation can significantly impact the safety of glass installation, especially at height." Specify current conditions, monitoring equipment, specific thresholds (e.g., "25mph sustained winds = stop work"), and alert protocol.',
                    validationRules: [
                        { keyword: 'wind|temperature|precipitation', message: 'Include current weather conditions' },
                        { keyword: 'mph|degrees|°F', message: 'Include specific measurements' },
                        { keyword: 'anemometer|monitor|alert', message: 'Describe monitoring method and alerts' },
                        { keyword: 'stop|suspend|threshold|limit', message: 'Include work stoppage triggers' }
                    ]
                },

                {
                    id: 'ground_protection',
                    label: 'Ground-Level Protection Systems',
                    type: 'textarea',
                    required: true,
                    minLength: 150,
                    placeholder: 'How are ground-level workers and public protected from falling objects? Barricades type and location? Exclusion zone size? Warning signage? Controlled access? Who monitors the area below? Overhead protection (canopies)?...',
                    hint: 'V1 CRITICAL GAP: "The response for \'Ground Level Protection Systems\' is missing. This is critical. The public must be protected from falling objects and other hazards. Implement barriers, signage, and controlled access zones to prevent unauthorized entry into the work area." and immediate action item: "Ground Level Protection: Barriers, signage, and controlled access zones must be implemented to prevent unauthorized entry into the area below the glass installation." Be specific about barricade type (jersey barriers, fencing), exclusion zone size (minimum distance), signage types, access control methods.',
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
                    hint: 'V1 risk scoring: "Worker Experience Multiplier: Expert (>5 years): ×0.6, Experienced (2-5 years): ×1.0, New (<1 year): ×2.1". Agent 2 adjusts risk probability based on experience. Agent 3 uses this for Swiss Cheese causal chain: "New workers are 2.1× more likely to make errors". Specify experience distribution and any language/communication issues.',
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
                    hint: 'V1 Swiss Cheese Model: "Organizational Influences (Latent Conditions): Schedule Pressure Analysis" and Agent 3 calculates: "Fatigue Risk: if hours > 12 or days > 14: CRITICAL, if hours > 10 or days > 10: HIGH" and adjusts probability: "+ Production pressure: ${overtime !== \'Not specified\' ? \'+20%\' : \'0%\'}". Schedule pressure is a root cause in incident prediction. Be honest about deadlines and overtime.',
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
                    hint: 'V1 Swiss Cheese: "Unsafe Supervision (Active Failures): Competent person designated? Adequate oversight? Hazard recognition training?" and recommended: "Competent Person Designation: Designate a competent person(s) to oversee fall protection, crane operations, and rigging." Document supervisor presence, inspection frequency, toolbox talk schedule.',
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
                    hint: 'V1 Swiss Cheese: "Leading Indicators: Near-Miss: \'Load swung within 3 feet of worker yesterday in similar conditions\'" and "OSHA Pattern Match: similarIncidents, matchConfidence, citationsExpected". Agent 3 uses incident history to increase prediction confidence and identify recurring failure patterns. Document any close calls, equipment issues, or safety concerns - this data is CRITICAL for prediction.',
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
                    hint: 'V1 assessed: "Signal person identified and qualified" for crane operations and recommended: "Review the attached emergency response plan to ensure it includes clear communication protocols". Communication failures are a common Swiss Cheese layer. Document communication methods, crane signal person qualifications, emergency protocol, and how alerts are distributed.',
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
