"""
EAP (Emergency Action Plan) Models

SQLAlchemy models for EAP questionnaires and generated plans.
Supporting the 4-agent EAP generation pipeline.
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean, JSON
from datetime import datetime
import uuid
from app.models.base import Base, APP_SCHEMA


class EAPQuestionnaire(Base):
    """EAP Questionnaire - collects site and emergency information"""
    __tablename__ = "eap_questionnaires"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Removed FK constraint due to type mismatch with existing Neon table (UUID vs String)
    analysis_id = Column(String, nullable=True)
    
    # Company Info
    company_name = Column(Text, nullable=False)
    site_address = Column(Text, nullable=False)
    city = Column(Text, nullable=False)
    state = Column(Text, nullable=False)
    zip_code = Column(String(10), nullable=True)
    
    # Site Details
    site_type = Column(Text, nullable=False)  # 'construction' | 'general_industry' | 'maritime'
    building_type = Column(Text, nullable=True)
    building_height = Column(Integer, nullable=True)
    work_elevation = Column(Integer, nullable=True)
    total_employees = Column(Integer, nullable=False)
    project_description = Column(Text, nullable=True)
    construction_phase = Column(Text, nullable=True)
    
    # Hazards (stored as JSON for flexibility)
    hazards = Column(JSON, nullable=False, default=dict)  # {fallFromHeight: bool, confinedSpace: bool, ...}
    equipment = Column(JSON, nullable=False, default=list)  # string[]
    weather_concerns = Column(JSON, nullable=False, default=list)  # string[]
    
    # Emergency Contacts (JSON objects)
    emergency_coordinator = Column(JSON, nullable=False)  # {name, title, phone, email}
    alternate_coordinator = Column(JSON, nullable=False)
    
    # Facilities (JSON objects)
    nearest_hospital = Column(JSON, nullable=False)  # {name, address, phone, distance}
    fire_station = Column(JSON, nullable=False)
    local_police = Column(JSON, nullable=False)
    
    # Assembly Areas (JSON objects)
    primary_assembly = Column(JSON, nullable=False)  # {location, description, capacity}
    secondary_assembly = Column(JSON, nullable=False)
    
    # Safety Systems
    alarm_systems = Column(JSON, nullable=False, default=list)  # [{type, location, activation}]
    radio_channel = Column(Text, nullable=True)
    rescue_option = Column(Text, nullable=True)  # 'internal' | 'external' | 'both'
    rescue_capability = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class GeneratedEAP(Base):
    """Generated Emergency Action Plan - output from 4-agent pipeline"""
    __tablename__ = "generated_eaps"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    questionnaire_id = Column(String, ForeignKey('eap_questionnaires.id', ondelete='CASCADE'), nullable=False)
    
    # Generated Document (complete EAP as JSON)
    eap_document = Column(JSON, nullable=False)
    
    # Metadata
    osha_compliant = Column(Boolean, nullable=False, default=False)
    completeness = Column(Integer, nullable=False, default=0)  # 0-100%
    procedure_count = Column(Integer, nullable=False, default=0)
    
    # Agent outputs (for debugging/auditing)
    agent_outputs = Column(JSON, nullable=True)  # {agent1: {...}, agent2: {...}, ...}
    
    # Processing time
    generation_time_ms = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
