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
from app.core.security_utils import (
    validate_path_within_base,
    sanitize_filename,
    validate_file_extension,
    validate_mime_type,
    sanitize_path_component,
)
from app.services.file_service import FileService

router = APIRouter()
file_service = FileService()


@router.get("/")
async def list_files(
    path: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)
):
    """List files in a directory"""
    try:
        # Use UPLOAD_DIR as the base, optionally with a subdirectory
        if path:
            # Validate and construct safe path
            safe_path = validate_path_within_base(path, settings.UPLOAD_DIR)
        else:
            # Use upload directory directly
            safe_path = settings.UPLOAD_DIR
        files = await file_service.list_files(safe_path)
        return files
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan")
async def scan_directory(path: str, db: AsyncSession = Depends(get_db)):
    """Scan a directory and index all files"""
    try:
        # Validate path to prevent directory traversal
        safe_path = validate_path_within_base(path, settings.UPLOAD_DIR)
        files = await file_service.scan_directory(safe_path, db)
        return files
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/")
async def upload_files(
    files: List[UploadFile] = File(...),
    path: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Upload files to the server with comprehensive security validation"""
    uploaded_files = []

    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File must have a filename")

        # Sanitize filename to prevent path traversal
        safe_filename = sanitize_filename(file.filename)

        # Validate file extension against allowed list
        ext = validate_file_extension(safe_filename, settings.ALLOWED_EXTENSIONS)

        # Read file content
        content = await file.read()

        # Validate file size
        if len(content) > settings.MAX_FILE_SIZE:
            max_size_mb = settings.MAX_FILE_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size_mb:.1f}MB",
            )

        # Validate MIME type matches extension
        if not validate_mime_type(content, {ext}):
            raise HTTPException(
                status_code=400,
                detail=f"File content does not match extension '.{ext}'",
            )

        # Create unique filename with prefix
        file_id = str(uuid.uuid4())[:8]
        final_filename = f"nvi_workspace_nexus_gtc_{file_id}_{safe_filename}"

        # Validate and sanitize the upload path
        if path and path.strip():
            # Sanitize each path component
            path_components = [
                p for p in path.strip().replace("\\", "/").split("/") if p
            ]
            sanitized_components = [sanitize_path_component(c) for c in path_components]
            safe_subpath = (
                os.path.join(*sanitized_components) if sanitized_components else ""
            )

            # Validate the full path is within UPLOAD_DIR
            target_dir = validate_path_within_base(safe_subpath, settings.UPLOAD_DIR)
        else:
            target_dir = settings.UPLOAD_DIR

        # Build final file path
        file_path = os.path.join(target_dir, final_filename)

        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path) or target_dir, exist_ok=True)

        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        relative_path = os.path.relpath(
            os.path.abspath(file_path), os.path.abspath(settings.UPLOAD_DIR)
        ).replace("\\", "/")

        # Return file metadata
        uploaded_files.append(
            {
                "id": file_id,
                "name": safe_filename,
                "path": relative_path,
                "size": len(content),
                "extension": ext,
                "is_directory": False,
                "modified_at": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
            }
        )

    return uploaded_files


@router.get("/download/")
async def download_file(path: str, db: AsyncSession = Depends(get_db)):
    """Download a file"""
    try:
        # Validate path to prevent directory traversal
        safe_path = validate_path_within_base(path, settings.UPLOAD_DIR)

        if not os.path.exists(safe_path):
            raise HTTPException(status_code=404, detail="File not found")

        if not os.path.isfile(safe_path):
            raise HTTPException(status_code=400, detail="Path is not a file")

        return FileResponse(safe_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/organize")
async def organize_files(
    path: str,
    strategy: str = Query(default="content"),  # content, type, date
    db: AsyncSession = Depends(get_db),
):
    """Organize files using AI"""
    try:
        # Validate path to prevent directory traversal
        safe_path = validate_path_within_base(path, settings.UPLOAD_DIR)

        # Validate strategy parameter
        allowed_strategies = {"content", "type", "date", "name", "size"}
        if strategy not in allowed_strategies:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid strategy. Allowed: {', '.join(allowed_strategies)}",
            )

        task = await file_service.organize_files(db, safe_path, strategy)
        return task
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rename")
async def rename_files(operations: List[dict], db: AsyncSession = Depends(get_db)):
    """Batch rename files"""
    try:
        if not operations:
            raise HTTPException(status_code=400, detail="No rename operations provided")

        safe_operations = []
        for operation in operations:
            source = operation.get("source")
            target = operation.get("target")

            if not source or not target:
                raise HTTPException(
                    status_code=400,
                    detail="Each operation must include 'source' and 'target'",
                )

            safe_source = validate_path_within_base(source, settings.UPLOAD_DIR)
            safe_target = sanitize_filename(target)
            safe_operations.append({"source": safe_source, "target": safe_target})

        result = await file_service.batch_rename(db, safe_operations)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete_files(paths: List[str], db: AsyncSession = Depends(get_db)):
    """Delete files"""
    try:
        # Validate all paths to prevent directory traversal
        safe_paths = []
        for path in paths:
            try:
                safe_path = validate_path_within_base(path, settings.UPLOAD_DIR)
                safe_paths.append(safe_path)
            except HTTPException as e:
                # Skip invalid paths but report them in results
                pass

        if not safe_paths:
            raise HTTPException(status_code=400, detail="No valid paths provided")

        results = await file_service.delete_files(db, safe_paths)
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze")
async def analyze_files(
    paths: List[str] = Query(...), db: AsyncSession = Depends(get_db)
):
    """Analyze files for duplicates and categories"""
    try:
        # Validate all paths to prevent directory traversal
        safe_paths = []
        for path in paths:
            try:
                safe_path = validate_path_within_base(path, settings.UPLOAD_DIR)
                safe_paths.append(safe_path)
            except HTTPException:
                # Skip invalid paths
                continue

        if not safe_paths:
            raise HTTPException(status_code=400, detail="No valid paths provided")

        analysis = await file_service.analyze_files(db, safe_paths)
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
