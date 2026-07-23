terraform {
  required_version = ">= 1.5"

  # State lives in S3 (versioned + encrypted, bootstrapped by hand outside
  # this config -- Terraform can't create the backend it depends on).
  # use_lockfile replaces the old DynamoDB lock table (native S3 locking,
  # Terraform >= 1.10).
  backend "s3" {
    bucket       = "toronto-shop-tfstate-022767580281"
    key          = "toronto-shop/terraform.tfstate"
    region       = "ca-central-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# No hardcoded profile: local runs pick it up from the AWS_PROFILE=capstone
# env var (as already used for every terraform command in this project),
# CI runs pick up short-lived credentials injected by
# aws-actions/configure-aws-credentials via OIDC. Both go through the same
# default credential chain.
provider "aws" {
  region = var.aws_region
}
