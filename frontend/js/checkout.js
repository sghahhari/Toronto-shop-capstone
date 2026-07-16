(function () {
  if (!requireAuth()) return;

  var loadingEl = document.getElementById("checkout-loading");
  var formEl = document.getElementById("checkout-form");
  var confirmationEl = document.getElementById("order-confirmation");
  var messageEl = document.getElementById("checkout-message");

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = "auth__message is-visible " + (isError ? "is-error" : "is-success");
  }

  var cart = getCart();
  if (cart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  function renderOrderSummary() {
    var itemsEl = document.getElementById("checkout-items");
    itemsEl.innerHTML = cart
      .map(function (item, i) {
        return (
          "<li>" +
            (i + 1).toString().padStart(2, "0") + ". " + escapeHtml(item.name) + " &times; " + item.quantity +
            " <span>$" + (item.price * item.quantity).toFixed(2) + "</span>" +
          "</li>"
        );
      })
      .join("");

    var total = cartTotal();
    document.getElementById("checkout-subtotal").textContent = "$" + total.toFixed(2);
    document.getElementById("checkout-total").textContent = "$" + total.toFixed(2);
  }

  function prefillFromProfile() {
    return authFetch(TORONTO_SHOP.API_BASE_URL + "/profile")
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (profile) {
        if (!profile) return;
        document.getElementById("checkout-name").value = profile.name || "";
        document.getElementById("checkout-phone").value = profile.phone || "";
        var addr = profile.shippingAddress || {};
        document.getElementById("checkout-address").value = addr.line1 || "";
        document.getElementById("checkout-city").value = addr.city || "";
        document.getElementById("checkout-province").value = addr.province || "";
        document.getElementById("checkout-postal").value = addr.postalCode || "";
        document.getElementById("checkout-country").value = addr.country || "";
      })
      .catch(function () {
        // No saved profile yet -- fine, the customer just fills the form manually.
      });
  }

  renderOrderSummary();
  prefillFromProfile().finally(function () {
    loadingEl.style.display = "none";
    formEl.style.display = "block";
  });

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();

    var body = {
      items: cart.map(function (item) {
        return {
          productId: item.productId,
          name: item.name,
          price: item.price,
          qty: item.quantity,
          imageUrl: item.imageUrl,
        };
      }),
      total: cartTotal(),
      shippingAddress: {
        name: document.getElementById("checkout-name").value.trim(),
        phone: document.getElementById("checkout-phone").value.trim(),
        line1: document.getElementById("checkout-address").value.trim(),
        city: document.getElementById("checkout-city").value.trim(),
        province: document.getElementById("checkout-province").value.trim(),
        postalCode: document.getElementById("checkout-postal").value.trim(),
        country: document.getElementById("checkout-country").value.trim(),
      },
    };

    var submitBtn = document.getElementById("place-order-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Placing order...";

    authFetch(TORONTO_SHOP.API_BASE_URL + "/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("POST /orders failed with status " + res.status);
        return res.json();
      })
      .then(function (order) {
        clearCart();
        formEl.style.display = "none";
        document.getElementById("confirmation-text").textContent =
          "Order placed! Your order #" + order.orderId.slice(0, 8) + " is now " + order.status + ". Redirecting to your orders...";
        confirmationEl.style.display = "block";
        setTimeout(function () {
          window.location.href = "orders.html";
        }, 1800);
      })
      .catch(function (err) {
        showMessage(err.message, true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Place Order";
      });
  });
})();
