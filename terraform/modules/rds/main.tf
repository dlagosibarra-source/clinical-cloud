# ─────────────────────────────────────────────────────────────
# Dynamic / Generated Master Password (if not supplied)
# ─────────────────────────────────────────────────────────────
resource "random_password" "db_password" {
  count            = var.db_password == null ? 1 : 0
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

locals {
  effective_db_password = var.db_password != null ? var.db_password : random_password.db_password[0].result
}

# ─────────────────────────────────────────────────────────────
# DB Subnet Group (Private Isolated Subnets)
# ─────────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "this" {
  name_prefix = "${var.project_name}-${var.environment}-db-subnets-"
  description = "Subnet group for ${var.project_name} PostgreSQL database"
  subnet_ids  = var.db_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnets"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────
# PostgreSQL 16 Parameter Group
# ─────────────────────────────────────────────────────────────
resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.project_name}-${var.environment}-pg16-params-"
  family      = "postgres16"
  description = "Custom parameter group for PostgreSQL 16 (${var.project_name})"

  parameter {
    name  = "client_encoding"
    value = "UTF8"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_line_prefix"
    value = "%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h "
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-pg16-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────
# RDS PostgreSQL Instance
# ─────────────────────────────────────────────────────────────
resource "aws_db_instance" "this" {
  identifier_prefix     = "${var.project_name}-${var.environment}-db-"
  engine                = "postgres"
  engine_version        = var.engine_version
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = local.effective_db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.db_security_group_id]
  parameter_group_name   = aws_db_parameter_group.this.name

  publicly_accessible     = false
  multi_az                = var.multi_az
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot
  backup_retention_period = var.backup_retention_period
  copy_tags_to_snapshot   = true

  auto_minor_version_upgrade = true
  apply_immediately          = var.environment == "dev"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db"
  })
}

# ─────────────────────────────────────────────────────────────
# Secrets Manager: Store Credentials & DATABASE_URL
# ─────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "db_credentials" {
  name_prefix             = "${var.project_name}-${var.environment}-db-credentials-"
  description             = "Master credentials and connection URL for ${var.project_name} PostgreSQL"
  recovery_window_in_days = 0 # Immediate deletion in dev to prevent collision on re-creates

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    database = var.db_name
    username = var.db_username
    password = local.effective_db_password
    url      = "postgresql://${var.db_username}:${local.effective_db_password}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.db_name}?sslmode=require"
  })
}
