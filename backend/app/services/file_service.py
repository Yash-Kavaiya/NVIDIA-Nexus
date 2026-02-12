import os
import json
import shutil
import hashlib
import uuid
import asyncio
import logging
from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import aiofiles
import mimetypes
import httpx

HAS_MAGIC = False

from app.models.file import FileMetadata, FileOperation
from app.models.task import Task, TaskStep
from app.core.config import settings
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


def _get_mime_type(file_path: str) -> str:
    """Get MIME type using mimetypes."""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type or "application/octet-stream"


class FileService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    async def list_files(self, path: str) -> List[dict]:
        """List files in a directory"""
        files = []
        upload_root = os.path.abspath(self.upload_dir)
        try:
            for entry in os.scandir(path):
                stat = entry.stat()
                entry_path = os.path.abspath(entry.path)
                try:
                    relative_path = os.path.relpath(entry_path, upload_root)
                except ValueError:
                    relative_path = entry.name
                files.append({
                    "id": str(uuid.uuid4()),
                    "name": entry.name,
                    "path": relative_path.replace("\\", "/"),
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
        """Create organization task and kick off background execution"""
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            title="Organize Files",
            description=f"Organize files in {path} using {strategy} strategy",
            status="pending",
            progress=0.0
        )

        # Add steps
        step_ids = [str(uuid.uuid4()) for _ in range(4)]
        steps = [
            TaskStep(id=step_ids[0], task_id=task_id, description="Scan directory", order=1),
            TaskStep(id=step_ids[1], task_id=task_id, description="Analyze file contents", order=2),
            TaskStep(id=step_ids[2], task_id=task_id, description="Categorize files", order=3),
            TaskStep(id=step_ids[3], task_id=task_id, description="Move files to folders", order=4),
        ]

        db.add(task)
        for step in steps:
            db.add(step)

        await db.commit()
        await db.refresh(task)

        # Launch background execution
        asyncio.create_task(
            self._execute_organization(task_id, step_ids, path, strategy)
        )

        return task

    async def _execute_organization(
        self,
        task_id: str,
        step_ids: List[str],
        path: str,
        strategy: str
    ):
        """Background task: actually organize files using AI"""
        # Use a fresh DB session since the request session is closed
        async with AsyncSessionLocal() as db:
            try:
                # Mark task as executing
                task = await db.get(Task, task_id)
                if not task:
                    return
                task.status = "executing"
                await db.commit()

                # --- Step 1: Scan directory ---
                step1 = await db.get(TaskStep, step_ids[0])
                if step1:
                    step1.status = "in_progress"
                    await db.commit()

                file_list = []
                try:
                    for entry in os.scandir(path):
                        if entry.is_file():
                            stat = entry.stat()
                            ext = entry.name.rsplit('.', 1)[-1].lower() if '.' in entry.name else ''
                            file_list.append({
                                "name": entry.name,
                                "path": entry.path,
                                "size": stat.st_size,
                                "extension": ext,
                            })
                except Exception as e:
                    logger.error(f"Scan error: {e}")

                if step1:
                    step1.status = "completed"
                    step1.result = f"Found {len(file_list)} files"
                task.progress = 25.0
                await db.commit()

                if not file_list:
                    # No files to organize, mark complete
                    for sid in step_ids[1:]:
                        s = await db.get(TaskStep, sid)
                        if s:
                            s.status = "completed"
                            s.result = "No files to process"
                    task.progress = 100.0
                    task.status = "completed"
                    await db.commit()
                    return

                # --- Step 2: Analyze file contents via AI ---
                step2 = await db.get(TaskStep, step_ids[1])
                if step2:
                    step2.status = "in_progress"
                    await db.commit()

                file_summary = "\n".join(
                    f"- {f['name']} ({f['extension']}, {f['size']} bytes)"
                    for f in file_list
                )

                prompt = (
                    f"You are a file organization assistant. Given these files, suggest categories "
                    f"to organize them into. Strategy: {strategy}.\n\n"
                    f"Files:\n{file_summary}\n\n"
                    f"Respond ONLY with valid JSON mapping category folder names to lists of filenames. "
                    f"Example: {{\"Documents\": [\"report.pdf\", \"notes.txt\"], \"Images\": [\"photo.jpg\"]}}\n"
                    f"Do NOT include any text outside the JSON."
                )

                categories: Dict[str, List[str]] = {}
                try:
                    async with httpx.AsyncClient(
                        base_url=settings.NVIDIA_BASE_URL,
                        headers={"Authorization": f"Bearer {settings.NVIDIA_API_KEY}"},
                        timeout=60.0
                    ) as client:
                        resp = await client.post("/chat/completions", json={
                            "model": settings.DEFAULT_MODEL,
                            "messages": [
                                {"role": "system", "content": "You are a file organization assistant. Respond only with JSON."},
                                {"role": "user", "content": prompt},
                            ],
                            "temperature": 0.3,
                            "max_tokens": 1024,
                        })
                        resp.raise_for_status()
                        ai_text = resp.json()["choices"][0]["message"]["content"].strip()

                        # Extract JSON from response (handle markdown code blocks)
                        if "```" in ai_text:
                            ai_text = ai_text.split("```")[1]
                            if ai_text.startswith("json"):
                                ai_text = ai_text[4:]
                            ai_text = ai_text.strip()

                        categories = json.loads(ai_text)
                except Exception as e:
                    logger.error(f"AI categorization failed: {e}")
                    # Fallback: group by extension
                    for f in file_list:
                        ext = f["extension"].upper() or "Other"
                        category = f"{ext} Files"
                        categories.setdefault(category, []).append(f["name"])

                if step2:
                    step2.status = "completed"
                    step2.result = f"AI suggested {len(categories)} categories"
                task.progress = 50.0
                await db.commit()

                # --- Step 3: Categorize (validate mapping) ---
                step3 = await db.get(TaskStep, step_ids[2])
                if step3:
                    step3.status = "in_progress"
                    await db.commit()

                # Build actual file-to-category mapping, filtering only files that exist
                existing_names = {f["name"] for f in file_list}
                move_plan: Dict[str, List[str]] = {}
                for category, filenames in categories.items():
                    valid_files = [fn for fn in filenames if fn in existing_names]
                    if valid_files:
                        move_plan[category] = valid_files

                if step3:
                    step3.status = "completed"
                    total_mapped = sum(len(v) for v in move_plan.values())
                    step3.result = f"Mapped {total_mapped} files to {len(move_plan)} categories"
                task.progress = 75.0
                await db.commit()

                # --- Step 4: Move files ---
                step4 = await db.get(TaskStep, step_ids[3])
                if step4:
                    step4.status = "in_progress"
                    await db.commit()

                moved_count = 0
                errors = []
                for category, filenames in move_plan.items():
                    # Create category subfolder
                    cat_dir = os.path.join(path, category)
                    os.makedirs(cat_dir, exist_ok=True)

                    for fname in filenames:
                        src = os.path.join(path, fname)
                        dst = os.path.join(cat_dir, fname)
                        try:
                            if os.path.exists(src) and not os.path.exists(dst):
                                shutil.move(src, dst)
                                moved_count += 1
                        except Exception as e:
                            errors.append(f"{fname}: {e}")

                if step4:
                    step4.status = "completed"
                    result_msg = f"Moved {moved_count} files"
                    if errors:
                        result_msg += f", {len(errors)} errors"
                    step4.result = result_msg

                task.progress = 100.0
                task.status = "completed"
                await db.commit()

            except Exception as e:
                logger.error(f"Organization task {task_id} failed: {e}")
                try:
                    task = await db.get(Task, task_id)
                    if task:
                        task.status = "failed"
                        task.error = str(e)
                        await db.commit()
                except Exception:
                    pass

    async def batch_rename(
        self,
        db: AsyncSession,
        operations: List[dict]
    ) -> dict:
        """Batch rename files and return operation results"""
        results = []
        upload_root = os.path.abspath(self.upload_dir)

        for operation in operations:
            source_path = os.path.abspath(operation["source"])
            target_name = operation["target"]
            target_path = os.path.abspath(
                os.path.join(os.path.dirname(source_path), target_name)
            )

            try:
                if not os.path.exists(source_path):
                    results.append(
                        {
                            "source": os.path.relpath(
                                source_path, upload_root
                            ).replace("\\", "/"),
                            "target": target_name,
                            "success": False,
                            "error": "Source file not found",
                        }
                    )
                    continue

                if os.path.exists(target_path):
                    results.append(
                        {
                            "source": os.path.relpath(
                                source_path, upload_root
                            ).replace("\\", "/"),
                            "target": target_name,
                            "success": False,
                            "error": "Target filename already exists",
                        }
                    )
                    continue

                os.rename(source_path, target_path)

                source_rel = os.path.relpath(source_path, upload_root).replace("\\", "/")
                target_rel = os.path.relpath(target_path, upload_root).replace("\\", "/")

                # Update any indexed metadata record if present.
                result = await db.execute(
                    select(FileMetadata).where(FileMetadata.path == source_path)
                )
                file_meta = result.scalar_one_or_none()
                matched_relative = False
                if not file_meta:
                    result = await db.execute(
                        select(FileMetadata).where(FileMetadata.path == source_rel)
                    )
                    file_meta = result.scalar_one_or_none()
                    matched_relative = file_meta is not None

                if file_meta:
                    file_meta.name = target_name
                    file_meta.path = target_rel if matched_relative else target_path
                    file_meta.extension = (
                        target_name.rsplit(".", 1)[-1].lower()
                        if "." in target_name
                        else ""
                    )

                results.append(
                    {
                        "source": source_rel,
                        "target": target_rel,
                        "success": True,
                    }
                )
            except Exception as e:
                results.append(
                    {
                        "source": os.path.relpath(source_path, upload_root).replace(
                            "\\", "/"
                        ),
                        "target": target_name,
                        "success": False,
                        "error": str(e),
                    }
                )

        await db.commit()

        renamed_count = sum(1 for item in results if item.get("success"))
        failed_count = len(results) - renamed_count
        return {
            "results": results,
            "renamed_count": renamed_count,
            "failed_count": failed_count,
        }

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
