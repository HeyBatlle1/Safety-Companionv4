/**
 * JHA Test Data Generator
 * 
 * Generates realistic, valid test data for each JHA form card.
 * Each function returns data that passes all validation rules.
 */

// Helper to pick random item from array
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

// Random project names
const projectNames = [
    "Downtown Tower Glass Replacement",
    "Harbor View Condos Curtain Wall",
    "Metro Center Facade Restoration",
    "Skyline Plaza Window Installation",
    "Riverside Office Complex Glazing",
    "Central Station Atrium Glass",
    "Tech Park Building A Renovation",
    "Medical Center Tower Upgrade"
];

// Random locations
const locations = [
    "450 Main Street, Boston MA 02108",
    "123 Harbor Blvd, San Diego CA 92101",
    "789 Michigan Ave, Chicago IL 60611",
    "555 Market Street, San Francisco CA 94105",
    "1200 6th Avenue, New York NY 10036",
    "300 S Grand Ave, Los Angeles CA 90071",
    "100 Congress Ave, Austin TX 78701",
    "500 Pike Street, Seattle WA 98101"
];

// Random supervisor names
const supervisors = [
    "Mike Johnson", "Carlos Martinez", "Sarah Williams",
    "Tom Brown", "David Chen", "Maria Garcia",
    "James Wilson", "Robert Taylor", "Jennifer Davis"
];

const craneOperators = [
    "Carlos Martinez", "David Chen", "Robert Taylor",
    "James Wilson", "Anthony Lopez", "Kevin Park"
];

const riggers = [
    "Sarah Williams", "Tom Brown", "Kevin Park",
    "Anthony Lopez", "Maria Garcia", "Jennifer Davis"
];

// ================================
// CARD 1: Project & Safety Planning
// ================================
export function generateCard1Data(): Record<string, any> {
    const supervisor = pick(supervisors);
    const location = pick(locations);
    const projectName = pick(projectNames);
    const height = pick([80, 100, 120, 150, 180, 200]);
    const crewSize = pick([6, 8, 10, 12]);
    const duration = pick([7, 10, 14, 21, 30]);

    const city = location.split(',')[0];
    const phone1 = `${pick(['617', '312', '415', '212', '310', '512', '206'])}-555-${Math.floor(1000 + Math.random() * 9000)}`;
    const phone2 = `${pick(['617', '312', '415', '212', '310', '512', '206'])}-555-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
        // Structured project details
        project_details: {
            projectName,
            location,
            buildingHeight: height,
            workType: pick([
                'Glass & Glazing Installation',
                'Curtain Wall Installation',
                'Structural Steel Erection',
                'Roofing',
                'General Construction'
            ]),
            duration,
            crewSize,
            supervisor
        },

        // Emergency Response
        emergency_response: `Emergency assembly point is the parking lot at ${city} (east side of building, marked with orange cones). 

Emergency contacts: 
- ${supervisor} (Site Supervisor): ${phone1}
- Fire Department: 911  
- Local Hospital: ${phone2}
- Safety Manager: ${pick(supervisors)} ${phone1.replace('-555-', '-666-')}

First aid kit locations: Job trailer, each floor work area (floors ${Math.floor(height / 20)}-${Math.floor(height / 10)}), and equipment staging area.

Rescue equipment: Tripod rescue system on each active floor, 2 rescue harnesses per crew, Stokes basket in trailer, AED in trailer and floor ${Math.floor(height / 20)}. 

Rescue procedure: Competent rescue person (${pick(riggers)}) trained in suspension trauma protocol. Target rescue time under 6 minutes. All workers trained in self-rescue techniques.`,

        // Competent Persons
        competent_persons: `${supervisor} - OSHA 30, Site Supervisor, Competent Person for Fall Protection, 15 years experience in curtain wall installation.

${pick(craneOperators)} - OSHA 30, NCCCO Certified Tower Crane Operator #${Math.floor(100000 + Math.random() * 900000)}, Competent Person Crane Operations.

${pick(riggers)} - OSHA 10, NCCCO Qualified Rigger #${Math.floor(100000 + Math.random() * 900000)}, certified signal person, 8 years experience.

${pick(supervisors)} - OSHA 30, Competent Person Scaffolding, scaffold erector certification.

All ${crewSize} crew members have current OSHA 10 certification and site-specific fall protection training completed ${pick(['Monday', 'last week', 'December 15th'])}.`,

        // Safety Meetings
        safety_meetings_jha: `Daily toolbox talk held at 6:45 AM today led by ${supervisor}. All ${crewSize} crew members attended and signed the attendance sheet. 

Topics covered today:
- ${pick(['Wind conditions', 'Fall protection', 'Crane operations', 'Glass handling'])} procedures
- ${pick(['Harness inspection', 'Load limits', 'Communication signals', 'Emergency evacuation'])}
- Review of ${pick(['weather forecast', 'lift plan', 'exclusion zones', 'PPE requirements'])}

JHA reviewed with full crew on ${pick(['Monday morning', 'project kickoff', 'December 15th'])}. All workers signed acknowledgment.

Safety concerns raised: ${pick([
            'Swing stage cable showed minor wear - inspected and approved by competent person',
            'Wind gusts forecast for afternoon - will monitor and stop at 25mph',
            'New worker on crew - assigned experienced partner for first week',
            'Pedestrian traffic near staging area - added additional barricades'
        ])}.`,

        // Permits & Compliance
        permits_compliance: `Building permit #BP-2024-${Math.floor(1000 + Math.random() * 9000)} obtained and posted on job trailer.
Crane operation permit from City valid through ${pick(['1/15/2025', '2/28/2025', '3/31/2025'])}.
Hot work permit on file (for welding activities).

OSHA standards reviewed with crew:
- 1926 Subpart M (Fall Protection) - 6ft trigger height, 5000lb anchor requirement
- 1926 Subpart N (Cranes & Derricks) - annual inspection, daily checks, load charts
- 1926 Subpart L (Scaffolding) - competent person inspection requirements
- ANSI/IWCA I-14.1 for suspended platform operations

Company safety record: No OSHA citations in past 3 years. Current EMR: 0.${pick(['85', '92', '88', '95'])}.`
    };
}

// ================================
// CARD 2: Equipment & Materials
// ================================
export function generateCard2Data(): Record<string, any> {
    const craneMfg = pick(['Liebherr', 'Potain', 'Manitowoc', 'Terex']);
    const craneModel = pick(['71 EC-B 5', 'MD 365', '888', 'CTL 140-10']);
    const craneCapacity = pick(['4', '6', '8', '10']);
    const craneInspectionDate = pick(['11/15/2024', '12/01/2024', '12/10/2024']);
    const monthlyInspectionDate = pick(['12/15/2024', '12/18/2024', '12/20/2024']);

    return {
        // Major Equipment
        major_equipment: `Tower Crane - ${craneMfg} ${craneModel}, ${craneCapacity}-ton max capacity at 130ft radius.
- Annual inspection: ${craneInspectionDate} by ABC Crane Inspection
- Monthly inspection: ${monthlyInspectionDate}
- Daily pre-shift inspection by ${pick(craneOperators)}

Spider Crane - Jekko SPX${pick(['532', '424', '650'])}, ${pick(['2.7', '2.4', '5.0'])}-ton capacity, inspected ${monthlyInspectionDate}.

Swing Stage - Spider SC${pick(['1500', '1000', '2000'])}, ${pick(['1500', '1000', '2000'])}lb capacity per platform.
- Inspected ${pick(['12/22/2024', '12/20/2024', '12/18/2024'])}
- ${pick(['2', '3', '4'])} platforms on site

JLG ${pick(['600S', '800S', '460SJ'])} Boom Lift, ${pick(['500', '600', '700'])}lb basket capacity, inspected ${pick(['12/01/2024', '12/05/2024', '12/10/2024'])}.`,

        // Fall Protection PFAS
        fall_protection_pfas: `Full-body harnesses: 3M DBI-SALA ExoFit ${pick(['X300', 'X200', 'NEX'])} for all ${pick([6, 8, 10])} crew members.
- Daily inspection by worker before each use
- Weekly documented inspection by competent person (${pick(supervisors)})
- All harnesses manufactured within past ${pick(['2', '3'])} years

Shock-absorbing lanyards: 3M ${pick(['6ft', '4ft'])} twin-leg with rebar hooks, energy absorber rated for 310lb worker + 50lb tools.

Self-retracting lifelines: DBI-SALA Nano-Lok ${pick(['9ft', '11ft'])} on each swing stage position.

Anchor points: Engineered beam clamps rated 5,000lbs on steel I-beams, certified by structural engineer ${pick(['12/05/2024', '12/10/2024'])}. Anchor locations marked with yellow paint.

100% tie-off policy in effect - dual lanyards required when transitioning.

Rescue plan: Suspension trauma rescue within 6 minutes maximum. Tripod rescue system on each active floor. ${pick(riggers)} is trained rescue competent person. All workers trained in suspension trauma awareness.`,

        // Materials & Storage
        materials_storage: `Glass panels: Insulated glass units (IGU), ${pick(['10ft x 6ft', '8ft x 5ft', '12ft x 8ft'])}, approximately ${pick([350, 450, 550, 650])}lbs each.
Steel mullions: ${pick(['10ft', '12ft', '14ft'])} lengths, averaging ${pick([75, 85, 95])}lbs each.
Aluminum framing: Various lengths up to 20ft.

Storage: A-frame glass racks on level compacted gravel pad (north side of building).
- Racks secured with ratchet straps to ground anchors
- Tarps for weather protection
- ${pick(['50ft', '40ft', '30ft'])} exclusion zone around storage area with chain-link fencing

Caulk, sealants, and adhesives stored in climate-controlled job trailer.
All MSDS/SDS sheets on file and accessible.
Flammables cabinet for solvents.`,

        // PPE Requirements
        ppe_requirements: `Hard hats: MSA V-Gard ${pick(['Type I Class E', 'Type II Class E'])}, chin straps required above 50ft.

Safety glasses: 3M SecureFit ANSI Z87.1+ rated, anti-fog. Side shields required.

Cut-resistant gloves: Mechanix ${pick(['CutResist A4', 'Orhlon Knit A5'])} Level for all glass handling.

High-vis vests: ANSI 107 Class ${pick(['2', '3'])} for all workers on site at all times.

Steel-toe boots: ASTM F2413-18 rated, ankle support required.

Fall protection: Full-body harness as described above, required for all work above 6ft.

Hearing protection: 3M E-A-R plugs NRR ${pick(['29dB', '32dB'])} for crane operations and power tools.

${pick(['Face shields required when grinding', 'Welding hoods for all welding operations', 'Respirators available for dusty conditions'])}.`,

        // Equipment Certifications
        equipment_certifications: `Crane operator: ${pick(craneOperators)}, NCCCO Certified TLL (Tower Crane) #${Math.floor(100000 + Math.random() * 900000)}.
Certification valid through ${pick(['8/2025', '10/2025', '12/2025'])}.

Signal person: ${pick(riggers)}, NCCCO Certified Signal Person #${Math.floor(100000 + Math.random() * 900000)}.

Qualified riggers: ${pick(riggers)} - NCCCO Qualified Rigger #${Math.floor(100000 + Math.random() * 900000)}.
${pick(riggers)} - NCCCO Qualified Rigger #${Math.floor(100000 + Math.random() * 900000)}.

Load charts: ${craneMfg} ${craneModel} load chart posted in crane cab and in job trailer.
Reviewed daily before operations with crane operator.
Critical lift plan on file for glass panel lifts.

All lifts pre-planned - heaviest lift is ${pick([450, 550, 650])}lb glass panel at ${pick([85, 95, 105])}ft radius (within ${pick(['60%', '65%', '70%'])} of rated capacity at that radius).`
    };
}

// ================================
// CARD 3: Hazards & Controls  
// ================================
export function generateCard3Data(): Record<string, any> {
    const height = pick([80, 100, 120, 150]);
    const panelWeight = pick([350, 450, 550]);
    const panelSize = pick(['10ft x 6ft', '8ft x 5ft', '12ft x 8ft']);

    return {
        // Top 3 Hazards
        top_three_hazards: `1. FALL FROM HEIGHT - Workers on swing stage at ${height}ft while positioning and installing ${panelSize} glass panels (${panelWeight}lbs). Risk: Worker loses balance during panel positioning, leans over guardrail to adjust panel, or is struck by swinging load and knocked off platform.

2. STRUCK-BY FALLING OBJECT - Glass panel drops during tower crane lift due to rigging failure, wind gust, or suction cup failure. Workers below or at adjacent levels struck by ${panelWeight}lb panel or broken glass. Secondary risk: tools/equipment dropped from height.

3. CRUSHING/PINCH POINTS - Glass panel slips during installation and crushes worker hands, fingers, or feet against frame or building structure. Panels being maneuvered in tight spaces with limited escape routes. Weight of ${panelWeight}lbs can cause severe crushing injuries.`,

        // Existing Controls
        existing_controls: `HAZARD 1 (Fall from height):
Engineering - Swing stage guardrails on all sides (42" top rail, 21" mid rail, 4" toe board). Fall arrest anchor points at each worker station. Wind break tarps.
Administrative - 25mph sustained wind = work stop. Daily equipment inspection. Toolbox talks. Zone restriction below work.
PPE - Full-body harness with shock-absorbing lanyard to overhead anchor. 100% tie-off policy. Dual lanyards for transitions.

HAZARD 2 (Struck-by):
Engineering - Tag lines on ALL crane loads (minimum 2 per load). Exclusion zone below with barriers. Debris netting at floors ${Math.floor(height / 40)}, ${Math.floor(height / 25)}, ${Math.floor(height / 15)}.
Administrative - Pre-lift meeting for every pick. Lift plan review. Signal person required. No personnel under load EVER. Ground-level safety watch with air horn.
PPE - Hard hats mandatory in exclusion zone. Steel-toe boots.

HAZARD 3 (Crushing):
Engineering - Suction cup lifters rated 2x panel weight. Panel cart for staging. Mechanical assist for all moves. Anti-tip A-frame storage.
Administrative - Two-person minimum for all glass handling. Clear escape routes. Verbal warnings before moves.
PPE - Cut-resistant A4 gloves. Steel-toe boots. No loose clothing.`,

        // Work Environment
        work_environment: `Working heights: ${height} feet (floors ${Math.floor(height / 15)} through ${Math.floor(height / 10)}) on building exterior.

Power lines: Nearest overhead utility is ${pick(['>100ft', '75ft', '200ft'])} from work zone. Tower crane swing radius verified clear by surveyor.

Underground utilities: 811 locate completed ${pick(['12/15/2024', '12/10/2024', '12/05/2024'])}. Gas, electric, telecom marked. No conflicts in staging area.

Public areas: 
- Sidewalk on ${pick(['east', 'west'])} side ${pick([25, 30, 40])}ft from building - protected by ${pick(['8ft chain-link fence and overhead canopy', 'jersey barriers and covered walkway'])}
- ${pick(['Active street traffic controlled by flaggers during crane operations', 'No active traffic concerns - site fully fenced'])}

Adjacent structures:
- Occupied building ${pick([40, 50, 60])}ft ${pick(['west', 'east', 'north'])} - windows have protective film, occupants notified
- ${pick(['Parking structure 30ft south - upper deck closed during lifts', 'Green space 50ft north - no restrictions'])}`,

        // Ground Protection
        ground_protection: `Exclusion zone: ${pick([50, 60, 75])}ft perimeter around building with ${pick(['6ft', '8ft'])} chain-link fencing and jersey barriers at vehicle access points.

Warning signs posted every ${pick([20, 25, 30])}ft:
- "DANGER - Overhead Work - Hard Hat Zone"
- "Authorized Personnel Only"
- "Falling Object Hazard"

Debris protection: Debris netting installed at floors ${Math.floor(height / 40)}, ${Math.floor(height / 25)}, and ${Math.floor(height / 15)} to catch dropped materials/tools.

Safety watch: Full-time ground monitor (${pick(supervisors)}) with air horn during all crane operations. Radio communication with crew above.

Pedestrian protection: ${pick(['Covered walkway on east sidewalk rated for 150lbs/sqft impact', 'East sidewalk closed with pedestrian detour signs', '8ft plywood covered walkway with signage'])}.

Vehicle access: Single controlled entry point with ${pick(['flagman', 'security guard'])}. All vehicles must display authorized sticker.`
    };
}

// ================================
// CARD 4: Crew & Schedule
// ================================
export function generateCard4Data(): Record<string, any> {
    const crewSize = pick([6, 8, 10]);
    const experienced = Math.floor(crewSize * 0.4);
    const midLevel = Math.floor(crewSize * 0.4);
    const newbie = crewSize - experienced - midLevel;

    return {
        // Crew Experience
        crew_experience: `${crewSize}-person crew. Experience breakdown:

Highly experienced (>10 years): ${experienced} workers
- ${pick(supervisors)} - 15 years curtain wall, supervisor
- ${pick(craneOperators)} - 12 years, crane operator
${experienced > 2 ? `- ${pick(riggers)} - 10 years, lead rigger\n` : ''}
Mid-level (3-5 years): ${midLevel} workers
- Glass installers with similar high-rise project experience

New workers (<1 year): ${newbie} worker(s)
- Assigned to ground-level material handling only
- Paired with experienced worker at all times
- NOT assigned to elevated work

Specialized skills:
- ${pick(craneOperators)}: NCCCO tower crane operator
- ${pick(riggers)}: Qualified rigger and signal person
- ${pick(supervisors)}: Competent person fall protection & scaffolding

Language: All crew members English-speaking. Daily safety briefings in English.`,

        // Schedule Pressure
        schedule_pressure: `Currently ${pick(['on schedule', '2 days ahead of schedule', 'slightly behind but recoverable'])}.

Work hours: Standard ${pick(['8', '10'])}-hour days (${pick(['7AM-3:30PM', '6AM-4:30PM'])}).
${pick(['No overtime currently planned.', 'Occasional 10-hour days if weather delays occur.'])}

Rest schedule: Workers have had ${pick(['2', '3'])} days off in last 7 days (weekend).
Maximum consecutive work days: ${pick(['5', '6'])}.

Upcoming deadline: Building enclosure milestone ${pick(['1/15/2025', '1/31/2025', '2/15/2025'])}.
- ${pick(['No contractual penalties for reasonable delays', 'Owner flexible on timeline', 'Weather contingency days built into schedule'])}
- ${pick(['Not rushing - safety is priority', 'Will extend hours only if safe conditions exist'])}

Fatigue management: ${pick(['Mandatory break every 2 hours', '2 x 15min breaks plus 30min lunch', 'Hydration station on each floor'])}.`,

        // Supervision & Oversight
        supervision_oversight: `Site supervisor: ${pick(supervisors)} - present 100% of work hours.
Competent person: ${pick(supervisors)} (fall protection, scaffolding).
Competent person: ${pick(craneOperators)} (crane operations).

Safety inspections:
- Pre-shift inspection at 6:30 AM by competent person
- Mid-day inspection at 11:00 AM
- End-of-shift inspection at 3:00 PM
- All inspections documented in safety log

Toolbox talks: Daily at 6:45 AM led by ${pick(supervisors)}.
Topics rotate based on day's activities.
Attendance signed by all workers.

Weekly safety audit: Every Friday by company safety manager.
Monthly third-party audit by insurance carrier.

Incident reporting: All near-misses reported immediately. No retaliation policy. Stop-work authority for all workers.`,

        // Incident History
        incident_history: `Near-misses (this project):
- ${pick(['12/20/2024', '12/18/2024', '12/15/2024'])}: Glass panel swung ${pick(['4', '3', '5'])} feet toward worker during lift when wind gusted to ${pick([22, 20, 25])}mph.
  * Response: Immediately stopped operations, reviewed lift plan with crew, added second tag line requirement
  * Root cause: Single tag line insufficient in gusty conditions
  
No injuries on this project (${pick([15, 20, 25])} days in).

Previous project history (company-wide, past 12 months):
- ${pick(['2', '1', '3'])} first-aid only incidents (minor cuts, bandaged on site)
- 0 recordable injuries
- 0 lost time injuries
- 0 OSHA citations

Safety concerns raised by crew:
- ${pick(['Swing stage cable wear noted - replaced 12/22', 'Ice on platform in morning - added ice melt protocol', 'Radio batteries weak - replaced all units'])}.`,

        // Communication & Coordination
        communication_coordination: `Radios: Motorola ${pick(['T800', 'T600', 'CP200d'])} two-way radios for all crew.
- Channel 1: Normal operations
- Channel 2: Emergencies only
- Channel 3: Crane operations
- Radio check every morning at 6:45 AM

Signal person: ${pick(riggers)} - NCCCO certified, uses OSHA standard hand signals.
Voice communication via radio when visual signals insufficient.

Weather alerts: ${pick(supervisors)} monitors weather.com and WeatherBug hourly.
Text alerts sent to all crew phones if conditions changing.
Anemometer on top floor reads real-time wind speed.

Emergency signals:
- 3 long air horn blasts = evacuate to assembly point
- 1 long blast = ALL STOP
- Radio code "${pick(['Code Red', 'Priority Alpha', 'Emergency Emergency'])}" = immediate medical emergency

Shift handoff: ${pick(['N/A - single shift only', 'Full briefing between day and night shift leads'])}.`
    };
}

// ================================
// FILL ALL CARDS AT ONCE
// ================================
export function generateAllTestData(): Record<string, any> {
    return {
        ...generateCard1Data(),
        ...generateCard2Data(),
        ...generateCard3Data(),
        ...generateCard4Data()
    };
}

// ================================
// CARD-SPECIFIC FILL FUNCTIONS
// ================================
export const testDataGenerators = {
    0: generateCard1Data,
    1: generateCard2Data,
    2: generateCard3Data,
    3: generateCard4Data
} as const;
