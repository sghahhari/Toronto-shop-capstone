# Post-confirmation Cognito trigger: auto-enrolls self-signed-up users into
# the Customer group. This is the *only* place group membership is granted
# automatically — Admin is always assigned out-of-band via CLI/console.

data "archive_file" "post_confirmation_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_src/post_confirmation"
  output_path = "${path.module}/build/post_confirmation.zip"
}

resource "aws_iam_role" "post_confirmation_exec" {
  name = "${var.project_name}-post-confirmation-exec"

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

resource "aws_iam_role_policy_attachment" "post_confirmation_basic_execution" {
  role       = aws_iam_role.post_confirmation_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "post_confirmation_cognito_access" {
  name = "${var.project_name}-post-confirmation-cognito-access"
  role = aws_iam_role.post_confirmation_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "cognito-idp:AdminAddUserToGroup"
        Resource = aws_cognito_user_pool.main.arn
      }
    ]
  })
}

resource "aws_lambda_function" "post_confirmation" {
  function_name    = "${var.project_name}-post-confirmation"
  role             = aws_iam_role.post_confirmation_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.post_confirmation_zip.output_path
  source_code_hash = data.archive_file.post_confirmation_zip.output_base64sha256
  timeout          = 10

  tags = local.common_tags
}

resource "aws_lambda_permission" "allow_cognito_invoke_post_confirmation" {
  statement_id  = "AllowCognitoInvokePostConfirmation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
