import os
import uuid
import httpx
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.conversation import Conversation, Message, MessageAttachment
from app.models.task import Task, TaskStep
from app.services.safety_service import safety_service

class AIService:
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        self.base_url = settings.NVIDIA_BASE_URL
        self.model = settings.DEFAULT_MODEL
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=60.0
        )
    
    async def chat(
        self, 
        db: AsyncSession, 
        message: str, 
        conversation_id: Optional[str] = None,
        files: Optional[List[str]] = None
    ) -> dict:
        """Send a chat message to NVIDIA Nemotron-3 with safety checks"""
        
        # Check prompt safety first
        safety_check = await safety_service.check_content_safety(message)
        
        if not safety_check["prompt_safe"]:
            return {
                "message": "I cannot process this request as it contains harmful content. Please rephrase your message.",
                "conversation_id": conversation_id,
                "safety_blocked": True,
                "safety_reason": safety_check.get("prompt_harm", "harmful")
            }
        
        # Get or create conversation
        if conversation_id:
            result = await db.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conversation = result.scalar_one_or_none()
        else:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                title=message[:50] + "..." if len(message) > 50 else message
            )
            db.add(conversation)
        
        # Save user message
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="user",
            content=message
        )
        db.add(user_msg)
        
        # Prepare context with file information
        context = self._build_context(files)
        
        # Call NVIDIA API
        try:
            response = await self._call_nvidia_api(message, context)
            ai_content = self._extract_content(response)
            
            # Check response safety
            response_safety = await safety_service.check_content_safety(
                message, 
                ai_content
            )
            
            if not response_safety["response_safe"]:
                ai_content = "I apologize, but I cannot provide that response as it may contain harmful content. Please try rephrasing your question."
                
        except Exception as e:
            ai_content = f"Error: {str(e)}"
        
        # Save AI response
        ai_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role="assistant",
            content=ai_content
        )
        db.add(ai_msg)
        
        await db.commit()
        
        return {
            "message": ai_content,
            "conversation_id": conversation.id,
            "message_id": ai_msg.id
        }
    
    async def get_conversations(self, db: AsyncSession) -> List[dict]:
        """Get all conversations"""
        result = await db.execute(select(Conversation))
        conversations = result.scalars().all()
        
        return [
            {
                "id": conv.id,
                "title": conv.title,
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None
            }
            for conv in conversations
        ]
    
    async def get_conversation(self, db: AsyncSession, conversation_id: str) -> Optional[dict]:
        """Get a specific conversation with messages"""
        result = await db.execute(
            select(
                Conversation.id, Conversation.title
            ).where(Conversation.id == conversation_id)
        )
        conversation = result.first()

        if not conversation:
            return None

        # Query messages as rows to avoid async lazy-load issues with ORM objects
        msg_result = await db.execute(
            select(
                Message.id, Message.role, Message.content, Message.timestamp
            )
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.timestamp.asc())
        )
        messages = msg_result.all()

        return {
            "id": conversation.id,
            "title": conversation.title,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else None
                }
                for msg in messages
            ]
        }
    
    async def delete_conversation(self, db: AsyncSession, conversation_id: str) -> bool:
        """Delete a conversation"""
        result = await db.execute(
            delete(Conversation).where(Conversation.id == conversation_id)
        )
        await db.commit()
        return result.rowcount > 0
    
    async def analyze_files(self, db: AsyncSession, paths: List[str]) -> dict:
        """Analyze files using AI"""
        # Prepare file information
        file_info = []
        for path in paths:
            if os.path.exists(path):
                stat = os.stat(path)
                file_info.append({
                    "name": os.path.basename(path),
                    "size": stat.st_size,
                    "type": os.path.splitext(path)[1]
                })
        
        # Create analysis prompt
        prompt = f"""Analyze these files and provide:
1. Suggested categories for organization
2. Potential duplicate detection hints
3. Content type recommendations

Files: {file_info}"""
        
        try:
            response = await self._call_nvidia_api(prompt)
            content = self._extract_content(response)
        except Exception as e:
            content = f"Analysis error: {str(e)}"
        
        return {
            "categories": {},
            "duplicates": [],
            "suggestions": [content]
        }
    
    async def generate_plan(
        self, 
        db: AsyncSession, 
        goal: str, 
        files: List[str]
    ) -> Task:
        """Generate an execution plan"""
        
        # Create task
        task = Task(
            id=str(uuid.uuid4()),
            title="AI Task",
            description=goal,
            status="planning",
            progress=0.0
        )
        
        # Generate plan using AI
        prompt = f"""Create a step-by-step plan to achieve this goal:
Goal: {goal}
Files involved: {files}

Provide 3-5 clear steps."""
        
        try:
            response = await self._call_nvidia_api(prompt)
            content = self._extract_content(response)
            
            # Parse steps from response (simplified)
            steps_text = content.split('\n')
            for i, step_text in enumerate(steps_text[:5], 1):
                if step_text.strip():
                    step = TaskStep(
                        id=str(uuid.uuid4()),
                        task_id=task.id,
                        description=step_text.strip()[:200],
                        order=i
                    )
                    db.add(step)
        except Exception as e:
            # Add a default step if AI fails
            step = TaskStep(
                id=str(uuid.uuid4()),
                task_id=task.id,
                description=f"Execute: {goal}",
                order=1
            )
            db.add(step)
        
        db.add(task)
        await db.commit()
        
        return task
    
    async def synthesize_documents(
        self, 
        db: AsyncSession, 
        paths: List[str], 
        prompt: str
    ) -> dict:
        """Synthesize multiple documents"""
        
        # Extract text from documents (simplified)
        contents = []
        for path in paths:
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    contents.append(f.read()[:1000])  # Limit content
            except Exception as e:
                contents.append(f"Error reading {path}: {e}")
        
        # Create synthesis prompt
        synthesis_prompt = f"""Synthesize these documents based on the following request:
Request: {prompt}

Documents:
{chr(10).join(f"Document {i+1}: {content[:500]}..." for i, content in enumerate(contents))}

Provide:
1. A comprehensive summary
2. Key points extracted
3. A synthesized document"""
        
        try:
            response = await self._call_nvidia_api(synthesis_prompt)
            content = self._extract_content(response)
        except Exception as e:
            content = f"Synthesis error: {str(e)}"
        
        return {
            "summary": content[:500],
            "keyPoints": [],
            "document": content
        }
    
    def _build_context(self, files: Optional[List[str]]) -> str:
        """Build context string from file information"""
        if not files:
            return ""

        context_parts = []
        for path in files:
            if os.path.exists(path):
                name = os.path.basename(path)
                ext = os.path.splitext(path)[1]
                size = os.path.getsize(path)
                context_parts.append(f"File: {name} (type: {ext}, size: {size} bytes)")

        return "\n".join(context_parts) if context_parts else ""

    @staticmethod
    def _extract_content(response: dict) -> str:
        """Extract text content from NVIDIA API response, handling reasoning models."""
        msg = response.get("choices", [{}])[0].get("message", {})
        # Some NVIDIA models (e.g. nemotron-3-nano) return content in reasoning_content
        return msg.get("content") or msg.get("reasoning_content") or ""

    async def _call_nvidia_api(self, message: str, context: str = "") -> dict:
        """Call the NVIDIA Nemotron-3 API"""
        messages = []

        if context:
            messages.append({
                "role": "system",
                "content": f"You are NVIDIA Nexus, an AI file management assistant. Context:\n{context}"
            })
        else:
            messages.append({
                "role": "system",
                "content": "You are NVIDIA Nexus, an AI file management assistant powered by NVIDIA Nemotron-3."
            })

        messages.append({"role": "user", "content": message})

        response = await self.client.post(
            "/chat/completions",
            json={
                "model": self.model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1024
            }
        )
        response.raise_for_status()
        return response.json()
