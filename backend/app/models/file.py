from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base

class FileMetadata(Base):
    __tablename__ = "file_metadata"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    path = Column(String, unique=True, index=True)
    size = Column(Integer)
    type = Column(String)
    extension = Column(String, index=True)
    modified_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    category = Column(String, index=True, nullable=True)
    is_directory = Column(Boolean, default=False)
    parent_id = Column(String, ForeignKey("file_metadata.id"), nullable=True)
    checksum = Column(String, nullable=True)
    
class FileOperation(Base):
    __tablename__ = "file_operations"
    
    id = Column(String, primary_key=True, index=True)
    operation_type = Column(String)  # move, copy, delete, rename, organize
    status = Column(String, default="pending")  # pending, in_progress, completed, failed
    source_path = Column(String)
    target_path = Column(String, nullable=True)
    progress = Column(Float, default=0.0)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
