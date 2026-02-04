from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.services.task_service import TaskService

router = APIRouter()
task_service = TaskService()

@router.get("/")
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all tasks"""
    tasks = await task_service.get_tasks(db, skip, limit)
    return tasks

@router.get("/{task_id}")
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific task"""
    task = await task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/{task_id}/pause")
async def pause_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Pause a running task"""
    task = await task_service.pause_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/{task_id}/resume")
async def resume_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Resume a paused task"""
    task = await task_service.resume_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Cancel a task"""
    success = await task_service.cancel_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task cancelled"}


@router.post("/")
async def create_task(
    title: str,
    description: str = "",
    db: AsyncSession = Depends(get_db)
):
    """Create a new task"""
    task = await task_service.create_task(db, title, description)
    return task


@router.post("/seed")
async def seed_demo_tasks(
    db: AsyncSession = Depends(get_db)
):
    """Seed demo placeholder tasks for testing"""
    tasks = await task_service.seed_demo_tasks(db)
    return {"message": f"Created {len(tasks)} demo tasks", "count": len(tasks)}

