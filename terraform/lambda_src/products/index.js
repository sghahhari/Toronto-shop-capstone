const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.PRODUCTS_TABLE;

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

async function listProducts(event) {
  const qs = event.queryStringParameters || {};
  const filters = [];
  const names = {};
  const values = {};

  if (qs.category) {
    filters.push("#category = :category");
    names["#category"] = "category";
    values[":category"] = qs.category;
  }
  if (qs.gender) {
    filters.push("#gender = :gender");
    names["#gender"] = "gender";
    values[":gender"] = qs.gender;
  }

  const params = { TableName: TABLE };
  if (filters.length > 0) {
    params.FilterExpression = filters.join(" AND ");
    params.ExpressionAttributeNames = names;
    params.ExpressionAttributeValues = values;
  }

  const result = await ddb.send(new ScanCommand(params));
  return respond(200, result.Items || []);
}

async function getProduct(event) {
  const productId = event.pathParameters.id;
  const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { productId } }));
  if (!result.Item) return respond(404, { message: "Product not found" });
  return respond(200, result.Item);
}

async function createProduct(event) {
  const adminError = requireAdmin(event);
  if (adminError) return adminError;

  const body = JSON.parse(event.body || "{}");
  if (!body.name || body.price === undefined) {
    return respond(400, { message: "name and price are required" });
  }

  const item = {
    productId: randomUUID(),
    name: body.name,
    description: body.description || "",
    price: body.price,
    category: body.category || "",
    gender: body.gender || "unisex",
    imageUrl: body.imageUrl || "",
    stock: body.stock ?? 0,
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return respond(201, item);
}

async function updateProduct(event) {
  const adminError = requireAdmin(event);
  if (adminError) return adminError;

  const productId = event.pathParameters.id;
  const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { productId } }));
  if (!existing.Item) return respond(404, { message: "Product not found" });

  const body = JSON.parse(event.body || "{}");
  const item = { ...existing.Item, ...body, productId };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return respond(200, item);
}

exports.handler = async (event) => {
  try {
    switch (event.routeKey) {
      case "GET /products":
        return await listProducts(event);
      case "GET /products/{id}":
        return await getProduct(event);
      case "POST /admin/products":
        return await createProduct(event);
      case "PUT /admin/products/{id}":
        return await updateProduct(event);
      default:
        return respond(404, { message: "Route not found" });
    }
  } catch (err) {
    console.error(err);
    return respond(500, { message: "Internal server error" });
  }
};
