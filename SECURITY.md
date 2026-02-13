# Security Guidelines

## Sensitive Files - DO NOT COMMIT

The following files contain sensitive information and are excluded from git:

### Credentials & Keys
- `.env` - Contains NVIDIA API key and application secrets
- `terraform/aws/terraform.tfvars` - Contains AWS credentials and API keys
- `*accessKeys.csv` - AWS access key files
- `*.pem`, `*.key` - Private keys

### Terraform State
- `*.tfstate` - Contains infrastructure state with sensitive data
- `.terraform/` - Terraform working directory

### Database & Uploads
- `*.db` - SQLite database files
- `backend/uploads/*` - User uploaded files

## Before Pushing Code

1. **Verify .gitignore is working:**
   ```bash
   git status
   ```
   Ensure no `.env`, `.tfvars`, or credential files are listed.

2. **Check for hardcoded secrets:**
   ```bash
   git diff
   ```
   Look for API keys, passwords, or access tokens.

3. **Use example files:**
   - `.env.example` - Template for environment variables
   - `terraform.tfvars.example` - Template for Terraform variables

## Setting Up Secrets Locally

### 1. Environment Variables (.env)
```bash
cp .env.example .env
# Edit .env and add your NVIDIA_API_KEY
```

### 2. Terraform Variables
```bash
cd terraform/aws
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and add your nvidia_api_key
```

### 3. AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

## Production Deployment

For production, use secure secret management:

### AWS Secrets Manager
```bash
# Store NVIDIA API key
aws secretsmanager create-secret \
  --name nvidia-nexus-api-key \
  --secret-string "your-api-key"
```

### Environment Variables in ECS
Configure secrets in ECS task definitions using Secrets Manager ARNs.

### GitHub Actions Secrets
Store credentials as GitHub repository secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `NVIDIA_API_KEY`

## Rotating Credentials

### NVIDIA API Key
1. Generate new key at [NVIDIA NGC](https://catalog.ngc.nvidia.com/)
2. Update in AWS Secrets Manager
3. Restart ECS services

### AWS Access Keys
1. Create new access key in IAM
2. Update local AWS CLI configuration
3. Update CI/CD secrets
4. Delete old access key

## Incident Response

If credentials are accidentally committed:

1. **Immediately rotate all exposed credentials**
2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push (if safe):**
   ```bash
   git push origin --force --all
   ```
4. **Notify team members to re-clone repository**

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] `terraform.tfvars` is in `.gitignore`
- [ ] AWS credentials CSV is in `.gitignore`
- [ ] No hardcoded API keys in code
- [ ] Example files have placeholder values
- [ ] Production uses AWS Secrets Manager
- [ ] IAM roles follow least privilege principle
- [ ] Security groups restrict access appropriately
- [ ] SSL/TLS enabled for production
- [ ] Regular credential rotation schedule

## Reporting Security Issues

If you discover a security vulnerability, please email: [your-security-email]

Do not create public GitHub issues for security vulnerabilities.
