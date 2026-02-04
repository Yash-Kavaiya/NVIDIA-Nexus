from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    files: Optional[List[str]] = None

@router.post("/")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a message to the AI"""
    try:
        response = await ai_service.chat(
            db, 
            request.message, 
            request.conversation_id,
            request.files
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations")
async def get_conversations(
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations"""
    conversations = await ai_service.get_conversations(db)
    return conversations

@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific conversation with messages"""
    conversation = await ai_service.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a conversation"""
    success = await ai_service.delete_conversation(db, conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted"}
