# Publishes an SNS notification whenever a new row lands in the orders
# table (customer checkout or admin reorder). Deliberately NOT VPC-attached
# — unlike the API Lambdas, this one only needs to read the orders table's
# stream and call SNS, both reachable over the public AWS network, so it
# skips the private-subnet/no-NAT constraint entirely (see network.tf).

data "archive_file" "order_notifier_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src/order_notifier"
  output_path = "${path.module}/build/order_notifier.zip"
}

resource "aws_lambda_function" "order_notifier" {
  function_name    = "${var.project_name}-order-notifier"
  role             = aws_iam_role.order_notifier_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.order_notifier_zip.output_path
  source_code_hash = data.archive_file.order_notifier_zip.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.order_confirmations.arn
    }
  }

  tags = local.common_tags
}

# LATEST so this only reacts to orders created after deploy -- no backfill
# notifications for rows that already existed in the table.
resource "aws_lambda_event_source_mapping" "orders_stream_to_notifier" {
  event_source_arn  = aws_dynamodb_table.orders.stream_arn
  function_name     = aws_lambda_function.order_notifier.arn
  starting_position = "LATEST"
  batch_size        = 10
}
