// Session storage + nav sync, shared by every page (mirrors the cart.js
// pattern from step 5b: localStorage is the source of truth, and every
// page syncs its header from it on load).
var SESSION_STORAGE_KEY = "toronto_shop_session";

function saveSession(authResult, email) {
  var session = {
    idToken: authResult.IdToken,
    accessToken: authResult.AccessToken,
    refreshToken: authResult.RefreshToken,
    expiresAt: Date.now() + authResult.ExpiresIn * 1000,
    email: email,
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try {
    var raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  var session = getSession();
  return !!(session && session.idToken && session.expiresAt > Date.now());
}

function getIdToken() {
  var session = getSession();
  return session ? session.idToken : null;
}

function logout() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  window.location.href = "index.html";
}

// Decodes (does not verify -- verification happens server-side via API
// Gateway's JWT authorizer) the ID token payload for display purposes.
function decodeJwt(token) {
  try {
    var payload = token.split(".")[1];
    var padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    return JSON.parse(atob(padded));
  } catch (e) {
    return null;
  }
}

function getCurrentUser() {
  if (!isLoggedIn()) return null;
  return decodeJwt(getIdToken());
}

// Call at the top of any page that requires a signed-in user. Redirects to
// login.html with a redirect-back param if not logged in.
function requireAuth() {
  if (isLoggedIn()) return true;
  var here = window.location.pathname.split("/").pop();
  window.location.href = "login.html?redirect=" + encodeURIComponent(here);
  return false;
}

// fetch() with the Authorization header attached -- for the /profile and
// /orders/mine routes, which require a valid Cognito ID token.
function authFetch(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers, {
    Authorization: "Bearer " + getIdToken(),
  });
  return fetch(url, options);
}

function updateAuthNav() {
  var loggedIn = isLoggedIn();

  // class, not id -- this markup gets stamped into two containers (the
  // visible header bar and the hidden offcanvas mobile menu), and duplicate
  // ids meant "#logout-link" could resolve to the hidden one.
  var html = loggedIn
    ? '<a href="profile.html">My Account</a>' +
      '<a href="orders.html">My Orders</a>' +
      '<a href="#" class="logout-link">Logout</a>'
    : '<a href="login.html">Sign in</a>';

  document.querySelectorAll(".header__top__links, .offcanvas__links").forEach(function (el) {
    el.innerHTML = html;
  });

  document.querySelectorAll(".logout-link").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
    });
  });
}

document.addEventListener("DOMContentLoaded", updateAuthNav);
