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
