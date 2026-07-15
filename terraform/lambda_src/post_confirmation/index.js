const {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  // Only self-service signups get auto-enrolled. Password-reset confirmations
  // and admin-created users also flow through this trigger with a different
  // triggerSource, and must not be re-processed here.
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: "Customer",
      })
    );
  }

  return event;
};
