#!/bin/bash
set -e

# GCP Deployment Script for NVIDIA Nexus
# Usage: ./deploy.sh [init|plan|apply|destroy|build-push]

ACTION=${1:-apply}
REGION=${GCP_REGION:-us-central1}

echo "=== NVIDIA Nexus GCP Deployment ==="
echo "Action: $ACTION"
echo "Region: $REGION"

# Check prerequisites
command -v terraform >/dev/null 2>&1 || { echo "Terraform not installed"; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo "gcloud CLI not installed"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker not installed"; exit 1; }

# Check GCP authentication
gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1 || { echo "Not authenticated with gcloud"; exit 1; }

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
    
    build-push)
        echo "Building and pushing Docker images..."
        
        # Get Artifact Registry URL
        REPO_URL=$(terraform output -raw artifact_registry_url)
        
        # Configure Docker
        gcloud auth configure-docker $REGION-docker.pkg.dev
        
        # Build and push backend
        echo "Building backend..."
        cd ../../backend
        docker build -t $REPO_URL/backend:latest .
        docker push $REPO_URL/backend:latest
        
        # Build and push frontend
        echo "Building frontend..."
        cd ../frontend
        docker build -t $REPO_URL/frontend:latest .
        docker push $REPO_URL/frontend:latest
        
        cd ../terraform/gcp
        echo "Images pushed successfully"
        ;;
    
    apply)
        echo "Step 1: Applying infrastructure..."
        terraform apply -auto-approve
        
        echo ""
        echo "Step 2: Building and pushing Docker images..."
        bash $0 build-push
        
        # Check if using Cloud Run
        USE_CLOUD_RUN=$(terraform output -json | jq -r '.backend_url.value' | grep -q "run.app" && echo "true" || echo "false")
        
        if [ "$USE_CLOUD_RUN" = "true" ]; then
            echo ""
            echo "Step 3: Updating Cloud Run services..."
            PROJECT_ID=$(terraform output -raw project_id)
            
            gcloud run services update nvidia-nexus-backend \
                --region $REGION \
                --project $PROJECT_ID
            
            gcloud run services update nvidia-nexus-frontend \
                --region $REGION \
                --project $PROJECT_ID
        else
            echo ""
            echo "Step 3: Deploying to GKE..."
            echo "Run: kubectl apply -f k8s/"
        fi
        
        echo ""
        echo "=== Deployment Complete ==="
        echo "Frontend URL: $(terraform output -raw frontend_url)"
        echo "Backend URL: $(terraform output -raw backend_url)"
        ;;
    
    destroy)
        echo "Destroying infrastructure..."
        terraform destroy
        ;;
    
    *)
        echo "Usage: $0 [init|plan|apply|destroy|build-push]"
        exit 1
        ;;
esac
