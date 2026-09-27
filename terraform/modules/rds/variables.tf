variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "clinical-cloud"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_subnet_ids" {
  description = "List of isolated private subnet IDs for the RDS DB subnet group"
  type        = list(string)
}

variable "db_security_group_id" {
  description = "Security group ID allowing restricted port 5432 ingress to RDS"
  type        = string
}

variable "db_name" {
  description = "Initial PostgreSQL database name"
  type        = string
  default     = "clinical_cloud_dev"
}

variable "db_username" {
  description = "Master username for PostgreSQL"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Master password for PostgreSQL (sensitive). If not provided, a random password will be generated."
  type        = string
  sensitive   = true
  default     = null
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.3"
}

variable "instance_class" {
  description = "RDS instance class (Graviton2 db.t4g.micro for cost efficiency in dev)"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB (gp3)"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage limit in GB for storage autoscaling"
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Specifies if the RDS instance is multi-AZ (false for dev, true for prod)"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Prevent database deletion via Terraform"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final DB snapshot on destroy (true for dev, false for prod)"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Automated backup retention period in days"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
