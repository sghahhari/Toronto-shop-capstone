# products — PK productId. Category/gender/price/stock/etc. are non-key attributes
# stored as regular items, no schema needed for them in Terraform.
resource "aws_dynamodb_table" "products" {
  name         = "${var.project_name}-products"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "productId"

  attribute {
    name = "productId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = local.common_tags
}

# orders — PK orderId, GSI on userId so customers can list their own orders
# and admin can list everything via a table scan.
# Stream (NEW_IMAGE) feeds the order-notifier Lambda (order_notifier.tf) so
# order confirmations publish to SNS without the VPC-attached orders Lambda
# needing a path out to a public AWS service.
resource "aws_dynamodb_table" "orders" {
  name             = "${var.project_name}-orders"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "orderId"
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  attribute {
    name = "orderId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-index"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = local.common_tags
}

# profiles — PK userId (Cognito sub).
resource "aws_dynamodb_table" "profiles" {
  name         = "${var.project_name}-profiles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = local.common_tags
}
