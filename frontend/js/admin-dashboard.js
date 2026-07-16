(function () {
  if (!requireAdminAuth()) return;

  var REVENUE_STATUSES = ["Confirmed", "Shipped", "Delivered"];
  var ALL_STATUSES = ["Pending Payment", "Confirmed", "Shipped", "Delivered", "Cancelled"];

  function statusClass(status) {
    return "status-" + status.toLowerCase().replace(/\s+/g, "-");
  }

  authFetch(TORONTO_SHOP.API_BASE_URL + "/admin/orders")
    .then(function (res) {
      if (!res.ok) throw new Error("GET /admin/orders failed with status " + res.status);
      return res.json();
    })
    .then(function (orders) {
      document.getElementById("stat-total-orders").textContent = orders.length;

      var revenue = orders
        .filter(function (o) {
          return REVENUE_STATUSES.indexOf(o.status) !== -1;
        })
        .reduce(function (sum, o) {
          return sum + Number(o.total);
        }, 0);
      document.getElementById("stat-revenue").textContent = "$" + revenue.toFixed(2);

      var pendingCount = orders.filter(function (o) {
        return o.status === "Pending Payment";
      }).length;
      document.getElementById("stat-pending").textContent = pendingCount;

      var counts = {};
      ALL_STATUSES.forEach(function (s) {
        counts[s] = 0;
      });
      orders.forEach(function (o) {
        counts[o.status] = (counts[o.status] || 0) + 1;
      });

      var breakdownEl = document.getElementById("status-breakdown");
      breakdownEl.innerHTML = ALL_STATUSES.map(function (status) {
        return (
          "<li>" +
            '<span class="order-status ' + statusClass(status) + '">' + status + "</span>" +
            "<span>" + counts[status] + " order" + (counts[status] === 1 ? "" : "s") + "</span>" +
          "</li>"
        );
      }).join("");

      document.getElementById("dashboard-loading").style.display = "none";
      document.getElementById("dashboard-content").style.display = "block";
    })
    .catch(function (err) {
      document.getElementById("dashboard-loading").textContent =
        "Could not load dashboard (" + err.message + ").";
    });
})();
