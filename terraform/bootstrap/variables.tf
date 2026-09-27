variable "aws_region" {
  description = "AWS region for the Terraform remote state infrastructure"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Project name identifier"
  type        = string
  default     = "clinical-cloud"
}

variable "state_bucket_name" {
  description = "Globally unique name for the S3 bucket storing Terraform state"
  type        = string
  default     = "clinical-cloud-tfstate-us-east-2"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table used for Terraform state locking"
  type        = string
  default     = "clinical-cloud-tflocks"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
