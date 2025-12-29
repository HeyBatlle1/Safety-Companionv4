"""
EAP Generator Service

4-Agent Pipeline for generating OSHA-compliant Emergency Action Plans.

Agent Pipeline:
1. EAP Analyzer - Analyzes questionnaire data, identifies gaps
2. Procedure Generator - Creates emergency procedures based on hazards
3. OSHA Compliance Checker - Validates against OSHA 1910.38 requirements
4. Document Assembler - Compiles final EAP document

Uses Gemini API for intelligent content generation with fallback templates.
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
import google.generativeai as genai

from app.core.config import get_settings

settings = get_settings()


class EAPGeneratorService:
    """Emergency Action Plan Generator - 4-Agent Pipeline"""
    
    # OSHA 1910.38 Required Elements
    OSHA_REQUIREMENTS = [
        "emergency_escape_procedures",
        "emergency_escape_routes", 
        "procedures_for_critical_operations",
        "employee_accounting_procedures",
        "rescue_and_medical_duties",
        "reporting_emergencies",
        "emergency_contacts",
        "alarm_system_description"
    ]
    
    # Emergency types by site
    EMERGENCY_TYPES = {
        "construction": [
            "fire", "medical", "evacuation", "severe_weather", 
            "structural_collapse", "hazmat_spill", "fall_rescue",
            "confined_space_rescue", "crane_emergency", "excavation_collapse"
        ],
        "general_industry": [
            "fire", "medical", "evacuation", "severe_weather",
            "hazmat_spill", "workplace_violence", "bomb_threat",
            "power_outage", "gas_leak"
        ],
        "maritime": [
            "fire", "medical", "evacuation", "man_overboard",
            "abandon_ship", "flooding", "hazmat_spill", "severe_weather"
        ]
    }

    def __init__(self):
        """Initialize with Gemini API"""
        api_key = settings.google_api_key or settings.gemini_api_key
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            print("⚠️ EAP Generator: No API key, using templates only")

    async def generate_eap(self, questionnaire: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point - Run 4-agent pipeline to generate EAP
        
        Returns complete EAP document with metadata
        """
        start_time = time.time()
        agent_outputs = {}
        
        try:
            # Agent 1: Analyze questionnaire
            print("🔍 EAP Agent 1: Analyzing questionnaire...")
            analysis = await self._agent1_analyze(questionnaire)
            agent_outputs["analyzer"] = analysis
            
            # Agent 2: Generate procedures
            print("📋 EAP Agent 2: Generating procedures...")
            procedures = await self._agent2_generate_procedures(questionnaire, analysis)
            agent_outputs["procedures"] = procedures
            
            # Agent 3: OSHA compliance check
            print("✅ EAP Agent 3: Checking OSHA compliance...")
            compliance = await self._agent3_check_compliance(questionnaire, procedures)
            agent_outputs["compliance"] = compliance
            
            # Agent 4: Assemble final document
            print("📄 EAP Agent 4: Assembling document...")
            document = await self._agent4_assemble_document(
                questionnaire, analysis, procedures, compliance
            )
            agent_outputs["document"] = {"sections": len(document.get("sections", []))}
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            
            return {
                "id": str(uuid.uuid4()),
                "questionnaire_id": questionnaire.get("id"),
                "eap_document": document,
                "osha_compliant": compliance.get("is_compliant", False),
                "completeness": compliance.get("completeness_score", 0),
                "procedure_count": len(procedures),
                "agent_outputs": agent_outputs,
                "generation_time_ms": elapsed_ms,
                "created_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"❌ EAP Generation failed: {e}")
            raise

    async def _agent1_analyze(self, questionnaire: Dict[str, Any]) -> Dict[str, Any]:
        """
        Agent 1: EAP Analyzer
        
        Analyzes questionnaire data to identify:
        - Missing critical information
        - Hazard severity rankings
        - Site-specific risks
        - Recommended emergency types
        """
        site_type = questionnaire.get("site_type", "construction")
        hazards = questionnaire.get("hazards", {})
        
        # Determine applicable emergencies based on site type and hazards
        applicable_emergencies = list(self.EMERGENCY_TYPES.get(site_type, self.EMERGENCY_TYPES["construction"]))
        
        # Add hazard-specific emergencies
        if hazards.get("fall_from_height"):
            if "fall_rescue" not in applicable_emergencies:
                applicable_emergencies.append("fall_rescue")
        if hazards.get("confined_space"):
            if "confined_space_rescue" not in applicable_emergencies:
                applicable_emergencies.append("confined_space_rescue")
        if hazards.get("excavation"):
            if "excavation_collapse" not in applicable_emergencies:
                applicable_emergencies.append("excavation_collapse")
        if hazards.get("hazardous_materials"):
            if "hazmat_spill" not in applicable_emergencies:
                applicable_emergencies.append("hazmat_spill")
        
        # Check for missing critical info
        missing_info = []
        required_fields = [
            ("company_name", "Company Name"),
            ("site_address", "Site Address"),
            ("emergency_coordinator", "Emergency Coordinator"),
            ("nearest_hospital", "Nearest Hospital"),
            ("primary_assembly", "Primary Assembly Area")
        ]
        
        for field, label in required_fields:
            if not questionnaire.get(field):
                missing_info.append(label)
        
        # Rank hazards by severity
        hazard_rankings = []
        hazard_severity = {
            "confined_space": 10,
            "fall_from_height": 9,
            "excavation": 9,
            "electrical": 8,
            "hazardous_materials": 8,
            "crane_operations": 7,
            "hot_work": 7,
            "heavy_equipment": 6,
            "noise": 3,
            "dust": 2
        }
        
        for hazard, present in hazards.items():
            if present:
                severity = hazard_severity.get(hazard, 5)
                hazard_rankings.append({
                    "hazard": hazard,
                    "severity": severity,
                    "requires_permit": hazard in ["confined_space", "excavation", "hot_work"]
                })
        
        hazard_rankings.sort(key=lambda x: x["severity"], reverse=True)
        
        return {
            "site_type": site_type,
            "applicable_emergencies": applicable_emergencies,
            "hazard_rankings": hazard_rankings,
            "missing_info": missing_info,
            "total_employees": questionnaire.get("total_employees", 0),
            "work_elevation": questionnaire.get("work_elevation", 0),
            "analysis_complete": len(missing_info) == 0
        }

    async def _agent2_generate_procedures(
        self, 
        questionnaire: Dict[str, Any], 
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Agent 2: Procedure Generator
        
        Generates emergency procedures for each applicable emergency type.
        Uses Gemini for intelligent generation with template fallback.
        """
        procedures = []
        applicable_emergencies = analysis.get("applicable_emergencies", [])
        
        for emergency_type in applicable_emergencies:
            procedure = await self._generate_single_procedure(
                emergency_type, questionnaire, analysis
            )
            procedures.append(procedure)
        
        return procedures

    async def _generate_single_procedure(
        self,
        emergency_type: str,
        questionnaire: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a single emergency procedure"""
        
        # Try Gemini first for intelligent generation
        if self.model:
            try:
                prompt = self._build_procedure_prompt(emergency_type, questionnaire, analysis)
                response = self.model.generate_content(prompt)
                
                # Parse JSON response
                text = response.text
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0]
                
                procedure = json.loads(text.strip())
                procedure["emergency_type"] = emergency_type
                procedure["generated_by"] = "gemini"
                return procedure
                
            except Exception as e:
                print(f"⚠️ Gemini procedure generation failed for {emergency_type}: {e}")
                # Fall through to template
        
        # Fallback to template
        return self._get_template_procedure(emergency_type, questionnaire)

    def _build_procedure_prompt(
        self,
        emergency_type: str,
        questionnaire: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> str:
        """Build prompt for Gemini procedure generation"""
        return f"""Generate an OSHA-compliant emergency procedure for: {emergency_type.upper().replace('_', ' ')}

SITE INFORMATION:
- Company: {questionnaire.get('company_name', 'Unknown')}
- Site Type: {questionnaire.get('site_type', 'construction')}
- Location: {questionnaire.get('site_address', 'Unknown')}, {questionnaire.get('city', '')}, {questionnaire.get('state', '')}
- Employees: {questionnaire.get('total_employees', 0)}
- Work Elevation: {questionnaire.get('work_elevation', 0)} feet

EMERGENCY COORDINATOR:
{json.dumps(questionnaire.get('emergency_coordinator', {}), indent=2)}

ASSEMBLY AREAS:
- Primary: {json.dumps(questionnaire.get('primary_assembly', {}), indent=2)}
- Secondary: {json.dumps(questionnaire.get('secondary_assembly', {}), indent=2)}

NEAREST HOSPITAL:
{json.dumps(questionnaire.get('nearest_hospital', {}), indent=2)}

Return a JSON object with this EXACT structure:
{{
    "title": "Procedure title",
    "priority": "high" | "medium" | "low",
    "steps": [
        {{
            "step_number": 1,
            "action": "Clear action description",
            "responsible_party": "Who does this",
            "time_frame": "Immediately" | "Within 5 minutes" | etc
        }}
    ],
    "equipment_needed": ["list of equipment"],
    "training_required": ["list of training"],
    "special_considerations": ["site-specific notes"]
}}

Generate 5-8 clear, actionable steps. Be OSHA-compliant."""

    def _get_template_procedure(
        self,
        emergency_type: str,
        questionnaire: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get fallback template procedure"""
        
        coordinator = questionnaire.get('emergency_coordinator', {})
        primary_assembly = questionnaire.get('primary_assembly', {})
        hospital = questionnaire.get('nearest_hospital', {})
        
        templates = {
            "fire": {
                "title": "Fire Emergency Procedure",
                "priority": "high",
                "steps": [
                    {"step_number": 1, "action": "Activate fire alarm or notify emergency coordinator", "responsible_party": "Discoverer", "time_frame": "Immediately"},
                    {"step_number": 2, "action": "Call 911 and report fire location and type", "responsible_party": "Supervisor", "time_frame": "Immediately"},
                    {"step_number": 3, "action": "Evacuate area using posted evacuation routes", "responsible_party": "All employees", "time_frame": "Immediately"},
                    {"step_number": 4, "action": "Use fire extinguisher ONLY if trained and fire is small", "responsible_party": "Trained personnel", "time_frame": "If safe to do so"},
                    {"step_number": 5, "action": "Proceed to assembly area and report for head count", "responsible_party": "All employees", "time_frame": "Within 5 minutes"},
                    {"step_number": 6, "action": "Account for all personnel and report to emergency coordinator", "responsible_party": "Supervisors", "time_frame": "Within 10 minutes"},
                    {"step_number": 7, "action": "Do not re-enter until authorized by fire department", "responsible_party": "All personnel", "time_frame": "Until cleared"}
                ],
                "equipment_needed": ["Fire extinguishers", "First aid kits", "Emergency contact list"],
                "training_required": ["Fire extinguisher use", "Evacuation routes", "Emergency response"],
                "special_considerations": ["Account for visitors and contractors"]
            },
            "medical": {
                "title": "Medical Emergency Procedure",
                "priority": "high",
                "steps": [
                    {"step_number": 1, "action": "Assess scene for safety before approaching", "responsible_party": "First responder", "time_frame": "Immediately"},
                    {"step_number": 2, "action": "Call 911 and provide location and nature of emergency", "responsible_party": "Designated caller", "time_frame": "Immediately"},
                    {"step_number": 3, "action": f"Notify emergency coordinator: {coordinator.get('name', 'Designated coordinator')}", "responsible_party": "Supervisor", "time_frame": "Immediately"},
                    {"step_number": 4, "action": "Provide first aid/CPR if trained and victim consents", "responsible_party": "Trained responder", "time_frame": "Immediately"},
                    {"step_number": 5, "action": "Clear path for emergency responders", "responsible_party": "Supervisor", "time_frame": "Before EMS arrival"},
                    {"step_number": 6, "action": "Designate guide to meet ambulance at entrance", "responsible_party": "Assigned personnel", "time_frame": "Before EMS arrival"},
                    {"step_number": 7, "action": "Document incident and notify safety manager", "responsible_party": "Supervisor", "time_frame": "Within 24 hours"}
                ],
                "equipment_needed": ["First aid kit", "AED", "Emergency contact cards", "PPE"],
                "training_required": ["First Aid/CPR", "AED operation", "Bloodborne pathogens"],
                "special_considerations": [f"Nearest hospital: {hospital.get('name', 'Local hospital')}"]
            },
            "evacuation": {
                "title": "General Evacuation Procedure",
                "priority": "high",
                "steps": [
                    {"step_number": 1, "action": "Sound evacuation alarm or announce evacuation", "responsible_party": "Emergency coordinator", "time_frame": "Immediately"},
                    {"step_number": 2, "action": "Secure critical operations if safe to do so", "responsible_party": "Operators", "time_frame": "Within 2 minutes"},
                    {"step_number": 3, "action": "Evacuate via nearest safe exit route", "responsible_party": "All personnel", "time_frame": "Immediately"},
                    {"step_number": 4, "action": f"Proceed to assembly area: {primary_assembly.get('location', 'Designated area')}", "responsible_party": "All personnel", "time_frame": "Within 5 minutes"},
                    {"step_number": 5, "action": "Supervisors conduct head count and report", "responsible_party": "Supervisors", "time_frame": "Within 10 minutes"},
                    {"step_number": 6, "action": "Report missing personnel to emergency coordinator", "responsible_party": "Supervisors", "time_frame": "Immediately"},
                    {"step_number": 7, "action": "Remain at assembly area until all-clear given", "responsible_party": "All personnel", "time_frame": "Until authorized"}
                ],
                "equipment_needed": ["Emergency flashlights", "Employee roster", "First aid kit"],
                "training_required": ["Evacuation routes", "Assembly procedures", "Head count"],
                "special_considerations": ["Assist mobility-impaired personnel", "Account for visitors"]
            },
            "severe_weather": {
                "title": "Severe Weather Emergency Procedure",
                "priority": "high",
                "steps": [
                    {"step_number": 1, "action": "Monitor weather alerts and forecasts", "responsible_party": "Safety coordinator", "time_frame": "Ongoing"},
                    {"step_number": 2, "action": "Alert workers of approaching severe weather", "responsible_party": "Supervisors", "time_frame": "When warning issued"},
                    {"step_number": 3, "action": "Secure loose materials and equipment", "responsible_party": "Work crews", "time_frame": "Before storm arrival"},
                    {"step_number": 4, "action": "Move to designated shelter area", "responsible_party": "All personnel", "time_frame": "When directed"},
                    {"step_number": 5, "action": "Stay away from windows and exterior walls", "responsible_party": "All personnel", "time_frame": "During storm"},
                    {"step_number": 6, "action": "Remain in shelter until all-clear given", "responsible_party": "All personnel", "time_frame": "Until authorized"},
                    {"step_number": 7, "action": "Inspect site for damage before resuming work", "responsible_party": "Supervisor", "time_frame": "After storm"}
                ],
                "equipment_needed": ["Weather radio", "Emergency supplies", "Flashlights", "First aid kit"],
                "training_required": ["Severe weather awareness", "Shelter procedures"],
                "special_considerations": ["Lightning safety", "Tornado shelter locations"]
            },
            "fall_rescue": {
                "title": "Fall Protection & Rescue Procedure",
                "priority": "high",
                "steps": [
                    {"step_number": 1, "action": "Alert emergency coordinator of fall arrest", "responsible_party": "Witness", "time_frame": "Immediately"},
                    {"step_number": 2, "action": "Call 911 if rescue cannot be completed in 15 minutes", "responsible_party": "Supervisor", "time_frame": "Immediately"},
                    {"step_number": 3, "action": "Initiate suspension trauma protocol", "responsible_party": "Trained rescuer", "time_frame": "Immediately"},
                    {"step_number": 4, "action": "Deploy rescue equipment per training", "responsible_party": "Rescue team", "time_frame": "Within 5 minutes"},
                    {"step_number": 5, "action": "Lower worker safely to ground or platform", "responsible_party": "Rescue team", "time_frame": "Within 15 minutes"},
                    {"step_number": 6, "action": "Position in W-position to prevent suspension trauma", "responsible_party": "Trained responder", "time_frame": "Immediately after rescue"},
                    {"step_number": 7, "action": "Provide medical evaluation and document incident", "responsible_party": "Medical personnel", "time_frame": "Same day"}
                ],
                "equipment_needed": ["Rescue kit", "Rope descent system", "Trauma straps", "First aid kit"],
                "training_required": ["Fall protection", "Rescue procedures", "Suspension trauma", "First aid"],
                "special_considerations": ["Suspension trauma can be fatal within 15-30 minutes"]
            },
            "confined_space_rescue": {
                "title": "Confined Space Rescue Procedure",
                "priority": "high",
                "steps": [
                    {"step_number": 1, "action": "Attendant raises alarm - DO NOT ENTER", "responsible_party": "Attendant", "time_frame": "Immediately"},
                    {"step_number": 2, "action": "Call 911 and notify emergency coordinator", "responsible_party": "Attendant", "time_frame": "Immediately"},
                    {"step_number": 3, "action": "Attempt non-entry rescue if possible", "responsible_party": "Attendant", "time_frame": "Immediately"},
                    {"step_number": 4, "action": "Only trained rescue team may enter permit-required space", "responsible_party": "Rescue team", "time_frame": "When ready"},
                    {"step_number": 5, "action": "Continuous atmospheric monitoring during rescue", "responsible_party": "Rescue team", "time_frame": "Throughout"},
                    {"step_number": 6, "action": "Extract victim using retrieval system", "responsible_party": "Rescue team", "time_frame": "As quickly as safe"},
                    {"step_number": 7, "action": "Provide immediate medical care", "responsible_party": "Medical personnel", "time_frame": "Upon extraction"}
                ],
                "equipment_needed": ["SCBA", "Gas monitor", "Retrieval system", "Communication devices", "First aid kit"],
                "training_required": ["Confined space entry", "Rescue procedures", "Respiratory protection", "First aid"],
                "special_considerations": ["60% of confined space fatalities are would-be rescuers"]
            }
        }
        
        if emergency_type in templates:
            template = templates[emergency_type].copy()
            template["emergency_type"] = emergency_type
            template["generated_by"] = "template"
            return template
        
        # Generic fallback
        return {
            "emergency_type": emergency_type,
            "title": f"{emergency_type.replace('_', ' ').title()} Emergency Procedure",
            "priority": "medium",
            "steps": [
                {"step_number": 1, "action": "Alert emergency coordinator", "responsible_party": "Discoverer", "time_frame": "Immediately"},
                {"step_number": 2, "action": "Call 911 if life-threatening", "responsible_party": "Supervisor", "time_frame": "Immediately"},
                {"step_number": 3, "action": "Evacuate affected area if needed", "responsible_party": "Supervisor", "time_frame": "As directed"},
                {"step_number": 4, "action": "Report to assembly area", "responsible_party": "All personnel", "time_frame": "When directed"},
                {"step_number": 5, "action": "Document incident", "responsible_party": "Supervisor", "time_frame": "Within 24 hours"}
            ],
            "equipment_needed": ["First aid kit", "Emergency contact list"],
            "training_required": ["Emergency response basics"],
            "special_considerations": ["Follow supervisor instructions"],
            "generated_by": "template"
        }

    async def _agent3_check_compliance(
        self,
        questionnaire: Dict[str, Any],
        procedures: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Agent 3: OSHA Compliance Checker
        
        Validates EAP against OSHA 1910.38 requirements.
        """
        requirements_met = []
        requirements_missing = []
        
        # Check each OSHA requirement
        osha_checks = {
            "emergency_escape_procedures": any(
                p["emergency_type"] in ["evacuation", "fire"] for p in procedures
            ),
            "emergency_escape_routes": bool(questionnaire.get("primary_assembly")),
            "procedures_for_critical_operations": any(
                p["emergency_type"] in ["fire", "hazmat_spill"] for p in procedures
            ),
            "employee_accounting_procedures": any(
                "head count" in str(p).lower() for p in procedures
            ),
            "rescue_and_medical_duties": any(
                p["emergency_type"] in ["medical", "fall_rescue", "confined_space_rescue"] 
                for p in procedures
            ),
            "reporting_emergencies": any(
                "911" in str(p) or "call" in str(p).lower() for p in procedures
            ),
            "emergency_contacts": bool(questionnaire.get("emergency_coordinator")),
            "alarm_system_description": bool(questionnaire.get("alarm_systems"))
        }
        
        for requirement, met in osha_checks.items():
            if met:
                requirements_met.append(requirement)
            else:
                requirements_missing.append(requirement)
        
        completeness_score = int((len(requirements_met) / len(self.OSHA_REQUIREMENTS)) * 100)
        is_compliant = completeness_score >= 75
        
        return {
            "is_compliant": is_compliant,
            "completeness_score": completeness_score,
            "requirements_met": requirements_met,
            "requirements_missing": requirements_missing,
            "osha_standard": "29 CFR 1910.38",
            "recommendation": "Compliant - EAP meets OSHA requirements" if is_compliant 
                else f"Address missing requirements: {', '.join(requirements_missing)}"
        }

    async def _agent4_assemble_document(
        self,
        questionnaire: Dict[str, Any],
        analysis: Dict[str, Any],
        procedures: List[Dict[str, Any]],
        compliance: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Agent 4: Document Assembler
        
        Compiles all components into final EAP document structure.
        """
        document = {
            "title": f"Emergency Action Plan - {questionnaire.get('company_name', 'Site')}",
            "version": "1.0",
            "effective_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "site_info": {
                "company": questionnaire.get("company_name"),
                "address": questionnaire.get("site_address"),
                "city": questionnaire.get("city"),
                "state": questionnaire.get("state"),
                "zip": questionnaire.get("zip_code"),
                "site_type": questionnaire.get("site_type"),
                "total_employees": questionnaire.get("total_employees")
            },
            "sections": []
        }
        
        # Section 1: Purpose and Scope
        document["sections"].append({
            "number": 1,
            "title": "Purpose and Scope",
            "content": f"""This Emergency Action Plan (EAP) establishes procedures for {questionnaire.get('company_name', 'this organization')} 
to protect employees and visitors during emergency situations at {questionnaire.get('site_address', 'this location')}, 
{questionnaire.get('city', '')}, {questionnaire.get('state', '')}. 

This plan applies to all {questionnaire.get('total_employees', 0)} employees and any contractors, visitors, 
or other persons on site. This EAP complies with OSHA 29 CFR 1910.38 requirements."""
        })
        
        # Section 2: Emergency Contacts
        coordinator = questionnaire.get("emergency_coordinator", {})
        alternate = questionnaire.get("alternate_coordinator", {})
        document["sections"].append({
            "number": 2,
            "title": "Emergency Contacts",
            "content": {
                "emergency_services": {
                    "fire_ems_police": "911",
                    "poison_control": "1-800-222-1222"
                },
                "site_emergency_coordinator": coordinator,
                "alternate_coordinator": alternate,
                "medical_facilities": {
                    "hospital": questionnaire.get("nearest_hospital", {}),
                    "fire_station": questionnaire.get("fire_station", {}),
                    "police": questionnaire.get("local_police", {})
                }
            }
        })
        
        # Section 3: Alarm Systems
        document["sections"].append({
            "number": 3,
            "title": "Alarm Systems and Communication",
            "content": {
                "alarm_systems": questionnaire.get("alarm_systems", []),
                "radio_channel": questionnaire.get("radio_channel"),
                "notification_procedures": "Upon discovery of an emergency, immediately notify the Emergency Coordinator and activate appropriate alarm."
            }
        })
        
        # Section 4: Evacuation
        document["sections"].append({
            "number": 4,
            "title": "Evacuation Procedures",
            "content": {
                "primary_assembly_area": questionnaire.get("primary_assembly", {}),
                "secondary_assembly_area": questionnaire.get("secondary_assembly", {}),
                "evacuation_routes": "Posted throughout site - know your nearest exit",
                "accountability": "Supervisors conduct head count at assembly area and report to Emergency Coordinator"
            }
        })
        
        # Section 5: Emergency Procedures (all generated procedures)
        procedure_section = {
            "number": 5,
            "title": "Emergency-Specific Procedures",
            "procedures": procedures
        }
        document["sections"].append(procedure_section)
        
        # Section 6: Rescue Operations
        document["sections"].append({
            "number": 6,
            "title": "Rescue and Medical Operations",
            "content": {
                "rescue_option": questionnaire.get("rescue_option", "external"),
                "rescue_capability": questionnaire.get("rescue_capability", ""),
                "medical_duties": "First aid trained personnel provide initial care until EMS arrives",
                "first_aid_locations": "First aid kits located at jobsite trailer and each work floor"
            }
        })
        
        # Section 7: Training
        document["sections"].append({
            "number": 7,
            "title": "Training Requirements",
            "content": {
                "initial_training": "All employees receive EAP training upon hire",
                "annual_refresher": "Annual review of emergency procedures",
                "drill_frequency": "Evacuation drills conducted quarterly",
                "specialized_training": [
                    "First Aid/CPR for designated responders",
                    "Fire extinguisher use",
                    "Confined space rescue (if applicable)",
                    "Fall protection rescue (if applicable)"
                ]
            }
        })
        
        # Section 8: Plan Review
        document["sections"].append({
            "number": 8,
            "title": "Plan Maintenance",
            "content": {
                "review_frequency": "Annual review or when conditions change",
                "responsible_party": coordinator.get("name", "Emergency Coordinator"),
                "distribution": "Posted at main entrance and in break areas",
                "version_history": [
                    {"version": "1.0", "date": datetime.utcnow().strftime("%Y-%m-%d"), "changes": "Initial document"}
                ]
            }
        })
        
        # Add compliance summary
        document["compliance"] = compliance
        
        return document


# Singleton instance
_eap_service = None

def get_eap_service() -> EAPGeneratorService:
    """Get or create EAP Generator service instance"""
    global _eap_service
    if _eap_service is None:
        _eap_service = EAPGeneratorService()
    return _eap_service
