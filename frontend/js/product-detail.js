(function () {
  var params = new URLSearchParams(window.location.search);
  var productId = params.get("id");

  var imageWrap = document.getElementById("product-image-wrap");
  var textWrap = document.getElementById("product-details-text");
  var breadcrumbName = document.getElementById("product-breadcrumb-name");
  var relatedGrid = document.getElementById("related-products-grid");

  function showError(message) {
    textWrap.innerHTML = '<p class="grid-status">' + message + "</p>";
  }

  function genderLabel(gender) {
    return gender === "men" ? "Men's" : "Women's";
  }

  function categoryName(slug) {
    var match = TORONTO_SHOP_CATEGORIES.filter(function (c) {
      return c.slug === slug;
    })[0];
    return match ? match.name : slug;
  }

  function renderProduct(product) {
    document.title = "Toronto Shop | " + product.name;
    breadcrumbName.textContent = product.name;

    imageWrap.innerHTML =
      '<img src="' + product.imageUrl + '" alt="' + escapeHtml(product.name) + '">';

    var inStock = product.stock > 0;
    var availability = inStock ? "In Stock (" + product.stock + " available)" : "Out of Stock";

    var cartControl;
    if (inStock) {
      // main.js's own +/- decoration for .pro-qty runs synchronously at
      // parse time, before this markup exists, so it never attaches here --
      // the qtybtn spans and their click handling are done by this file.
      cartControl =
        '<div class="product__details__cart__option">' +
          '<div class="quantity">' +
            '<div class="pro-qty">' +
              '<span class="fa fa-angle-up dec qtybtn"></span>' +
              '<input type="text" id="qty-input" value="1">' +
              '<span class="fa fa-angle-down inc qtybtn"></span>' +
            "</div>" +
          "</div>" +
          '<a href="#" class="primary-btn" id="add-to-cart-btn">add to cart</a>' +
        "</div>";
    } else {
      cartControl =
        '<div class="product__details__cart__option">' +
          '<a href="#" class="primary-btn" style="opacity:0.5;pointer-events:none;">out of stock</a>' +
        "</div>";
    }

    textWrap.innerHTML =
      "<h4>" + escapeHtml(product.name) + "</h4>" +
      "<h3>$" + Number(product.price).toFixed(2) + "</h3>" +
      "<p>" + escapeHtml(product.description) + "</p>" +
      cartControl +
      '<div class="product__details__last__option">' +
        "<h5><span>Product Info</span></h5>" +
        "<ul>" +
          "<li><span>Category:</span> " + escapeHtml(categoryName(product.category)) + "</li>" +
          "<li><span>Gender:</span> " + genderLabel(product.gender) + "</li>" +
          "<li><span>Availability:</span> " + availability + "</li>" +
        "</ul>" +
      "</div>";

    if (inStock) {
      var qtyInput = document.getElementById("qty-input");

      document.querySelectorAll(".pro-qty .qtybtn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var current = parseInt(qtyInput.value, 10) || 1;
          var next = btn.classList.contains("inc") ? current + 1 : current - 1;
          qtyInput.value = Math.max(1, Math.min(next, product.stock));
        });
      });

      document.getElementById("add-to-cart-btn").addEventListener("click", function (e) {
        e.preventDefault();
        var qty = Math.max(1, Math.min(parseInt(qtyInput.value, 10) || 1, product.stock));
        qtyInput.value = qty;

        addToCart(product, qty);

        var btn = e.currentTarget;
        var original = btn.textContent;
        btn.textContent = "added!";
        setTimeout(function () {
          btn.textContent = original;
        }, 1200);
      });
    }
  }

  function renderRelated(product) {
    fetchProducts({ category: product.category })
      .then(function (products) {
        var related = products
          .filter(function (p) {
            return p.productId !== product.productId;
          })
          .slice(0, 4);

        if (related.length === 0) {
          relatedGrid.innerHTML = '<div class="col-lg-12"><p class="grid-status">No related products.</p></div>';
          return;
        }

        relatedGrid.innerHTML = related
          .map(function (p) {
            return renderProductCard(p).replace("col-lg-4", "col-lg-3");
          })
          .join("");
      })
      .catch(function () {
        relatedGrid.innerHTML = "";
      });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  if (!productId) {
    showError("No product specified.");
    return;
  }

  fetchProductById(productId)
    .then(function (product) {
      if (!product) {
        showError("Product not found.");
        return;
      }
      renderProduct(product);
      renderRelated(product);
    })
    .catch(function (err) {
      showError("Could not load this product (" + err.message + ").");
    });
})();
