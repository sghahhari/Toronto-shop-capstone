// localStorage-based cart shared by every page (per BUILD_SPEC.md -- no
// backend cart table). Line items snapshot name/price/imageUrl at add time
// so cart.html never needs to refetch products.
var CART_STORAGE_KEY = "toronto_shop_cart";

function getCart() {
  try {
    var raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, quantity) {
  quantity = quantity || 1;
  var cart = getCart();
  var existing = cart.find(function (item) {
    return item.productId === product.productId;
  });

  var maxQty = product.stock != null ? product.stock : Infinity;

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, maxQty);
  } else {
    cart.push({
      productId: product.productId,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      stock: product.stock,
      quantity: Math.min(quantity, maxQty),
    });
  }

  saveCart(cart);
  return cart;
}

function removeFromCart(productId) {
  var cart = getCart().filter(function (item) {
    return item.productId !== productId;
  });
  saveCart(cart);
  return cart;
}

function updateCartQuantity(productId, quantity) {
  var cart = getCart();
  var item = cart.find(function (i) {
    return i.productId === productId;
  });
  if (!item) return cart;

  var maxQty = item.stock != null ? item.stock : Infinity;
  quantity = Math.max(0, Math.min(quantity, maxQty));

  if (quantity === 0) {
    cart = cart.filter(function (i) {
      return i.productId !== productId;
    });
  } else {
    item.quantity = quantity;
  }

  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce(function (sum, item) {
    return sum + item.quantity;
  }, 0);
}

function cartTotal() {
  var raw = getCart().reduce(function (sum, item) {
    return sum + item.price * item.quantity;
  }, 0);
  // Floating point sums drift (e.g. 69.99*2 + 89.99 = 229.96999999999997).
  // Rounded here at the source so every caller -- the header badge display,
  // the checkout summary, and critically the total actually POSTed and
  // persisted to /orders -- gets a clean value, not just a display that
  // happens to look right via toFixed().
  return Math.round(raw * 100) / 100;
}

// Every page's header has a cart icon with a count badge + running price
// (".header__nav__option" in the main header, ".offcanvas__nav__option" in
// the mobile offcanvas menu) -- both need to reflect real cart state.
function updateCartBadge() {
  var count = cartCount();
  var total = cartTotal();
  var totalText = "$" + total.toFixed(2);

  document.querySelectorAll(".header__nav__option span, .offcanvas__nav__option span").forEach(function (el) {
    el.textContent = count;
  });
  document.querySelectorAll(".header__nav__option .price, .offcanvas__nav__option .price").forEach(function (el) {
    el.textContent = totalText;
  });
}

// Delegated so it works for both statically-written cards and ones injected
// later by home.js/shop.js -- no need to re-bind after each render.
document.addEventListener("click", function (e) {
  var btn = e.target.closest("a.add-cart[data-product-id]");
  if (!btn) return;
  e.preventDefault();

  addToCart(
    {
      productId: btn.dataset.productId,
      name: btn.dataset.productName,
      price: Number(btn.dataset.productPrice),
      imageUrl: btn.dataset.productImage,
      stock: btn.dataset.productStock ? Number(btn.dataset.productStock) : null,
    },
    1
  );

  var original = btn.textContent;
  btn.textContent = "Added!";
  setTimeout(function () {
    btn.textContent = original;
  }, 1000);
});

document.addEventListener("DOMContentLoaded", updateCartBadge);
