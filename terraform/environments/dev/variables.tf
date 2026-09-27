variable "aws_region" {
  description = "Target AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-2" # Consistent with AWS_REGION in .env.local
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "clinical-cloud"
}

variable "vpc_cidr" {
  description = "CIDR block for the development VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to span across in us-east-2"
  type        = list(string)
  default     = ["us-east-2a", "us-east-2b"]
}

variable "enable_nat_gateway" {
  description = "Set to true to provision a NAT gateway (disabled by default in dev to minimize AWS cost)"
  type        = bool
  default     = false
}

variable "db_name" {
  description = "PostgreSQL initial database name"
  type        = string
  default     = "clinical_cloud_dev"
}

variable "db_username" {
  description = "Master username for PostgreSQL database"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Master password for PostgreSQL database (if null, a secure 24-character random password is generated)"
  type        = string
  sensitive   = true
  default     = null
}

variable "db_instance_class" {
  description = "Instance class for development RDS PostgreSQL instance"
  type        = string
  default     = "db.t4g.micro"
}
