terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Remote state backend in Amazon S3 with DynamoDB distributed locking
  backend "s3" {
    bucket         = "clinical-cloud-tfstate-us-east-2"
    key            = "dev/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "clinical-cloud-tflocks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "clinical-cloud"
    }
  }
}
