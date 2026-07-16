// Builds one .product__item card, matching the template's markup/classes.
// Rating stars and color-swatch dots are dropped since neither is backed by
// a real product attribute (no reviews or color variants in this build).
function renderProductCard(product) {
  var price = "$" + Number(product.price).toFixed(2);
  var img = product.imageUrl || "";

  return (
    '<div class="col-lg-4 col-md-6 col-sm-6">' +
      '<div class="product__item">' +
        '<div class="product__item__pic set-bg" style="background-image:url(\'' + img + '\')">' +
          '<ul class="product__hover">' +
            '<li><a href="#"><img src="img/icon/heart.png" alt=""></a></li>' +
            '<li><a href="#"><img src="img/icon/compare.png" alt=""> <span>Compare</span></a></li>' +
            '<li><a href="product.html?id=' + encodeURIComponent(product.productId) + '"><img src="img/icon/search.png" alt=""></a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="product__item__text">' +
          '<h6>' + escapeHtml(product.name) + '</h6>' +
          '<a href="#" class="add-cart"' +
            ' data-product-id="' + encodeURIComponent(product.productId) + '"' +
            ' data-product-name="' + escapeHtml(product.name) + '"' +
            ' data-product-price="' + Number(product.price) + '"' +
            ' data-product-image="' + escapeHtml(img) + '"' +
            ' data-product-stock="' + Number(product.stock) + '"' +
          '>+ Add To Cart</a>' +
          '<h5>' + price + '</h5>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
