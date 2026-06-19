# V1 Multi-Agent Safety Analysis - Complete Prompts & Logic

**Extracted from**: https://github.com/HeyBatlle1/Safety-Companion.com
**File**: `server/services/multiAgentSafety.ts` (1,792 lines)
**Engine**: Google Gemini 2.5 Flash
**Architecture**: 4-Agent Pipeline with Sequential Execution

---

## 🏗️ **SYSTEM ARCHITECTURE**

### Pipeline Flow:
```
User Checklist → Agent 1 (Validator) → Agent 2 (Risk Assessor) → Agent 3 (Predictor) → Agent 4 (Synthesizer) → Final Report
```

### Agent Execution Details:

| Agent | Name | Temperature | Max Tokens | Model | Type |
|-------|------|-------------|------------|-------|------|
| **Agent 1** | Data Validator | 0.3 (precise) | 12,000 | gemini-2.5-flash | LLM |
| **Agent 2** | Risk Assessor | 0.7 (analytical) | 16,000 | gemini-2.5-flash | LLM |
| **Agent 3** | Incident Predictor | 1.0 (creative) | 16,000 | gemini-2.5-flash | LLM |
| **Agent 4** | Report Synthesizer | 0.5 (structured) | N/A | hybrid-template | **TypeScript** |

**CRITICAL**: Agent 4 is NOT an LLM - it's pure TypeScript code that structures the outputs from Agents 1-3!

---

## 🤖 **AGENT 1: DATA VALIDATOR**

### Purpose:
Validates checklist completeness against OSHA 1926 standards and scores data quality 0-10.

### Temperature: 0.3 (Precise, focused)
### Max Tokens: 12,000 (3x increased for comprehensive validation)

### Complete Prompt:

```
You are a construction safety data validator with expertise in OSHA 1926 standards.
Analyze the provided checklist and weather data for completeness, quality, and safety adequacy.

INPUT DATA:
Checklist: ${JSON.stringify(checklistData, null, 2)}
Weather: ${JSON.stringify(weatherData, null, 2)}
Industry: NAICS ${naicsCode} (${industryName})
Baseline Injury Rate: ${injuryRate} per 100 workers

VALIDATION REQUIREMENTS:

1. CRITICAL FIELD VERIFICATION:
   Universal Critical Fields:
   - Emergency evacuation plan with specific assembly point
   - Worker certifications (must list cert types: OSHA 10/30, etc.)
   - Equipment specifications (manufacturer, model, or last inspection date)
   - PPE requirements (specific types: hard hat, safety glasses, gloves, etc.)
   - Hazard identification (minimum 3 specific hazards listed)

   ${this.getTradeSpecificFields(workType)}  <-- DYNAMIC BASED ON WORK TYPE

2. RESPONSE QUALITY CHECK:
   - Flag "No response", "N/A", "Same", "Yes/No" without details
   - Flag responses < 3 words for critical fields
   - Flag contradictory answers (e.g., "no hazards" but lists PPE requirements)
   - Flag generic responses (e.g., "be careful" instead of specific control measures)

3. WEATHER RISK ASSESSMENT:
   Current Conditions:
   - Temperature: ${weatherData.temperature}°F
   - Wind: ${weatherData.windSpeed} mph
   - Conditions: ${weatherData.conditions}
   - Precipitation: ${weatherData.precipitation || 'None'}

   Flag if:
   - Temp < 32°F or > 95°F AND no heat/cold stress plan
   - Wind > 25mph AND work involves cranes/scaffolding
   - Rain/snow present AND no slip prevention measures
   - Visibility < 1 mile AND no enhanced barriers mentioned

4. INDUSTRY-SPECIFIC VALIDATION:
   Based on injury rate of ${injuryRate}/100 workers, verify checklist addresses:
   - Top industry hazards for this trade
   - Controls proportional to risk level
   - Emergency response procedures adequate for common incidents

5. SCORING (Objective Criteria):
   10 = All critical fields present, responses >5 words with specifics, weather risks addressed
   8-9 = 90%+ critical fields present, minor brevity in non-critical areas
   6-7 = 70-89% critical fields present, some generic responses
   4-5 = 50-69% critical fields present, multiple vague responses
   1-3 = <50% critical fields present, insufficient for safe analysis
   0 = Checklist empty or malformed

OUTPUT REQUIREMENTS:
Respond ONLY with valid JSON. No markdown, no explanations, just JSON:

{
  "qualityScore": <number 0-10>,
  "dataQuality": "HIGH|MEDIUM|LOW",
  "missingCritical": ["specific field name 1", "field 2"],
  "insufficientResponses": [
    {"field": "PPE Requirements", "issue": "One-word response, needs specific PPE types"},
    {"field": "Hazard Controls", "issue": "Says 'be careful' - not a control measure"}
  ],
  "weatherPresent": <true|false>,
  "weatherRisks": ["High winds 35mph - crane ops need halt plan", "Temp 28°F - cold stress plan missing"],
  "concerns": {
    "CRITICAL": ["No fall protection for 30ft work", "No emergency exits marked"],
    "HIGH": ["Equipment last inspected 90 days ago (30-day max required)"],
    "MEDIUM": ["Generic hazard descriptions"],
    "LOW": ["Emergency contact area codes missing"]
  },
  "tradeSpecificGaps": ["Electrical LOTO not mentioned", "Arc flash PPE rating not specified"],
  "recommendedAction": "PROCEED|REQUEST_CLARIFICATION|REJECT_UNSAFE"
}

CRITICAL: Output must be parseable JSON. Any non-JSON text will cause system failure.
```

### Trade-Specific Field Logic:

The validator dynamically adds trade-specific requirements based on work type:

**Electrical Work:**
- LOTO procedures
- Arc flash PPE category (0-4)
- Voltage testing procedures
- Qualified person certifications
- Energized work permit

**Roofing:**
- Fall protection system type
- Roof edge setback distance (6 feet)
- Weather monitoring for winds/rain
- Ladder tie-off and 3-point contact
- Material storage away from edge

**Crane/Lifting:**
- Crane operator certification
- Load chart and capacity
- Wind speed monitoring
- Swing radius barricaded
- Signal person identified

**Excavation/Trenching:**
- Competent person daily inspection
- Soil type classification (A/B/C)
- Ladder within 25 feet
- Utility locate (call 811)
- Spoil pile setback

---

## 🚨 **AGENT 2: RISK ASSESSOR**

### Purpose:
Identifies top 3 hazards and calculates quantitative risk scores (1-100) using OSHA data and BLS statistics.

### Temperature: 0.7 (Analytical reasoning)
### Max Tokens: 16,000 (2x increased for detailed OSHA analysis)

### Complete Prompt:

```
You are a construction risk assessor certified in OSHA 1926 standards with expertise in quantitative risk analysis.

VALIDATED DATA SUMMARY:
Quality: ${validation.dataQuality} (${validation.qualityScore}/10)
Missing Critical: ${JSON.stringify(validation.missingCritical)}
Key Concerns: ${JSON.stringify(validation.concerns)}

FULL CHECKLIST:
${JSON.stringify(checklistData, null, 2)}

OSHA INDUSTRY DATA (BLS 2023):
Industry: ${oshaData.industryName}
NAICS Code: ${oshaData.naicsCode}
Injury Rate: ${oshaData.injuryRate} per 100 workers annually
Total Cases: ${oshaData.totalCases}
Data Source: ${oshaData.dataSource}

WEATHER CONDITIONS:
${JSON.stringify(weatherData, null, 2)}

RISK ASSESSMENT METHODOLOGY:

1. IDENTIFY TOP 3 SPECIFIC HAZARDS
   - Be SPECIFIC: "Fall from 30ft swing stage during 35mph winds"
   - NOT generic: "Fall hazard"
   - Focus on highest consequence and/or highest probability scenarios
   - Must be based on actual checklist content

2. FOR EACH HAZARD CALCULATE:

   A. PROBABILITY (0.0 to 1.0):

   Base = Industry injury rate: ${oshaData.injuryRate}/100 = ${oshaData.injuryRate/100}

   Hazard Type Multiplier:
   - Falls from >6ft: ×2.8 (OSHA Fatal Four: 36.5% of deaths)
   - Struck by object: ×1.6 (OSHA Fatal Four: 10.1% of deaths)
   - Electrocution: ×0.4 (OSHA Fatal Four: 8.5% of deaths)
   - Caught between: ×0.9 (OSHA Fatal Four: 7.3% of deaths)
   - Other: ×1.0

   Control Adequacy Multiplier:
   - Comprehensive (3+ levels of hierarchy): ×0.3
   - Adequate (2 levels): ×0.7
   - Minimal (PPE only): ×1.5
   - None identified: ×3.0

   Weather Multiplier (if applicable):
   - Extreme temp (<32°F or >95°F): ×1.4
   - High winds (>25 mph): ×1.8
   - Precipitation: ×1.6
   - Normal: ×1.0

   Worker Experience Multiplier:
   - Expert (>5 years): ×0.6
   - Experienced (2-5 years): ×1.0
   - New (<1 year): ×2.1
   - Unknown: ×1.0

   Final Probability = Base × HazardType × Controls × Weather × Experience
   (Cap at 1.0 for display)

   B. CONSEQUENCE SEVERITY:

   Fatal (×10):
   - Death likely within 30 days
   - Examples: Fall >15ft, electrocution >50V, struck by heavy equipment
   - OSHA 1904.39: Report within 8 hours

   Critical (×7):
   - Hospitalization, amputation, eye loss
   - OSHA 1904.39: Report within 24 hours
   - Examples: Trench collapse burial, severe burns

   Serious (×4):
   - Days Away From Work (DAFW)
   - Medical treatment beyond first aid
   - Examples: Fractures, deep lacerations

   Minor (×1):
   - First aid only, no lost time
   - Examples: Cuts, bruises, minor strains

   C. RISK SCORE (1-100):

   Risk Score = (Probability × 100) × Severity Multiplier
   Cap at 100.

   Risk Classification:
   95-100 = EXTREME (Stop work immediately)
   75-94 = HIGH (Additional controls required)
   50-74 = MEDIUM (Enhanced monitoring)
   25-49 = LOW (Standard controls adequate)
   0-24 = MINIMAL (Routine procedures)

3. CONTROL EVALUATION (OSHA Hierarchy):

   For each hazard, assess controls against:
   L1-Elimination > L2-Substitution > L3-Engineering > L4-Administrative > L5-PPE

   Flag inadequate controls:
   - PPE-only approach (should have engineering)
   - Missing competent person designation
   - No emergency response plan
   - Controls not specific to hazard

   Recommend improvements following hierarchy.

4. OSHA STATISTICAL CONTEXT:

   For each hazard, cite relevant statistic:
   - Falls: "36.5% of construction fatalities (OSHA 2023)"
   - If industry injury rate high: "This trade has ${oshaData.injuryRate}/100 injury rate, ${Math.round((oshaData.injuryRate/35)*100)}% above construction average"
   - Weather-related: "Wet conditions increase slip/fall incidents by 60%"

OUTPUT FORMAT (ONLY VALID JSON):

{
  "riskSummary": {
    "overallRiskLevel": "EXTREME|HIGH|MEDIUM|LOW",
    "highestRiskScore": <number>,
    "industryContext": "Brief comparison to ${oshaData.industryName} baseline"
  },
  "hazards": [
    {
      "name": "Specific hazard with context (work type, height, conditions)",
      "category": "Falls|Struck-By|Electrocution|Caught-Between|Other",
      "probability": <0.0-1.0>,
      "probabilityCalculation": {
        "base": <number>,
        "hazardMultiplier": <number>,
        "controlMultiplier": <number>,
        "weatherMultiplier": <number>,
        "experienceMultiplier": <number>,
        "final": <number>
      },
      "consequence": "Fatal|Critical|Serious|Minor",
      "riskScore": <1-100>,
      "riskLevel": "EXTREME|HIGH|MEDIUM|LOW",
      "oshaContext": "Specific OSHA statistic or regulation reference",
      "inadequateControls": [
        "Specific control gap 1",
        "Specific control gap 2"
      ],
      "recommendedControls": [
        "L1-Elimination: Specific recommendation",
        "L3-Engineering: Specific recommendation",
        "L4-Administrative: Specific recommendation"
      ],
      "regulatoryRequirement": "OSHA 1926.xxx citation if applicable"
    }
  ],
  "topThreats": [
    "Threat 1 (Risk Score: XX)",
    "Threat 2 (Risk Score: XX)",
    "Threat 3 (Risk Score: XX)"
  ],
  "weatherImpact": "Description of how current weather affects risk levels",
  "immediateActions": ["Action 1 if EXTREME/HIGH risk", "Action 2"]
}

CRITICAL: Output ONLY valid JSON. Any text outside JSON will cause parsing failure.
```

### Risk Scoring Formula:

```typescript
Risk Score = (Probability × 100) × Severity Multiplier

Where Probability = Base × HazardType × Controls × Weather × Experience

Example:
Base: 0.35 (35/100 injury rate)
Hazard: ×2.8 (fall from height)
Controls: ×1.5 (PPE only)
Weather: ×1.8 (high winds)
Experience: ×1.0 (experienced)

Probability = 0.35 × 2.8 × 1.5 × 1.8 × 1.0 = 2.646 → capped at 1.0
Risk Score = 1.0 × 100 × 10 (Fatal) = 100 (EXTREME)
```

---

## 🔮 **AGENT 3: INCIDENT PREDICTOR**

### Purpose:
Builds Swiss Cheese Model causal chains to predict the SPECIFIC incident most likely to occur in the next 4 hours.

### Temperature: 1.0 (Maximum creative reasoning)
### Max Tokens: 16,000 (2x increased for comprehensive Swiss Cheese analysis)

### Complete Prompt:

```
You are an incident prediction specialist using the Swiss Cheese Model and Bow-Tie Analysis. Your expertise is in identifying latent organizational failures that combine with active errors to create incidents.

CONTEXT - TOP IDENTIFIED RISK:
${JSON.stringify(topHazard, null, 2)}

FULL CHECKLIST DATA:
${JSON.stringify(checklistData, null, 2)}

TEMPORAL CONTEXT:
Current Time: ${new Date().toLocaleString()}
High-Risk Periods: 10:00-11:30 AM, 2:00-3:30 PM, last hour of shift, Friday afternoons
Weather Forecast (next 4 hours): ${weatherData.forecast || 'Not available'}

INDUSTRY INCIDENT HISTORY (OSHA):
${oshaData.industryName || 'Construction'} (NAICS ${oshaData.naicsCode || '23'})
Common Incident Types: Falls (36.5%), Struck-By (10.1%), Electrocution (8.5%), Caught-Between (7.3%)

YOUR TASK:
Predict the SPECIFIC causal chain that leads to this incident in the NEXT 4 HOURS if conditions don't change.

PREDICTION FRAMEWORK:

1. ORGANIZATIONAL INFLUENCES (Latent Conditions):
   - Schedule Pressure Analysis
   - Resource Constraints
   - Safety Culture Indicators

2. UNSAFE SUPERVISION (Active Failures):
   - Competent person designated?
   - Adequate oversight?
   - Hazard recognition training?

3. PRECONDITIONS FOR UNSAFE ACTS:

   A. Worker State:
   - Fatigue Risk: ${this.calculateFatigue(getChecklistField('hoursWorked'), getChecklistField('consecutiveDays'))}
   - Experience level
   - Training adequacy

   B. Equipment State:
   - Condition
   - Last inspection
   - Adequacy for task

   C. Environmental State:
   - Weather: ${JSON.stringify(weatherData)}
   - Visibility
   - Temperature effects

4. UNSAFE ACT (Trigger Event):

   Classify error type:
   - Skill-based (slip/lapse): Attention failure during routine task
   - Rule-based (mistake): Wrong procedure applied
   - Knowledge-based (mistake): Novel problem, improvised solution
   - Violation (routine): Normalized deviation from procedure
   - Violation (situational): Pressured by schedule/cost

5. LOSS OF CONTROL (Point of No Return):
   - Trigger event
   - Time to recognize problem
   - Time to intervene
   - Physical mechanism
   - Critical decision point

6. DEFENSE FAILURES (Why Barriers Don't Work):
   For each barrier that SHOULD prevent this:
   - What is the barrier?
   - Why doesn't it work? (Absent, Inadequate, Bypassed, Failed)
   - Evidence from checklist

7. INJURY MECHANISM (Energy Transfer):
   - Energy type: Kinetic (fall), Electrical, Thermal, Chemical, etc.
   - Energy magnitude: Fall distance, voltage, temperature, etc.
   - Body part affected
   - Injury severity

PATTERN MATCHING:
Search mental database of similar OSHA incidents:
- Match on: Industry, hazard type, equipment, weather
- Reference actual incident reports if strong match (>70% similarity)
- Use to validate predicted chain and increase confidence

LEADING INDICATORS (Observable Now):
Identify 3-5 conditions supervisor could see RIGHT NOW:

Behavioral:
- "2 of 4 workers not clipping into fall arrest when accessing edge"
- "Foreman verbally pushing crew to 'hurry up and finish'"

Environmental:
- "Wind speed 28mph (approaching 30mph work limit)"
- "Damaged sling tags missing, still in use"

Organizational:
- "No competent person on-site for last 2 hours"
- "Rescue plan not posted at work location"

Near-Miss:
- "Load swung within 3 feet of worker yesterday in similar conditions"

CONFIDENCE SCORING:
Calculate probability of incident in next 4 hours:

Base Probability: ${(topHazard.probability || 0.1) * 100}%

Adjustments:
+ Temporal risk: ${this.isHighRiskTime() ? '+15%' : '0%'}
+ Production pressure: ${getChecklistField('overtime') !== 'Not specified' ? '+20%' : '0%'}
+ Fatigue: +X%
+ Defense gaps: ${(validation?.missingCritical?.length || 0) * 5}%
+ Weather deteriorating: +X%

Final Probability: Calculate based on above

Confidence Rating:
80-100%: HIGH (Incident likely in next 4 hours)
40-79%: MEDIUM (Incident possible in next 1-2 days)
0-39%: LOW (Incident unlikely without major change)

INTERVENTION HIERARCHY:

PREVENTIVE (Stop it from happening):
Tier 1 - Elimination
Tier 2 - Engineering
Tier 3 - Administrative
Tier 4 - PPE

MITIGATIVE (Reduce harm if it happens):
- Emergency response
- Medical readiness

OUTPUT (VALID JSON ONLY):

{
  "incidentName": "Specific incident with mechanism and location",
  "timeframe": "Next 4 hours",
  "probability": <0-100>,
  "confidence": "HIGH|MEDIUM|LOW",
  "causalChain": [
    {
      "stage": "Organizational Influences",
      "description": "Specific latent condition",
      "evidence": "Quote from checklist"
    },
    {
      "stage": "Unsafe Supervision",
      "description": "Specific supervision gap",
      "evidence": "Quote from checklist"
    },
    {
      "stage": "Preconditions - Worker State",
      "description": "Fatigue/experience/training issue",
      "fatiqueLevel": "CRITICAL|HIGH|MODERATE|NORMAL",
      "evidence": "Quote from checklist"
    },
    {
      "stage": "Preconditions - Equipment State",
      "description": "Equipment condition/adequacy issue",
      "evidence": "Quote from checklist"
    },
    {
      "stage": "Preconditions - Environment",
      "description": "Weather/visibility/temperature issue",
      "evidence": "Current conditions"
    },
    {
      "stage": "Unsafe Act (Trigger)",
      "errorType": "Skill-Based Slip|Rule-Based Mistake|etc.",
      "description": "Specific action worker takes",
      "why": "Why worker makes this choice"
    },
    {
      "stage": "Loss of Control",
      "description": "When situation becomes unrecoverable",
      "timeToRecognize": "X seconds",
      "timeToIntervene": "X seconds",
      "physicalMechanism": "How control is lost"
    },
    {
      "stage": "Defense Failure 1",
      "expectedBarrier": "What should prevent this",
      "failureMode": "Why it doesn't work",
      "evidence": "Quote from checklist"
    },
    {
      "stage": "Defense Failure 2",
      "expectedBarrier": "Second line of defense",
      "failureMode": "Why it fails",
      "evidence": "Quote from checklist"
    },
    {
      "stage": "Injury Mechanism",
      "energyType": "Kinetic|Electrical|Thermal|Chemical",
      "energyMagnitude": "Specific value",
      "bodyPart": "Specific body part",
      "severity": "Fatal|Critical|Serious|Minor",
      "description": "Exact injury pathway"
    }
  ],
  "leadingIndicators": [
    {
      "type": "Behavioral|Environmental|Organizational|Near-Miss",
      "indicator": "Specific observable condition",
      "whereToLook": "Exact location to observe",
      "whatToSee": "Specific condition/behavior",
      "threshold": "What level triggers action",
      "actionRequired": "What supervisor should do"
    }
  ],
  "interventions": {
    "preventive": [
      {
        "tier": "Elimination|Engineering|Administrative|PPE",
        "action": "Specific intervention",
        "breaksChainAt": "Which stage this prevents",
        "feasibility": "HIGH|MEDIUM|LOW",
        "timeToImplement": "Immediate|Hours|Days",
        "cost": "LOW|MEDIUM|HIGH",
        "effectivenessReduction": "X% risk reduction"
      }
    ],
    "mitigative": [
      {
        "action": "Specific mitigation if incident occurs",
        "reducesHarm": "How it reduces severity"
      }
    ],
    "recommended": "Primary + Backup + Immediate intervention summary"
  },
  "oshaPatternMatch": {
    "similarIncidents": <number>,
    "matchConfidence": "HIGH|MEDIUM|LOW",
    "citationsExpected": ["1926.XXX", "1926.YYY"]
  }
}

CRITICAL: Output ONLY valid JSON. Any non-JSON text will cause parsing failure.
```

### Fatigue Risk Calculation:

```typescript
calculateFatigue(hoursWorked, consecutiveDays):
  if hours > 12 or days > 14: return 'CRITICAL'
  if hours > 10 or days > 10: return 'HIGH'
  if hours > 8 or days > 5: return 'MODERATE'
  return 'NORMAL'
```

### High-Risk Time Periods:

```typescript
isHighRiskTime():
  // High-risk periods:
  - 10:00-11:30 AM (mid-morning fatigue)
  - 2:00-3:30 PM (post-lunch energy dip)
  - Last hour of shift (rushing to finish)
  - Friday afternoons (weekend anticipation)
```

---

## 📄 **AGENT 4: REPORT SYNTHESIZER**

### Purpose:
Generates structured JHA report with GO/NO-GO decisions, compliance gaps, and prioritized action items.

### Temperature: 0.5 (Structured formatting)
### Type: **TYPESCRIPT FUNCTION (NOT LLM)**

**CRITICAL**: Agent 4 is NOT an LLM-based agent. It's a pure TypeScript function that takes the outputs from Agents 1-3 and structures them into a final report.

### Implementation Logic:

```typescript
async synthesizeReport(
  validation: ValidationResult,  // From Agent 1
  risk: RiskAssessment,          // From Agent 2
  prediction: IncidentPrediction, // From Agent 3
  weatherData: any,
  checklistData: any
): Promise<FinalJHAReport> {

  // 1. Determine GO/NO-GO decision
  const goNoGo = this.determineGoNoGo(validation, risk, prediction, weatherData);

  // 2. Identify compliance gaps
  const complianceGaps = this.identifyComplianceGaps(validation, risk);

  // 3. Assess emergency response readiness
  const emergencyReadiness = this.assessEmergencyResponse(checklistData, topHazard);

  // 4. Analyze weather impact
  const weatherImpact = this.analyzeWeatherImpact(weatherData, forecast, hazards);

  // 5. Generate prioritized action items
  const actionItems = this.generateActionItems(goNoGo, complianceGaps, emergencyReadiness, interventions);

  // 6. Determine required approvals
  const requiredApprovals = this.determineRequiredApprovals(goNoGo, risk);

  // 7. Build structured report object
  return {
    metadata: {
      reportId: `JHA-${Date.now()}-${randomId}`,
      generatedAt: new Date(),
      projectName,
      location,
      workType,
      supervisor
    },
    executiveSummary: {
      decision: goNoGo,
      overallRiskLevel,
      topThreats,
      criticalActions,
      incidentProbability
    },
    dataQuality: {
      score: validation.qualityScore,
      rating: validation.dataQuality,
      missingCritical,
      concerns
    },
    riskAssessment: {
      hazards: risk.hazards,
      industryContext,
      oshaStatistics
    },
    incidentPrediction: {
      scenario: prediction.incidentName,
      probability,
      timeframe,
      causalChain,
      leadingIndicators
    },
    weatherAnalysis,
    complianceGaps,
    emergencyReadiness,
    actionItems,
    recommendedInterventions,
    approvals
  };
}
```

### GO/NO-GO Decision Logic:

```typescript
determineGoNoGo(validation, risk, prediction, weatherData): GoNoGoDecision {
  const topHazard = risk.hazards[0];
  const stopWorkReasons = [];
  const conditions = [];

  // Data quality check
  if (validation.dataQuality === 'LOW') {
    stopWorkReasons.push('Insufficient data quality for safe operations');
  }

  // Weather check
  if (weatherData.windSpeed > 30) {
    stopWorkReasons.push(`Wind speed ${weatherData.windSpeed} mph exceeds safe limit`);
  }

  // Risk score check
  if (topHazard.riskScore >= 95) {
    return {
      decision: 'STOP_WORK',
      reasons: ['EXTREME risk level requires immediate stop-work']
    };
  }

  if (topHazard.riskScore >= 75) {
    conditions.push('Additional controls must be implemented before proceeding');
    return {
      decision: 'GO_WITH_CONDITIONS',
      reasons: ['HIGH risk requires enhanced controls'],
      conditions
    };
  }

  // Missing critical fields
  if (validation.missingCritical.length > 5) {
    return {
      decision: 'NO_GO',
      reasons: ['Too many critical fields missing']
    };
  }

  return {
    decision: 'GO',
    reasons: ['Risk levels acceptable with current controls']
  };
}
```

---

## 📊 **DATA FLOW & ORCHESTRATION**

### Pipeline Execution:

```typescript
async analyze(checklistData, weatherData, analysisId) {
  // AGENT 1: Validate data quality
  const validation = await this.validateData(checklistData, weatherData);
  // Save to database: agent_outputs table

  // AGENT 2: Assess risks with OSHA data
  const risk = await this.assessRisk(validation, checklistData);
  // Save to database: agent_outputs table

  // AGENT 3: Predict incidents using Swiss Cheese Model
  const prediction = await this.predictIncident(risk, checklistData, validation);
  // Save to database: agent_outputs table

  // AGENT 4: Synthesize final report (TypeScript, not LLM)
  const report = await this.synthesizeReport(validation, risk, prediction, weatherData, checklistData);
  // Save to database: agent_outputs table

  // Return complete analysis
  return {
    report,
    agent1: validation,
    agent2: risk,
    agent3: prediction,
    agent4: report,
    metadata: {
      pipelineVersion: 'multi-agent-v1.0-hybrid',
      executionTimeMs,
      dataQuality: validation.dataQuality,
      topRiskScore: risk.hazards[0].riskScore,
      predictionConfidence: prediction.confidence
    }
  };
}
```

### Fallback & Error Handling:

```typescript
// If any agent fails, pipeline gracefully degrades
try {
  // Execute agents...
} catch (error) {
  // Preserve partial results from successful agents
  return {
    report: fallbackReport,
    metadata: {
      dataQuality: lastKnownDataQuality,    // From Agent 1
      topRiskScore: lastKnownTopRiskScore,  // From Agent 2
      predictionConfidence: lastKnownConfidence  // From Agent 3
    }
  };
}
```

### Database Storage:

All agent outputs are saved to `agent_outputs` table:

```sql
INSERT INTO agent_outputs (
  analysis_id,
  agent_id,           -- 'safety_agent_1', 'safety_agent_2', etc.
  agent_name,         -- 'Data Validator', 'Risk Assessor', etc.
  agent_type,         -- 'multi_agent_safety'
  output_data,        -- JSON output from agent
  execution_metadata, -- Model, temperature, tokens, timing
  success             -- true/false
) VALUES (...)
```

---

## 🎯 **KEY TAKEAWAYS FOR V3 IMPLEMENTATION**

### 1. **Agent Architecture:**
- V1 uses **3 LLM agents + 1 TypeScript synthesizer**
- All use Gemini 2.5 Flash with different temperatures
- Token limits: 12K, 16K, 16K (increased from original 4K, 8K, 8K)

### 2. **Critical Prompts to Port:**
- Agent 1: Trade-specific validation logic is GOLD
- Agent 2: Quantitative risk scoring formula is battle-tested
- Agent 3: Swiss Cheese Model framework is comprehensive
- Agent 4: Structured report format is production-ready

### 3. **Data Sources:**
- **OSHA Data**: Fetched from `safetyIntelligenceService` (NeonDB)
- **BLS Statistics**: Hardcoded in prompts (BLS 2023 Construction data)
- **Weather**: Real-time from API via `getWeatherForSafetyAnalysis`
- **ANSI Standards**: Available in Supabase (from your earlier extraction)

### 4. **Risk Scoring Math:**
```
Probability = Base × HazardType × Controls × Weather × Experience
Risk Score = (Probability × 100) × Severity Multiplier
```

### 5. **Database Integration:**
- All agent outputs saved for audit trail
- Enables analytics and pattern recognition
- Supports backward compatibility with legacy formats

### 6. **Temperature Strategy:**
- **0.3** = Precise, objective validation
- **0.7** = Analytical risk assessment
- **1.0** = Creative incident prediction
- **0.5** = Structured report formatting

---

## 🚀 **NEXT STEPS FOR V3**

1. **Port Prompts**: Copy these exact prompts to V3 agent files
2. **Add Risk Math**: Implement the probability calculation formulas
3. **Integrate OSHA Data**: Connect to Supabase OSHA tables
4. **Build Synthesizer**: Create TypeScript version of Agent 4
5. **Test Pipeline**: Run full 4-agent flow with sample checklists

The V1 system is production-ready and battle-tested. These prompts are the engine that powers the entire safety analysis platform.
