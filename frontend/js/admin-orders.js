(function () {
  if (!requireAdminAuth()) return;

  var listEl = document.getElementById("admin-orders-list");
  var messageEl = document.getElementById("admin-orders-message");

  // Mirrors the exact transition map enforced server-side in
  // terraform/lambda_src/orders/index.js -- these are the only actions
  // that can ever succeed, so only these are offered. "Cancel" is one of
  // them, available from Confirmed/Shipped like the backend allows; the
  // "Confirm"/"Ship"/"Deliver" actions exist alongside it because nothing
  // else can move an order out of Pending Payment yet (no Stripe webhook
  // wired up until a later step), and without them every order would be
  // permanently stuck where Cancel is never even reachable to test.
  var NEXT_ACTIONS = {
    "Pending Payment": [{ status: "Confirmed", label: "Confirm Order", style: "" }],
    Confirmed: [
      { status: "Shipped", label: "Mark as Shipped", style: "" },
      { status: "Cancelled", label: "Cancel Order", style: "admin-btn--danger" },
    ],
    Shipped: [
      { status: "Delivered", label: "Mark as Delivered", style: "" },
      { status: "Cancelled", label: "Cancel Order", style: "admin-btn--danger" },
    ],
    Delivered: [],
    Cancelled: [],
  };

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function statusClass(status) {
    return "status-" + status.toLowerCase().replace(/\s+/g, "-");
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = "auth__message is-visible " + (isError ? "is-error" : "is-success");
  }

  function renderOrder(order) {
    var itemsHtml = (order.items || [])
      .map(function (item) {
        return "<li>" + escapeHtml(item.name) + " &times; " + item.qty + "</li>";
      })
      .join("");

    var actionsHtml = (NEXT_ACTIONS[order.status] || [])
      .map(function (action) {
        return (
          '<button type="button" class="admin-btn ' + action.style + ' order-status-btn"' +
            ' data-order-id="' + order.orderId + '" data-status="' + action.status + '">' +
            action.label +
          "</button>"
        );
      })
      .join("");

    return (
      '<div class="order-card">' +
        '<div class="order-card__header">' +
          "<div>" +
            '<div class="order-card__id">Order #' + escapeHtml(order.orderId.slice(0, 8)) + "</div>" +
            '<div class="order-card__date">' + formatDate(order.createdAt) + " &middot; Customer " + escapeHtml(order.userId.slice(0, 8)) + "</div>" +
          "</div>" +
          '<span class="order-status ' + statusClass(order.status) + '">' + escapeHtml(order.status) + "</span>" +
        "</div>" +
        '<ul class="order-card__items">' + itemsHtml + "</ul>" +
        '<div class="order-card__footer">' +
          "<span>Total</span>" +
          "<span>$" + Number(order.total).toFixed(2) + "</span>" +
        "</div>" +
        '<div style="margin-top:15px;">' +
          actionsHtml +
          '<button type="button" class="admin-btn admin-btn--secondary reorder-btn" data-order-id="' + order.orderId + '">Reorder</button>' +
        "</div>" +
      "</div>"
    );
  }

  function loadOrders() {
    return authFetch(TORONTO_SHOP.API_BASE_URL + "/admin/orders")
      .then(function (res) {
        if (!res.ok) throw new Error("GET /admin/orders failed with status " + res.status);
        return res.json();
      })
      .then(function (orders) {
        if (orders.length === 0) {
          listEl.innerHTML = '<p class="grid-status">No orders yet.</p>';
          return;
        }
        orders.sort(function (a, b) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        listEl.innerHTML = orders.map(renderOrder).join("");
      });
  }

  loadOrders().catch(function (err) {
    listEl.innerHTML = '<p class="grid-status">Could not load orders (' + err.message + ").</p>";
  });

  listEl.addEventListener("click", function (e) {
    var statusBtn = e.target.closest(".order-status-btn");
    if (statusBtn) {
      var orderId = statusBtn.dataset.orderId;
      var newStatus = statusBtn.dataset.status;
      statusBtn.disabled = true;

      authFetch(TORONTO_SHOP.API_BASE_URL + "/admin/orders/" + orderId + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("PATCH status failed with status " + res.status);
          return res.json();
        })
        .then(function () {
          showMessage("Order #" + orderId.slice(0, 8) + " is now " + newStatus + ".", false);
          return loadOrders();
        })
        .catch(function (err) {
          showMessage(err.message, true);
          statusBtn.disabled = false;
        });
      return;
    }

    var reorderBtn = e.target.closest(".reorder-btn");
    if (reorderBtn) {
      var reorderId = reorderBtn.dataset.orderId;
      reorderBtn.disabled = true;

      authFetch(TORONTO_SHOP.API_BASE_URL + "/admin/orders/" + reorderId + "/reorder", {
        method: "POST",
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Reorder failed with status " + res.status);
          return res.json();
        })
        .then(function (newOrder) {
          showMessage(
            "Reordered #" + reorderId.slice(0, 8) + " as new order #" + newOrder.orderId.slice(0, 8) + ".",
            false
          );
          return loadOrders();
        })
        .catch(function (err) {
          showMessage(err.message, true);
          reorderBtn.disabled = false;
        });
    }
  });
})();
