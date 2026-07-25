// Toronto Shop frontend config
var TORONTO_SHOP = {
  API_BASE_URL: "https://3q3o98gs1k.execute-api.ca-central-1.amazonaws.com",
  AWS_REGION: "ca-central-1",
  COGNITO_USER_POOL_ID: "ca-central-1_crf7sQI6c",
  COGNITO_CLIENT_ID: "76lkqb3rfjrmj15v5unit8kchd",
  // Publishable key -- safe to ship client-side by design (Stripe.js only
  // ever uses it to tokenize card details, it can't move money on its own).
  STRIPE_PUBLISHABLE_KEY:
    "pk_test_51TmcttKaUOzd3AVogUEEUydwNLkKgbnMYHn0TkMrN1fPA8UFZCey9J4834ODncBLE1xMrTdyEeBQfCT1qRmbn0Zh007ZCVHtts",
};
