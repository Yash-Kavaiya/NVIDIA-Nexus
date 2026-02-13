# AWS Deployment Setup Instructions

## Prerequisites Installation

### 1. Install AWS CLI

Download and install from: https://aws.amazon.com/cli/

Or using PowerShell:
```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

Verify installation:
```powershell
aws --version
```

### 2. Install Terraform

Download from: https://www.terraform.io/downloads

Or using Chocolatey:
```powershell
choco install terraform
```

Verify installation:
```powershell
terraform version
```

### 3. Install Docker Desktop

Download from: https://www.docker.com/products/docker-desktop

Required for building and pushing container images.

## AWS Configuration

### Configure AWS Credentials

Your AWS credentials should be configured from the CSV file you downloaded.

Run this command to configure AWS CLI:
```powershell
aws configure
```

When prompted, enter your credentials from the access keys CSV file:
- AWS Access Key ID: [from CSV file]
- AWS Secret Access Key: [from CSV file]
- Default region name: `us-east-1`
- Default output format: `json`

Verify configuration:
```powershell
aws sts get-caller-identity
```

## Deployment Steps

### Step 1: Initialize Terraform

```powershell
cd terraform\aws
terraform init
```

This will download required providers (AWS provider ~5.0).

### Step 2: Review Infrastructure Plan

```powershell
terraform plan
```

This will show all resources to be created:
- VPC with 2 public and 2 private subnets
- Application Load Balancer (ALB)
- ECS Fargate cluster
- 2 ECR repositories (backend, frontend)
- EFS file system for persistent storage
- Security groups and IAM roles
- CloudWatch log groups
- Secrets Manager for NVIDIA API key

Estimated cost: ~$50-100/month for dev environment

### Step 3: Deploy Infrastructure

```powershell
terraform apply
```

Type `yes` when prompted. Deployment takes approximately 10-15 minutes.

### Step 4: Build and Push Docker Images

After infrastructure is created, get the ECR repository URLs:

```powershell
# Get repository URLs
$BACKEND_REPO = terraform output -raw ecr_backend_repository_url
$FRONTEND_REPO = terraform output -raw ecr_frontend_repository_url
$REGION = terraform output -raw aws_region
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Build and push backend
cd ..\..\backend
docker build -t ${BACKEND_REPO}:latest .
docker push ${BACKEND_REPO}:latest

# Build and push frontend
cd ..\frontend
docker build -t ${FRONTEND_REPO}:latest .
docker push ${FRONTEND_REPO}:latest
```

### Step 5: Update ECS Services

```powershell
cd ..\terraform\aws
$CLUSTER = terraform output -raw ecs_cluster_name

# Force new deployment with updated images
aws ecs update-service --cluster $CLUSTER --service nvidia-nexus-backend --force-new-deployment
aws ecs update-service --cluster $CLUSTER --service nvidia-nexus-frontend --force-new-deployment
```

### Step 6: Access Your Application

Get the application URL:
```powershell
terraform output frontend_url
```

Visit the URL in your browser. Note: It may take 2-3 minutes for services to become healthy.

## Verification

### Check Service Health

```powershell
# Get ALB DNS name
$ALB_DNS = terraform output -raw alb_dns_name

# Test backend health
curl "http://$ALB_DNS/health"
```

Expected response:
```json
{"status": "healthy"}
```

### View Logs

```powershell
# Backend logs
aws logs tail /ecs/nvidia-nexus/backend --follow

# Frontend logs
aws logs tail /ecs/nvidia-nexus/frontend --follow
```

### Check ECS Service Status

```powershell
aws ecs describe-services --cluster nvidia-nexus-cluster --services nvidia-nexus-backend nvidia-nexus-frontend
```

## Troubleshooting

### Issue: Docker build fails

Ensure Docker Desktop is running:
```powershell
docker ps
```

### Issue: ECR push fails

Re-authenticate with ECR:
```powershell
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### Issue: Services not starting

Check task logs:
```powershell
aws ecs describe-tasks --cluster nvidia-nexus-cluster --tasks $(aws ecs list-tasks --cluster nvidia-nexus-cluster --query 'taskArns[0]' --output text)
```

### Issue: Cannot access application

1. Check security group rules
2. Verify ALB target health:
```powershell
aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names nvidia-nexus-backend-tg --query 'TargetGroups[0].TargetGroupArn' --output text)
```

## Cleanup

To destroy all resources and stop incurring costs:

```powershell
cd terraform\aws
terraform destroy
```

Type `yes` when prompted.

**Important:** This will delete:
- All ECS services and tasks
- ECR repositories and images
- EFS file system and data
- Load balancer
- VPC and networking

## Cost Optimization

For development:
- Use single NAT gateway (already configured)
- Use minimal task sizes (512 CPU, 1024 MB memory)
- Stop services when not in use:
  ```powershell
  aws ecs update-service --cluster nvidia-nexus-cluster --service nvidia-nexus-backend --desired-count 0
  aws ecs update-service --cluster nvidia-nexus-cluster --service nvidia-nexus-frontend --desired-count 0
  ```

## Next Steps

1. Set up custom domain with Route 53
2. Add SSL certificate with ACM
3. Configure auto-scaling policies
4. Set up CloudWatch alarms
5. Implement CI/CD with GitHub Actions

## Support

For issues:
1. Check CloudWatch logs
2. Review ECS task definitions
3. Verify security group rules
4. Check IAM permissions
