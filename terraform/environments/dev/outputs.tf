output "vpc_id" {
  description = "The ID of the provisioned VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "rds_endpoint" {
  description = "The connection endpoint for the Amazon RDS PostgreSQL database"
  value       = module.rds.db_instance_endpoint
}

output "rds_address" {
  description = "The hostname/address of the PostgreSQL database"
  value       = module.rds.db_instance_address
}

output "rds_database_name" {
  description = "The database name"
  value       = module.rds.db_name
}

output "rds_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret storing PostgreSQL credentials"
  value       = module.rds.db_secret_arn
}

output "api_gateway_url" {
  description = "Public HTTP URL of the API Gateway"
  value       = module.compute.api_endpoint
}

output "lambda_function_name" {
  description = "Name of the API Lambda function"
  value       = module.compute.lambda_function_name
}
