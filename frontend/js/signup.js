(function () {
  var signupForm = document.getElementById("signup-form");
  var confirmForm = document.getElementById("confirm-form");
  var messageEl = document.getElementById("auth-message");
  var resendLink = document.getElementById("resend-code-link");
  var confirmHint = document.getElementById("confirm-hint");

  var pendingEmail = null;

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = "auth__message is-visible " + (isError ? "is-error" : "is-success");
  }

  function clearMessage() {
    messageEl.className = "auth__message";
  }

  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearMessage();

    var email = document.getElementById("signup-email").value.trim();
    var password = document.getElementById("signup-password").value;
    var confirmPassword = document.getElementById("signup-password-confirm").value;

    if (password !== confirmPassword) {
      showMessage("Passwords do not match.", true);
      return;
    }

    var submitBtn = signupForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    cognitoSignUp(email, password)
      .then(function () {
        pendingEmail = email;
        confirmHint.textContent = "Enter the verification code we emailed to " + email + ".";
        signupForm.style.display = "none";
        confirmForm.style.display = "block";
        clearMessage();
      })
      .catch(function (err) {
        showMessage(err.message, true);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      });
  });

  confirmForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearMessage();

    var code = document.getElementById("confirm-code").value.trim();
    var submitBtn = confirmForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Confirming...";

    cognitoConfirmSignUp(pendingEmail, code)
      .then(function () {
        showMessage("Account confirmed! Redirecting to login...", false);
        setTimeout(function () {
          window.location.href = "login.html?confirmed=1";
        }, 1200);
      })
      .catch(function (err) {
        showMessage(err.message, true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Account";
      });
  });

  resendLink.addEventListener("click", function (e) {
    e.preventDefault();
    if (!pendingEmail) return;
    cognitoResendConfirmationCode(pendingEmail)
      .then(function () {
        showMessage("A new code has been sent to " + pendingEmail + ".", false);
      })
      .catch(function (err) {
        showMessage(err.message, true);
      });
  });
})();
