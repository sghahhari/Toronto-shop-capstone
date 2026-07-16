# Static frontend hosting: a private S3 bucket that CloudFront reaches via
# Origin Access Control (OAC) -- the bucket has no public access at all;
# every request must go through the distribution.

data "aws_caller_identity" "current" {}

locals {
  frontend_dir = "${path.module}/../frontend"

  content_types = {
    html  = "text/html; charset=utf-8"
    js    = "application/javascript; charset=utf-8"
    css   = "text/css; charset=utf-8"
    json  = "application/json; charset=utf-8"
    png   = "image/png"
    jpg   = "image/jpeg"
    jpeg  = "image/jpeg"
    svg   = "image/svg+xml"
    ico   = "image/x-icon"
    woff  = "font/woff"
    woff2 = "font/woff2"
    ttf   = "font/ttf"
    otf   = "font/otf"
    eot   = "application/vnd.ms-fontobject"
  }
}

# ---------- S3 bucket (private) ----------

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"

  tags = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Disables ACLs entirely (bucket owner owns every object regardless of who
# uploaded it) -- OAC-based access doesn't use ACLs, so there's no reason
# to leave that legacy mechanism available.
resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# ---------- CloudFront distribution ----------

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-frontend-oac"
  description                       = "OAC for ${var.project_name} frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${var.project_name} frontend"
  # Cheapest tier (North America + Europe edge locations) -- fine for a
  # capstone demo, no need to pay for the global edge network.
  price_class = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # No custom domain for this capstone (per BUILD_SPEC.md), so the default
  # *.cloudfront.net certificate is enough -- no ACM certificate needed.
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

# Only CloudFront (via this specific distribution's OAC) may read from the
# bucket -- scoped with a SourceArn condition so no other distribution,
# even one in the same account, could reuse this policy.
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# ---------- Upload frontend/ ----------

resource "aws_s3_object" "frontend_files" {
  for_each = fileset(local.frontend_dir, "**")

  bucket       = aws_s3_bucket.frontend.id
  key          = each.value
  source       = "${local.frontend_dir}/${each.value}"
  etag         = filemd5("${local.frontend_dir}/${each.value}")
  content_type = lookup(local.content_types, lower(regex("[^.]+$", each.value)), "application/octet-stream")

  tags = local.common_tags
}
