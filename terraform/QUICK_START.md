# NVIDIA Nexus - Quick Start Deployment

Choose your cloud provider and follow the steps below for the fastest deployment.

## 🚀 AWS Quick Start (15 minutes)

```bash
# 1. Prerequisites
aws configure
cd terraform/aws

# 2. Configure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and add your nvidia_api_key

# 3. Deploy everything
chmod +x deploy.sh
./deploy.sh apply

# 4. Get your URL
terraform output frontend_url
```

**That's it!** The script handles:
- Infrastructure provisioning
- Docker image building
- ECR push
- ECS service deployment

## ☁️ GCP Quick Start (15 minutes)

```bash
# 1. Prerequisites
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
cd terraform/gcp

# 2. Configure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars:
#   - Set project_id
#   - Add nvidia_api_key
#   - Set use_cloud_run = true (recommended)

# 3. Deploy everything
chmod +x deploy.sh
./deploy.sh apply

# 4. Get your URL
terraform output frontend_url
```

**That's it!** The script handles:
- API enablement
- Infrastructure provisioning
- Docker image building
- Artifact Registry push
- Cloud Run deployment

## 🎯 What Gets Deployed

### AWS Architecture
```
Internet → ALB → ECS Fargate
                 ├── Backend (FastAPI)
                 └── Frontend (React)
                 
Storage:
├── EFS (uploads & database)
├── ECR (Docker images)
└── Secrets Manager (API keys)
```

### GCP Architecture (Cloud Run)
```
Internet → Cloud Run
           ├── Backend (FastAPI)
           └── Frontend (React)

Storage:
├── Cloud Storage (uploads)
├── Artifact Registry (Docker images)
└── Secret Manager (API keys)
```

### GCP Architecture (GKE)
```
Internet → Ingress → GKE
                     ├── Backend pods
                     └── Frontend pods

Storage:
├── Persistent Volumes (uploads & database)
├── Artifact Registry (Docker images)
└── Secret Manager (API keys)
```

## 📋 Configuration Options

### Minimal (Dev)
```hcl
environment = "dev"
backend_desired_count = 1  # AWS
backend_min_instances = 0  # GCP
```

**Cost:** ~$20-50/month

### Production
```hcl
environment = "prod"
backend_desired_count = 2  # AWS
backend_min_instances = 1  # GCP
use_cloud_sql = true       # GCP only
```

**Cost:** ~$150-500/month

## 🔧 Common Commands

### View Logs

**AWS:**
```bash
aws logs tail /ecs/nvidia-nexus/backend --follow
```

**GCP:**
```bash
gcloud run services logs read nvidia-nexus-backend --follow
```

### Update Application

**AWS:**
```bash
cd terraform/aws
./deploy.sh apply
```

**GCP:**
```bash
cd terraform/gcp
./deploy.sh apply
```

### Scale Services

**AWS:**
Edit `terraform.tfvars`:
```hcl
backend_desired_count = 3
```
Then: `terraform apply`

**GCP Cloud Run:**
Auto-scales automatically. To set limits:
```hcl
backend_max_instances = 20
```
Then: `terraform apply`

### Destroy Everything

**AWS:**
```bash
cd terraform/aws
terraform destroy
```

**GCP:**
```bash
cd terraform/gcp
terraform destroy
```

## 🐛 Troubleshooting

### Issue: "terraform: command not found"
```bash
# Install Terraform
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

### Issue: "AWS credentials not configured"
```bash
aws configure
# Enter your credentials
```

### Issue: "GCP project not set"
```bash
gcloud config set project YOUR_PROJECT_ID
```

### Issue: Services not starting
```bash
# Check logs (see commands above)
# Verify NVIDIA API key is correct
# Check resource limits (CPU/memory)
```

### Issue: Cannot access application
```bash
# Wait 2-3 minutes for health checks
# Verify security groups/firewall rules
# Check load balancer status
```

## 📚 Next Steps

1. **Custom Domain:** Configure DNS and SSL certificates
2. **Monitoring:** Set up CloudWatch/Cloud Monitoring dashboards
3. **CI/CD:** Use GitHub Actions workflows in `.github/workflows/`
4. **Scaling:** Adjust instance counts based on load
5. **Backup:** Configure automated backups for production

## 🔐 Security Checklist

- [ ] NVIDIA API key stored in secrets manager
- [ ] terraform.tfvars added to .gitignore
- [ ] Backend runs in private subnets (AWS)
- [ ] Security groups restrict access (AWS)
- [ ] IAM roles follow least privilege
- [ ] Enable deletion protection for production
- [ ] Configure SSL/TLS certificates
- [ ] Set up VPC flow logs (AWS) or VPC Flow Logs (GCP)

## 💰 Cost Optimization

### Development
- Use single NAT gateway (AWS)
- Set min instances to 0 (GCP Cloud Run)
- Use preemptible nodes (GKE)
- Delete resources when not in use

### Production
- Use reserved instances (AWS)
- Enable autoscaling
- Use committed use discounts (GCP)
- Monitor and optimize resource usage

## 📞 Support

- **Documentation:** See `README.md` and `DEPLOYMENT_GUIDE.md`
- **Issues:** Check logs first, then open GitHub issue
- **Updates:** Pull latest code and run `./deploy.sh apply`

---

**Ready to deploy?** Pick your cloud provider above and follow the steps!
