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

variable "vpc_id" {
  description = "VPC ID where Lambda and internal compute reside"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for Lambda VPC connectivity"
  type        = list(string)
}

variable "lambda_security_group_id" {
  description = "Security group ID allowing Lambda execution in VPC and database egress"
  type        = string
}

variable "db_secret_arn" {
  description = "ARN of the Secrets Manager secret for DB credentials (for IAM read access)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
