from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.task import Task, TaskStep

class TaskService:
    async def get_tasks(
        self, 
        db: AsyncSession, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Task]:
        """Get all tasks"""
        result = await db.execute(
            select(Task)
            .offset(skip)
            .limit(limit)
            .order_by(Task.created_at.desc())
        )
        return result.scalars().all()
    
    async def get_task(self, db: AsyncSession, task_id: str) -> Optional[Task]:
        """Get a specific task"""
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        return result.scalar_one_or_none()
    
    async def pause_task(self, db: AsyncSession, task_id: str) -> Optional[Task]:
        """Pause a running task"""
        task = await self.get_task(db, task_id)
        if task and task.status == "executing":
            task.status = "paused"
            await db.commit()
            await db.refresh(task)
        return task
    
    async def resume_task(self, db: AsyncSession, task_id: str) -> Optional[Task]:
        """Resume a paused task"""
        task = await self.get_task(db, task_id)
        if task and task.status == "paused":
            task.status = "executing"
            await db.commit()
            await db.refresh(task)
        return task
    
    async def cancel_task(self, db: AsyncSession, task_id: str) -> bool:
        """Cancel a task"""
        result = await db.execute(
            delete(Task).where(Task.id == task_id)
        )
        await db.commit()
        return result.rowcount > 0
    
    async def update_task_progress(
        self, 
        db: AsyncSession, 
        task_id: str, 
        progress: float
    ) -> Optional[Task]:
        """Update task progress"""
        task = await self.get_task(db, task_id)
        if task:
            task.progress = progress
            await db.commit()
            await db.refresh(task)
        return task
    
    async def complete_task_step(
        self, 
        db: AsyncSession, 
        step_id: str, 
        result: str = ""
    ) -> Optional[TaskStep]:
        """Mark a task step as completed"""
        result_query = await db.execute(
            select(TaskStep).where(TaskStep.id == step_id)
        )
        step = result_query.scalar_one_or_none()
        
        if step:
            step.status = "completed"
            step.result = result
            await db.commit()
            await db.refresh(step)
            
            # Update parent task progress
            await self._recalculate_task_progress(db, step.task_id)
        
        return step
    
    async def _recalculate_task_progress(self, db: AsyncSession, task_id: str):
        """Recalculate task progress based on completed steps"""
        result = await db.execute(
            select(TaskStep).where(TaskStep.task_id == task_id)
        )
        steps = result.scalars().all()
        
        if steps:
            completed = sum(1 for s in steps if s.status == "completed")
            progress = (completed / len(steps)) * 100
            
            task = await self.get_task(db, task_id)
            if task:
                task.progress = progress
                if progress >= 100:
                    task.status = "completed"
                await db.commit()
