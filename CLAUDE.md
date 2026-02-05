# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NVIDIA Nexus is an AI-powered file management assistant using NVIDIA's Nemotron-3 LLM (`nvidia/llama-3.1-nemotron-70b-instruct`). It provides intelligent file organization, document synthesis, and task automation through a chat interface.

## Development Commands

### Docker (Recommended)
```bash
docker-compose up --build    # Build and run both services with hot-reload
```

### Frontend (from /frontend)
```bash
npm install               # Install dependencies
npm run dev               # Start Vite dev server on :3000
npm run build             # TypeScript compile + Vite production build
npm run lint              # ESLint (zero warnings tolerance)
npm run preview           # Preview production build
```

### Backend (from /backend)
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing
No formal test framework (pytest/Jest/Vitest) is configured. Two manual test scripts exist at the repo root:
```bash
python test_chat.py       # End-to-end integration tests (health, chat, conversations, frontend)
python quick_check.py     # Quick validation (placeholder existence, API key, frontend config)
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

### Backend (`/backend/app/`)
- `main.py` — FastAPI app, route registration, WebSocket echo endpoint at `/ws`, health check at `/health`
- `database.py` — Async SQLAlchemy engine/session with `create_async_engine()`, dependency injection via `get_db()`
- `core/config.py` — Pydantic `BaseSettings` loading from `.env` (case-sensitive). Singleton: `settings = Settings()`
- `api/` — REST endpoints: `files.py`, `chat.py`, `tasks.py`, `ai.py`, `ocr.py`
- `services/` — Business logic: `ai_service.py` (NVIDIA API calls via async HTTPX, 60s timeout), `file_service.py`, `task_service.py`
- `models/` — SQLAlchemy ORM: `file.py` (FileMetadata, FileOperation), `task.py` (Task, TaskStep), `conversation.py` (Conversation, Message, MessageAttachment)

### Frontend (`/frontend/src/`)
- `store/index.ts` — Single Zustand store managing files, tasks, chat, UI state. Settings and `sidebarOpen` are persisted to localStorage via `persist` middleware
- `services/api.ts` — Axios client (base URL from `VITE_API_URL` env var, defaults to `http://localhost:8000`, 30s timeout). Exports `fileApi`, `taskApi`, `chatApi`, `aiApi`
- `pages/` — Dashboard, FileManager, Chat, Tasks, Settings (routes defined in `App.tsx` with Framer Motion transitions)
- `types/index.ts` — All TypeScript interfaces (FileItem, Task, Message, Conversation, AIRequest/AIResponse, UserSettings)
- `hooks/` — `useKeyboardShortcuts`, `useFileSelection`, `useSwipe`, `useLongPress`
- React Query configured in `main.tsx` with 5-minute `staleTime` and 2 retries

### Key Integration Points
- Vite dev server proxies `/api/*` → `http://localhost:8000` and `/ws` → `ws://localhost:8000` (see `vite.config.ts`)
- CORS configured in backend for `localhost:3000` and `127.0.0.1:3000`
- Database file: `nvidia_nexus.db` (local) or `/app/data/nvidia_nexus.db` (Docker)
- Uploads stored in `./uploads` (local) or `/app/uploads` (Docker)

## NVIDIA Theme

The app uses NVIDIA's official dark theme via Tailwind (`tailwind.config.js`):
- `nvidia-black`: `#0A0A0A` — page background
- `nvidia-dark`: `#141414` — card/surface background
- `nvidia-gray`: `#1E1E1E` — borders/elevated surfaces
- `nvidia-green`: `#76B900` — primary accent
- `nvidia-green-bright` / `nvidia-secondary`: `#00FF9F` — highlights
- Fonts: Inter (sans), JetBrains Mono (mono)
- Custom animations: `pulse-green`, `glow`

## Environment Configuration

Copy `.env.example` to `.env`. Key variables:
- `NVIDIA_API_KEY` — Required for Nemotron-3 API access
- `NVIDIA_BASE_URL` — API endpoint (default: `https://integrate.api.nvidia.com/v1`)
- `DATABASE_URL` — SQLite connection (default: `sqlite+aiosqlite:///./nvidia_nexus.db`)
- `UPLOAD_DIR` — File storage directory (default: `./uploads`)
- `MAX_FILE_SIZE` — Upload limit in bytes (default: 100MB)
- `SECRET_KEY` — Must change in production
- `CORS_ORIGINS` — Comma-separated allowed origins

## API Endpoints

| Group | Method | Path | Description |
|-------|--------|------|-------------|
| Files | `POST` | `/api/files/upload/` | Upload files (multipart/form-data) |
| Files | `GET` | `/api/files/` | List files |
| Files | `POST` | `/api/files/scan/` | Scan directory |
| Files | `POST` | `/api/files/organize/` | AI-powered organization |
| Chat | `POST` | `/api/chat/` | Send message to Nemotron-3 |
| Chat | `GET` | `/api/chat/conversations` | List conversations |
| Chat | `GET` | `/api/chat/conversations/{id}` | Get conversation |
| Chat | `DELETE` | `/api/chat/conversations/{id}` | Delete conversation |
| Tasks | `GET` | `/api/tasks` | List tasks |
| Tasks | `POST` | `/api/tasks/{id}/pause\|resume\|cancel` | Task control |
| AI | `POST` | `/api/ai/analyze` | Analyze files |
| AI | `POST` | `/api/ai/plan` | Generate execution plan |
| AI | `POST` | `/api/ai/synthesize` | Synthesize documents |

## Database Models

- **FileMetadata** — File index with name, path, size, type, extension, category, checksum, parent_id (self-referential for directories)
- **FileOperation** — Batch operation tracking (move, copy, delete, organize) with progress
- **Task/TaskStep** — Async task execution with ordered steps, progress tracking, error state
- **Conversation/Message/MessageAttachment** — Chat history with user/assistant roles, file attachments
