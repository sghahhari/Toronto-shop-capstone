resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    # Scoped to the actual deployed frontend origin, not "*" -- local dev
    # (python -m http.server, etc.) will no longer be able to call this API
    # directly from a browser as a result; that's the intended tradeoff.
    allow_origins = ["https://${aws_cloudfront_distribution.frontend.domain_name}"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type"]
  }

  tags = local.common_tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  tags = local.common_tags
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# ---------- integrations ----------

resource "aws_apigatewayv2_integration" "products" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.products.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "orders" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.orders.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "profile" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.profile.invoke_arn
  payload_format_version = "2.0"
}

# ---------- routes: public product browsing ----------

resource "aws_apigatewayv2_route" "get_products" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /products"
  target             = "integrations/${aws_apigatewayv2_integration.products.id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_route" "get_product_by_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /products/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.products.id}"
  authorization_type = "NONE"
}

# ---------- routes: customer ----------

resource "aws_apigatewayv2_route" "post_orders" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /orders"
  target             = "integrations/${aws_apigatewayv2_integration.orders.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_orders_mine" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /orders/mine"
  target             = "integrations/${aws_apigatewayv2_integration.orders.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_profile" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /profile"
  target             = "integrations/${aws_apigatewayv2_integration.profile.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "put_profile" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /profile"
  target             = "integrations/${aws_apigatewayv2_integration.profile.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ---------- routes: admin ----------
# The JWT authorizer only proves the caller is *some* signed-in user — group
# membership (Admin vs Customer) is checked inside each Lambda handler, since
# an HTTP API JWT authorizer can't branch on the cognito:groups claim itself.

resource "aws_apigatewayv2_route" "post_admin_products" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /admin/products"
  target             = "integrations/${aws_apigatewayv2_integration.products.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "put_admin_product_by_id" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /admin/products/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.products.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_admin_orders" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /admin/orders"
  target             = "integrations/${aws_apigatewayv2_integration.orders.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "patch_admin_order_status" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PATCH /admin/orders/{id}/status"
  target             = "integrations/${aws_apigatewayv2_integration.orders.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "post_admin_order_reorder" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /admin/orders/{id}/reorder"
  target             = "integrations/${aws_apigatewayv2_integration.orders.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ---------- permissions: allow API Gateway to invoke each Lambda ----------

resource "aws_lambda_permission" "apigw_invoke_products" {
  statement_id  = "AllowAPIGatewayInvokeProducts"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.products.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_orders" {
  statement_id  = "AllowAPIGatewayInvokeOrders"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.orders.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_profile" {
  statement_id  = "AllowAPIGatewayInvokeProfile"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
