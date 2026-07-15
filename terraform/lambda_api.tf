# API Lambdas, one per DynamoDB table, each routing internally on event.routeKey.
# All three share the lambda_exec role from step 1 (already scoped to exactly
# these three tables).

data "archive_file" "products_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src/products"
  output_path = "${path.module}/build/products.zip"
}

data "archive_file" "orders_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src/orders"
  output_path = "${path.module}/build/orders.zip"
}

data "archive_file" "profile_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src/profile"
  output_path = "${path.module}/build/profile.zip"
}

resource "aws_lambda_function" "products" {
  function_name    = "${var.project_name}-products"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.products_zip.output_path
  source_code_hash = data.archive_file.products_zip.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      PRODUCTS_TABLE = aws_dynamodb_table.products.name
    }
  }

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = local.common_tags
}

resource "aws_lambda_function" "orders" {
  function_name    = "${var.project_name}-orders"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.orders_zip.output_path
  source_code_hash = data.archive_file.orders_zip.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      ORDERS_TABLE = aws_dynamodb_table.orders.name
    }
  }

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = local.common_tags
}

resource "aws_lambda_function" "profile" {
  function_name    = "${var.project_name}-profile"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.profile_zip.output_path
  source_code_hash = data.archive_file.profile_zip.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      PROFILES_TABLE = aws_dynamodb_table.profiles.name
    }
  }

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = local.common_tags
}
