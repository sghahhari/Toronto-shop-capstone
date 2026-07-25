variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ca-central-1"
}

variable "project_name" {
  description = "Short name used as a prefix for resource names"
  type        = string
  default     = "toronto-shop"
}

variable "environment" {
  description = "Deployment environment tag"
  type        = string
  default     = "dev"
}

variable "notification_email" {
  description = "Email address subscribed to the order-confirmation SNS topic. AWS emails a confirmation link to this address after apply -- deliveries are held until it's clicked."
  type        = string
  default     = "shahabodin@hotmail.com"
}

# No default on purpose: this must come from the TF_VAR_stripe_secret_key
# env var (locally) or a CI secret, never from a file that could end up
# committed. sensitive = true redacts it from plan/apply console output,
# but it is still stored in the S3 state (encrypted at rest, access scoped
# to this account's IAM) -- that's inherent to Terraform managing a Lambda
# env var, not something this flag fixes.
variable "stripe_secret_key" {
  description = "Stripe secret key for the stripe-handler Lambda. Supply via TF_VAR_stripe_secret_key, never a default or a checked-in .tfvars file."
  type        = string
  sensitive   = true
}
