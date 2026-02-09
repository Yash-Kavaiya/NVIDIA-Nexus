#!/bin/bash
set -e

# AWS Deployment Script for NVIDIA Nexus
# Usage: ./deploy.sh [init|plan|apply|destroy]

ACTION=${1:-apply}
REGION=${AWS_REGION:-us-east-1}

echo "=== NVIDIA Nexus AWS Deployment ==="
echo "Action: $ACTION"
echo "Region: $REGION"

# Check prerequisites
command -v terraform >/dev/null 2>&1 || { echo "Terraform not installed"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "AWS CLI not installed"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker not installed"; exit 1; }

# Check AWS credentials
aws sts get-caller-identity >/dev/null 2>&1 || { echo "AWS credentials not configured"; exit 1; }

# Check for terraform.tfvars
if [ ! -f terraform.tfvars ]; then
    echo "Error: terraform.tfvars not found"
    echo "Copy terraform.tfvars.example and fill in your values"
    exit 1
fi

case $ACTION in
    init)
        echo "Initializing Terraform..."
        terraform init
        ;;
    
    plan)
        echo "Planning infrastructure..."
        terraform plan
        ;;
    
    apply)
        echo "Step 1: Applying infrastructure..."
        terraform apply -auto-approve
        
        echo ""
        echo "Step 2: Building and pushing Docker images..."
        
        # Get ECR URLs
        BACKEND_REPO=$(terraform output -raw ecr_backend_repository_url)
        FRONTEND_REPO=$(terraform output -raw ecr_frontend_repository_url)
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        
        # ECR login
        aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
        
        # Build and push backend
        echo "Building backend..."
        cd ../../backend
        docker build -t nvidia-nexus-backend .
        docker tag nvidia-nexus-backend:latest $BACKEND_REPO:latest
        docker push $BACKEND_REPO:latest
        
        # Build and push frontend
        echo "Building frontend..."
        cd ../frontend
        docker build -t nvidia-nexus-frontend .
        docker tag nvidia-nexus-frontend:latest $FRONTEND_REPO:latest
        docker push $FRONTEND_REPO:latest
        
        cd ../terraform/aws
        
        echo ""
        echo "Step 3: Updating ECS services..."
        CLUSTER=$(terraform output -raw ecs_cluster_name)
        aws ecs update-service --cluster $CLUSTER --service nvidia-nexus-backend --force-new-deployment --region $REGION
        aws ecs update-service --cluster $CLUSTER --service nvidia-nexus-frontend --force-new-deployment --region $REGION
        
        echo ""
        echo "=== Deployment Complete ==="
        echo "Frontend URL: $(terraform output -raw frontend_url)"
        echo "Backend API: $(terraform output -raw backend_api_url)"
        ;;
    
    destroy)
        echo "Destroying infrastructure..."
        terraform destroy
        ;;
    
    *)
        echo "Usage: $0 [init|plan|apply|destroy]"
        exit 1
        ;;
esac
