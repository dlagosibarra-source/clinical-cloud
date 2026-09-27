terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Note: The bootstrap module intentionally uses local state
  # to break the "chicken-and-egg" cycle of state storage.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Project     = var.project_name
        Environment = "bootstrap"
        ManagedBy   = "terraform"
        Component   = "remote-state-backend"
      },
      var.tags
    )
  }
}
