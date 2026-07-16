(function () {
  if (!requireAuth()) return;

  var listEl = document.getElementById("orders-list");

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

  function renderOrder(order) {
    var itemsHtml = (order.items || [])
      .map(function (item) {
        return "<li>" + escapeHtml(item.name) + " &times; " + item.qty + "</li>";
      })
      .join("");

    return (
      '<div class="order-card">' +
        '<div class="order-card__header">' +
          "<div>" +
            '<div class="order-card__id">Order #' + escapeHtml(order.orderId.slice(0, 8)) + "</div>" +
            '<div class="order-card__date">' + formatDate(order.createdAt) + "</div>" +
          "</div>" +
          '<span class="order-status ' + statusClass(order.status) + '">' + escapeHtml(order.status) + "</span>" +
        "</div>" +
        '<ul class="order-card__items">' + itemsHtml + "</ul>" +
        '<div class="order-card__footer">' +
          "<span>Total</span>" +
          "<span>$" + Number(order.total).toFixed(2) + "</span>" +
        "</div>" +
      "</div>"
    );
  }

  authFetch(TORONTO_SHOP.API_BASE_URL + "/orders/mine")
    .then(function (res) {
      if (!res.ok) throw new Error("GET /orders/mine failed with status " + res.status);
      return res.json();
    })
    .then(function (orders) {
      if (orders.length === 0) {
        listEl.innerHTML =
          '<p class="grid-status">You haven\'t placed any orders yet.</p>' +
          '<p class="text-center"><a href="shop.html" class="primary-btn">Start Shopping</a></p>';
        return;
      }

      orders.sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      listEl.innerHTML = orders.map(renderOrder).join("");
    })
    .catch(function (err) {
      listEl.innerHTML = '<p class="grid-status">Could not load your orders (' + err.message + ").</p>";
    });
})();
