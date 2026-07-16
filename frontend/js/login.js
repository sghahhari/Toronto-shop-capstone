(function () {
  var loginForm = document.getElementById("login-form");
  var messageEl = document.getElementById("auth-message");
  var params = new URLSearchParams(window.location.search);

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = "auth__message is-visible " + (isError ? "is-error" : "is-success");
  }

  if (params.get("confirmed") === "1") {
    showMessage("Account confirmed! You can now log in.", false);
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    messageEl.className = "auth__message";

    var email = document.getElementById("login-email").value.trim();
    var password = document.getElementById("login-password").value;

    var submitBtn = loginForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    cognitoLogin(email, password)
      .then(function (authResult) {
        saveSession(authResult, email);
        var redirect = params.get("redirect");
        window.location.href = redirect ? redirect : "index.html";
      })
      .catch(function (err) {
        showMessage(err.message, true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      });
  });
})();
