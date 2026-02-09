# NVIDIA Nexus - Terraform Cloud Deployment

Complete infrastructure-as-code deployment for AWS and Google Cloud Platform.

## 📁 What's Included

```
terraform/
├── aws/                          # AWS ECS Fargate deployment
│   ├── main.tf                   # Infrastructure definition
│   ├── variables.tf              # Configuration variables
│   ├── outputs.tf                # Deployment outputs
│   ├── terraform.tfvars.example  # Configuration template
│   └── deploy.sh                 # Automated deployment script
│
├── gcp/                          # GCP Cloud Run/GKE deployment
│   ├── main.tf                   # Infrastructure definition
│   ├── variables.tf              # Configuration variables
│   ├── outputs.tf                # Deployment outputs
│   ├── terraform.tfvars.example  # Configuration template
│   ├── deploy.sh                 # Automated deployment script
│   └── k8s/                      # Kubernetes manifests for GKE
│       ├── backend-deployment.yaml
│       ├── frontend-deployment.yaml
│       ├── storage.yaml
│       ├── secrets.yaml
│       └── ingress.yaml
│
├── README.md                     # Detailed documentation
├── DEPLOYMENT_GUIDE.md           # Step-by-step guide
├── QUICK_START.md                # Fast deployment guide
└── .gitignore                    # Terraform gitignore

.github/workflows/
├── deploy-aws.yml                # AWS CI/CD pipeline
└── deploy-gcp.yml                # GCP CI/CD pipeline
```

## 🎯 Deployment Options

### AWS (ECS Fargate)
- **Compute:** Serverless containers with ECS Fargate
- **Load Balancing:** Application Load Balancer
- **Storage:** EFS for persistent data, ECR for images
- **Database:** SQLite on EFS (upgradeable to RDS)
- **Cost:** ~$50-100/month (dev), ~$200-500/month (prod)

### GCP (Cloud Run - Recommended)
- **Compute:** Fully managed serverless containers
- **Load Balancing:** Built-in with Cloud Run
- **Storage:** Cloud Storage for uploads, Artifact Registry for images
- **Database:** SQLite (upgradeable to Cloud SQL)
- **Cost:** ~$20-50/month (dev), ~$100-300/month (prod)

### GCP (GKE - Advanced)
- **Compute:** Kubernetes cluster with full control
- **Load Balancing:** Ingress controller
- **Storage:** Persistent volumes
- **Database:** SQLite or Cloud SQL
- **Cost:** ~$150-400/month

## 🚀 Quick Start

### AWS Deployment
```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings
chmod +x deploy.sh
./deploy.sh apply
```

### GCP Deployment
```bash
cd terraform/gcp
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings
chmod +x deploy.sh
./deploy.sh apply
```

## 📖 Documentation

- **[QUICK_START.md](terraform/QUICK_START.md)** - Get started in 15 minutes
- **[DEPLOYMENT_GUIDE.md](terraform/DEPLOYMENT_GUIDE.md)** - Complete deployment walkthrough
- **[README.md](terraform/README.md)** - Architecture and configuration details

## 🔑 Required Secrets

Both deployments require:
1. **NVIDIA API Key** - Get from [NVIDIA NGC](https://catalog.ngc.nvidia.com/)
2. **Cloud Credentials** - AWS credentials or GCP service account

## 🏗️ Infrastructure Components

### AWS Resources Created
- VPC with public/private subnets across 2 AZs
- Application Load Balancer
- ECS Fargate cluster
- 2 ECS services (backend, frontend)
- 2 ECR repositories
- EFS file system for persistent storage
- Security groups and IAM roles
- CloudWatch log groups
- Secrets Manager for API keys

### GCP Resources Created (Cloud Run)
- VPC network with Cloud NAT
- 2 Cloud Run services (backend, frontend)
- Artifact Registry repository
- Cloud Storage bucket
- Secret Manager for API keys
- Service accounts with IAM bindings

### GCP Resources Created (GKE)
- GKE cluster with node pool
- VPC network with secondary ranges
- 2 Kubernetes deployments
- 2 Kubernetes services
- Ingress controller
- Persistent volumes
- Artifact Registry repository
- Secret Manager for API keys

## 🔄 CI/CD Integration

GitHub Actions workflows included for automated deployment:

### AWS Pipeline
- Triggers on push to main branch
- Builds Docker images
- Pushes to ECR
- Updates ECS services
- Waits for deployment stabilization

### GCP Pipeline
- Triggers on push to main branch
- Builds Docker images
- Pushes to Artifact Registry
- Updates Cloud Run services
- Reports deployment URLs

**Setup:**
1. Add secrets to GitHub repository settings
2. Push to main branch
3. Automatic deployment begins

## 📊 Monitoring & Logging

### AWS
- **CloudWatch Logs:** `/ecs/nvidia-nexus/backend` and `/ecs/nvidia-nexus/frontend`
- **Container Insights:** Enabled on ECS cluster
- **Metrics:** CPU, memory, request count, response time

### GCP
- **Cloud Logging:** Automatic for Cloud Run and GKE
- **Cloud Monitoring:** Built-in metrics and dashboards
- **Trace:** Request tracing available

## 🔒 Security Features

- Secrets stored in cloud secret managers (never in code)
- Backend runs in private subnets/networks
- Security groups/firewall rules restrict access
- IAM roles follow least privilege principle
- Encryption at rest and in transit
- VPC isolation

## 💰 Cost Breakdown

### AWS Development (~$50-100/month)
- ECS Fargate: ~$30
- ALB: ~$20
- EFS: ~$10
- Data transfer: ~$10
- CloudWatch: ~$5

### AWS Production (~$200-500/month)
- ECS Fargate (multiple tasks): ~$100
- ALB: ~$20
- RDS PostgreSQL: ~$50
- EFS: ~$20
- Data transfer: ~$30
- CloudWatch: ~$10

### GCP Cloud Run Development (~$20-50/month)
- Cloud Run (pay per use): ~$10
- Artifact Registry: ~$5
- Cloud Storage: ~$5
- Networking: ~$5

### GCP Cloud Run Production (~$100-300/month)
- Cloud Run (higher traffic): ~$50
- Cloud SQL: ~$30
- Cloud Storage: ~$10
- Networking: ~$20
- Monitoring: ~$10

### GCP GKE Production (~$150-400/month)
- GKE cluster: ~$100
- Load balancer: ~$20
- Cloud SQL: ~$30
- Storage: ~$10
- Networking: ~$20

## 🛠️ Management Commands

### View Infrastructure
```bash
terraform show
terraform state list
```

### Update Configuration
```bash
# Edit terraform.tfvars
terraform plan
terraform apply
```

### Scale Services
```bash
# Edit desired_count or min/max instances in terraform.tfvars
terraform apply
```

### View Logs
```bash
# AWS
aws logs tail /ecs/nvidia-nexus/backend --follow

# GCP
gcloud run services logs read nvidia-nexus-backend --follow
```

### Destroy Infrastructure
```bash
terraform destroy
```

## 🔧 Customization

### Change Region
Edit `terraform.tfvars`:
```hcl
aws_region = "us-west-2"  # AWS
region = "europe-west1"   # GCP
```

### Adjust Resources
```hcl
# AWS
backend_cpu = "1024"
backend_memory = "2048"

# GCP
backend_cpu = "2"
backend_memory = "2Gi"
```

### Enable Production Features
```hcl
environment = "prod"
use_cloud_sql = true  # GCP only
```

## 📝 Prerequisites

- Terraform >= 1.0
- Docker
- AWS CLI (for AWS) or gcloud CLI (for GCP)
- kubectl (for GKE)
- NVIDIA API key

## 🐛 Troubleshooting

### Common Issues

**Services not starting:**
- Check logs for errors
- Verify NVIDIA API key
- Check resource limits

**Cannot access application:**
- Wait 2-3 minutes for health checks
- Verify security groups/firewall rules
- Check load balancer status

**Terraform errors:**
- Run `terraform init` again
- Check cloud credentials
- Verify API quotas

### Getting Help

1. Check logs first
2. Review Terraform state
3. Consult documentation
4. Open GitHub issue with details

## 🎓 Learning Resources

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [GCP Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GCP GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)

## 🚦 Next Steps

1. **Deploy:** Follow QUICK_START.md for your cloud provider
2. **Configure:** Set up custom domain and SSL
3. **Monitor:** Enable dashboards and alerts
4. **Scale:** Adjust resources based on usage
5. **Automate:** Set up CI/CD pipelines

---

**Ready to deploy?** Start with [QUICK_START.md](terraform/QUICK_START.md)!
