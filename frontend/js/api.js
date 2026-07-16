// Thin wrapper around GET /products (public route, no auth required).
function fetchProducts(params) {
  var query = "";
  if (params && (params.category || params.gender)) {
    var parts = [];
    if (params.category) parts.push("category=" + encodeURIComponent(params.category));
    if (params.gender) parts.push("gender=" + encodeURIComponent(params.gender));
    query = "?" + parts.join("&");
  }

  return fetch(TORONTO_SHOP.API_BASE_URL + "/products" + query).then(function (res) {
    if (!res.ok) {
      throw new Error("GET /products failed with status " + res.status);
    }
    return res.json();
  });
}

// GET /products/{id} (public route). Resolves to null on 404 rather than
// throwing, since "product not found" is an expected, renderable state.
function fetchProductById(id) {
  return fetch(TORONTO_SHOP.API_BASE_URL + "/products/" + encodeURIComponent(id)).then(function (res) {
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error("GET /products/" + id + " failed with status " + res.status);
    }
    return res.json();
  });
}
