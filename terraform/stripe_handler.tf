# Processes new orders for payment. Same pattern as order_notifier.tf: a
# second, independent consumer on the orders table's stream (DynamoDB
# Streams supports multiple readers, each with its own checkpoint), non-VPC
# so it can reach the public Stripe API directly. Deliberately fires after
# the order row already exists rather than during checkout, since the
# orders Lambda itself is VPC-attached with no path out to Stripe.

data "archive_file" "stripe_handler_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src/stripe_handler"
  output_path = "${path.module}/build/stripe_handler.zip"
}

resource "aws_iam_role" "stripe_handler_exec" {
  name = "${var.project_name}-stripe-handler-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "stripe_handler_basic_execution" {
  role       = aws_iam_role.stripe_handler_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "stripe_handler_stream_read" {
  name = "${var.project_name}-stripe-handler-stream-read"
  role = aws_iam_role.stripe_handler_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeStream",
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:ListStreams",
        ]
        Resource = aws_dynamodb_table.orders.stream_arn
      }
    ]
  })
}

# Only UpdateItem -- this Lambda writes payment results back onto an
# existing order row, it never creates or deletes orders.
resource "aws_iam_role_policy" "stripe_handler_orders_update" {
  name = "${var.project_name}-stripe-handler-orders-update"
  role = aws_iam_role.stripe_handler_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "dynamodb:UpdateItem"
        Resource = aws_dynamodb_table.orders.arn
      }
    ]
  })
}

resource "aws_lambda_function" "stripe_handler" {
  function_name    = "${var.project_name}-stripe-handler"
  role             = aws_iam_role.stripe_handler_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.stripe_handler_zip.output_path
  source_code_hash = data.archive_file.stripe_handler_zip.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      ORDERS_TABLE      = aws_dynamodb_table.orders.name
      STRIPE_SECRET_KEY = var.stripe_secret_key
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_event_source_mapping" "orders_stream_to_stripe_handler" {
  event_source_arn  = aws_dynamodb_table.orders.stream_arn
  function_name     = aws_lambda_function.stripe_handler.arn
  starting_position = "LATEST"
  batch_size        = 10
}
