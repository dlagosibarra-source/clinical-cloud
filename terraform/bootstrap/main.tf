# ==============================================================================
# Terraform Remote State Storage: Amazon S3
# ==============================================================================

resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  # Safeguard against accidental destruction of the state backend
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = var.state_bucket_name
    Description = "Storage for Terraform remote state files"
  }
}

# Strict versioning to recover from accidental deletions or state corruption
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-Side Encryption (AES256) by default
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access at the bucket level
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ==============================================================================
# Terraform State Locking: Amazon DynamoDB
# ==============================================================================

resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Safeguard against accidental deletion of lock management
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = var.dynamodb_table_name
    Description = "DynamoDB table for Terraform distributed state locking"
  }
}
