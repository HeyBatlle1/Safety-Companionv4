from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Index, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from datetime import datetime
import uuid
from app.models.base import Base

class Company(Base):
    """Companies - matches Drizzle companies table"""
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    industry = Column(Text)
    naics_code = Column(Text, name="naics_code")
    address = Column(Text)
    city = Column(Text)
    state = Column(Text)
    zip_code = Column(Text, name="zip_code")
    phone = Column(Text)
    email = Column(Text)
    website = Column(Text)
    license_number = Column(Text, name="license_number")
    insurance_info = Column(JSONB, name="insurance_info")
    safety_rating = Column(Numeric(3, 2), name="safety_rating")
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)


class Project(Base):
    """Projects - matches Drizzle projects table"""
    __tablename__ = "projects"
    __table_args__ = (
        Index('projects_company_id_idx', 'company_id'),
        Index('projects_status_idx', 'status'),
        Index('projects_created_at_idx', 'created_at'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    project_type = Column(Text, name="project_type")
    status = Column(Text, default='planning', nullable=False)
    start_date = Column(DateTime(timezone=True), name="start_date")
    end_date = Column(DateTime(timezone=True), name="end_date")
    location = Column(Text)
    site_address = Column(Text, name="site_address")
    project_manager = Column(Text, name="project_manager")
    budget = Column(Numeric(12, 2))
    crew_size = Column(Integer, name="crew_size")
    hazard_profile = Column(JSONB, name="hazard_profile")
    safety_requirements = Column(ARRAY(Text), name="safety_requirements")
    metadata_json = Column(JSONB, name="metadata")
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)