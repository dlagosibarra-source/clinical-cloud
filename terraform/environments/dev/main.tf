# ─────────────────────────────────────────────────────────────
# Module: Networking / VPC
# ─────────────────────────────────────────────────────────────
module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = true

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ─────────────────────────────────────────────────────────────
# Module: Amazon RDS for PostgreSQL 16
# ─────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  project_name         = var.project_name
  environment          = var.environment
  db_subnet_ids        = module.vpc.private_db_subnet_ids
  db_security_group_id = module.vpc.rds_security_group_id

  db_name        = var.db_name
  db_username    = var.db_username
  db_password    = var.db_password
  instance_class = var.db_instance_class

  multi_az            = false # Single AZ in dev for cost optimization
  deletion_protection = false # Configured for easy teardown in dev
  skip_final_snapshot = true

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ─────────────────────────────────────────────────────────────
# Module: API Gateway & Lambda Compute
# ─────────────────────────────────────────────────────────────
module "compute" {
  source = "../../modules/compute"

  project_name             = var.project_name
  environment              = var.environment
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_app_subnet_ids
  lambda_security_group_id = module.vpc.lambda_security_group_id
  db_secret_arn            = module.rds.db_secret_arn

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
