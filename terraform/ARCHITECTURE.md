# NVIDIA Nexus - Cloud Architecture

This document describes the cloud infrastructure architecture for both AWS and GCP deployments.

## AWS Architecture (ECS Fargate)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Application    │
                    │ Load Balancer  │
                    │ (Public)       │
                    └────────┬───────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌───────────────┐
        │ Target Group  │         │ Target Group  │
        │ (Backend)     │         │ (Frontend)    │
        └───────┬───────┘         └───────┬───────┘
                │                         │
                ▼                         ▼
┌───────────────────────────────────────────────────────────────┐
│                    ECS Fargate Cluster                         │
│                                                                │
│  ┌─────────────────────┐      ┌─────────────────────┐        │
│  │  Backend Service    │      │  Frontend Service   │        │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │        │
│  │  │ Task 1        │  │      │  │ Task 1        │  │        │
│  │  │ FastAPI:8000  │  │      │  │ React:3000    │  │        │
│  │  └───────────────┘  │      │  └───────────────┘  │        │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │        │
│  │  │ Task 2        │  │      │  │ Task 2        │  │        │
│  │  │ FastAPI:8000  │  │      │  │ React:3000    │  │        │
│  │  └───────────────┘  │      │  └───────────────┘  │        │
│  └─────────────────────┘      └─────────────────────┘        │
│                                                                │
└───────────────────────────────────────────────────────────────┘
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌───────────────┐
        │ EFS           │         │ ECR           │
        │ (Uploads/DB)  │         │ (Images)      │
        └───────────────┘         └───────────────┘
                │
                ▼
        ┌───────────────┐
        │ Secrets       │
        │ Manager       │
        │ (API Keys)    │
        └───────────────┘
```

### AWS Components

**Networking:**
- VPC with CIDR 10.0.0.0/16
- 2 Public subnets (10.0.101.0/24, 10.0.102.0/24)
- 2 Private subnets (10.0.1.0/24, 10.0.2.0/24)
- NAT Gateway for private subnet internet access
- Internet Gateway for public subnet access

**Compute:**
- ECS Fargate cluster (serverless containers)
- Backend service: 1-10 tasks (configurable)
- Frontend service: 1-10 tasks (configurable)
- Task CPU: 256-2048 units
- Task Memory: 512-4096 MB

**Load Balancing:**
- Application Load Balancer (internet-facing)
- Backend target group (port 8000)
- Frontend target group (port 3000)
- Health checks on /health and /

**Storage:**
- EFS for persistent uploads and database
- ECR for Docker images
- Secrets Manager for API keys

**Security:**
- Security groups for ALB and ECS tasks
- IAM roles for task execution and task
- Private subnets for containers

**Monitoring:**
- CloudWatch Logs for container logs
- Container Insights for metrics
- CloudWatch Alarms (optional)

## GCP Architecture (Cloud Run)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌───────────────┐
        │ Cloud Run     │         │ Cloud Run     │
        │ Backend       │         │ Frontend      │
        │               │         │               │
        │ ┌───────────┐ │         │ ┌───────────┐ │
        │ │ Container │ │         │ │ Container │ │
        │ │ FastAPI   │ │         │ │ React     │ │
        │ │ :8000     │ │         │ │ :3000     │ │
        │ └───────────┘ │         │ └───────────┘ │
        │               │         │               │
        │ Auto-scaling  │         │ Auto-scaling  │
        │ 0-10 instances│         │ 0-10 instances│
        └───────┬───────┘         └───────────────┘
                │
                ▼
        ┌───────────────┐
        │ Cloud Storage │
        │ (Uploads)     │
        └───────────────┘
                │
                ▼
        ┌───────────────┐
        │ Artifact      │
        │ Registry      │
        │ (Images)      │
        └───────────────┘
                │
                ▼
        ┌───────────────┐
        │ Secret        │
        │ Manager       │
        │ (API Keys)    │
        └───────────────┘
```

### GCP Cloud Run Components

**Networking:**
- VPC network with Cloud NAT
- Subnet: 10.0.0.0/24
- Cloud NAT for outbound internet access
- Automatic HTTPS with managed certificates

**Compute:**
- Cloud Run backend service
- Cloud Run frontend service
- Auto-scaling: 0-10 instances (configurable)
- CPU: 1-4 vCPU per instance
- Memory: 512Mi-4Gi per instance

**Storage:**
- Cloud Storage bucket for uploads
- Artifact Registry for Docker images
- Secret Manager for API keys

**Security:**
- Service accounts with IAM bindings
- VPC connector for private access
- Automatic DDoS protection

**Monitoring:**
- Cloud Logging for logs
- Cloud Monitoring for metrics
- Cloud Trace for request tracing

## GCP Architecture (GKE)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Ingress        │
                    │ Controller     │
                    └────────┬───────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌───────────────┐
        │ Backend       │         │ Frontend      │
        │ Service       │         │ Service       │
        │ (ClusterIP)   │         │ (LoadBalancer)│
        └───────┬───────┘         └───────┬───────┘
                │                         │
                ▼                         ▼
┌───────────────────────────────────────────────────────────────┐
│                    GKE Cluster                                 │
│                                                                │
│  ┌─────────────────────┐      ┌─────────────────────┐        │
│  │  Backend Deployment │      │  Frontend Deployment│        │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │        │
│  │  │ Pod 1         │  │      │  │ Pod 1         │  │        │
│  │  │ FastAPI:8000  │  │      │  │ React:3000    │  │        │
│  │  └───────────────┘  │      │  └───────────────┘  │        │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │        │
│  │  │ Pod 2         │  │      │  │ Pod 2         │  │        │
│  │  │ FastAPI:8000  │  │      │  │ React:3000    │  │        │
│  │  └───────────────┘  │      │  └───────────────┘  │        │
│  └─────────────────────┘      └─────────────────────┘        │
│                                                                │
│  ┌─────────────────────────────────────────────────┐          │
│  │           Node Pool (e2-medium)                 │          │
│  │           Auto-scaling: 1-5 nodes               │          │
│  └─────────────────────────────────────────────────┘          │
└───────────────────────────────────────────────────────────────┘
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌───────────────┐
        │ Persistent    │         │ Artifact      │
        │ Volumes       │         │ Registry      │
        │ (Uploads/DB)  │         │ (Images)      │
        └───────────────┘         └───────────────┘
```

### GKE Components

**Networking:**
- VPC with subnet 10.0.0.0/24
- Secondary ranges for pods (10.1.0.0/16)
- Secondary ranges for services (10.2.0.0/16)
- Cloud NAT for outbound traffic

**Compute:**
- GKE cluster with Workload Identity
- Node pool: e2-medium instances
- Auto-scaling: 1-5 nodes
- Backend deployment: 2 replicas
- Frontend deployment: 2 replicas

**Storage:**
- Persistent volumes for uploads and database
- Artifact Registry for Docker images
- Secret Manager for API keys

**Networking:**
- Ingress controller for routing
- Backend ClusterIP service
- Frontend LoadBalancer service

**Security:**
- Workload Identity for pod authentication
- Network policies (optional)
- Pod security policies

## Data Flow

### File Upload Flow

```
User → Frontend → ALB/Load Balancer → Backend → EFS/Cloud Storage
                                         ↓
                                    Database (SQLite)
                                         ↓
                                    AI Processing (NVIDIA API)
                                         ↓
                                    Response → Frontend → User
```

### Chat Flow

```
User → Frontend → WebSocket → Backend → NVIDIA Nemotron-3 API
                                  ↓
                            Database (Conversation)
                                  ↓
                            Response → Frontend → User
```

## Scaling Strategy

### AWS ECS
- **Horizontal:** Increase `desired_count` in terraform.tfvars
- **Vertical:** Increase `cpu` and `memory` in terraform.tfvars
- **Auto-scaling:** Configure ECS service auto-scaling (optional)

### GCP Cloud Run
- **Automatic:** Scales to zero when idle
- **Horizontal:** Automatically scales based on requests
- **Limits:** Set `max_instances` to control costs
- **Vertical:** Increase `cpu` and `memory` in terraform.tfvars

### GCP GKE
- **Horizontal Pod Autoscaling:** Based on CPU/memory
- **Cluster Autoscaling:** Adds/removes nodes automatically
- **Vertical:** Increase pod resources in deployment YAML

## High Availability

### AWS
- Multi-AZ deployment (2 availability zones)
- ALB distributes traffic across AZs
- EFS replicated across AZs
- Auto-recovery of failed tasks

### GCP Cloud Run
- Regional deployment (multi-zone)
- Automatic traffic distribution
- Built-in redundancy
- Automatic instance replacement

### GCP GKE
- Regional cluster (multi-zone)
- Node pool across multiple zones
- Pod anti-affinity (optional)
- Automatic node repair

## Disaster Recovery

### Backup Strategy
- **Database:** Regular snapshots of EFS/persistent volumes
- **Configuration:** Terraform state in version control
- **Images:** Tagged Docker images in ECR/Artifact Registry

### Recovery Time Objective (RTO)
- **AWS:** ~15 minutes (redeploy from Terraform)
- **GCP Cloud Run:** ~10 minutes (redeploy from Terraform)
- **GCP GKE:** ~20 minutes (redeploy cluster and workloads)

### Recovery Point Objective (RPO)
- **Database:** Last backup (configure backup frequency)
- **Files:** Last upload (real-time)
- **Configuration:** Last commit (version controlled)

## Cost Optimization

### Development
- Use minimal instance sizes
- Set min instances to 0 (GCP Cloud Run)
- Use single NAT gateway (AWS)
- Delete resources when not in use

### Production
- Use reserved instances/committed use discounts
- Enable auto-scaling to match demand
- Monitor and optimize resource usage
- Use spot/preemptible instances for non-critical workloads

## Security Best Practices

1. **Network Isolation:** Backend in private subnets/networks
2. **Secrets Management:** Use cloud secret managers
3. **IAM:** Principle of least privilege
4. **Encryption:** At rest and in transit
5. **Monitoring:** Enable audit logs
6. **Updates:** Regular security patches

## Monitoring and Alerting

### Key Metrics
- Request count and latency
- Error rate (4xx, 5xx)
- CPU and memory utilization
- Disk usage (EFS/persistent volumes)
- Container health

### Recommended Alerts
- High error rate (> 5%)
- High latency (> 2 seconds)
- High CPU usage (> 80%)
- High memory usage (> 90%)
- Service unavailable

## Next Steps

1. Review architecture for your use case
2. Adjust resource sizing in terraform.tfvars
3. Deploy using deployment scripts
4. Configure monitoring and alerts
5. Set up CI/CD pipelines
6. Plan disaster recovery procedures
