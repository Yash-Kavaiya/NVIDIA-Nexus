terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com"
  ])

  service            = each.value
  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.required_apis]
}

# Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "${var.project_name}-subnet"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }
}

# Cloud NAT for private instances
resource "google_compute_router" "router" {
  name    = "${var.project_name}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.project_name}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "${var.project_name}-docker"
  description   = "Docker repository for NVIDIA Nexus"
  format        = "DOCKER"
  depends_on    = [google_project_service.required_apis]
}

# Secret Manager for NVIDIA API Key
resource "google_secret_manager_secret" "nvidia_api_key" {
  secret_id = "${var.project_name}-nvidia-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "nvidia_api_key" {
  secret      = google_secret_manager_secret.nvidia_api_key.id
  secret_data = var.nvidia_api_key
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = "${var.project_name}-gke"
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.project_name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.gke_node_count

  node_config {
    preemptible  = var.environment == "dev"
    machine_type = var.gke_machine_type

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      project     = var.project_name
      environment = var.environment
    }

    tags = ["${var.project_name}-node"]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  autoscaling {
    min_node_count = var.gke_min_nodes
    max_node_count = var.gke_max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Cloud Storage bucket for uploads
resource "google_storage_bucket" "uploads" {
  name          = "${var.project_id}-${var.project_name}-uploads"
  location      = var.region
  force_destroy = var.environment == "dev"

  uniform_bucket_level_access = true

  versioning {
    enabled = var.environment == "prod"
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

# Cloud SQL (PostgreSQL) for production database
resource "google_sql_database_instance" "main" {
  count            = var.use_cloud_sql ? 1 : 0
  name             = "${var.project_name}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled            = var.environment == "prod"
      start_time         = "03:00"
      point_in_time_recovery_enabled = var.environment == "prod"
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = var.environment == "prod"
  depends_on          = [google_project_service.required_apis]
}

resource "google_sql_database" "database" {
  count    = var.use_cloud_sql ? 1 : 0
  name     = "nvidia_nexus"
  instance = google_sql_database_instance.main[0].name
}

resource "google_sql_user" "user" {
  count    = var.use_cloud_sql ? 1 : 0
  name     = "nexus_user"
  instance = google_sql_database_instance.main[0].name
  password = var.db_password
}

# Service Account for workloads
resource "google_service_account" "nexus" {
  account_id   = "${var.project_name}-sa"
  display_name = "NVIDIA Nexus Service Account"
}

resource "google_project_iam_member" "nexus_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.nexus.email}"
}

resource "google_project_iam_member" "nexus_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.nexus.email}"
}

resource "google_project_iam_member" "nexus_sql" {
  count   = var.use_cloud_sql ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.nexus.email}"
}

# Cloud Run services (alternative to GKE for simpler deployment)
resource "google_cloud_run_v2_service" "backend" {
  count    = var.use_cloud_run ? 1 : 0
  name     = "${var.project_name}-backend"
  location = var.region

  template {
    service_account = google_service_account.nexus.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/backend:latest"

      ports {
        container_port = 8000
      }

      env {
        name  = "DATABASE_URL"
        value = var.use_cloud_sql ? "postgresql://${google_sql_user.user[0].name}:${var.db_password}@/${google_sql_database.database[0].name}?host=/cloudsql/${google_sql_database_instance.main[0].connection_name}" : "sqlite+aiosqlite:///./data/nvidia_nexus.db"
      }

      env {
        name = "NVIDIA_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.nvidia_api_key.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
      }
    }

    scaling {
      min_instance_count = var.backend_min_instances
      max_instance_count = var.backend_max_instances
    }
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_cloud_run_v2_service" "frontend" {
  count    = var.use_cloud_run ? 1 : 0
  name     = "${var.project_name}-frontend"
  location = var.region

  template {
    service_account = google_service_account.nexus.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/frontend:latest"

      ports {
        container_port = 3000
      }

      env {
        name  = "VITE_API_URL"
        value = var.use_cloud_run ? google_cloud_run_v2_service.backend[0].uri : "http://backend-service:8000"
      }

      resources {
        limits = {
          cpu    = var.frontend_cpu
          memory = var.frontend_memory
        }
      }
    }

    scaling {
      min_instance_count = var.frontend_min_instances
      max_instance_count = var.frontend_max_instances
    }
  }

  depends_on = [google_project_service.required_apis]
}

# IAM for Cloud Run (allow public access)
resource "google_cloud_run_service_iam_member" "backend_public" {
  count    = var.use_cloud_run ? 1 : 0
  location = google_cloud_run_v2_service.backend[0].location
  service  = google_cloud_run_v2_service.backend[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "frontend_public" {
  count    = var.use_cloud_run ? 1 : 0
  location = google_cloud_run_v2_service.frontend[0].location
  service  = google_cloud_run_v2_service.frontend[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
