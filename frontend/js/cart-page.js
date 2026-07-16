(function () {
  var container = document.getElementById("cart-container");

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function renderEmpty() {
    container.innerHTML =
      '<div class="row">' +
        '<div class="col-lg-12 text-center">' +
          '<p class="grid-status">Your cart is empty.</p>' +
          '<a href="shop.html" class="primary-btn">Continue Shopping</a>' +
        "</div>" +
      "</div>";
  }

  function renderRow(item) {
    var lineTotal = item.price * item.quantity;
    return (
      '<tr data-product-id="' + escapeHtml(item.productId) + '">' +
        '<td class="product__cart__item">' +
          '<div class="product__cart__item__pic"><img src="' + item.imageUrl + '" alt="' + escapeHtml(item.name) + '"></div>' +
          '<div class="product__cart__item__text">' +
            "<h6>" + escapeHtml(item.name) + "</h6>" +
            "<h5>$" + item.price.toFixed(2) + "</h5>" +
          "</div>" +
        "</td>" +
        '<td class="quantity__item">' +
          '<div class="quantity"><div class="pro-qty-2">' +
            '<span class="fa fa-angle-left dec qtybtn"></span>' +
            '<input type="text" class="cart-qty-input" value="' + item.quantity + '">' +
            '<span class="fa fa-angle-right inc qtybtn"></span>' +
          "</div></div>" +
        "</td>" +
        '<td class="cart__price">$' + lineTotal.toFixed(2) + "</td>" +
        '<td class="cart__close"><i class="fa fa-close cart-remove-btn"></i></td>' +
      "</tr>"
    );
  }

  function render() {
    var cart = getCart();

    if (cart.length === 0) {
      renderEmpty();
      return;
    }

    var total = cartTotal();

    container.innerHTML =
      '<div class="row">' +
        '<div class="col-lg-8">' +
          '<div class="shopping__cart__table">' +
            "<table>" +
              "<thead><tr><th>Product</th><th>Quantity</th><th>Total</th><th></th></tr></thead>" +
              "<tbody>" + cart.map(renderRow).join("") + "</tbody>" +
            "</table>" +
          "</div>" +
          '<div class="row">' +
            '<div class="col-lg-6 col-md-6 col-sm-6">' +
              '<div class="continue__btn"><a href="shop.html">Continue Shopping</a></div>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="col-lg-4">' +
          '<div class="cart__total">' +
            "<h6>Cart total</h6>" +
            "<ul>" +
              "<li>Subtotal <span>$" + total.toFixed(2) + "</span></li>" +
              "<li>Total <span>$" + total.toFixed(2) + "</span></li>" +
            "</ul>" +
            '<a href="checkout.html" class="primary-btn">Proceed to checkout</a>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function handleQuantityChange(productId, qty) {
    updateCartQuantity(productId, qty);
    render();
  }

  container.addEventListener("click", function (e) {
    if (e.target.closest(".cart-remove-btn")) {
      var row = e.target.closest("tr");
      removeFromCart(row.dataset.productId);
      render();
      return;
    }

    // main.js's own +/- decoration for .pro-qty-2 runs synchronously at
    // parse time, before any cart rows exist, so it never attaches to
    // these -- increment/decrement is computed here instead.
    var qtyBtn = e.target.closest(".pro-qty-2 .qtybtn");
    if (qtyBtn) {
      var qtyRow = qtyBtn.closest("tr");
      var input = qtyBtn.parentElement.querySelector("input");
      var current = parseInt(input.value, 10) || 0;
      var next = qtyBtn.classList.contains("inc") ? current + 1 : current - 1;
      handleQuantityChange(qtyRow.dataset.productId, next);
    }
  });

  container.addEventListener("change", function (e) {
    if (!e.target.classList.contains("cart-qty-input")) return;
    var row = e.target.closest("tr");
    handleQuantityChange(row.dataset.productId, parseInt(e.target.value, 10) || 0);
  });

  render();
})();
