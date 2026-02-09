# NVIDIA Nexus

**NVIDIA Nemotron-3 Powered AI File Management Assistant**

A powerful AI assistant built with FastAPI and React, featuring NVIDIA's dark theme and designed for intelligent file management, document synthesis, and task automation.

## 🚀 Features

- **🤖 AI-Powered File Management**: Let NVIDIA Nemotron-3 organize, categorize, and manage your files
- **📁 Smart Organization**: Content-based file categorization, duplicate detection, batch operations
- **💬 Natural Language Interface**: Chat with AI to execute complex file operations
- **📊 Document Synthesis**: Combine multiple documents into comprehensive summaries and reports
- **⚡ Real-time Updates**: WebSocket support for live task progress tracking
- **🎨 NVIDIA Dark Theme**: Official NVIDIA styling with green accents (#76B900)
- **🔒 Secure & Private**: Local file storage, no cloud dependencies

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python) - High-performance async web framework
- SQLAlchemy + SQLite - Database management
- NVIDIA Nemotron-3 API - AI model integration
- WebSockets - Real-time communication
- Docker - Containerization

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS - Styling with NVIDIA theme
- Zustand - State management
- React Query - Server state management
- Framer Motion - Animations
- Vite - Build tool

## 🚀 Quick Start

### Local Development

#### Prerequisites
- Docker and Docker Compose
- NVIDIA API Key (for Nemotron-3 access)

#### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your NVIDIA API key
```

#### 2. Run with Docker

```bash
docker-compose up --build
```

#### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### ☁️ Cloud Deployment

Deploy to AWS or Google Cloud Platform with Terraform:

```bash
# AWS (ECS Fargate)
cd terraform/aws
./deploy.sh apply

# GCP (Cloud Run)
cd terraform/gcp
./deploy.sh apply
```

**📖 Full deployment guide:** [TERRAFORM_DEPLOYMENT.md](TERRAFORM_DEPLOYMENT.md)

**Features:**
- ✅ Production-ready infrastructure
- ✅ Auto-scaling and load balancing
- ✅ Secure secrets management
- ✅ CI/CD pipelines included
- ✅ ~15 minute deployment

## 📦 Project Structure

```
NVIDIA-Nexus/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # REST API endpoints
│   │   ├── core/        # Configuration
│   │   ├── models/      # Database models
│   │   └── services/    # Business logic
│   └── Dockerfile
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   └── services/    # API clients
│   └── Dockerfile
└── docker-compose.yml
```

## 🎨 NVIDIA Theme

- **Background**: #0A0A0A (Very dark gray-black)
- **Primary**: #76B900 (NVIDIA green)
- **Secondary**: #00FF9F (Bright green)
- **Text**: #FFFFFF (White), #B3B3B3 (Gray)

## 📄 License

MIT License

---

Built with ❤️ and powered by **NVIDIA Nemotron-3**
