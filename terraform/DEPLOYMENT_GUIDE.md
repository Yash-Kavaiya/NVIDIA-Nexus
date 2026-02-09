# NVIDIA Nexus - Complete Deployment Guide

This guide walks you through deploying NVIDIA Nexus to AWS or GCP from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Deployment](#aws-deployment)
3. [GCP Deployment](#gcp-deployment)
4. [Post-Deployment](#post-deployment)
5. [CI/CD Setup](#cicd-setup)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

```bash
# Terraform
terraform --version  # >= 1.0

# Docker
docker --version

# AWS CLI (for AWS deployment)
aws --version

# GCP CLI (for GCP deployment)
gcloud --version

# kubectl (for GKE deployment)
kubectl version --client
```

### Get NVIDIA API Key

1. Visit [NVIDIA NGC](https://catalog.ngc.nvidia.com/)
2. Sign up or log in
3. Generate an API key from your account settings
4. Save it securely - you'll need it for deployment

## AWS Deployment

### Step 1: Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

### Step 2: Prepare Configuration

```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region   = "us-east-1"
project_name = "nvidia-nexus"
environment  = "dev"

# IMPORTANT: Add your NVIDIA API key
nvidia_api_key = "nvapi-xxxxxxxxxxxxx"
```

### Step 3: Initialize Terraform

```bash
terraform init
```

### Step 4: Review Infrastructure Plan

```bash
terraform plan
```

This will show you all resources that will be created:
- VPC with public/private subnets
- Application Load Balancer
- ECS Fargate cluster
- ECR repositories
- EFS file system
- Security groups
- IAM roles

### Step 5: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This takes ~10-15 minutes.

### Step 6: Build and Push Docker Images

```bash
# Get ECR repository URLs
BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url)
FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url)
REGION=$(terraform output -raw aws_region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin \
  $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and push backend
cd ../../backend
docker build -t $BACKEND_REPO:latest .
docker push $BACKEND_REPO:latest

# Build and push frontend
cd ../frontend
docker build -t $FRONTEND_REPO:latest .
docker push $FRONTEND_REPO:latest
```

### Step 7: Update ECS Services

```bash
cd ../terraform/aws
CLUSTER=$(terraform output -raw ecs_cluster_name)

aws ecs update-service \
  --cluster $CLUSTER \
  --service nvidia-nexus-backend \
  --force-new-deployment

aws ecs update-service \
  --cluster $CLUSTER \
  --service nvidia-nexus-frontend \
  --force-new-deployment
```

### Step 8: Access Your Application

```bash
# Get the application URL
terraform output frontend_url
```

Visit the URL in your browser. It may take 2-3 minutes for services to become healthy.

### Alternative: Use Deployment Script

```bash
cd terraform/aws
chmod +x deploy.sh
./deploy.sh apply
```

## GCP Deployment

### Step 1: Authenticate with GCP

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Enable Required APIs

```bash
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Step 3: Prepare Configuration

```bash
cd terraform/gcp
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
project_id   = "your-gcp-project-id"
project_name = "nvidia-nexus"
region       = "us-central1"
environment  = "dev"

# Choose deployment method
use_cloud_run = true   # Simpler, serverless
use_cloud_sql = false  # Use SQLite for dev

# IMPORTANT: Add your NVIDIA API key
nvidia_api_key = "nvapi-xxxxxxxxxxxxx"
```

### Step 4: Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### Step 5: Build and Push Docker Images

```bash
# Get Artifact Registry URL
REPO_URL=$(terraform output -raw artifact_registry_url)
REGION=$(terraform output -raw region)

# Configure Docker
gcloud auth configure-docker $REGION-docker.pkg.dev

# Build and push backend
cd ../../backend
docker build -t $REPO_URL/backend:latest .
docker push $REPO_URL/backend:latest

# Build and push frontend
cd ../frontend
docker build -t $REPO_URL/frontend:latest .
docker push $REPO_URL/frontend:latest
```

### Step 6: Update Cloud Run Services

```bash
cd ../terraform/gcp
PROJECT_ID=$(terraform output -raw project_id)
REGION=$(terraform output -raw region)

gcloud run services update nvidia-nexus-backend \
  --region $REGION \
  --project $PROJECT_ID

gcloud run services update nvidia-nexus-frontend \
  --region $REGION \
  --project $PROJECT_ID
```

### Step 7: Access Your Application

```bash
terraform output frontend_url
```

### Alternative: Use Deployment Script

```bash
cd terraform/gcp
chmod +x deploy.sh
./deploy.sh apply
```

### GKE Deployment (Advanced)

If you set `use_cloud_run = false`, deploy to GKE:

```bash
# Get cluster credentials
gcloud container clusters get-credentials nvidia-nexus-gke --region us-central1

# Update k8s manifests with your project ID
sed -i 's/PROJECT_ID/your-project-id/g' k8s/*.yaml

# Create secret
kubectl create secret generic nvidia-api-key \
  --from-literal=api-key=nvapi-xxxxxxxxxxxxx

# Deploy
kubectl apply -f k8s/storage.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Get external IP
kubectl get ingress nvidia-nexus-ingress
```

## Post-Deployment

### Verify Health

```bash
# AWS
curl http://$(terraform output -raw alb_dns_name)/health

# GCP
curl $(terraform output -raw backend_url)/health
```

Expected response:
```json
{"status": "healthy"}
```

### Test File Upload

```bash
# Create test file
echo "Hello NVIDIA Nexus" > test.txt

# Upload via API
curl -X POST \
  -F "file=@test.txt" \
  http://YOUR_URL/api/files/upload
```

### View Logs

**AWS:**
```bash
# Backend logs
aws logs tail /ecs/nvidia-nexus/backend --follow

# Frontend logs
aws logs tail /ecs/nvidia-nexus/frontend --follow
```

**GCP Cloud Run:**
```bash
# Backend logs
gcloud run services logs read nvidia-nexus-backend --region us-central1

# Frontend logs
gcloud run services logs read nvidia-nexus-frontend --region us-central1
```

**GCP GKE:**
```bash
kubectl logs -l component=backend --follow
kubectl logs -l component=frontend --follow
```

## CI/CD Setup

### GitHub Actions (AWS)

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to ECR
        run: |
          aws ecr get-login-password --region us-east-1 | \
            docker login --username AWS --password-stdin \
            ${{ secrets.ECR_REGISTRY }}
      
      - name: Build and push backend
        run: |
          cd backend
          docker build -t ${{ secrets.ECR_REGISTRY }}/nvidia-nexus-backend:latest .
          docker push ${{ secrets.ECR_REGISTRY }}/nvidia-nexus-backend:latest
      
      - name: Build and push frontend
        run: |
          cd frontend
          docker build -t ${{ secrets.ECR_REGISTRY }}/nvidia-nexus-frontend:latest .
          docker push ${{ secrets.ECR_REGISTRY }}/nvidia-nexus-frontend:latest
      
      - name: Update ECS services
        run: |
          aws ecs update-service --cluster nvidia-nexus-cluster \
            --service nvidia-nexus-backend --force-new-deployment
          aws ecs update-service --cluster nvidia-nexus-cluster \
            --service nvidia-nexus-frontend --force-new-deployment
```

### GitHub Actions (GCP)

Create `.github/workflows/deploy-gcp.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Configure Docker
        run: gcloud auth configure-docker us-central1-docker.pkg.dev
      
      - name: Build and push backend
        run: |
          cd backend
          docker build -t us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/nvidia-nexus-docker/backend:latest .
          docker push us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/nvidia-nexus-docker/backend:latest
      
      - name: Build and push frontend
        run: |
          cd frontend
          docker build -t us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/nvidia-nexus-docker/frontend:latest .
          docker push us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/nvidia-nexus-docker/frontend:latest
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run services update nvidia-nexus-backend --region us-central1
          gcloud run services update nvidia-nexus-frontend --region us-central1
```

## Monitoring

### AWS CloudWatch

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name nvidia-nexus \
  --dashboard-body file://cloudwatch-dashboard.json
```

### GCP Cloud Monitoring

```bash
# View metrics
gcloud monitoring dashboards list
```

### Custom Metrics

Add to backend code:
```python
from prometheus_client import Counter, Histogram

request_count = Counter('http_requests_total', 'Total HTTP requests')
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')
```

## Troubleshooting

### Issue: Services not starting

**AWS:**
```bash
# Check task status
aws ecs describe-tasks --cluster nvidia-nexus-cluster \
  --tasks $(aws ecs list-tasks --cluster nvidia-nexus-cluster --query 'taskArns[0]' --output text)
```

**GCP:**
```bash
# Check Cloud Run logs
gcloud run services logs read nvidia-nexus-backend --limit 50
```

### Issue: Cannot access application

1. Check security groups (AWS) or firewall rules (GCP)
2. Verify load balancer health checks
3. Check DNS propagation

### Issue: Database errors

- Verify EFS mount (AWS) or persistent volume (GKE)
- Check file permissions
- Ensure SQLite database is initialized

### Issue: NVIDIA API errors

- Verify API key is correct
- Check API key has not expired
- Ensure secrets are properly mounted

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

**Note:** Some resources may have deletion protection. Disable before destroying.

## Cost Estimates

### AWS (Monthly)

- **Dev Environment**: ~$50-100
  - ECS Fargate: ~$30
  - ALB: ~$20
  - EFS: ~$10
  - Data transfer: ~$10

- **Production**: ~$200-500
  - Multiple tasks
  - RDS instead of SQLite
  - Enhanced monitoring

### GCP (Monthly)

- **Dev (Cloud Run)**: ~$20-50
  - Cloud Run: Pay per use
  - Artifact Registry: ~$5
  - Storage: ~$5

- **Production (GKE)**: ~$150-400
  - GKE cluster: ~$100
  - Load balancer: ~$20
  - Cloud SQL: ~$30
  - Storage: ~$10

## Support

For issues or questions:
- Check logs first
- Review Terraform state
- Consult cloud provider documentation
- Open GitHub issue with logs and configuration
