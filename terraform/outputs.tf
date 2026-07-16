output "products_table_name" {
  value = aws_dynamodb_table.products.name
}

output "orders_table_name" {
  value = aws_dynamodb_table.orders.name
}

output "profiles_table_name" {
  value = aws_dynamodb_table.profiles.name
}

output "lambda_exec_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  value = aws_cognito_user_pool.main.arn
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "api_endpoint" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

output "lambda_security_group_id" {
  value = aws_security_group.lambda.id
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "order_confirmations_topic_arn" {
  value = aws_sns_topic.order_confirmations.arn
}

