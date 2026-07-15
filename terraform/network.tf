# Minimal VPC for the API Lambdas: two private subnets (no NAT, no IGW),
# a DynamoDB Gateway endpoint for the only outbound call these functions
# make, and a security group scoped to just that traffic. Free-tier
# friendly — Gateway endpoints have no hourly charge, unlike NAT/Interface
# endpoints.

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, { Name = "${var.project_name}-vpc" })
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = merge(local.common_tags, { Name = "${var.project_name}-private-a" })
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = merge(local.common_tags, { Name = "${var.project_name}-private-b" })
}

# No route to an internet gateway or NAT is ever added here, which is what
# makes these subnets private — the only non-local route comes from the
# DynamoDB gateway endpoint association below.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, { Name = "${var.project_name}-private-rt" })
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = merge(local.common_tags, { Name = "${var.project_name}-dynamodb-endpoint" })
}

# Gateway endpoints don't attach an ENI or use security groups themselves —
# this SG governs the Lambda ENIs in the private subnets. Egress is scoped
# to the DynamoDB endpoint's own prefix list on 443, which is the only
# outbound call these functions make; no inbound rules since nothing
# initiates connections to a Lambda ENI.
resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-lambda-sg"
  description = "Lambda ENIs in the private subnets - HTTPS egress to DynamoDB only"
  vpc_id      = aws_vpc.main.id

  egress {
    description     = "HTTPS to DynamoDB via gateway endpoint"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [aws_vpc_endpoint.dynamodb.prefix_list_id]
  }

  tags = local.common_tags
}
