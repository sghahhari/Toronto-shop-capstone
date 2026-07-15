const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.ORDERS_TABLE;
const USER_ID_INDEX = "userId-index";

// Delivered and Cancelled are terminal; Cancelled is only reachable from
// Confirmed or Shipped, never from Pending Payment or Delivered.
const ALLOWED_TRANSITIONS = {
  "Pending Payment": ["Confirmed"],
  Confirmed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: [],
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getClaims(event) {
  return event.requestContext?.authorizer?.jwt?.claims || {};
}

function getUserId(event) {
  return getClaims(event).sub;
}

function isAdmin(event) {
  const raw = getClaims(event)["cognito:groups"];
  if (!raw) return false;
  // API Gateway stringifies the groups claim as Go's fmt.Sprint of a []string,
  // e.g. "[Admin]" or "[Admin Customer]" — space-separated, no commas.
  const groups = Array.isArray(raw)
    ? raw
    : String(raw)
        .replace(/^\[|\]$/g, "")
        .split(/[\s,]+/)
        .map((g) => g.trim())
        .filter(Boolean);
  return groups.includes("Admin");
}

function requireAdmin(event) {
  return isAdmin(event) ? null : respond(403, { message: "Admin access required" });
}

async function createOrder(event) {
  const userId = getUserId(event);
  const body = JSON.parse(event.body || "{}");
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return respond(400, { message: "items must be a non-empty array" });
  }
  if (body.total === undefined) {
    return respond(400, { message: "total is required" });
  }

  const item = {
    orderId: randomUUID(),
    userId,
    items: body.items,
    total: body.total,
    shippingAddress: body.shippingAddress || null,
    status: "Pending Payment",
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return respond(201, item);
}

async function listMyOrders(event) {
  const userId = getUserId(event);
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: USER_ID_INDEX,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: { ":userId": userId },
    })
  );
  return respond(200, result.Items || []);
}

async function listAllOrders(event) {
  const adminError = requireAdmin(event);
  if (adminError) return adminError;

  const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
  return respond(200, result.Items || []);
}

async function updateOrderStatus(event) {
  const adminError = requireAdmin(event);
  if (adminError) return adminError;

  const orderId = event.pathParameters.id;
  const body = JSON.parse(event.body || "{}");
  const nextStatus = body.status;

  const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { orderId } }));
  if (!existing.Item) return respond(404, { message: "Order not found" });

  const currentStatus = existing.Item.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return respond(400, {
      message: `Cannot transition order from "${currentStatus}" to "${nextStatus}"`,
    });
  }

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { orderId },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": nextStatus },
      ReturnValues: "ALL_NEW",
    })
  );

  return respond(200, result.Attributes);
}

async function reorder(event) {
  const adminError = requireAdmin(event);
  if (adminError) return adminError;

  const orderId = event.pathParameters.id;
  const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { orderId } }));
  if (!existing.Item) return respond(404, { message: "Order not found" });

  const original = existing.Item;
  const newOrder = {
    orderId: randomUUID(),
    userId: original.userId,
    items: original.items,
    total: original.total,
    shippingAddress: original.shippingAddress,
    status: "Pending Payment",
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: newOrder }));
  return respond(201, newOrder);
}

exports.handler = async (event) => {
  try {
    switch (event.routeKey) {
      case "POST /orders":
        return await createOrder(event);
      case "GET /orders/mine":
        return await listMyOrders(event);
      case "GET /admin/orders":
        return await listAllOrders(event);
      case "PATCH /admin/orders/{id}/status":
        return await updateOrderStatus(event);
      case "POST /admin/orders/{id}/reorder":
        return await reorder(event);
      default:
        return respond(404, { message: "Route not found" });
    }
  } catch (err) {
    console.error(err);
    return respond(500, { message: "Internal server error" });
  }
};
