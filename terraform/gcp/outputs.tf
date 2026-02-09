output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "gke_cluster_name" {
  description = "GKE cluster name"
  value       = var.use_cloud_run ? null : google_container_cluster.primary.name
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = var.use_cloud_run ? null : google_container_cluster.primary.endpoint
  sensitive   = true
}

output "backend_url" {
  description = "Backend service URL"
  value       = var.use_cloud_run ? google_cloud_run_v2_service.backend[0].uri : "Deploy via kubectl to get URL"
}

output "frontend_url" {
  description = "Frontend service URL"
  value       = var.use_cloud_run ? google_cloud_run_v2_service.frontend[0].uri : "Deploy via kubectl to get URL"
}

output "storage_bucket_name" {
  description = "Cloud Storage bucket for uploads"
  value       = google_storage_bucket.uploads.name
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = var.use_cloud_sql ? google_sql_database_instance.main[0].connection_name : null
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.nexus.email
}

output "vpc_network_name" {
  description = "VPC network name"
  value       = google_compute_network.vpc.name
}
