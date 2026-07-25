const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.ORDERS_TABLE;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// pm_card_visa is Stripe's built-in test PaymentMethod, documented as
// equivalent to the card number 4242 4242 4242 4242 -- lets this run fully
// server-side (no card form exists yet) while still exercising a real
// Stripe test-mode charge end to end.
async function createAndConfirmPaymentIntent(order) {
  const amountCents = Math.round(Number(order.total) * 100);

  const body = new URLSearchParams({
    amount: String(amountCents),
    currency: "cad",
    "payment_method_types[]": "card",
    payment_method: "pm_card_visa",
    confirm: "true",
    description: `Toronto Shop order ${order.orderId}`,
  });

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = await res.json();
  return { ok: res.ok, paymentIntent: json };
}

async function markPaid(orderId, paymentIntentId) {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { orderId },
      UpdateExpression: "SET #status = :status, paymentStatus = :paid, stripePaymentIntentId = :piId",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "Confirmed",
        ":paid": "paid",
        ":piId": paymentIntentId,
      },
    })
  );
}

async function markFailed(orderId, errorMessage, paymentIntentId) {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { orderId },
      UpdateExpression:
        "SET paymentStatus = :failed, stripeError = :err" + (paymentIntentId ? ", stripePaymentIntentId = :piId" : ""),
      ExpressionAttributeValues: {
        ":failed": "failed",
        ":err": errorMessage,
        ...(paymentIntentId ? { ":piId": paymentIntentId } : {}),
      },
    })
  );
}

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== "INSERT" || !record.dynamodb.NewImage) continue;

    const order = unmarshall(record.dynamodb.NewImage);

    try {
      const { ok, paymentIntent } = await createAndConfirmPaymentIntent(order);

      if (ok && paymentIntent.status === "succeeded") {
        await markPaid(order.orderId, paymentIntent.id);
      } else {
        const message = paymentIntent.error ? paymentIntent.error.message : `Unexpected status: ${paymentIntent.status}`;
        await markFailed(order.orderId, message, paymentIntent.id);
      }
    } catch (err) {
      // Swallow the error so one bad record doesn't fail the whole batch and
      // send the stream into an endless retry loop.
      console.error("Failed to process Stripe payment for", order.orderId, err);
    }
  }
};
