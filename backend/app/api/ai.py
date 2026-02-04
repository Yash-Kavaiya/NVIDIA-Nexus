from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

class AnalyzeRequest(BaseModel):
    paths: List[str]

class PlanRequest(BaseModel):
    goal: str
    files: List[str] = []

class SynthesizeRequest(BaseModel):
    paths: List[str]
    prompt: str

@router.post("/analyze")
async def analyze_files(
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Analyze files using AI"""
    try:
        analysis = await ai_service.analyze_files(db, request.paths)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plan")
async def generate_plan(
    request: PlanRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate an execution plan"""
    try:
        plan = await ai_service.generate_plan(db, request.goal, request.files)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/synthesize")
async def synthesize_documents(
    request: SynthesizeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Synthesize multiple documents"""
    try:
        result = await ai_service.synthesize_documents(
            db, 
            request.paths, 
            request.prompt
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
