# Toronto Shop

A full-stack, serverless e-commerce platform built on AWS, covering multi-category retail (watches, clothing, shoes, bags, and accessories for men and women), user accounts with order tracking, real payment processing, and a complete administrative back office.

**Live site:** [add your CloudFront URL here]

## Features

**Storefront**
- Browse by category and gender (7 categories × 2 genders, 140 products)
- Product detail pages, shopping cart, and checkout
- Real payment processing via Stripe (test mode)
- Order confirmation emails

**Accounts**
- Signup and login via Amazon Cognito
- Profile management (name, phone, shipping address)
- Order history with live status tracking

**Admin panel**
- Dashboard with order and revenue statistics
- Add and edit products
- View, confirm, ship, cancel, or reorder any customer's order
- Role-based access enforced server-side, not just hidden in the UI

## Architecture

The entire application is serverless and defined as Infrastructure as Code using Terraform — no resource was created manually through the AWS Console.

| Layer | Service |
|---|---|
| CDN / Hosting | Amazon CloudFront + S3 (private, Origin Access Control) |
| Authentication | Amazon Cognito (User Pool + Admin/Customer groups) |
| API | Amazon API Gateway (HTTP API, JWT authorizer) |
| Compute | AWS Lambda |
| Networking | Amazon VPC (private subnets, no NAT/IGW, DynamoDB Gateway Endpoint) |
| Database | Amazon DynamoDB (Point-in-Time Recovery enabled) |
| Messaging | Amazon SNS |
| Payments | Stripe (test mode) |

See `docs/architecture.png` for the full architecture diagram.

## Security

- Two-tier role model (Admin/Customer) enforced independently on both the frontend and every backend route
- Customer-facing compute runs in private VPC subnets with no direct internet route
- Least-privilege IAM throughout — no wildcard permissions, no AdministratorAccess anywhere, including in the CI/CD deploy role
- Secrets (Stripe key) supplied only via environment variables at deploy time, never committed
- HTTPS enforced end-to-end; CORS locked to the exact application origin

## CI/CD

GitHub Actions runs a security-gated deployment pipeline on every push to `main`:

1. **Security Scan** — Trivy, Checkov, Gitleaks, and npm audit run in parallel
2. **Security Gate** — blocks the pipeline on any Critical/High severity finding
3. **Terraform validate → plan → manual approval → apply**, authenticated to AWS via OIDC (no long-lived AWS credentials stored in GitHub)

## Disaster Recovery

- **Infrastructure:** fully defined in Terraform; recoverable via `terraform apply` from this repository
- **Database:** Point-in-Time Recovery enabled on all tables, tested with a real point-in-time restore
- **Application:** full end-to-end validation performed against the live deployed environment

## Project structure

```
terraform/            Infrastructure as Code (all AWS resources)
frontend/             Static site (HTML/CSS/JS)
seed/                 Product catalog seed data
.github/workflows/    CI/CD pipeline definitions
```

## Tech stack

Terraform · AWS (Lambda, API Gateway, DynamoDB, Cognito, S3, CloudFront, SNS, VPC, IAM) · Stripe · GitHub Actions · Trivy · Checkov · Gitleaks
