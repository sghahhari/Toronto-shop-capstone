# CI/CD identity for GitHub Actions. Reuses the GitHub OIDC provider that
# already exists in this AWS account (only one provider per issuer URL is
# allowed, so this is a data source, not a resource -- creating a second one
# for the same URL would fail).
#
# NOTE: an unrelated role for a different project (tp-github-actions-deploy-role,
# trust policy scoped to repo:sghahhari/TorontoPremiumPlatform:*) already
# exists on this same OIDC provider. It is untouched by this file.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# Trust is scoped to this exact repo, not a wildcard -- only two specific
# sub claim values are accepted, both listed explicitly rather than via a
# StringLike wildcard:
#   - repo:.../ref:refs/heads/main            (the terraform-plan job, and
#     anything else in this workflow with no `environment:` key)
#   - repo:.../environment:production          (the terraform-apply job --
#     a job that targets a GitHub Environment gets a *different* sub claim
#     shape than a plain ref-triggered job, discovered via a real
#     AssumeRoleWithWebIdentity denial: terraform-plan succeeded with the
#     ref-based trust condition alone, terraform-apply did not, because it
#     sets `environment: production`)
# PR-triggered runs (security-scan.yml also runs on pull_request) produce a
# third, different sub claim shape and are still rejected, as intended.
resource "aws_iam_role" "github_actions_deploy" {
  name = "${var.project_name}-github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
            "token.actions.githubusercontent.com:sub" = [
              "repo:sghahhari/Toronto-shop-capstone:ref:refs/heads/main",
              "repo:sghahhari/Toronto-shop-capstone:environment:production",
            ]
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# Read/write on just the state object (and its use_lockfile lock file, which
# lives at the same key + ".tflock") -- not the whole bucket.
resource "aws_iam_role_policy" "github_actions_state_access" {
  name = "${var.project_name}-github-actions-state-access"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::toronto-shop-tfstate-022767580281/toronto-shop/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketVersioning"]
        Resource = "arn:aws:s3:::toronto-shop-tfstate-022767580281"
      }
    ]
  })
}

# DynamoDB tables/streams + Lambda functions, scoped to the project's
# toronto-shop-* naming convention. Event source mappings are identified by
# an AWS-generated UUID with no name-based ARN, so those specific actions
# need Resource "*" -- there is no tighter scope the API supports.
resource "aws_iam_role_policy" "github_actions_data_compute" {
  name = "${var.project_name}-github-actions-data-compute"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:CreateTable",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeTable",
          "dynamodb:UpdateTable",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:UpdateTimeToLive",
          "dynamodb:DescribeContinuousBackups",
          "dynamodb:DescribeStream",
          "dynamodb:ListStreams",
          "dynamodb:TagResource",
          "dynamodb:UntagResource",
          "dynamodb:ListTagsOfResource",
        ]
        Resource = [
          "arn:aws:dynamodb:ca-central-1:022767580281:table/toronto-shop-*",
          "arn:aws:dynamodb:ca-central-1:022767580281:table/toronto-shop-*/stream/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:GetFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunctionConfiguration",
          "lambda:ListVersionsByFunction",
          "lambda:TagResource",
          "lambda:UntagResource",
          "lambda:ListTags",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          "lambda:GetPolicy",
          "lambda:GetFunctionCodeSigningConfig", # read during every refresh, not just on create
        ]
        Resource = "arn:aws:lambda:ca-central-1:022767580281:function:toronto-shop-*"
      },
      {
        # No ARN scoping possible: event source mapping IDs don't exist
        # until creation.
        Effect = "Allow"
        Action = [
          "lambda:CreateEventSourceMapping",
          "lambda:DeleteEventSourceMapping",
          "lambda:GetEventSourceMapping",
          "lambda:UpdateEventSourceMapping",
          "lambda:ListEventSourceMappings",
          # Same action name as the function-scoped statement below, but a
          # completely different ARN shape (event-source-mapping:<uuid>) --
          # needs its own grant under this Resource "*".
          "lambda:ListTags",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:UpdateRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:TagRole",
          "iam:UntagRole",
        ]
        Resource = "arn:aws:iam::022767580281:role/toronto-shop-*"
      },
      {
        Effect    = "Allow"
        Action    = "iam:PassRole"
        Resource  = "arn:aws:iam::022767580281:role/toronto-shop-*"
        Condition = { StringEquals = { "iam:PassedToService" = "lambda.amazonaws.com" } }
      },
      {
        Effect   = "Allow"
        Action   = "iam:GetOpenIDConnectProvider"
        Resource = data.aws_iam_openid_connect_provider.github.arn
      },
      {
        # The data source looks the provider up by URL, which the AWS
        # provider resolves via ListOpenIDConnectProviders before it can
        # call GetOpenIDConnectProvider on the matched ARN above -- list
        # operations don't support resource-level scoping.
        Effect   = "Allow"
        Action   = "iam:ListOpenIDConnectProviders"
        Resource = "*"
      }
    ]
  })
}

# API Gateway (v2/HTTP API) and Cognito. Both AWS APIs have limited
# resource-level IAM support: apigateway ARNs never include an account ID
# (scoped as tight as the service allows), and cognito-idp's control-plane
# actions don't support resource-level restriction at all per AWS's own IAM
# action reference -- Resource "*" there is a platform limitation, not a
# scoping shortcut.
resource "aws_iam_role_policy" "github_actions_api_auth" {
  name = "${var.project_name}-github-actions-api-auth"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "apigateway:*"
        Resource = [
          "arn:aws:apigateway:ca-central-1::/apis",
          "arn:aws:apigateway:ca-central-1::/apis/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:CreateUserPool",
          "cognito-idp:DeleteUserPool",
          "cognito-idp:DescribeUserPool",
          "cognito-idp:UpdateUserPool",
          "cognito-idp:CreateUserPoolClient",
          "cognito-idp:DeleteUserPoolClient",
          "cognito-idp:DescribeUserPoolClient",
          "cognito-idp:UpdateUserPoolClient",
          "cognito-idp:CreateGroup",
          "cognito-idp:DeleteGroup",
          "cognito-idp:GetGroup",
          "cognito-idp:UpdateGroup",
          "cognito-idp:TagResource",
          "cognito-idp:UntagResource",
          "cognito-idp:ListTagsForResource",
          "cognito-idp:GetUserPoolMfaConfig", # read during every user pool refresh
        ]
        Resource = "*"
      }
    ]
  })
}

# Frontend bucket + CloudFront + SNS. CloudFront distribution/OAC IDs (like
# Cognito pool IDs above) don't exist before creation, so Create* actions
# there need Resource "*"; Get/Update/Delete could theoretically be scoped
# to the specific distribution ARN once known, but with a single
# distribution in this account that split isn't worth the added complexity.
resource "aws_iam_role_policy" "github_actions_frontend_notify" {
  name = "${var.project_name}-github-actions-frontend-notify"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:PutBucketPolicy",
          "s3:DeleteBucketPolicy",
          "s3:PutBucketPublicAccessBlock",
          "s3:PutBucketCORS",
          "s3:PutBucketVersioning",
          "s3:PutEncryptionConfiguration",
          "s3:PutBucketTagging",
          # s3:Get* (read-only, non-mutating): terraform's refresh phase
          # probes a long tail of individual bucket-attribute reads --
          # policy, CORS, versioning, encryption, tagging, ACL, website,
          # accelerate, request payment, logging, lifecycle, replication,
          # and more -- discovered one AccessDenied at a time. All are
          # read-only GET calls already scoped to just this bucket, so
          # granting the wildcard converges instead of chasing each one
          # individually; no write/delete capability is added by this.
          "s3:Get*",
          "s3:ListBucket",
          "s3:PutObject",
          "s3:PutObjectTagging", # every uploaded frontend file is tagged (aws_s3_object.tags)
          "s3:DeleteObject",
        ]
        Resource = [
          "arn:aws:s3:::toronto-shop-frontend-*",
          "arn:aws:s3:::toronto-shop-frontend-*/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateDistribution",
          "cloudfront:GetDistribution",
          "cloudfront:UpdateDistribution",
          "cloudfront:DeleteDistribution",
          "cloudfront:TagResource",
          "cloudfront:UntagResource",
          "cloudfront:ListTagsForResource",
          "cloudfront:CreateOriginAccessControl",
          "cloudfront:GetOriginAccessControl",
          "cloudfront:UpdateOriginAccessControl",
          "cloudfront:DeleteOriginAccessControl",
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListCachePolicies", # needed to look up the managed Managed-CachingOptimized policy by name
          "cloudfront:GetCachePolicy",    # read on every refresh once resolved
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:CreateTopic",
          "sns:DeleteTopic",
          "sns:GetTopicAttributes",
          "sns:SetTopicAttributes",
          "sns:Subscribe",
          "sns:Unsubscribe",
          "sns:GetSubscriptionAttributes",
          "sns:SetSubscriptionAttributes",
          "sns:ListSubscriptionsByTopic",
          "sns:TagResource",
          "sns:UntagResource",
          "sns:ListTagsForResource",
        ]
        Resource = "arn:aws:sns:ca-central-1:022767580281:toronto-shop-*"
      }
    ]
  })
}

# VPC networking (network.tf). EC2's IAM model has notably weak
# resource-level support -- most Describe* calls and many of the VPC-family
# Create* actions require Resource "*" regardless of naming convention, so
# this isn't scoped further the way the other statements are.
resource "aws_iam_role_policy" "github_actions_network" {
  name = "${var.project_name}-github-actions-network"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateVpc",
          "ec2:DeleteVpc",
          "ec2:DescribeVpcs",
          "ec2:DescribeVpcAttribute", # read during every VPC refresh (enableDnsHostnames etc.), not just on create
          "ec2:ModifyVpcAttribute",
          "ec2:CreateSubnet",
          "ec2:DeleteSubnet",
          "ec2:DescribeSubnets",
          "ec2:CreateRouteTable",
          "ec2:DeleteRouteTable",
          "ec2:DescribeRouteTables",
          "ec2:AssociateRouteTable",
          "ec2:DisassociateRouteTable",
          "ec2:CreateRoute",
          "ec2:DeleteRoute",
          "ec2:CreateSecurityGroup",
          "ec2:DeleteSecurityGroup",
          "ec2:DescribeSecurityGroups",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupEgress",
          "ec2:CreateVpcEndpoint",
          "ec2:DeleteVpcEndpoints",
          "ec2:DescribeVpcEndpoints",
          "ec2:ModifyVpcEndpoint",
          "ec2:DescribeNetworkInterfaces",
          "ec2:CreateTags",
          "ec2:DeleteTags",
          "ec2:DescribeTags",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribePrefixLists",
        ]
        Resource = "*"
      }
    ]
  })
}
