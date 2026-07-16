// Talks to Cognito's public unauthenticated JSON API directly -- no AWS SDK,
// no signing needed. This is exactly what the app client (generate_secret =
// false) is for: SignUp/InitiateAuth/ConfirmSignUp are meant to be called
// straight from a browser with just the client ID.
var COGNITO_ENDPOINT = "https://cognito-idp." + TORONTO_SHOP.AWS_REGION + ".amazonaws.com/";

function cognitoRequest(action, body) {
  return fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService." + action,
    },
    body: JSON.stringify(body),
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) {
        // Cognito's error "message" is generally human-readable
        // ("Password did not conform with policy...") -- surfaced as-is.
        var err = new Error(data.message || data.__type || "Request failed");
        err.cognitoType = data.__type;
        throw err;
      }
      return data;
    });
  });
}

function cognitoSignUp(email, password) {
  return cognitoRequest("SignUp", {
    ClientId: TORONTO_SHOP.COGNITO_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  });
}

function cognitoConfirmSignUp(email, code) {
  return cognitoRequest("ConfirmSignUp", {
    ClientId: TORONTO_SHOP.COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  });
}

function cognitoResendConfirmationCode(email) {
  return cognitoRequest("ResendConfirmationCode", {
    ClientId: TORONTO_SHOP.COGNITO_CLIENT_ID,
    Username: email,
  });
}

// Resolves to the AuthenticationResult (IdToken/AccessToken/RefreshToken/
// ExpiresIn) on success.
function cognitoLogin(email, password) {
  return cognitoRequest("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: TORONTO_SHOP.COGNITO_CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  }).then(function (data) {
    return data.AuthenticationResult;
  });
}
