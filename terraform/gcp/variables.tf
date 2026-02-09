variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "nvidia-nexus"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "subnet_cidr" {
  description = "CIDR block for subnet"
  type        = string
  default     = "10.0.0.0/24"
}

variable "pods_cidr" {
  description = "CIDR block for GKE pods"
  type        = string
  default     = "10.1.0.0/16"
}

variable "services_cidr" {
  description = "CIDR block for GKE services"
  type        = string
  default     = "10.2.0.0/16"
}

variable "use_cloud_run" {
  description = "Use Cloud Run instead of GKE"
  type        = bool
  default     = true
}

variable "use_cloud_sql" {
  description = "Use Cloud SQL instead of SQLite"
  type        = bool
  default     = false
}

# GKE Configuration
variable "gke_machine_type" {
  description = "Machine type for GKE nodes"
  type        = string
  default     = "e2-medium"
}

variable "gke_node_count" {
  description = "Initial number of GKE nodes"
  type        = number
  default     = 2
}

variable "gke_min_nodes" {
  description = "Minimum number of GKE nodes"
  type        = number
  default     = 1
}

variable "gke_max_nodes" {
  description = "Maximum number of GKE nodes"
  type        = number
  default     = 5
}

# Cloud Run Configuration
variable "backend_cpu" {
  description = "CPU allocation for backend (e.g., '1', '2')"
  type        = string
  default     = "1"
}

variable "backend_memory" {
  description = "Memory allocation for backend (e.g., '512Mi', '1Gi')"
  type        = string
  default     = "1Gi"
}

variable "frontend_cpu" {
  description = "CPU allocation for frontend"
  type        = string
  default     = "1"
}

variable "frontend_memory" {
  description = "Memory allocation for frontend"
  type        = string
  default     = "512Mi"
}

variable "backend_min_instances" {
  description = "Minimum backend instances"
  type        = number
  default     = 0
}

variable "backend_max_instances" {
  description = "Maximum backend instances"
  type        = number
  default     = 10
}

variable "frontend_min_instances" {
  description = "Minimum frontend instances"
  type        = number
  default     = 0
}

variable "frontend_max_instances" {
  description = "Maximum frontend instances"
  type        = number
  default     = 10
}

# Database Configuration
variable "db_tier" {
  description = "Cloud SQL tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  default     = ""
}

# Secrets
variable "nvidia_api_key" {
  description = "NVIDIA API key for AI services"
  type        = string
  sensitive   = true
}
