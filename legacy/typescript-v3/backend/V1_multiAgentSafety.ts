import { GoogleGenerativeAI } from '@google/generative-ai';
import { SafetyIntelligenceService } from './safetyIntelligenceService';
import { db } from '../db.js';
import { agentOutputs } from '../../shared/schema.js';

const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const safetyIntelligence = new SafetyIntelligenceService();

interface ValidationResult {
  qualityScore: number;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  missingCritical: string[];
  insufficientResponses?: Array<{ field: string; issue: string }>;
  weatherPresent: boolean;
  weatherRisks?: string[];
  concerns: {
    CRITICAL?: string[];
    HIGH?: string[];
    MEDIUM?: string[];
    LOW?: string[];
  };
  tradeSpecificGaps?: string[];
  recommendedAction?: 'PROCEED' | 'REQUEST_CLARIFICATION' | 'REJECT_UNSAFE';
  weatherData?: any;
  // Legacy fields for backward compatibility
  noResponses?: string[];
}

interface ProbabilityCalculation {
  base: number;
  hazardMultiplier: number;
  controlMultiplier: number;
  weatherMultiplier: number;
  experienceMultiplier: number;
  final: number;
}

interface RiskHazard {
  name: string;
  category: string;
  probability: number;
  probabilityCalculation?: ProbabilityCalculation;
  consequence: string;
  riskScore: number;
  riskLevel?: string;
  oshaContext: string;
  inadequateControls: string[];
  recommendedControls?: string[];
  regulatoryRequirement?: string;
}

interface RiskSummary {
  overallRiskLevel: string;
  highestRiskScore: number;
  industryContext: string;
}

interface RiskAssessment {
  riskSummary?: RiskSummary;
  hazards: RiskHazard[];
  topThreats: string[];
  weatherImpact?: string;
  immediateActions?: string[];
  oshaData: any;
}

interface CausalStage {
  stage: string;
  description: string;
  evidence?: string;
  whyItFails?: string;
  why?: string;
  errorType?: string;
  fatiqueLevel?: string;
  timeToRecognize?: string;
  timeToIntervene?: string;
  physicalMechanism?: string;
  expectedBarrier?: string;
  failureMode?: string;
  energyType?: string;
  energyMagnitude?: string;
  bodyPart?: string;
  severity?: string;
}

interface LeadingIndicator {
  type: string;
  indicator: string;
  whereToLook: string;
  whatToSee: string;
  threshold: string;
  actionRequired: string;
}

interface Intervention {
  tier?: string;
  action: string;
  breaksChainAt?: string;
  feasibility?: string;
  timeToImplement?: string;
  cost?: string;
  effectivenessReduction?: string;
  reducesHarm?: string;
}

interface InterventionsSet {
  preventive: Intervention[];
  mitigative: Intervention[];
  recommended: string;
}

interface OshaPatternMatch {
  similarIncidents: number;
  matchConfidence: string;
  citationsExpected: string[];
}

interface IncidentPrediction {
  incidentName: string;
  timeframe?: string;
  probability?: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  causalChain: CausalStage[];
  singleBestIntervention?: string; // Backward compatibility
  leadingIndicators: LeadingIndicator[] | string[]; // Support both formats
  interventions?: InterventionsSet;
  oshaPatternMatch?: OshaPatternMatch;
}

interface GoNoGoDecision {
  decision: 'GO' | 'GO_WITH_CONDITIONS' | 'NO_GO' | 'STOP_WORK';
  reasons: string[];
  conditions?: string[];
}

interface ComplianceGap {
  standard: string;
  requirement: string;
  gap: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;
}

interface EmergencyReadiness {
  rescueCapability: 'ADEQUATE' | 'INADEQUATE' | 'NOT_REQUIRED';
  firstAid: boolean;
  communication: boolean;
  evacuationPlan: boolean;
  gaps: string[];
}

interface WeatherImpact {
  currentConditions: any;
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  impacts: string[];
  recommendations: string[];
}

interface ActionItem {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  deadline: string;
  responsibility: string;
}

interface FinalJHAReport {
  metadata: {
    reportId: string;
    generatedAt: Date;
    projectName: string;
    location: string;
    workType: string;
    supervisor: string;
  };
  
  executiveSummary: {
    decision: GoNoGoDecision;
    overallRiskLevel: string;
    topThreats: string[];
    criticalActions: string[];
    incidentProbability: number;
  };
  
  dataQuality: {
    score: number;
    rating: string;
    missingCritical: string[];
    concerns: ValidationResult['concerns'];
  };
  
  riskAssessment: {
    hazards: RiskHazard[];
    industryContext: string;
    oshaStatistics: any;
  };
  
  incidentPrediction: {
    scenario: string;
    probability: number;
    timeframe: string;
    causalChain: CausalStage[];
    leadingIndicators: LeadingIndicator[] | string[];
  };
  
  weatherAnalysis: WeatherImpact;
  complianceGaps: ComplianceGap[];
  emergencyReadiness: EmergencyReadiness;
  actionItems: ActionItem[];
  
  recommendedInterventions: {
    preventive: Intervention[];
    mitigative: Intervention[];
  };
  
  approvals: {
    requiredSignatures: string[];
    competentPersonReview: boolean;
    managementReview: boolean;
  };
  
  // Legacy markdown format for backward compatibility
  markdownReport?: string;
}

interface PipelineMetadata {
  pipelineVersion: string;
  executionTimeMs: number;
  agents: {
    agent1_validator: {
      model: string;
      temperature: number;
      maxTokens: number;
      executionTimeMs: number;
      responseLength: number;
    };
    agent2_risk_assessor: {
      model: string;
      temperature: number;
      maxTokens: number;
      executionTimeMs: number;
      responseLength: number;
      oshaDataSources: string[];
    };
    agent3_incident_predictor: {
      model: string;
      temperature: number;
      maxTokens: number;
      executionTimeMs: number;
      responseLength: number;
      confidenceLevel: string;
    };
    agent4_report_synthesizer: {
      model: string;
      temperature: number;
      method: string;
      executionTimeMs: number;
      reportLength: number;
      responseLength: number;
    };
  };
  dataQuality: string;
  topRiskScore: number;
  predictionConfidence: string;
}

interface AnalysisResult {
  report: FinalJHAReport;
  agent1: ValidationResult;
  agent2: RiskAssessment;
  agent3: IncidentPrediction;
  agent4: FinalJHAReport;
  metadata: PipelineMetadata;
}

export class MultiAgentSafetyAnalysis {
  private model;
  private pipelineStartTime: number = 0;

  constructor() {
    this.model = gemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  /**
   * Helper: Get all concerns as flat array (backward compatibility)
   */
  private getAllConcerns(validation: ValidationResult): string[] {
    if (Array.isArray(validation.concerns)) {
      // Old format: concerns is array
      return validation.concerns as any;
    }
    // New format: concerns is object with CRITICAL/HIGH/MEDIUM/LOW
    const allConcerns: string[] = [];
    if (validation.concerns.CRITICAL) allConcerns.push(...validation.concerns.CRITICAL);
    if (validation.concerns.HIGH) allConcerns.push(...validation.concerns.HIGH);
    if (validation.concerns.MEDIUM) allConcerns.push(...validation.concerns.MEDIUM);
    if (validation.concerns.LOW) allConcerns.push(...validation.concerns.LOW);
    return allConcerns;
  }

  /**
   * Helper: Get trade-specific critical fields based on work type
   */
  private getTradeSpecificFields(workType: string): string {
    const workTypeLower = (workType || '').toLowerCase();
    
    if (workTypeLower.includes('electric') || workTypeLower.includes('electrical')) {
      return `   Electrical Trade Critical Fields:
   - LOTO (Lock-Out Tag-Out) procedures with specific energy sources
   - Arc flash PPE category (0-4) with calorie rating
   - Voltage testing procedure (must use rated test equipment)
   - Qualified person certifications (NFPA 70E or equivalent)
   - Energized work permit (if working on live circuits)`;
    }
    
    if (workTypeLower.includes('roofing') || workTypeLower.includes('roof')) {
      return `   Roofing Trade Critical Fields:
   - Fall protection system type (guardrails, nets, or PFAS)
   - Roof edge setback distance (minimum 6 feet from edge)
   - Weather monitoring for high winds/rain (specific wind speed limits)
   - Ladder tie-off and 3-point contact
   - Material storage away from roof edge`;
    }
    
    if (workTypeLower.includes('scaffold') || workTypeLower.includes('height') || workTypeLower.includes('fall')) {
      return `   Work at Height Critical Fields:
   - Fall protection anchor points with 5,000lb capacity certification
   - Competent person inspection of harnesses/lanyards (signed & dated)
   - Rescue plan with 6-minute response time capability
   - Scaffold load rating and capacity placard visible
   - Guardrail height 42" ± 3" with midrail and toeboard`;
    }
    
    if (workTypeLower.includes('crane') || workTypeLower.includes('lift') || workTypeLower.includes('hoist')) {
      return `   Crane/Lifting Critical Fields:
   - Crane operator certification (CCO or NCCCO)
   - Load chart present and load within rated capacity
   - Wind speed monitoring with specific mph stop-work limit
   - Swing radius barricaded and exclusion zone marked
   - Signal person identified and hand signals reviewed`;
    }
    
    if (workTypeLower.includes('concrete') || workTypeLower.includes('masonry')) {
      return `   Concrete/Masonry Critical Fields:
   - Form integrity inspection before pour (signed by engineer)
   - Shoring/reshoring plan for multi-level structures
   - Silica exposure control (wet methods or HEPA vacuum)
   - Vibration tool anti-vibration gloves and time limits
   - Reinforcement bar impalement protection (caps on vertical rebar)`;
    }
    
    if (workTypeLower.includes('excavat') || workTypeLower.includes('trench')) {
      return `   Excavation/Trenching Critical Fields:
   - Competent person daily trench inspection (atmospheric testing)
   - Soil type classification (Type A/B/C) with shoring/sloping accordingly
   - Ladder within 25 feet of workers at all times
   - Utility locate (call 811) with marked lines on site
   - Spoil pile setback minimum 2 feet from edge`;
    }
    
    // Generic construction
    return `   General Construction Critical Fields:
   - Site-specific hazard assessment (minimum 3 hazards identified)
   - Emergency assembly point with marked route
   - First aid kit location and trained first aid provider on site
   - Competent person for each major hazard category identified by name`;
  }

  /**
   * Main entry point - orchestrates the 4-agent pipeline
   * @param checklistData - The checklist data to analyze
   * @param weatherData - Weather data for the site
   * @param analysisId - Optional analysis_history record ID for tracking agent outputs
   */
  async analyze(checklistData: any, weatherData: any, analysisId?: string): Promise<AnalysisResult> {
    this.pipelineStartTime = Date.now();
    const agentTimings: any = {};
    
    // Track partial results for fallback fidelity
    let lastKnownDataQuality = 'ERROR';
    let lastKnownTopRiskScore = 0;
    let lastKnownConfidence = 'NONE';

    try {
      console.log('🤖 Starting multi-agent analysis pipeline...');

      // AGENT 1: Data Validation (Temperature 0.3 - precise)
      console.log('📋 Agent 1: Validating data quality...');
      const agent1Start = Date.now();
      const validation = await this.validateData(checklistData, weatherData);
      agentTimings.agent1_validator = {
        model: 'gemini-2.5-flash',
        temperature: 0.3,
        maxTokens: 12000, // Increased 3x for comprehensive validation
        executionTimeMs: Date.now() - agent1Start,
        responseLength: JSON.stringify(validation).length
      };
      lastKnownDataQuality = validation.dataQuality;
      console.log(`✓ Data quality: ${validation.dataQuality} (score: ${validation.qualityScore}/10)`);

      // Save Agent 1 output
      if (analysisId) {
        await db.insert(agentOutputs).values({
          analysisId,
          agentId: 'safety_agent_1',
          agentName: 'Data Validator',
          agentType: 'multi_agent_safety',
          outputData: validation,
          executionMetadata: agentTimings.agent1_validator,
          success: true
        });
      }

      // AGENT 2: Risk Assessment (Temperature 0.7 - analytical)
      console.log('⚠️  Agent 2: Assessing risks with OSHA data...');
      const agent2Start = Date.now();
      const risk = await this.assessRisk(validation, checklistData);
      agentTimings.agent2_risk_assessor = {
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 16000, // Increased 2x for detailed OSHA risk analysis
        executionTimeMs: Date.now() - agent2Start,
        responseLength: JSON.stringify(risk).length,
        oshaDataSources: risk.oshaData ? ['BLS_2023_Construction', 'NAICS_23'] : []
      };
      lastKnownTopRiskScore = risk.hazards[0]?.riskScore || 0;
      console.log(`✓ Identified ${risk.hazards.length} hazards`);

      // Save Agent 2 output
      if (analysisId) {
        await db.insert(agentOutputs).values({
          analysisId,
          agentId: 'safety_agent_2',
          agentName: 'Risk Assessor',
          agentType: 'multi_agent_safety',
          outputData: risk,
          executionMetadata: agentTimings.agent2_risk_assessor,
          success: true
        });
      }

      // AGENT 3: Incident Prediction (Temperature 1.0 - creative reasoning)
      console.log('🔮 Agent 3: Predicting incident scenarios...');
      const agent3Start = Date.now();
      const prediction = await this.predictIncident(risk, checklistData, validation);
      agentTimings.agent3_incident_predictor = {
        model: 'gemini-2.5-flash',
        temperature: 1.0,
        maxTokens: 16000, // Increased 2x for comprehensive Swiss Cheese analysis
        executionTimeMs: Date.now() - agent3Start,
        responseLength: JSON.stringify(prediction).length,
        confidenceLevel: prediction.confidence
      };
      lastKnownConfidence = prediction.confidence;
      console.log(`✓ Predicted: ${prediction.incidentName} (confidence: ${prediction.confidence})`);

      // Save Agent 3 output
      if (analysisId) {
        await db.insert(agentOutputs).values({
          analysisId,
          agentId: 'safety_agent_3',
          agentName: 'Incident Predictor',
          agentType: 'multi_agent_safety',
          outputData: prediction,
          executionMetadata: agentTimings.agent3_incident_predictor,
          success: true
        });
      }

      // AGENT 4: Report Synthesis (Temperature 0.5 - structured)
      console.log('📄 Agent 4: Synthesizing final report...');
      const agent4Start = Date.now();
      const report = await this.synthesizeReport(validation, risk, prediction, weatherData, checklistData);
      agentTimings.agent4_report_synthesizer = {
        model: 'hybrid-template',
        temperature: 0.5,
        method: 'structured_typescript',
        executionTimeMs: Date.now() - agent4Start,
        reportLength: report.length,
        responseLength: report.length  // Alias for consistency with other agents
      };
      console.log('✓ Pipeline complete!');

      // Save Agent 4 output
      if (analysisId) {
        await db.insert(agentOutputs).values({
          analysisId,
          agentId: 'safety_agent_4',
          agentName: 'Report Synthesizer',
          agentType: 'multi_agent_safety',
          outputData: { 
            fullReport: report,
            reportLength: report.length 
          },
          executionMetadata: agentTimings.agent4_report_synthesizer,
          success: true
        });
      }

      const totalExecutionTime = Date.now() - this.pipelineStartTime;

      const metadata: PipelineMetadata = {
        pipelineVersion: 'multi-agent-v1.0-hybrid',
        executionTimeMs: totalExecutionTime,
        agents: agentTimings,
        dataQuality: validation.dataQuality,
        topRiskScore: risk.hazards[0]?.riskScore || 0,
        predictionConfidence: prediction.confidence
      };

      return {
        report,
        agent1: validation,
        agent2: risk,
        agent3: prediction,
        agent4: report,
        metadata
      };

    } catch (error) {
      console.error('❌ Multi-agent pipeline error:', error);
      const fallbackReport = this.generateFallbackReport(error, checklistData, weatherData);
      
      // Use last known values from successful agents (preserves analytics fidelity)
      const fallbackMetadata: PipelineMetadata = {
        pipelineVersion: 'multi-agent-v1.0-hybrid',
        executionTimeMs: Date.now() - this.pipelineStartTime,
        agents: {
          agent1_validator: agentTimings.agent1_validator || {
            model: 'gemini-2.5-flash',
            temperature: 0.3,
            maxTokens: 12000, // Increased 3x
            executionTimeMs: 0,
            responseLength: 0
          },
          agent2_risk_assessor: agentTimings.agent2_risk_assessor || {
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            maxTokens: 16000, // Increased 2x
            executionTimeMs: 0,
            responseLength: 0,
            oshaDataSources: []
          },
          agent3_incident_predictor: agentTimings.agent3_incident_predictor || {
            model: 'gemini-2.5-flash',
            temperature: 1.0,
            maxTokens: 16000, // Increased 2x
            executionTimeMs: 0,
            responseLength: 0,
            confidenceLevel: lastKnownConfidence  // Preserve real confidence from Agent 3
          },
          agent4_report_synthesizer: agentTimings.agent4_report_synthesizer || {
            model: 'hybrid-template',
            temperature: 0.5,
            method: 'structured_typescript',
            executionTimeMs: 0,
            reportLength: 0,
            responseLength: 0
          }
        },
        dataQuality: lastKnownDataQuality,  // Preserve real data quality from Agent 1
        topRiskScore: lastKnownTopRiskScore,  // Preserve real risk score from Agent 2
        predictionConfidence: lastKnownConfidence  // Preserve real confidence from Agent 3
      };
      
      return {
        report: fallbackReport,
        metadata: fallbackMetadata
      };
    }
  }

  /**
   * AGENT 1: Data Validator
   * Temperature: 0.3 (precise, focused)
   * Task: Validate data quality and identify gaps
   */
  private async validateData(checklistData: any, weatherData: any): Promise<ValidationResult> {
    // Fetch OSHA industry context
    let naicsCode = '238'; // Default: Specialty Trade Contractors
    let industryName = 'Construction';
    let injuryRate = 35;
    
    try {
      // Try to get industry-specific data from OSHA database
      const riskProfile = await safetyIntelligence.getRiskProfile('238');
      if (riskProfile) {
        naicsCode = riskProfile.naicsCode;
        industryName = riskProfile.industryName;
        injuryRate = riskProfile.injuryRate || 35;
      }
    } catch (error) {
      console.warn('Could not fetch OSHA data for validation, using defaults');
    }
    
    // Extract work type from checklist
    const workType = checklistData.sections?.[0]?.responses?.[1]?.response || 
                     checklistData.workType || 
                     'General Construction';
    
    const prompt = `You are a construction safety data validator with expertise in OSHA 1926 standards. 
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
   
   ${this.getTradeSpecificFields(workType)}

2. RESPONSE QUALITY CHECK:
   - Flag "No response", "N/A", "Same", "Yes/No" without details
   - Flag responses < 3 words for critical fields
   - Flag contradictory answers (e.g., "no hazards" but lists PPE requirements)
   - Flag generic responses (e.g., "be careful" instead of specific control measures)

3. WEATHER RISK ASSESSMENT:
   ${weatherData ? `
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
   ` : 'Weather data unavailable - FLAG as CRITICAL concern'}

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

CRITICAL: Output must be parseable JSON. Any non-JSON text will cause system failure.`;

    let result = '';
    try {
      result = await this.callGemini(prompt, 0.3, 12000); // Increased 3x for comprehensive validation
      const extracted = this.extractJSON(result);
      console.log('🔍 Agent 1 extracted JSON length:', extracted.length);
      const parsed = JSON.parse(extracted);
      
      return {
        ...parsed,
        weatherData: weatherData
      };
    } catch (error) {
      console.error('Agent 1 parsing error:', error);
      console.error('Agent 1 raw response preview:', result?.substring(0, 200));
      // Fallback validation
      return {
        qualityScore: 5,
        missingCritical: ['Unable to parse validation'],
        dataQuality: 'MEDIUM',
        concerns: {
          CRITICAL: [],
          HIGH: ['Data validation failed - proceeding with caution'],
          MEDIUM: [],
          LOW: []
        },
        weatherPresent: !!weatherData,
        weatherData: weatherData
      };
    }
  }

  /**
   * AGENT 2: Risk Assessor
   * Temperature: 0.7 (analytical)
   * Task: Identify hazards and calculate risk scores using OSHA data
   */
  private async assessRisk(validation: ValidationResult, checklistData: any): Promise<RiskAssessment> {
    // Fetch OSHA data with proper structure for new prompt
    let oshaData: any = {
      industryName: 'Specialty Trade Contractors',
      naicsCode: '238',
      injuryRate: 35,
      totalCases: 198400,
      dataSource: 'BLS_Table_1_2023'
    };
    
    try {
      const constructionProfile = await safetyIntelligence.getRiskProfile('238');
      if (constructionProfile) {
        oshaData = {
          industryName: constructionProfile.industryName,
          naicsCode: constructionProfile.naicsCode,
          injuryRate: constructionProfile.injuryRate || 35,
          totalCases: 0, // Will be populated if available
          dataSource: 'BLS_Table_1_2023',
          constructionProfile, // Keep original for backward compatibility
        };
      }
    } catch (error) {
      console.error('Failed to fetch OSHA data:', error);
    }

    // Extract weather data for prompt
    const weatherData = validation.weatherData || {};

    const prompt = `You are a construction risk assessor certified in OSHA 1926 standards with expertise in quantitative risk analysis.

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
   ${weatherData.temperature < 32 || weatherData.temperature > 95 ? `- Extreme temp: ×1.4` : ''}
   ${weatherData.windSpeed > 25 ? `- High winds: ×1.8` : ''}
   ${weatherData.precipitation ? `- Precipitation: ×1.6` : ''}
   ${!weatherData.temperature && !weatherData.windSpeed ? `- Normal: ×1.0` : ''}
   
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

CRITICAL: Output ONLY valid JSON. Any text outside JSON will cause parsing failure.`;

    let result = '';
    try {
      result = await this.callGemini(prompt, 0.7, 16000); // Increased 2x for detailed OSHA analysis
      const extracted = this.extractJSON(result);
      console.log('🔍 Agent 2 extracted JSON length:', extracted.length);
      const parsed = JSON.parse(extracted);
      
      return {
        ...parsed,
        oshaData
      };
    } catch (error) {
      console.error('Agent 2 parsing error:', error);
      console.error('Agent 2 raw response preview:', result?.substring(0, 200));
      // Fallback risk assessment
      return {
        riskSummary: {
          overallRiskLevel: 'MEDIUM',
          highestRiskScore: 50,
          industryContext: 'Risk assessment failed - using baseline'
        },
        hazards: [{
          name: 'Generic construction hazard - risk assessment failed',
          category: 'Other',
          probability: 0.1,
          consequence: 'Serious',
          riskScore: 50,
          oshaContext: 'Risk assessment unavailable',
          inadequateControls: ['Unable to assess controls']
        }],
        topThreats: ['Risk assessment failed'],
        oshaData
      };
    }
  }

  /**
   * Helper: Calculate fatigue risk level
   */
  private calculateFatigue(hoursWorked: any, consecutiveDays: any): string {
    const hours = parseFloat(hoursWorked) || 0;
    const days = parseFloat(consecutiveDays) || 0;
    
    if (hours > 12 || days > 14) return 'CRITICAL';
    if (hours > 10 || days > 10) return 'HIGH';
    if (hours > 8 || days > 5) return 'MODERATE';
    return 'NORMAL';
  }

  /**
   * Helper: Determine if current time is high-risk period
   */
  private isHighRiskTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();
    
    // High-risk periods: 10:00-11:30 AM, 2:00-3:30 PM, last hour of shift, Friday afternoons
    if ((hour === 10 && minute >= 0) || (hour === 11 && minute <= 30)) return true;
    if ((hour === 14 && minute >= 0) || (hour === 15 && minute <= 30)) return true;
    if (dayOfWeek === 5 && hour >= 14) return true; // Friday afternoon
    if (hour >= 16 && hour <= 17) return true; // Last hour of typical shift
    
    return false;
  }

  /**
   * AGENT 3: Incident Predictor
   * Temperature: 1.0 (maximum creative reasoning)
   * Task: Build causal chain using Swiss Cheese Model
   */
  private async predictIncident(risk: RiskAssessment, checklistData: any, validation?: ValidationResult): Promise<IncidentPrediction> {
    const topHazard = risk.hazards[0];
    const oshaData = risk.oshaData || {};
    const weatherData = validation?.weatherData || {};

    // Extract checklist fields
    const getChecklistField = (field: string) => {
      return checklistData[field] || checklistData.sections?.find((s: any) => 
        s.responses?.some((r: any) => r.question?.toLowerCase().includes(field.toLowerCase()))
      )?.responses?.find((r: any) => r.question?.toLowerCase().includes(field.toLowerCase()))?.response || 'Not specified';
    };

    const prompt = `You are an incident prediction specialist using the Swiss Cheese Model and Bow-Tie Analysis. Your expertise is in identifying latent organizational failures that combine with active errors to create incidents.

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
   - Schedule Pressure Analysis:
     ${getChecklistField('deadline')}
     ${getChecklistField('scheduleStatus')}
     Pressure Level: ${getChecklistField('overtime') !== 'Not specified' ? 'HIGH (overtime)' : 'NORMAL'}
     
   - Resource Constraints:
     Equipment adequate?: ${getChecklistField('equipmentAdequacy')}
     Staffing adequate?: ${getChecklistField('staffingLevel')}
     
   - Safety Culture Indicators:
     Training current?: ${getChecklistField('trainingCurrent')}
     Safety meetings held?: ${getChecklistField('safetyMeetings')}
     Past violations?: ${getChecklistField('pastViolations')}

2. UNSAFE SUPERVISION (Active Failures):
   - Competent person designated?: ${getChecklistField('competentPerson')}
   - Adequate oversight?: ${getChecklistField('supervisionLevel')}
   - Hazard recognition training?: ${getChecklistField('hazardRecognition')}

3. PRECONDITIONS FOR UNSAFE ACTS:
   
   A. Worker State:
   - Fatigue Risk: ${this.calculateFatigue(getChecklistField('hoursWorked'), getChecklistField('consecutiveDays'))}
   - Experience level: ${getChecklistField('workerExperience')}
   - Training adequacy: ${getChecklistField('taskSpecificTraining')}
   
   B. Equipment State:
   - Condition: ${getChecklistField('equipmentCondition')}
   - Last inspection: ${getChecklistField('lastInspection')}
   - Adequacy for task: ${getChecklistField('equipmentMatch')}
   
   C. Environmental State:
   - Weather: ${JSON.stringify(weatherData)}
   - Visibility: ${weatherData.visibility || 'Unknown'}
   - Temperature effects: ${weatherData.temperature < 32 || weatherData.temperature > 95 ? 'EXTREME' : 'NORMAL'}

4. UNSAFE ACT (Trigger Event):
   
   Classify error type:
   - Skill-based (slip/lapse): Attention failure during routine task
   - Rule-based (mistake): Wrong procedure applied
   - Knowledge-based (mistake): Novel problem, improvised solution
   - Violation (routine): Normalized deviation from procedure
   - Violation (situational): Pressured by schedule/cost
   
   Predict which error is most likely based on:
   - Worker experience + task familiarity
   - Production pressure level
   - Past practice patterns from checklist

5. LOSS OF CONTROL (Point of No Return):
   
   - Trigger event: Specific action that starts cascade
   - Time to recognize problem: X seconds
   - Time to intervene: X seconds
   - Physical mechanism: How does control loss occur?
   - Critical decision point: Last chance to abort

6. DEFENSE FAILURES (Why Barriers Don't Work):
   
   For each barrier that SHOULD prevent this:
   - What is the barrier? (Engineering, Administrative, PPE)
   - Why doesn't it work? (Absent, Inadequate, Bypassed, Failed)
   - Evidence from checklist: Quote specific response showing gap
   
   Example: 
   Barrier: "Fall arrest system"
   Failure Mode: "Inadequate - anchor point not certified by competent person"
   Evidence: Checklist Q47: "No response" for anchor point inspection

7. INJURY MECHANISM (Energy Transfer):
   
   - Energy type: Kinetic (fall), Electrical, Thermal, Chemical, etc.
   - Energy magnitude: Fall distance, voltage, temperature, etc.
   - Body part affected: Head, torso, extremities
   - Injury severity: Based on energy and body part
     Fatal: >15ft fall to head, >50V electrocution
     Critical: 10-15ft fall, crush injury, severe burns
     Serious: 6-10ft fall, fractures, lacerations
     Minor: <6ft fall, bruises, sprains

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

For each indicator, specify:
- Where to look
- What constitutes the indicator
- Threshold for action

CONFIDENCE SCORING:

Calculate probability of incident in next 4 hours:

Base Probability: ${(topHazard.probability || 0.1) * 100}%

Adjustments:
+ Temporal risk: ${this.isHighRiskTime() ? '+15%' : '0%'}
+ Production pressure: ${getChecklistField('overtime') !== 'Not specified' ? '+20%' : '0%'}
+ Fatigue: ${this.calculateFatigue(getChecklistField('hoursWorked'), getChecklistField('consecutiveDays')) === 'CRITICAL' ? '+15%' : '0%'}
+ Defense gaps: ${(validation?.missingCritical?.length || 0) * 5}%
+ Weather deteriorating: ${weatherData.windSpeed > 25 ? '+10%' : '0%'}

Final Probability: Calculate based on above

Confidence Rating:
80-100%: HIGH (Incident likely in next 4 hours)
40-79%: MEDIUM (Incident possible in next 1-2 days)
0-39%: LOW (Incident unlikely without major change)

INTERVENTION HIERARCHY:

PREVENTIVE (Stop it from happening):
Tier 1 - Elimination: Identify elimination option if feasible
Tier 2 - Engineering: Identify engineering control option
Tier 3 - Administrative: Identify administrative control option
Tier 4 - PPE: Identify PPE option

MITIGATIVE (Reduce harm if it happens):
- Emergency response: Identify emergency response capability
- Medical readiness: Identify medical preparedness

Select top 3 interventions across all tiers.

OUTPUT (VALID JSON ONLY):

{
  "incidentName": "Specific incident with mechanism and location",
  "timeframe": "Next 4 hours",
  "probability": <0-100>,
  "confidence": "HIGH|MEDIUM|LOW",
  "causalChain": [
    {
      "stage": "Organizational Influences",
      "description": "Specific latent condition (schedule pressure, resource constraint, etc.)",
      "evidence": "Quote from checklist showing this exists"
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
      "evidence": "Current conditions: ${JSON.stringify(weatherData)}"
    },
    {
      "stage": "Unsafe Act (Trigger)",
      "errorType": "Skill-Based Slip|Rule-Based Mistake|Knowledge-Based Mistake|Routine Violation|Situational Violation",
      "description": "Specific action worker takes",
      "why": "Why worker makes this choice (fatigue, pressure, normalized practice, etc.)"
    },
    {
      "stage": "Loss of Control",
      "description": "When situation becomes unrecoverable",
      "timeToRecognize": "X seconds",
      "timeToIntervene": "X seconds",
      "physicalMechanism": "How control is lost (wind gust, equipment failure, etc.)"
    },
    {
      "stage": "Defense Failure 1",
      "expectedBarrier": "What should prevent this (engineering/admin/PPE)",
      "failureMode": "Why it doesn't work (absent/inadequate/bypassed)",
      "evidence": "Quote from checklist showing gap"
    },
    {
      "stage": "Defense Failure 2",
      "expectedBarrier": "Second line of defense",
      "failureMode": "Why it fails",
      "evidence": "Quote from checklist"
    },
    {
      "stage": "Injury Mechanism",
      "energyType": "Kinetic|Electrical|Thermal|Chemical|Other",
      "energyMagnitude": "Specific value (fall distance, voltage, etc.)",
      "bodyPart": "Specific body part affected",
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
      "actionRequired": "What supervisor should do if observed"
    }
  ],
  "interventions": {
    "preventive": [
      {
        "tier": "Elimination|Engineering|Administrative|PPE",
        "action": "Specific intervention",
        "breaksChainAt": "Which stage this intervention prevents",
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

CRITICAL: Output ONLY valid JSON. Any non-JSON text will cause parsing failure.`;

    let result = '';
    try {
      result = await this.callGemini(prompt, 1.0, 16000); // Increased for comprehensive Swiss Cheese analysis
      const extracted = this.extractJSON(result);
      console.log('🔍 Agent 3 extracted JSON length:', extracted.length);
      const parsed = JSON.parse(extracted);
      
      // Backward compatibility: extract singleBestIntervention if not present
      if (!parsed.singleBestIntervention && parsed.interventions?.recommended) {
        parsed.singleBestIntervention = parsed.interventions.recommended;
      }
      
      return parsed;
    } catch (error) {
      console.error('Agent 3 parsing error:', error);
      console.error('Agent 3 raw response preview:', result?.substring(0, 300));
      // Fallback prediction
      return {
        incidentName: topHazard.name,
        confidence: 'LOW',
        causalChain: [{
          stage: 'Prediction Failed',
          description: 'Unable to build causal chain - incident prediction unavailable'
        }],
        leadingIndicators: ['Incident prediction failed'],
        singleBestIntervention: 'Unable to determine intervention'
      };
    }
  }

  /**
   * Helper: Call Gemini with specific temperature and token limit
   */
  private async callGemini(prompt: string, temperature: number, maxTokens: number): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      });
      
      const responseText = result.response.text();
      console.log(`📡 Gemini response (temp ${temperature}): ${responseText.length} chars`);
      
      // Check for safety blocks
      if (!responseText || responseText.trim() === '') {
        console.error('⚠️  Empty response from Gemini');
        console.error('Prompt length:', prompt.length);
        console.error('Response object:', JSON.stringify(result.response, null, 2));
      }
      
      return responseText;
    } catch (error) {
      console.error('❌ Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Helper: Extract JSON from markdown code blocks
   */
  private extractJSON(text: string): string {
    // Try multiple patterns to extract JSON from markdown
    const patterns = [
      /```json\s*([\s\S]*?)\s*```/,  // ```json with optional whitespace
      /```\s*([\s\S]*?)\s*```/,        // ``` with optional whitespace
      /\{[\s\S]*\}/                     // Raw JSON object
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const extracted = match[1] || match[0];
        const trimmed = extracted.trim();
        // Verify it looks like JSON
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          return trimmed;
        }
      }
    }

    // Return as-is if no pattern matches
    return text.trim();
  }

  /**
   * Helper: Determine GO/NO-GO decision based on all factors
   */
  private determineGoNoGo(
    validation: ValidationResult,
    risk: RiskAssessment,
    prediction: IncidentPrediction,
    weatherData: any
  ): GoNoGoDecision {
    const topHazard = risk.hazards[0] || { riskScore: 0 };
    const stopWorkReasons: string[] = [];
    const conditions: string[] = [];

    // Data quality check
    if (validation.dataQuality === 'LOW') {
      stopWorkReasons.push('Insufficient data quality for safe operations');
    }

    // Weather check
    if (weatherData?.windSpeed) {
      const windLimit = 20;
      if (weatherData.windSpeed > windLimit) {
        stopWorkReasons.push(`Wind speed (${weatherData.windSpeed} mph) exceeds ${windLimit} mph safe crane operation limit`);
      } else if (weatherData.windSpeed > windLimit * 0.8) {
        conditions.push('Continuous wind speed monitoring with hard stop at 20 mph');
      }
    }

    // Risk check
    if (prediction.confidence === 'HIGH' && topHazard.riskScore > 85) {
      stopWorkReasons.push('High-confidence prediction of critical incident with inadequate controls');
    }

    // Critical fields check
    if (validation.missingCritical.some(field => 
      field.toLowerCase().includes('emergency') || 
      field.toLowerCase().includes('rescue'))) {
      conditions.push('Competent person inspection of fall protection before work starts');
    }

    // Determine decision
    let decision: 'GO' | 'GO_WITH_CONDITIONS' | 'NO_GO' | 'STOP_WORK';
    if (stopWorkReasons.length > 0) {
      decision = stopWorkReasons.some(r => r.includes('immediate')) ? 'STOP_WORK' : 'NO_GO';
    } else if (conditions.length > 0) {
      decision = 'GO_WITH_CONDITIONS';
    } else {
      decision = 'GO';
    }

    return { decision, reasons: stopWorkReasons, conditions };
  }

  /**
   * Helper: Identify compliance gaps from validation and risk data
   */
  private identifyComplianceGaps(
    validation: ValidationResult,
    risk: RiskAssessment
  ): ComplianceGap[] {
    const gaps: ComplianceGap[] = [];
    const topHazard = risk.hazards[0];

    // Add gaps from missing critical fields
    validation.missingCritical.forEach(field => {
      gaps.push({
        standard: 'OSHA 1926',
        requirement: `Documentation of ${field}`,
        gap: `Missing: ${field}`,
        severity: 'HIGH',
        evidence: `Validation found missing critical field: ${field}`
      });
    });

    // Add gaps from inadequate controls
    if (topHazard?.inadequateControls) {
      topHazard.inadequateControls.forEach(control => {
        gaps.push({
          standard: topHazard.regulatoryRequirement || 'OSHA 1926',
          requirement: 'Adequate hazard controls',
          gap: control,
          severity: topHazard.riskScore > 75 ? 'CRITICAL' : 'HIGH',
          evidence: `Risk assessment identified: ${control}`
        });
      });
    }

    return gaps;
  }

  /**
   * Helper: Assess emergency response readiness
   */
  private assessEmergencyResponse(
    checklistData: any,
    topHazard?: RiskHazard
  ): EmergencyReadiness {
    const gaps: string[] = [];

    // Check for rescue capability
    const hasRescuePlan = checklistData.sections?.some((s: any) => 
      s.responses?.some((r: any) => 
        r.response?.toLowerCase().includes('rescue')));

    const rescueCapability: 'ADEQUATE' | 'INADEQUATE' | 'NOT_REQUIRED' = 
      topHazard?.name?.toLowerCase().includes('fall') 
        ? (hasRescuePlan ? 'ADEQUATE' : 'INADEQUATE')
        : 'NOT_REQUIRED';

    if (rescueCapability === 'INADEQUATE') {
      gaps.push('No documented fall rescue plan');
    }

    // Check for first aid
    const firstAid = checklistData.sections?.some((s: any) => 
      s.responses?.some((r: any) => 
        r.response?.toLowerCase().includes('first aid')));

    if (!firstAid) gaps.push('First aid equipment not documented');

    // Check for communication
    const communication = checklistData.sections?.some((s: any) => 
      s.responses?.some((r: any) => 
        r.response?.toLowerCase().includes('radio') || 
        r.response?.toLowerCase().includes('communication')));

    if (!communication) gaps.push('Communication systems not documented');

    // Check for evacuation plan
    const evacuationPlan = checklistData.sections?.some((s: any) => 
      s.responses?.some((r: any) => 
        r.response?.toLowerCase().includes('evacuation') || 
        r.response?.toLowerCase().includes('emergency exit')));

    if (!evacuationPlan) gaps.push('Evacuation plan not documented');

    return {
      rescueCapability,
      firstAid: firstAid || false,
      communication: communication || false,
      evacuationPlan: evacuationPlan || false,
      gaps
    };
  }

  /**
   * Helper: Analyze weather impact
   */
  private analyzeWeatherImpact(
    weatherData: any,
    forecast: string | undefined,
    hazards: RiskHazard[]
  ): WeatherImpact {
    const impacts: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';

    if (weatherData?.windSpeed) {
      const safeLimit = 20;
      const windMargin = ((safeLimit - weatherData.windSpeed) / safeLimit) * 100;

      if (windMargin < 20) {
        riskLevel = 'RED';
        impacts.push(`Critical wind speed: ${weatherData.windSpeed} mph (approaching ${safeLimit} mph limit)`);
        recommendations.push('Halt crane and swing stage operations immediately');
      } else if (windMargin < 30) {
        riskLevel = 'YELLOW';
        impacts.push(`Elevated wind speed: ${weatherData.windSpeed} mph`);
        recommendations.push('Implement continuous wind monitoring with hard stop at 20 mph');
      }
    }

    if (weatherData?.temperature) {
      if (weatherData.temperature < 32) {
        impacts.push('Freezing temperatures increase slip/fall risk');
        recommendations.push('Implement cold stress prevention and anti-slip measures');
      } else if (weatherData.temperature > 95) {
        impacts.push('Extreme heat increases fatigue and heat stress risk');
        recommendations.push('Implement heat stress prevention with frequent breaks and hydration');
      }
    }

    if (weatherData?.precipitation) {
      impacts.push('Precipitation increases slip/fall incidents by 60%');
      recommendations.push('Enhanced fall protection and slip-resistant surfaces required');
    }

    return {
      currentConditions: weatherData,
      riskLevel,
      impacts,
      recommendations
    };
  }

  /**
   * Helper: Generate prioritized action items
   */
  private generateActionItems(
    goNoGo: GoNoGoDecision,
    complianceGaps: ComplianceGap[],
    emergencyReadiness: EmergencyReadiness,
    interventions?: InterventionsSet
  ): ActionItem[] {
    const actions: ActionItem[] = [];

    // Add immediate actions from decision
    if (goNoGo.decision === 'STOP_WORK' || goNoGo.decision === 'NO_GO') {
      goNoGo.reasons.forEach(reason => {
        actions.push({
          priority: 'CRITICAL',
          action: `Address: ${reason}`,
          deadline: 'Before work can proceed',
          responsibility: 'Site Supervisor'
        });
      });
    }

    // Add condition-based actions
    goNoGo.conditions?.forEach(condition => {
      actions.push({
        priority: 'HIGH',
        action: condition,
        deadline: 'Before work starts',
        responsibility: 'Competent Person'
      });
    });

    // Add compliance gap actions
    complianceGaps.slice(0, 3).forEach(gap => {
      actions.push({
        priority: gap.severity as any,
        action: `Resolve compliance gap: ${gap.gap}`,
        deadline: gap.severity === 'CRITICAL' ? 'Immediate' : 'Within 24 hours',
        responsibility: 'Safety Manager'
      });
    });

    // Add emergency readiness actions
    emergencyReadiness.gaps.forEach(gap => {
      actions.push({
        priority: 'HIGH',
        action: `Address emergency readiness gap: ${gap}`,
        deadline: 'Before work starts',
        responsibility: 'Emergency Coordinator'
      });
    });

    // Add preventive interventions
    if (interventions?.preventive) {
      interventions.preventive.slice(0, 3).forEach(intervention => {
        actions.push({
          priority: intervention.feasibility === 'HIGH' ? 'MEDIUM' : 'LOW',
          action: intervention.action,
          deadline: intervention.timeToImplement || 'As soon as feasible',
          responsibility: 'Project Manager'
        });
      });
    }

    return actions;
  }

  /**
   * Helper: Determine required approvals based on decision and risk
   */
  private determineRequiredApprovals(
    goNoGo: GoNoGoDecision,
    risk: RiskAssessment
  ): string[] {
    const approvals: string[] = ['Site Supervisor'];

    if (goNoGo.decision === 'GO_WITH_CONDITIONS') {
      approvals.push('Competent Person');
    }

    if (goNoGo.decision === 'NO_GO' || goNoGo.decision === 'STOP_WORK') {
      approvals.push('Competent Person', 'Safety Manager', 'Project Manager');
    }

    if (risk.riskSummary?.overallRiskLevel === 'EXTREME' || risk.riskSummary?.overallRiskLevel === 'HIGH') {
      approvals.push('Safety Manager');
    }

    return Array.from(new Set(approvals)); // Remove duplicates
  }

  /**
   * AGENT 4: Report Synthesizer
   * Temperature: 0.5 (structured formatting)
   * Task: Generate structured JHA report
   */
  private async synthesizeReport(
    validation: ValidationResult,
    risk: RiskAssessment,
    prediction: IncidentPrediction,
    weatherData: any,
    checklistData: any
  ): Promise<FinalJHAReport> {
    const now = new Date();
    const topHazard = risk.hazards[0] || { riskScore: 0, inadequateControls: [] };
    
    // Generate all components using helper functions
    const goNoGo = this.determineGoNoGo(validation, risk, prediction, weatherData);
    const complianceGaps = this.identifyComplianceGaps(validation, risk);
    const emergencyReadiness = this.assessEmergencyResponse(checklistData, topHazard as RiskHazard);
    const weatherImpact = this.analyzeWeatherImpact(weatherData, weatherData?.forecast, risk.hazards);
    const actionItems = this.generateActionItems(goNoGo, complianceGaps, emergencyReadiness, prediction.interventions);
    const requiredApprovals = this.determineRequiredApprovals(goNoGo, risk);
    
    // Extract metadata
    const siteLocation = checklistData.sections?.[0]?.responses?.[0]?.response || checklistData.location || 'Location not specified';
    const workType = checklistData.sections?.[0]?.responses?.[1]?.response || checklistData.workType || 'Work type not specified';
    const supervisor = checklistData.supervisor || 'Not specified';
    const projectName = checklistData.projectName || checklistData.template || 'Unnamed Project';
    
    // Build structured report
    const report: FinalJHAReport = {
      metadata: {
        reportId: `JHA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        generatedAt: now,
        projectName,
        location: siteLocation,
        workType,
        supervisor
      },
      
      executiveSummary: {
        decision: goNoGo,
        overallRiskLevel: risk.riskSummary?.overallRiskLevel || 'MEDIUM',
        topThreats: risk.topThreats || risk.hazards.slice(0, 3).map((h, i) => `${i+1}. ${h.name} (${h.riskScore}/100)`),
        criticalActions: actionItems.filter(a => a.priority === 'CRITICAL').map(a => a.action),
        incidentProbability: prediction.probability || (topHazard as any).probability * 100 || 0
      },
      
      dataQuality: {
        score: validation.qualityScore,
        rating: validation.dataQuality,
        missingCritical: validation.missingCritical,
        concerns: validation.concerns
      },
      
      riskAssessment: {
        hazards: risk.hazards,
        industryContext: risk.riskSummary?.industryContext || risk.oshaData?.industryName || 'Construction industry',
        oshaStatistics: risk.oshaData
      },
      
      incidentPrediction: {
        scenario: prediction.incidentName,
        probability: prediction.probability || 0,
        timeframe: prediction.timeframe || 'Next 4 hours',
        causalChain: prediction.causalChain,
        leadingIndicators: prediction.leadingIndicators
      },
      
      weatherAnalysis: weatherImpact,
      complianceGaps,
      emergencyReadiness,
      actionItems,
      
      recommendedInterventions: {
        preventive: prediction.interventions?.preventive || [],
        mitigative: prediction.interventions?.mitigative || []
      },
      
      approvals: {
        requiredSignatures: requiredApprovals,
        competentPersonReview: goNoGo.decision !== 'GO',
        managementReview: goNoGo.decision === 'NO_GO' || goNoGo.decision === 'STOP_WORK'
      }
    };
    
    return report;
  }

  /**
   * Helper: Generate overall assessment section (LEGACY - for backward compatibility with markdown reports)
   */
  private generateOverallAssessment(validation: ValidationResult, risk: RiskAssessment, weatherData: any): string {
    const topRisk = risk.hazards[0];
    const qualityNote = validation.dataQuality === 'LOW' ? 
      'However, data quality concerns limit analysis confidence. ' : '';
    
    const weatherNote = weatherData?.windSpeed && weatherData.windSpeed > 15 ? 
      `Current wind conditions (${weatherData.windSpeed} mph) present significant operational concerns. ` : '';
    
    return `This JHA addresses key aspects of ${risk.hazards[0]?.name || 'the construction project'}. ${qualityNote}${weatherNote}The analysis identifies ${risk.hazards.length} distinct hazards requiring attention, with ${risk.hazards.filter(h => h.riskScore > 70).length} rated as high-risk (>70/100). ${validation.dataQuality === 'HIGH' ? 'Comprehensive data quality enables high-confidence predictions.' : 'Additional data would improve prediction accuracy.'}`;
  }

  /**
   * Helper: Generate compliance status text (LEGACY - for backward compatibility with markdown reports)
   */
  private generateComplianceStatus(validation: ValidationResult, risk: RiskAssessment, checklistData: any): string {
    const standards = [
      'OSHA 1926.502 (Fall Protection)',
      'OSHA 1926.550 (Cranes and Derricks)',
      'OSHA 1926.95 (PPE Requirements)',
      'ANSI/IWCA I-14.1 (Swing Stage Safety)',
      'OSHA 1926.250 (Material Storage)'
    ];
    
    return `**Referenced Standards:**
${standards.map(s => `- ${s}: Compliance requires verification of documented procedures`).join('\n')}

**Compliance Concerns:**
${validation.missingCritical.length > 0 ? 
  `- Missing critical documentation: ${validation.missingCritical.join(', ')}` : 
  '- No critical documentation gaps identified'}
${this.getAllConcerns(validation).length > 0 ? 
  `- Data quality issues: ${this.getAllConcerns(validation).slice(0, 3).join('; ')}` : ''}
${risk.hazards[0]?.inadequateControls.length > 0 ? 
  `- Inadequate controls identified: ${risk.hazards[0].inadequateControls.length} gaps requiring correction` : ''}

**Overall Compliance Status:** ${validation.dataQuality === 'HIGH' && validation.missingCritical.length === 0 ? 
  'LIKELY COMPLIANT - Pending verification' : 
  'GAPS IDENTIFIED - Corrective action required before full compliance'}`;
  }

  /**
   * Fallback report when pipeline fails
   */
  private generateFallbackReport(error: any, checklistData: any, weatherData: any): string {
    return `**ANALYSIS SYSTEM ERROR**

The multi-agent pipeline encountered an error and could not complete the analysis.

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Checklist ID: ${checklistData.id || 'Unknown'}
Weather Data Present: ${weatherData ? 'Yes' : 'No'}

Please review the system logs and try again.`;
  }
}

export const multiAgentSafety = new MultiAgentSafetyAnalysis();
