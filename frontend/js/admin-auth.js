// Client-side Admin-group gate for pages under admin/. This is a UX
// convenience only, NOT the real security boundary -- every admin API
// route re-checks event.requestContext.authorizer.jwt.claims['cognito:groups']
// server-side in the Lambda itself (see terraform/lambda_src/*/index.js),
// which is what actually stops a non-admin from doing anything, regardless
// of what this client-side check does or doesn't catch.
//
// Note: decodeJwt() here reads the *raw* JWT payload directly, where
// cognito:groups is a real JSON array (["Admin","Customer"]). That's
// different from event.requestContext.authorizer.jwt.claims server-side,
// where API Gateway's JWT authorizer stringifies it instead (e.g.
// "[Admin Customer]") -- see the space-split parsing in the Lambda code.
function isAdmin() {
  var user = getCurrentUser();
  if (!user) return false;
  var groups = user["cognito:groups"];
  return Array.isArray(groups) && groups.includes("Admin");
}

function requireAdminAuth() {
  if (!isLoggedIn()) {
    var here = "admin/" + window.location.pathname.split("/").pop();
    window.location.href = "../login.html?redirect=" + encodeURIComponent(here);
    return false;
  }
  if (!isAdmin()) {
    window.location.href = "../index.html";
    return false;
  }
  return true;
}
