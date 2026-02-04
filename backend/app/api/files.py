from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os
import uuid
import aiofiles
from datetime import datetime

from app.database import get_db
from app.core.config import settings
from app.services.file_service import FileService

router = APIRouter()
file_service = FileService()

@router.get("/")
async def list_files(
    path: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List files in a directory"""
    try:
        files = await file_service.list_files(path or settings.UPLOAD_DIR)
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan")
async def scan_directory(
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Scan a directory and index all files"""
    try:
        files = await file_service.scan_directory(path, db)
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/")
async def upload_files(
    files: List[UploadFile] = File(...),
    path: str = Form(default=""),
    db: AsyncSession = Depends(get_db)
):
    """Upload files to the server"""
    uploaded_files = []
    
    for file in files:
        # Validate file extension
        ext = file.filename.split('.')[-1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type .{ext} not allowed")
        
        # Create unique filename with nvi_workspace_nexus_gtc prefix
        file_id = str(uuid.uuid4())[:8]  # Use first 8 chars for shorter ID
        filename = f"nvi_workspace_nexus_gtc_{file_id}_{file.filename}"
        
        # Build file path - handle empty path
        if path and path.strip():
            file_path = os.path.join(settings.UPLOAD_DIR, path.strip(), filename)
        else:
            file_path = os.path.join(settings.UPLOAD_DIR, filename)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else settings.UPLOAD_DIR, exist_ok=True)
        
        # Save file
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Return simple dict for JSON response
        uploaded_files.append({
            "id": file_id,
            "name": file.filename,
            "path": file_path,
            "size": len(content),
            "extension": ext,
            "is_directory": False,
            "modified_at": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat()
        })
    
    return uploaded_files

@router.get("/download/")
async def download_file(
    path: str,
    db: AsyncSession = Depends(get_db)
):
    """Download a file"""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(path)

@router.post("/organize")
async def organize_files(
    path: str,
    strategy: str = Query(default="content"),  # content, type, date
    db: AsyncSession = Depends(get_db)
):
    """Organize files using AI"""
    try:
        task = await file_service.organize_files(db, path, strategy)
        return task
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rename")
async def rename_files(
    operations: List[dict],
    db: AsyncSession = Depends(get_db)
):
    """Batch rename files"""
    try:
        task = await file_service.batch_rename(db, operations)
        return task
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/delete")
async def delete_files(
    paths: List[str],
    db: AsyncSession = Depends(get_db)
):
    """Delete files"""
    try:
        results = await file_service.delete_files(db, paths)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyze")
async def analyze_files(
    paths: List[str] = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Analyze files for duplicates and categories"""
    try:
        analysis = await file_service.analyze_files(db, paths)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
