const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const sns = new SNSClient({});
const TOPIC_ARN = process.env.SNS_TOPIC_ARN;

function buildMessage(order) {
  const itemLines = (order.items || [])
    .map((item) => `  - ${item.name} x${item.qty} — $${Number(item.price).toFixed(2)}`)
    .join("\n");

  return [
    "Thanks for your order!",
    "",
    `Order ID: ${order.orderId}`,
    `Status: ${order.status}`,
    `Total: $${Number(order.total).toFixed(2)}`,
    "",
    "Items:",
    itemLines,
  ].join("\n");
}

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== "INSERT" || !record.dynamodb.NewImage) continue;

    const order = unmarshall(record.dynamodb.NewImage);

    try {
      await sns.send(
        new PublishCommand({
          TopicArn: TOPIC_ARN,
          Subject: `Order Confirmation - #${order.orderId.slice(0, 8)}`,
          Message: buildMessage(order),
        })
      );
    } catch (err) {
      // Swallow the error so one bad record doesn't fail the whole batch and
      // send the stream into an endless retry loop.
      console.error("Failed to publish order confirmation for", order.orderId, err);
    }
  }
};
