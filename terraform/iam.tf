# Shared execution role for the Lambda functions added in step 3.
# Created now so the DynamoDB access policy can be scoped to the exact
# table/index ARNs from this step.
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec"

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

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Required for VPC-attached Lambdas: grants ec2:CreateNetworkInterface /
# DescribeNetworkInterfaces / DeleteNetworkInterface so Lambda can manage
# ENIs in the private subnets. The DynamoDB access policy below is
# unaffected — VPC attachment changes network routing, not IAM permissions.
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name = "${var.project_name}-lambda-dynamodb-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ]
        Resource = [
          aws_dynamodb_table.products.arn,
          "${aws_dynamodb_table.products.arn}/index/*",
          aws_dynamodb_table.orders.arn,
          "${aws_dynamodb_table.orders.arn}/index/*",
          aws_dynamodb_table.profiles.arn,
          "${aws_dynamodb_table.profiles.arn}/index/*",
        ]
      }
    ]
  })
}

# Dedicated role for the order-notifier Lambda (order_notifier.tf). It is
# deliberately separate from lambda_exec: that role is shared by VPC-attached
# Lambdas that need DynamoDB table read/write, while this one is a
# non-VPC Lambda that only needs to read the orders table's stream and
# publish to SNS -- reusing lambda_exec would grant it permissions it
# doesn't need (and vice versa).
resource "aws_iam_role" "order_notifier_exec" {
  name = "${var.project_name}-order-notifier-exec"

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

resource "aws_iam_role_policy_attachment" "order_notifier_basic_execution" {
  role       = aws_iam_role.order_notifier_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "order_notifier_stream_read" {
  name = "${var.project_name}-order-notifier-stream-read"
  role = aws_iam_role.order_notifier_exec.id

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

resource "aws_iam_role_policy" "order_notifier_sns_publish" {
  name = "${var.project_name}-order-notifier-sns-publish"
  role = aws_iam_role.order_notifier_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sns:Publish"
        Resource = aws_sns_topic.order_confirmations.arn
      }
    ]
  })
}
