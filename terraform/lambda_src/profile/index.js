const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.PROFILES_TABLE;

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

async function getProfile(event) {
  const userId = getUserId(event);
  const claims = getClaims(event);
  const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { userId } }));

  const profile = result.Item || { userId, name: "", phone: "", shippingAddress: null };
  profile.email = claims.email || profile.email || null;
  return respond(200, profile);
}

async function updateProfile(event) {
  const userId = getUserId(event);
  const claims = getClaims(event);
  const body = JSON.parse(event.body || "{}");

  const item = {
    userId,
    // Email always comes from the verified JWT claim, never the request body,
    // so a customer can't overwrite it with someone else's address.
    email: claims.email || null,
    name: body.name ?? "",
    phone: body.phone ?? "",
    shippingAddress: body.shippingAddress ?? null,
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return respond(200, item);
}

exports.handler = async (event) => {
  try {
    switch (event.routeKey) {
      case "GET /profile":
        return await getProfile(event);
      case "PUT /profile":
        return await updateProfile(event);
      default:
        return respond(404, { message: "Route not found" });
    }
  } catch (err) {
    console.error(err);
    return respond(500, { message: "Internal server error" });
  }
};
