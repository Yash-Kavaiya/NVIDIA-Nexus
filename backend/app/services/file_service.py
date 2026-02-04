import os
import hashlib
import uuid
from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import aiofiles
import mimetypes

try:
    import magic
    HAS_MAGIC = True
except Exception:
    HAS_MAGIC = False

from app.models.file import FileMetadata, FileOperation
from app.models.task import Task, TaskStep
from app.core.config import settings

def _get_mime_type(file_path: str) -> str:
    """Get MIME type using python-magic if available, else mimetypes."""
    if HAS_MAGIC:
        return _get_mime_type(file_path)
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type or "application/octet-stream"


class FileService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
    
    async def list_files(self, path: str) -> List[dict]:
        """List files in a directory"""
        files = []
        try:
            for entry in os.scandir(path):
                stat = entry.stat()
                files.append({
                    "id": str(uuid.uuid4()),
                    "name": entry.name,
                    "path": entry.path,
                    "size": stat.st_size,
                    "is_directory": entry.is_dir(),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                })
        except Exception as e:
            print(f"Error listing files: {e}")
        
        return files
    
    async def scan_directory(self, path: str, db: AsyncSession) -> List[FileMetadata]:
        """Scan directory and index all files"""
        files_metadata = []
        
        for root, dirs, files in os.walk(path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    stat = os.stat(file_path)
                    ext = file.split('.')[-1].lower() if '.' in file else ''
                    
                    # Calculate checksum
                    checksum = await self._calculate_checksum(file_path)
                    
                    file_meta = FileMetadata(
                        id=str(uuid.uuid4()),
                        name=file,
                        path=file_path,
                        size=stat.st_size,
                        type=_get_mime_type(file_path),
                        extension=ext,
                        modified_at=datetime.fromtimestamp(stat.st_mtime),
                        created_at=datetime.fromtimestamp(stat.st_ctime),
                        is_directory=False,
                        checksum=checksum
                    )
                    
                    files_metadata.append(file_meta)
                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")
        
        # Save to database
        for file_meta in files_metadata:
            db.add(file_meta)
        
        await db.commit()
        return files_metadata
    
    async def create_file_metadata(
        self, 
        db: AsyncSession, 
        file_id: str, 
        filename: str, 
        file_path: str, 
        size: int, 
        ext: str
    ) -> FileMetadata:
        """Create file metadata record"""
        file_meta = FileMetadata(
            id=file_id,
            name=filename,
            path=file_path,
            size=size,
            type=_get_mime_type(file_path),
            extension=ext,
            is_directory=False
        )
        
        db.add(file_meta)
        await db.commit()
        await db.refresh(file_meta)
        
        return file_meta
    
    async def organize_files(
        self, 
        db: AsyncSession, 
        path: str, 
        strategy: str
    ) -> Task:
        """Create organization task"""
        task = Task(
            id=str(uuid.uuid4()),
            title="Organize Files",
            description=f"Organize files in {path} using {strategy} strategy",
            status="pending",
            progress=0.0
        )
        
        # Add steps
        steps = [
            TaskStep(id=str(uuid.uuid4()), task_id=task.id, description="Scan directory", order=1),
            TaskStep(id=str(uuid.uuid4()), task_id=task.id, description="Analyze file contents", order=2),
            TaskStep(id=str(uuid.uuid4()), task_id=task.id, description="Categorize files", order=3),
            TaskStep(id=str(uuid.uuid4()), task_id=task.id, description="Move files to folders", order=4),
        ]
        
        db.add(task)
        for step in steps:
            db.add(step)
        
        await db.commit()
        return task
    
    async def batch_rename(
        self, 
        db: AsyncSession, 
        operations: List[dict]
    ) -> Task:
        """Create batch rename task"""
        task = Task(
            id=str(uuid.uuid4()),
            title="Batch Rename",
            description=f"Rename {len(operations)} files",
            status="pending",
            progress=0.0
        )
        
        db.add(task)
        await db.commit()
        
        return task
    
    async def delete_files(
        self, 
        db: AsyncSession, 
        paths: List[str]
    ) -> List[dict]:
        """Delete files"""
        results = []
        
        for path in paths:
            try:
                if os.path.exists(path):
                    if os.path.isfile(path):
                        os.remove(path)
                    else:
                        os.rmdir(path)
                    
                    # Remove from database
                    await db.execute(
                        delete(FileMetadata).where(FileMetadata.path == path)
                    )
                    
                    results.append({"path": path, "success": True})
                else:
                    results.append({"path": path, "success": False, "error": "File not found"})
            except Exception as e:
                results.append({"path": path, "success": False, "error": str(e)})
        
        await db.commit()
        return results
    
    async def analyze_files(
        self, 
        db: AsyncSession, 
        paths: List[str]
    ) -> dict:
        """Analyze files for categories and duplicates"""
        categories = {}
        checksums = {}
        duplicates = []
        
        for path in paths:
            try:
                # Get file metadata from DB
                result = await db.execute(
                    select(FileMetadata).where(FileMetadata.path == path)
                )
                file_meta = result.scalar_one_or_none()
                
                if file_meta:
                    # Group by category
                    cat = file_meta.category or "Uncategorized"
                    if cat not in categories:
                        categories[cat] = []
                    categories[cat].append(path)
                    
                    # Check for duplicates
                    if file_meta.checksum:
                        if file_meta.checksum in checksums:
                            duplicates.append([checksums[file_meta.checksum], path])
                        else:
                            checksums[file_meta.checksum] = path
            except Exception as e:
                print(f"Error analyzing file {path}: {e}")
        
        return {
            "categories": categories,
            "duplicates": duplicates,
            "suggestions": []
        }
    
    async def _calculate_checksum(self, file_path: str) -> str:
        """Calculate MD5 checksum of a file"""
        hash_md5 = hashlib.md5()
        async with aiofiles.open(file_path, "rb") as f:
            while chunk := await f.read(8192):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
