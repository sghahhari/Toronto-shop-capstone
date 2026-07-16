(function () {
  if (!requireAuth()) return;

  var card = document.getElementById("profile-card");
  var loading = document.getElementById("profile-loading");
  var messageEl = document.getElementById("profile-message");
  var form = document.getElementById("profile-form");

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = "auth__message is-visible " + (isError ? "is-error" : "is-success");
  }

  function fillForm(profile) {
    document.getElementById("profile-email").textContent = profile.email || getCurrentUser().email || "";
    document.getElementById("profile-name").value = profile.name || "";
    document.getElementById("profile-phone").value = profile.phone || "";

    var addr = profile.shippingAddress || {};
    document.getElementById("profile-address-line1").value = addr.line1 || "";
    document.getElementById("profile-address-city").value = addr.city || "";
    document.getElementById("profile-address-province").value = addr.province || "";
    document.getElementById("profile-address-postal").value = addr.postalCode || "";
    document.getElementById("profile-address-country").value = addr.country || "";
  }

  authFetch(TORONTO_SHOP.API_BASE_URL + "/profile")
    .then(function (res) {
      if (!res.ok) throw new Error("GET /profile failed with status " + res.status);
      return res.json();
    })
    .then(function (profile) {
      fillForm(profile);
      loading.style.display = "none";
      card.style.display = "block";
    })
    .catch(function (err) {
      loading.textContent = "Could not load your account (" + err.message + ").";
    });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var body = {
      name: document.getElementById("profile-name").value.trim(),
      phone: document.getElementById("profile-phone").value.trim(),
      shippingAddress: {
        line1: document.getElementById("profile-address-line1").value.trim(),
        city: document.getElementById("profile-address-city").value.trim(),
        province: document.getElementById("profile-address-province").value.trim(),
        postalCode: document.getElementById("profile-address-postal").value.trim(),
        country: document.getElementById("profile-address-country").value.trim(),
      },
    };

    var submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    authFetch(TORONTO_SHOP.API_BASE_URL + "/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("PUT /profile failed with status " + res.status);
        return res.json();
      })
      .then(function (profile) {
        fillForm(profile);
        showMessage("Profile saved.", false);
      })
      .catch(function (err) {
        showMessage(err.message, true);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Changes";
      });
  });
})();
