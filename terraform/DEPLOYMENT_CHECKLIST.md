# Deployment Checklist

Use this checklist to ensure a successful deployment of NVIDIA Nexus.

## Pre-Deployment

### Prerequisites
- [ ] Terraform >= 1.0 installed
- [ ] Docker installed and running
- [ ] Cloud CLI installed (aws-cli or gcloud)
- [ ] Cloud credentials configured
- [ ] NVIDIA API key obtained from NGC

### Configuration
- [ ] Copied `terraform.tfvars.example` to `terraform.tfvars`
- [ ] Set `project_id` (GCP) or verified AWS account
- [ ] Set `project_name` (default: nvidia-nexus)
- [ ] Set `region` (AWS: us-east-1, GCP: us-central1)
- [ ] Set `environment` (dev/staging/prod)
- [ ] Added `nvidia_api_key` to terraform.tfvars
- [ ] Reviewed resource sizing (CPU/memory)
- [ ] Reviewed cost estimates

### Security
- [ ] terraform.tfvars is in .gitignore
- [ ] API keys not committed to git
- [ ] Reviewed IAM/service account permissions
- [ ] Planned network security (VPC, security groups)

## Deployment

### Infrastructure
- [ ] Ran `terraform init` successfully
- [ ] Ran `terraform plan` and reviewed changes
- [ ] Ran `terraform apply` successfully
- [ ] All resources created without errors
- [ ] Noted output values (URLs, repository URLs)

### Docker Images
- [ ] Authenticated to container registry (ECR/Artifact Registry)
- [ ] Built backend Docker image
- [ ] Pushed backend image to registry
- [ ] Built frontend Docker image
- [ ] Pushed frontend image to registry
- [ ] Verified images in registry

### Service Deployment
- [ ] Updated services with new images (ECS/Cloud Run)
- [ ] Services started successfully
- [ ] Health checks passing
- [ ] No error logs in CloudWatch/Cloud Logging

## Post-Deployment Verification

### Health Checks
- [ ] Backend health endpoint responding: `/health`
- [ ] Frontend loading in browser
- [ ] API documentation accessible: `/docs`
- [ ] WebSocket connection working

### Functionality Tests
- [ ] Can upload a file
- [ ] Can view uploaded files
- [ ] Can chat with AI assistant
- [ ] AI responses working correctly
- [ ] Can delete files
- [ ] Can create tasks

### Performance
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] No memory leaks observed
- [ ] CPU usage within limits

### Security
- [ ] HTTPS enabled (if configured)
- [ ] API keys not exposed in logs
- [ ] Backend not directly accessible (only through ALB/Load Balancer)
- [ ] CORS configured correctly
- [ ] File upload size limits working

### Monitoring
- [ ] Logs visible in CloudWatch/Cloud Logging
- [ ] Metrics being collected
- [ ] Alerts configured (if applicable)
- [ ] Dashboard created (optional)

## AWS-Specific

### ECS
- [ ] Cluster created and active
- [ ] Task definitions registered
- [ ] Services running desired count
- [ ] Target groups healthy
- [ ] ALB routing correctly

### Networking
- [ ] VPC created with correct CIDR
- [ ] Public and private subnets created
- [ ] NAT gateway operational
- [ ] Security groups configured
- [ ] ALB accessible from internet

### Storage
- [ ] EFS file system created
- [ ] Mount targets in all AZs
- [ ] ECR repositories created
- [ ] Secrets in Secrets Manager

## GCP-Specific

### Cloud Run
- [ ] Services deployed and running
- [ ] Services accessible via URLs
- [ ] Auto-scaling configured
- [ ] Min/max instances set correctly
- [ ] IAM permissions correct

### GKE (if applicable)
- [ ] Cluster created and running
- [ ] Node pool healthy
- [ ] Pods running
- [ ] Services exposed
- [ ] Ingress configured
- [ ] Persistent volumes bound

### Networking
- [ ] VPC network created
- [ ] Subnet with secondary ranges (GKE)
- [ ] Cloud NAT operational
- [ ] Firewall rules configured

### Storage
- [ ] Artifact Registry repository created
- [ ] Cloud Storage bucket created
- [ ] Secrets in Secret Manager
- [ ] Persistent volumes (GKE)

## CI/CD (Optional)

### GitHub Actions
- [ ] Workflow files in `.github/workflows/`
- [ ] Secrets added to GitHub repository
- [ ] Test workflow triggered successfully
- [ ] Deployment automated on push to main

## Documentation

- [ ] Deployment notes documented
- [ ] URLs shared with team
- [ ] Access credentials secured
- [ ] Runbook created for operations
- [ ] Disaster recovery plan documented

## Cleanup (Dev/Test Only)

- [ ] Verified all resources to be destroyed
- [ ] Backed up any important data
- [ ] Ran `terraform destroy`
- [ ] Verified all resources deleted
- [ ] Checked for orphaned resources

## Troubleshooting

If any checks fail, refer to:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Detailed troubleshooting
- [README.md](README.md) - Architecture overview
- Cloud provider logs (CloudWatch/Cloud Logging)
- Terraform state: `terraform show`

## Sign-off

- [ ] Deployment completed successfully
- [ ] All tests passing
- [ ] Team notified
- [ ] Documentation updated

**Deployed by:** _______________  
**Date:** _______________  
**Environment:** _______________  
**Version/Commit:** _______________  
**URLs:**
- Frontend: _______________
- Backend: _______________

---

**Notes:**
