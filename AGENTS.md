# Agentic Coding Instructions for NVIDIA Nexus

This document provides guidelines for AI agents working on the NVIDIA Nexus codebase.

## Project Overview

NVIDIA Nexus is an AI-powered file management assistant using NVIDIA's Nemotron-3 LLM. It consists of:
- **Frontend**: React 18 + TypeScript + Vite (port 3000)
- **Backend**: FastAPI + Python 3.11 + SQLAlchemy + SQLite (port 8000)

## Build Commands

### Docker (Recommended)
```bash
docker-compose up --build    # Full stack with hot-reload
docker-compose up backend    # Backend only
docker-compose up frontend   # Frontend only
```

### Frontend (from /frontend)
```bash
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server
npm run build                  # TypeScript compile + production build
npm run lint                   # ESLint (zero warnings tolerance)
npm run preview                # Preview production build
```

### Backend (from /backend)
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Testing

**No formal test framework is configured.** Use these manual test scripts:

```bash
# Run all integration tests
python test_chat.py

# Quick validation check
python quick_check.py

# Test specific backend endpoint
curl http://localhost:8000/health

# Test with specific conversation
python test_chat.py --conversation <conversation_id>
```

## Code Style Guidelines

### Python (Backend)

**Imports**: Group in this order with blank lines between:
1. Standard library (os, typing, etc.)
2. Third-party (fastapi, sqlalchemy, etc.)
3. Local app modules (from app.core.config import settings)

**Formatting**:
- 4 spaces for indentation
- 88 character line length (Black-compatible)
- Double quotes for strings
- Trailing commas in multi-line collections

**Types**: Use type hints everywhere:
```python
from typing import List, Optional, Dict, Any

async def process_files(
    paths: List[str],
    db: AsyncSession,
    options: Optional[Dict[str, Any]] = None
) -> List[FileMetadata]:
```

**Naming**:
- Classes: `PascalCase` (FileMetadata, TaskService)
- Functions/variables: `snake_case` (get_db, file_path)
- Constants: `UPPER_CASE` (MAX_FILE_SIZE, ALLOWED_EXTENSIONS)
- Private: `_leading_underscore` (_calculate_checksum)

**Error Handling**:
- Use `HTTPException` from FastAPI for API errors
- Always re-raise HTTPException before catching generic Exception
- Log errors with context: `print(f"Error processing {path}: {e}")`

**Async Patterns**:
- All I/O operations must be async (use `aiofiles`, `httpx.AsyncClient`)
- Database operations use `AsyncSession` from SQLAlchemy
- WebSocket handlers must handle disconnections gracefully

### TypeScript/React (Frontend)

**Imports**: Group in this order:
1. React and external libraries
2. Type imports (`import type { FileItem } from '../types'`)
3. Local services/hooks
4. Relative components

**Formatting**:
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings (except JSX)
- Max line length: 100 characters

**Types**: Strict TypeScript enabled:
```typescript
interface Task {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  steps: TaskStep[];
}

const [tasks, setTasks] = useState<Task[]>([]);
```

**Naming**:
- Components: `PascalCase` (FileManager, TaskCard)
- Hooks: `camelCase` starting with `use` (useFileSelection)
- Types/Interfaces: `PascalCase` (FileItem, AIRequest)
- API objects: `camelCase` (fileApi, taskApi)

**Component Structure**:
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import type { FileItem } from '../types';

// 2. Component
export function FileList({ files, onSelect }: FileListProps) {
  // 3. State/hooks
  const [selected, setSelected] = useState<string[]>([]);
  
  // 4. Effects
  useEffect(() => { ... }, []);
  
  // 5. Handlers
  const handleClick = (id: string) => { ... };
  
  // 6. Render
  return (...);
}
```

**Error Handling**: Use toast notifications for user-facing errors:
```typescript
import { useStore } from '../store';

try {
  await fileApi.deleteFiles(paths);
} catch (error) {
  useStore.getState().addToast({
    type: 'error',
    message: 'Failed to delete files'
  });
}
```

## Key Conventions

### Security
- **Never commit API keys** - `.env` is in `.gitignore`
- Validate all file paths using `validate_path_within_base()` from `security_utils.py`
- Sanitize filenames with `sanitize_filename()` before storage
- Check file extensions against `ALLOWED_EXTENSIONS` set

### Database
- Use `AsyncSession` with SQLAlchemy 2.0 syntax
- Models use `Mapped[]` types from SQLAlchemy ORM
- Always commit with `await db.commit()` and refresh with `await db.refresh(obj)`

### State Management
- **Frontend**: Single Zustand store in `store/index.ts`
- Persist user settings with `persist` middleware
- Use React Query for server state (5-minute staleTime)

### API Standards
- REST endpoints under `/api/*` prefix
- WebSocket at `/ws`
- Consistent error response: `{ "detail": "error message" }`
- File uploads: multipart/form-data with prefix `nvi_workspace_nexus_gtc_<uuid>_`

### Styling
- Use Tailwind CSS with NVIDIA theme colors (nvidia-green: #76B900)
- Dark theme only (nvidia-black, nvidia-dark, nvidia-gray)
- Custom animations: `animate-pulse-green`, `animate-glow`

## Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Quick Reference

Check health: `curl http://localhost:8000/health`
Environment: Copy `.env.example` to `.env` and fill in `NVIDIA_API_KEY`
Upload dir: `./uploads` (local) or `/app/uploads` (Docker)
Database: `./nvidia_nexus.db` (SQLite)
