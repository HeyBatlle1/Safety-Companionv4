"""
AGENT 5: MULTIMODAL VISION ANALYZER

Purpose: Analyze photos/documents from field updates to detect:
- Equipment conditions (rust, damage, certifications)
- PPE status (fraying, expiration, compliance)
- Site hazards (unguarded edges, power lines, housekeeping)
- Document data (shop drawings, task lists, specs)

Supports:
- Google Gemini 2.0 Flash (development)
- Anthropic Claude Sonnet 4 (production)

Temperature: 0.3 (Precise detection)
Max Tokens: 16,000 (Detailed analysis)
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.services.vision_client import VisionClient, VisionProvider, ImageInput, DocumentInput


# ═══════════════════════════════════════════════════════════════════════════════
# VISION ANALYSIS PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

EQUIPMENT_INSPECTION_PROMPT = """You are a certified construction safety inspector analyzing equipment photos.

EQUIPMENT CONTEXT:
{equipment_context}

ANALYZE THIS IMAGE FOR:

1. IDENTIFICATION
   - Equipment type/model (if visible)
   - Manufacturer markings
   - Load capacity placards
   - Certification stickers/tags
   - Serial numbers or asset tags

2. CONDITION ASSESSMENT
   - Structural integrity (rust, cracks, dents, deformation)
   - Moving parts (wear, alignment, lubrication)
   - Safety devices (guards, limits, alarms, lockouts)
   - Hydraulic/pneumatic lines (leaks, abrasion, wear)
   - Electrical components (fraying, exposure, covers)

3. COMPLIANCE CHECK
   - OSHA required markings visible?
   - Inspection tags current? (Date visible?)
   - Safety colors/warnings present?
   - Proper setup (outriggers, brakes, wheel chocks)?
   - Operating within rated capacity?

4. HAZARDS DETECTED
   - Unsafe positioning or placement
   - Missing safety features or guards
   - Proximity to power lines (minimum clearances)
   - Unstable ground or surface conditions
   - Inadequate clearances for operation

Return ONLY valid JSON:
{{
  "equipment_identified": "Type and model if visible",
  "overall_status": "PASS|CONCERN|FAIL",
  "confidence": 0.85,
  "visible_elements": [
    {{"element": "description", "status": "VISIBLE|PARTIALLY_VISIBLE|NOT_VISIBLE"}}
  ],
  "condition_findings": [
    {{
      "component": "Hydraulic line",
      "condition": "Wear visible on outer sheath",
      "severity": "MEDIUM",
      "location_in_image": "Center-left, yellow arrow recommended",
      "action_required": "Inspect closeup before operation"
    }}
  ],
  "compliance_issues": [
    {{
      "requirement": "OSHA 1926.1400 - Crane certification",
      "status": "UNVERIFIED",
      "reason": "Certification sticker not visible in photo",
      "action": "Verify sticker on operator-side of equipment"
    }}
  ],
  "immediate_hazards": [
    {{
      "hazard": "Proximity to overhead power lines",
      "severity": "CRITICAL",
      "estimated_distance": "Appears <20 feet",
      "osha_reference": "OSHA 1926.1408",
      "action": "Verify clearances before operation"
    }}
  ],
  "positive_observations": ["List of good safety practices observed"]
}}

CRITICAL: Respond with parseable JSON only. Be specific about locations in image."""


PPE_INSPECTION_PROMPT = """You are a certified safety inspector analyzing Personal Protective Equipment (PPE).

TASK CONTEXT:
{task_context}

REQUIRED PPE FOR THIS TASK:
{required_ppe}

FOR EACH PIECE OF PPE VISIBLE, ANALYZE:

1. IDENTIFICATION
   - PPE type (hard hat, harness, gloves, boots, eye protection, etc.)
   - Brand/model if visible
   - Color and markings

2. PHYSICAL CONDITION
   - Straps: Look for fraying, cuts, stretch, sun damage
   - Hardware: Corrosion, cracks, missing parts, bent components
   - Webbing/fabric: Tears, burns, oil/chemical contamination
   - D-rings/buckles: Damage, distortion, gate function
   - Shells/bodies: Cracks, dents, chalking, fading

3. COMPLIANCE INDICATORS
   - Inspection tags visible and current?
   - Expiration dates readable?
   - ANSI/OSHA ratings visible?
   - Manufacturer labels intact?

4. USAGE STATUS
   - Worn correctly?
   - Properly adjusted?
   - All components connected?

RATING SCALE:
- PASS = Good condition, compliant, safe to use
- CONCERN = Minor issues requiring supervisor review
- FAIL = Must be removed from service immediately

Return ONLY valid JSON:
{{
  "total_items_inspected": 4,
  "summary": {{
    "pass": 2,
    "concern": 1,
    "fail": 1
  }},
  "ppe_items": [
    {{
      "item_number": 1,
      "type": "Fall arrest harness",
      "owner_visible": "Badge shows 'John'",
      "status": "PASS",
      "findings": [
        {{"component": "D-ring", "condition": "Intact, no corrosion", "status": "OK"}},
        {{"component": "Straps", "condition": "No visible fraying", "status": "OK"}},
        {{"component": "Inspection tag", "condition": "Visible, EXP 06/2025", "status": "OK"}}
      ],
      "action_required": null
    }},
    {{
      "item_number": 2,
      "type": "Fall arrest harness",
      "owner_visible": "Badge shows 'Dave'",
      "status": "FAIL",
      "findings": [
        {{"component": "Inspection tag", "condition": "EXPIRED 03/2024", "status": "FAIL"}}
      ],
      "action_required": "REMOVE FROM SERVICE - Inspection expired 9+ months ago"
    }}
  ],
  "missing_ppe": ["List any required PPE not visible"],
  "recommendations": ["General recommendations based on inspection"]
}}

CRITICAL: Flag ANY expired inspection tags as FAIL. Respond with parseable JSON only."""


SITE_HAZARD_PROMPT = """You are a certified construction safety inspector analyzing a job site photo.

WORK CONTEXT:
{work_context}

SCAN THIS IMAGE FOR HAZARDS IN THESE CATEGORIES:

1. FALL HAZARDS (OSHA 1926 Subpart M)
   - Unprotected edges (>6 feet)
   - Floor holes or openings
   - Ladders (angle, securing, extension, 3-point contact)
   - Scaffolding (guardrails, planking, tagging)
   - Roof work without protection
   - Open excavations

2. STRUCK-BY HAZARDS (OSHA 1926 Subpart N)
   - Overhead loads or suspended materials
   - Moving equipment (swing radius, backing)
   - Falling object risk (tools, materials)
   - Crane operations (load paths, signals)
   - Vehicle traffic patterns

3. ELECTRICAL HAZARDS (OSHA 1926 Subpart K)
   - Overhead power lines (minimum clearances)
   - Extension cords (condition, GFCI)
   - Temporary power (panel covers, grounding)
   - Wet conditions near electricity

4. CAUGHT-IN/BETWEEN HAZARDS (OSHA 1926 Subpart P)
   - Trenches/excavations (shoring, sloping)
   - Equipment pinch points
   - Rotating equipment
   - Confined spaces

5. ENVIRONMENTAL CONDITIONS
   - Weather visible (wet surfaces, ice, wind indicators)
   - Lighting conditions
   - Visibility issues

6. HOUSEKEEPING & ACCESS
   - Tripping hazards (cords, debris, materials)
   - Clear access/egress paths
   - Material storage organization
   - Fire lane access

7. POSITIVE OBSERVATIONS
   - Proper barricading
   - PPE in use
   - Organized work areas
   - Safety signage

Return ONLY valid JSON:
{{
  "overall_site_status": "SAFE|CONCERN|STOP_WORK",
  "hazard_count": {{
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 2
  }},
  "hazards_identified": [
    {{
      "category": "FALL",
      "description": "Ladder positioned less than 3 feet from unprotected edge",
      "severity": "HIGH",
      "location_in_image": "Right side of frame, near scaffolding",
      "osha_reference": "1926.1053(b)(1)",
      "immediate_action": "Reposition ladder minimum 4 feet from edge",
      "mark_on_image": "Circle in red"
    }},
    {{
      "category": "STRUCK_BY",
      "description": "Worker without hard hat in active work zone",
      "severity": "CRITICAL",
      "location_in_image": "Center of frame, blue shirt",
      "osha_reference": "1926.100(a)",
      "immediate_action": "All workers must wear hard hats in work zone",
      "mark_on_image": "Circle in red"
    }}
  ],
  "positive_observations": [
    {{
      "observation": "Work zone properly barricaded with caution tape",
      "location_in_image": "Perimeter of work area"
    }}
  ],
  "environmental_conditions": {{
    "weather_visible": "Clear sky, dry conditions",
    "ground_conditions": "Concrete, appears wet from recent rain",
    "lighting": "Daylight, adequate visibility"
  }},
  "recommended_actions": [
    {{
      "priority": "IMMEDIATE",
      "action": "Relocate ladder 4ft from edge",
      "hazard_addressed": "Fall hazard"
    }}
  ]
}}

CRITICAL: Mark severity as CRITICAL for any imminent danger. Respond with parseable JSON only."""


MATERIAL_STORAGE_PROMPT = """You are a certified safety inspector analyzing material storage conditions.

MATERIAL CONTEXT:
{material_context}

ANALYZE THIS STORAGE AREA FOR:

1. STORAGE METHOD
   - Correct orientation (panels vertical vs horizontal?)
   - Appropriate racks/supports
   - Weight distribution
   - Stacking height

2. STABILITY
   - Level surface
   - Secure restraints
   - Tipping hazards
   - Load paths clear

3. PROTECTION
   - Weather protection
   - Edge protection (glass, panels)
   - Contamination prevention
   - UV/sun exposure

4. ACCESS & HANDLING
   - Clear access paths
   - Lifting/handling space
   - Signage (weights, hazards)
   - FIFO organization if applicable

5. HAZARDOUS MATERIALS (if applicable)
   - Proper containment
   - SDS availability
   - Separation from incompatibles
   - Ventilation

Return ONLY valid JSON:
{{
  "storage_status": "ACCEPTABLE|NEEDS_IMPROVEMENT|UNSAFE",
  "material_identified": "Glass panels on A-frame rack",
  "good_practices": [
    "Panels stored vertically (correct for glass)",
    "A-frame rack used (appropriate support)",
    "Protected from weather (under cover)"
  ],
  "concerns": [
    {{
      "issue": "Storage rack appears on slight incline",
      "severity": "MEDIUM",
      "risk": "Tipping hazard if bumped",
      "action": "Level the rack or add restraints"
    }},
    {{
      "issue": "No visible restraint straps",
      "severity": "HIGH",
      "risk": "Panels could shift during access",
      "action": "Add restraint straps to secure panels"
    }}
  ],
  "missing_elements": [
    "Edge protection foam on panel edges",
    "Weight/handling warning signs",
    "FRAGILE signage"
  ],
  "recommendations": [
    "Level storage rack surface",
    "Add restraint straps",
    "Apply edge protection",
    "Post warning signs"
  ]
}}

CRITICAL: Respond with parseable JSON only."""


SHOP_DRAWING_PROMPT = """You are analyzing construction shop drawings/documents for safety-relevant information.

DOCUMENT CONTEXT:
{document_context}

EXTRACT THE FOLLOWING INFORMATION:

1. DIMENSIONS & WEIGHTS
   - Component sizes
   - Individual weights
   - Total assembly weights
   - Critical dimensions for handling

2. INSTALLATION METHODS
   - Attachment/connection methods
   - Lifting points
   - Rigging requirements
   - Sequence of installation

3. LOAD REQUIREMENTS
   - Design loads
   - Safety factors
   - Load distribution points
   - Maximum capacities

4. MATERIAL SPECIFICATIONS
   - Material types
   - Fragile components
   - Special handling requirements
   - Storage requirements

5. SAFETY IMPLICATIONS
   - Based on extracted data, what equipment is needed?
   - What certifications are required?
   - What PPE is required?
   - What fall protection is needed?

MAP TO REGULATIONS:
- OSHA 1926 requirements
- ANSI standards referenced
- Manufacturer requirements

Return ONLY valid JSON:
{{
  "document_type": "Shop drawing for glass curtainwall panels",
  "extracted_specifications": {{
    "panel_dimensions": "8ft x 12ft",
    "panel_weight": "1,200 lbs",
    "total_panels": 24,
    "installation_height": "45 feet AGL",
    "attachment_method": "4-point lifting harness"
  }},
  "lifting_requirements": {{
    "total_load": "1,200 lbs per panel",
    "crane_capacity_needed": ">1,500 lbs at reach",
    "rigging_capacity": "1,500 lbs minimum (with safety factor)",
    "lift_points": 4,
    "load_per_point": "300 lbs"
  }},
  "safety_requirements": {{
    "certifications_required": [
      "NCCCO crane operator certification",
      "Rigging qualification",
      "Signal person certification"
    ],
    "ppe_required": [
      "Fall protection harness (>6ft work height)",
      "Hard hat",
      "Safety glasses",
      "Cut-resistant gloves (glass handling)"
    ],
    "equipment_requirements": [
      "Crane rated >1,500 lbs at 45ft",
      "4-point rigging harness for glass",
      "Tag lines for load control",
      "Edge protection at installation point"
    ]
  }},
  "osha_compliance": [
    {{
      "standard": "1926.502",
      "requirement": "Fall protection required at heights >6 feet",
      "application": "All workers at 45ft installation point"
    }},
    {{
      "standard": "1926.251",
      "requirement": "Rigging must be rated equipment",
      "application": "1,200 lb load requires rated rigging"
    }},
    {{
      "standard": "1926.1400",
      "requirement": "Crane operators must be certified",
      "application": "Required for lift operation"
    }}
  ],
  "critical_notes": [
    "Wind loading critical at 45ft height",
    "Panels over 1,000 lbs require rigging plan",
    "Multi-story lift requires communication plan"
  ]
}}

CRITICAL: Extract specific numbers and specifications. Respond with parseable JSON only."""


# ═══════════════════════════════════════════════════════════════════════════════
# AGENT 5 CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class Agent5VisionAnalyzer:
    """
    Multimodal Vision Analyzer Agent
    
    Analyzes photos and documents from field updates to detect:
    - Equipment conditions and compliance
    - PPE status and expiration
    - Site hazards and unsafe conditions
    - Document specifications and requirements
    
    Supports:
    - Google Gemini 2.0 Flash (development/testing)
    - Anthropic Claude Sonnet 4 (production)
    """
    
    def __init__(
        self,
        provider: VisionProvider = VisionProvider.GOOGLE,
        model: Optional[str] = None
    ):
        self.vision_client = VisionClient(provider=provider, model=model)
        self.temperature = 0.3  # Precise detection
        self.max_tokens = 16000
    
    async def analyze_equipment(
        self,
        image: ImageInput,
        equipment_context: str = "Construction equipment"
    ) -> Dict[str, Any]:
        """
        Analyze equipment photo for conditions, compliance, hazards.
        
        Args:
            image: ImageInput with equipment photo
            equipment_context: Description of equipment and its use
            
        Returns:
            Equipment analysis with status, findings, actions
        """
        prompt = EQUIPMENT_INSPECTION_PROMPT.format(
            equipment_context=equipment_context
        )
        
        result = await self.vision_client.analyze_image(
            image=image,
            prompt=prompt,
            temperature=self.temperature,
            max_tokens=4096
        )
        
        result["analysis_type"] = "equipment_inspection"
        result["analyzed_at"] = datetime.utcnow().isoformat()
        
        return result
    
    async def analyze_ppe(
        self,
        images: List[ImageInput],
        task_context: str = "Construction work",
        required_ppe: str = "Hard hat, safety glasses, harness, gloves, high-vis"
    ) -> Dict[str, Any]:
        """
        Analyze PPE photos for condition, expiration, compliance.
        
        Args:
            images: List of ImageInputs showing PPE items
            task_context: Description of work being performed
            required_ppe: Required PPE for this task
            
        Returns:
            PPE analysis with pass/concern/fail ratings
        """
        prompt = PPE_INSPECTION_PROMPT.format(
            task_context=task_context,
            required_ppe=required_ppe
        )
        
        result = await self.vision_client.analyze_images(
            images=images,
            prompt=prompt,
            temperature=self.temperature,
            max_tokens=8192
        )
        
        result["analysis_type"] = "ppe_inspection"
        result["analyzed_at"] = datetime.utcnow().isoformat()
        
        return result
    
    async def analyze_site(
        self,
        image: ImageInput,
        work_context: str = "Active construction site"
    ) -> Dict[str, Any]:
        """
        Analyze site photo for hazards, conditions, compliance.
        
        Args:
            image: ImageInput with site overview photo
            work_context: Description of work activities
            
        Returns:
            Site hazard analysis with severity rankings
        """
        prompt = SITE_HAZARD_PROMPT.format(
            work_context=work_context
        )
        
        result = await self.vision_client.analyze_image(
            image=image,
            prompt=prompt,
            temperature=self.temperature,
            max_tokens=8192
        )
        
        result["analysis_type"] = "site_hazard_detection"
        result["analyzed_at"] = datetime.utcnow().isoformat()
        
        return result
    
    async def analyze_materials(
        self,
        image: ImageInput,
        material_context: str = "Construction materials storage"
    ) -> Dict[str, Any]:
        """
        Analyze material storage photo for safety concerns.
        
        Args:
            image: ImageInput with material storage photo
            material_context: Description of materials being stored
            
        Returns:
            Storage analysis with concerns and recommendations
        """
        prompt = MATERIAL_STORAGE_PROMPT.format(
            material_context=material_context
        )
        
        result = await self.vision_client.analyze_image(
            image=image,
            prompt=prompt,
            temperature=self.temperature,
            max_tokens=4096
        )
        
        result["analysis_type"] = "material_storage"
        result["analyzed_at"] = datetime.utcnow().isoformat()
        
        return result
    
    async def analyze_document(
        self,
        document: DocumentInput,
        document_context: str = "Construction shop drawings"
    ) -> Dict[str, Any]:
        """
        Analyze shop drawings/documents for specifications.
        
        Args:
            document: DocumentInput with PDF
            document_context: Description of document type
            
        Returns:
            Extracted specifications with safety requirements
        """
        prompt = SHOP_DRAWING_PROMPT.format(
            document_context=document_context
        )
        
        result = await self.vision_client.analyze_document(
            document=document,
            prompt=prompt,
            temperature=self.temperature,
            max_tokens=8192
        )
        
        result["analysis_type"] = "document_extraction"
        result["analyzed_at"] = datetime.utcnow().isoformat()
        
        return result
    
    async def analyze_full_update(
        self,
        text_update: str,
        images: Optional[List[ImageInput]] = None,
        documents: Optional[List[DocumentInput]] = None,
        existing_jha_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive multimodal analysis of a JHA update.
        
        Processes text, images, and documents together to create
        a complete picture of current site conditions.
        
        Args:
            text_update: Natural language update from foreman
            images: List of site/equipment/PPE photos
            documents: List of shop drawings/task lists
            existing_jha_context: Current JHA context for reference
            
        Returns:
            Complete analysis with all findings synthesized
        """
        
        results = {
            "update_received_at": datetime.utcnow().isoformat(),
            "text_update": text_update,
            "image_count": len(images) if images else 0,
            "document_count": len(documents) if documents else 0,
            "analyses": {},
            "synthesis": {}
        }
        
        # 1. Analyze images by category
        if images:
            for img in images:
                category = img.category or "general"
                
                if category == "equipment":
                    results["analyses"]["equipment"] = await self.analyze_equipment(
                        image=img,
                        equipment_context=f"{text_update} - Equipment photo"
                    )
                elif category == "ppe":
                    results["analyses"]["ppe"] = await self.analyze_ppe(
                        images=[img],
                        task_context=text_update
                    )
                elif category == "site":
                    results["analyses"]["site"] = await self.analyze_site(
                        image=img,
                        work_context=text_update
                    )
                elif category == "materials":
                    results["analyses"]["materials"] = await self.analyze_materials(
                        image=img,
                        material_context=text_update
                    )
                else:
                    # Default to site analysis
                    if "site" not in results["analyses"]:
                        results["analyses"]["site"] = await self.analyze_site(
                            image=img,
                            work_context=text_update
                        )
        
        # 2. Analyze documents
        if documents:
            doc_analyses = []
            for doc in documents:
                analysis = await self.analyze_document(
                    document=doc,
                    document_context=f"{text_update} - {doc.filename}"
                )
                doc_analyses.append(analysis)
            results["analyses"]["documents"] = doc_analyses
        
        # 3. Synthesize findings
        results["synthesis"] = self._synthesize_findings(results["analyses"])
        
        return results
    
    def _synthesize_findings(self, analyses: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize all analysis findings into unified summary"""
        
        critical_actions = []
        all_hazards = []
        all_concerns = []
        positive_observations = []
        
        # Extract from equipment analysis
        if "equipment" in analyses:
            eq = analyses["equipment"]
            if eq.get("overall_status") == "FAIL":
                critical_actions.append({
                    "category": "Equipment",
                    "action": "Do not operate - equipment failed inspection",
                    "priority": "IMMEDIATE"
                })
            for hazard in eq.get("immediate_hazards", []):
                all_hazards.append(hazard)
            for finding in eq.get("condition_findings", []):
                if finding.get("severity") in ["CRITICAL", "HIGH"]:
                    all_concerns.append(finding)
            for obs in eq.get("positive_observations", []):
                positive_observations.append({"type": "Equipment", "observation": obs})
        
        # Extract from PPE analysis
        if "ppe" in analyses:
            ppe = analyses["ppe"]
            for item in ppe.get("ppe_items", []):
                if item.get("status") == "FAIL":
                    critical_actions.append({
                        "category": "PPE",
                        "action": item.get("action_required", "Remove from service"),
                        "priority": "IMMEDIATE",
                        "details": f"{item.get('type')} - {item.get('owner_visible', 'Unknown owner')}"
                    })
        
        # Extract from site analysis
        if "site" in analyses:
            site = analyses["site"]
            if site.get("overall_site_status") == "STOP_WORK":
                critical_actions.insert(0, {
                    "category": "Site",
                    "action": "STOP WORK - Critical hazards detected",
                    "priority": "IMMEDIATE"
                })
            for hazard in site.get("hazards_identified", []):
                all_hazards.append(hazard)
            for obs in site.get("positive_observations", []):
                positive_observations.append({"type": "Site", "observation": obs.get("observation", str(obs))})
        
        # Extract from material analysis
        if "materials" in analyses:
            mat = analyses["materials"]
            if mat.get("storage_status") == "UNSAFE":
                critical_actions.append({
                    "category": "Materials",
                    "action": "Correct storage issues before handling",
                    "priority": "BEFORE_WORK"
                })
            for concern in mat.get("concerns", []):
                all_concerns.append(concern)
        
        # Calculate overall risk impact
        critical_count = len([h for h in all_hazards if h.get("severity") == "CRITICAL"])
        high_count = len([h for h in all_hazards if h.get("severity") == "HIGH"])
        
        if critical_count > 0:
            risk_impact = "STOP_WORK"
            decision = "NO_GO"
        elif high_count > 2:
            risk_impact = "HIGH"
            decision = "GO_WITH_CONDITIONS"
        elif high_count > 0 or len(all_concerns) > 3:
            risk_impact = "ELEVATED"
            decision = "GO_WITH_CONDITIONS"
        else:
            risk_impact = "ACCEPTABLE"
            decision = "GO"
        
        return {
            "overall_risk_impact": risk_impact,
            "recommended_decision": decision,
            "critical_actions": critical_actions,
            "hazards_detected": all_hazards,
            "concerns_noted": all_concerns,
            "positive_observations": positive_observations,
            "hazard_summary": {
                "critical": critical_count,
                "high": high_count,
                "medium": len([h for h in all_hazards if h.get("severity") == "MEDIUM"]),
                "low": len([h for h in all_hazards if h.get("severity") == "LOW"])
            }
        }
