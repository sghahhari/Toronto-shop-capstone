#!/bin/bash
# Invalidates the CloudFront cache for the frontend distribution, so files
# just re-uploaded via `terraform apply` go live immediately instead of
# waiting out the cache TTL (up to 1 hour, per the CachingOptimized policy).
#
# Not run automatically by `terraform apply` -- deploy your file changes
# first, then run this when you want them visible right away.
#
# Usage:
#   ./invalidate-cache.sh                        # invalidate everything
#   ./invalidate-cache.sh /index.html /shop.html  # invalidate specific paths

set -euo pipefail
cd "$(dirname "$0")"

DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
PATHS=("${@:-/*}")

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "${PATHS[@]}" \
  --profile capstone \
  --region ca-central-1
