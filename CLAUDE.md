# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NVIDIA Nexus is an AI-powered file management assistant using NVIDIA's Nemotron-3 LLM. It provides intelligent file organization, document synthesis, and task automation through a chat interface.

## Development Commands

### Docker (Recommended)
```bash
docker-compose up --build    # Build and run both services with hot-reload
```

### Frontend (from /frontend)
```bash
npm run dev       # Start Vite dev server on :3000
npm run build     # TypeScript compile + Vite production build
npm run lint      # ESLint (zero warnings tolerance)
npm run preview   # Preview production build
```

### Backend (from /backend)
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

## Architecture

```
Frontend (React 18 + TypeScript + Vite)  ←→  Backend (FastAPI + Python 3.11)
         Port 3000                                    Port 8000
              ↓                                            ↓
    Zustand + React Query                    SQLAlchemy + SQLite (aiosqlite)
                                                           ↓
                                              NVIDIA Nemotron-3 API
```

### Backend Structure (`/backend/app/`)
- `main.py` - FastAPI app initialization, route registration, WebSocket handler
- `database.py` - Async SQLAlchemy engine and session management
- `core/config.py` - Pydantic settings (loads from environment)
- `api/` - REST endpoints: `files.py`, `chat.py`, `tasks.py`, `ai.py`
- `services/` - Business logic: `file_service.py`, `ai_service.py`, `task_service.py`
- `models/` - SQLAlchemy ORM: `file.py`, `task.py`, `conversation.py`

### Frontend Structure (`/frontend/src/`)
- `main.tsx` - React root with React Query provider and router
- `App.tsx` - Route definitions (Dashboard, FileManager, Chat, Tasks, Settings)
- `store/index.ts` - Zustand store (files, tasks, chat, UI state, persisted settings)
- `pages/` - Page components for each route
- `components/` - Layout, FileManager, FilePreview, Search, TaskPanel, UI
- `hooks/` - Custom hooks: keyboard shortcuts, file selection, swipe, long press

### Key Integration Points
- Vite proxies `/api/*` and `/ws` to backend (see `vite.config.ts`)
- WebSocket at `/ws` for real-time task progress updates
- CORS configured for localhost:3000 in backend

## NVIDIA Theme

The app uses NVIDIA's official dark theme. When styling:
- Background: `#0A0A0A` (nvidia-dark)
- Primary green: `#76B900` (nvidia-green)
- Secondary: `#00FF9F` (nvidia-secondary)
- Custom theme classes available via Tailwind (`tailwind.config.js`)

## Environment Configuration

Copy `.env.example` to `.env`. Required variables:
- `NVIDIA_API_KEY` - For Nemotron-3 API access
- `NVIDIA_BASE_URL` - API endpoint (default: https://integrate.api.nvidia.com/v1)
- `DATABASE_URL` - SQLite connection string
- `UPLOAD_DIR` - File storage directory
- `SECRET_KEY` - Change in production

## API Endpoints

**Files:**
- `POST /api/files/upload` - Upload files
- `GET /api/files/` - List files
- `POST /api/files/organize` - AI-powered organization
- `POST /api/files/analyze` - File analysis

**Chat:**
- `POST /api/chat/` - Send message to Nemotron-3
- `GET /api/chat/conversations` - List conversations

**Tasks:**
- `GET /api/tasks/` - List tasks
- `POST /api/tasks/{id}/pause|resume|cancel` - Task control

## Database Models

- **FileMetadata** - File index with metadata (size, type, category, checksum)
- **FileOperation** - Batch operation tracking (move, copy, delete, organize)
- **Task/TaskStep** - Async task execution with progress tracking
- **Conversation/Message** - Chat history with user/assistant roles and attachments
