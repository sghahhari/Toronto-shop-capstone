# Order-confirmation notifications. Terraform can create the topic and the
# email subscription, but per BUILD_SPEC.md's own "things Terraform can't
# do" list, it can't click the confirmation link AWS emails to
# var.notification_email -- deliveries stay in "PendingConfirmation" and
# silently never arrive until that's done by hand.

resource "aws_sns_topic" "order_confirmations" {
  name = "${var.project_name}-order-confirmations"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "order_confirmations_email" {
  topic_arn = aws_sns_topic.order_confirmations.arn
  protocol  = "email"
  endpoint  = var.notification_email
}
