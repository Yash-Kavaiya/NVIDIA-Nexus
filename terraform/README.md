# NVIDIA Nexus - Terraform Infrastructure

This directory contains Terraform configurations for deploying NVIDIA Nexus on AWS and GCP.

## Directory Structure

```
terraform/
├── aws/              # AWS deployment (ECS Fargate)
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── gcp/              # GCP deployment (Cloud Run or GKE)
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
└── README.md
```

## Prerequisites

1. **Terraform** >= 1.0 installed
2. **Docker** installed for building images
3. Cloud provider CLI tools:
   - AWS: `aws-cli` configured with credentials
   - GCP: `gcloud` CLI authenticated

## AWS Deployment

### Architecture

- **Compute**: ECS Fargate (serverless containers)
- **Load Balancer**: Application Load Balancer
- **Storage**: EFS for persistent uploads, ECR for Docker images
- **Database**: SQLite on EFS (can be upgraded to RDS)
- **Secrets**: AWS Secrets Manager

### Setup

1. **Configure AWS credentials**:
```bash
aws configure
```

2. **Navigate to AWS directory**:
```bash
cd terraform/aws
```

3. **Create terraform.tfvars**:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

4. **Build and push Docker images**:
```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd ../../backend
docker build -t nvidia-nexus-backend .
docker tag nvidia-nexus-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/nvidia-nexus-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nvidia-nexus-backend:latest

# Build and push frontend
cd ../frontend
docker build -t nvidia-nexus-frontend .
docker tag nvidia-nexus-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/nvidia-nexus-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nvidia-nexus-frontend:latest
```

5. **Deploy infrastructure**:
```bash
cd ../terraform/aws
terraform init
terraform plan
terraform apply
```

6. **Get application URL**:
```bash
terraform output frontend_url
```

### AWS Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `aws_region` | AWS region | `us-east-1` |
| `project_name` | Project name | `nvidia-nexus` |
| `environment` | Environment | `dev` |
| `backend_cpu` | Backend CPU units | `512` |
| `backend_memory` | Backend memory (MB) | `1024` |
| `nvidia_api_key` | NVIDIA API key | Required |

## GCP Deployment

### Architecture Options

**Option 1: Cloud Run (Recommended for simplicity)**
- Serverless containers with auto-scaling
- Pay-per-use pricing
- Simpler setup

**Option 2: GKE (Recommended for production)**
- Full Kubernetes control
- Better for complex workloads
- More configuration options

### Setup

1. **Authenticate with GCP**:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. **Enable required APIs** (if not using Terraform to enable):
```bash
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

3. **Navigate to GCP directory**:
```bash
cd terraform/gcp
```

4. **Create terraform.tfvars**:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

5. **Deploy infrastructure**:
```bash
terraform init
terraform plan
terraform apply
```

6. **Build and push Docker images**:
```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Get repository URL from Terraform output
REPO_URL=$(terraform output -raw artifact_registry_url)

# Build and push backend
cd ../../backend
docker build -t $REPO_URL/backend:latest .
docker push $REPO_URL/backend:latest

# Build and push frontend
cd ../frontend
docker build -t $REPO_URL/frontend:latest .
docker push $REPO_URL/frontend:latest
```

7. **Update Cloud Run services** (if using Cloud Run):
```bash
cd ../terraform/gcp
terraform apply -replace=google_cloud_run_v2_service.backend[0]
terraform apply -replace=google_cloud_run_v2_service.frontend[0]
```

8. **Get application URL**:
```bash
terraform output frontend_url
```

### GCP Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `project_id` | GCP project ID | Required |
| `region` | GCP region | `us-central1` |
| `use_cloud_run` | Use Cloud Run vs GKE | `true` |
| `use_cloud_sql` | Use Cloud SQL vs SQLite | `false` |
| `backend_cpu` | Backend CPU | `1` |
| `backend_memory` | Backend memory | `1Gi` |
| `nvidia_api_key` | NVIDIA API key | Required |

## Environment-Specific Deployments

### Development
```bash
# terraform.tfvars
environment = "dev"
backend_desired_count = 1  # AWS
backend_min_instances = 0  # GCP
```

### Production
```bash
# terraform.tfvars
environment = "prod"
backend_desired_count = 2  # AWS
backend_min_instances = 1  # GCP
use_cloud_sql = true       # GCP only
```

## Cost Optimization

### AWS
- Use `t3.micro` or `t4g.micro` for dev environments
- Enable single NAT gateway for dev (`single_nat_gateway = true`)
- Use Fargate Spot for non-critical workloads

### GCP
- Use Cloud Run with min instances = 0 for dev
- Use preemptible nodes for GKE dev clusters
- Enable autoscaling to scale down during low usage

## Security Best Practices

1. **Never commit secrets**:
   - Use `terraform.tfvars` (gitignored)
   - Use environment variables
   - Use cloud secret managers

2. **Network security**:
   - Backend runs in private subnets
   - Only ALB/Load Balancer exposed publicly
   - Security groups restrict access

3. **IAM/Service Accounts**:
   - Principle of least privilege
   - Separate roles for different services

## Monitoring and Logging

### AWS
- CloudWatch Logs: `/ecs/nvidia-nexus/backend` and `/ecs/nvidia-nexus/frontend`
- Container Insights enabled on ECS cluster

### GCP
- Cloud Logging: Automatic for Cloud Run and GKE
- Cloud Monitoring: Metrics and dashboards

## Troubleshooting

### AWS

**Issue**: Tasks not starting
```bash
# Check ECS service events
aws ecs describe-services --cluster nvidia-nexus-cluster --services nvidia-nexus-backend

# Check CloudWatch logs
aws logs tail /ecs/nvidia-nexus/backend --follow
```

**Issue**: Cannot pull Docker images
- Verify ECR repository exists
- Check IAM role has ECR pull permissions
- Ensure images are pushed to correct repository

### GCP

**Issue**: Cloud Run deployment fails
```bash
# Check service logs
gcloud run services logs read nvidia-nexus-backend --region us-central1

# Describe service
gcloud run services describe nvidia-nexus-backend --region us-central1
```

**Issue**: Cannot push to Artifact Registry
```bash
# Re-authenticate
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## Cleanup

### AWS
```bash
cd terraform/aws
terraform destroy
```

### GCP
```bash
cd terraform/gcp
terraform destroy
```

**Note**: Some resources may have deletion protection enabled in production. Disable before destroying.

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [GCP Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GCP GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
