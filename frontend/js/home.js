(function () {
  var gridEl = document.getElementById("home-product-grid");
  var currentFilter = "*";

  // One item per (category, gender) bucket -- 14 cards, real variety across
  // the whole catalog rather than an arbitrary first-N slice.
  function pickFeatured(products) {
    var seen = {};
    var featured = [];
    products.forEach(function (p) {
      var key = p.category + "|" + p.gender;
      if (!seen[key]) {
        seen[key] = true;
        featured.push(p);
      }
    });
    return featured;
  }

  function renderFeaturedCard(product) {
    var genderClass = product.gender === "men" ? "men" : "women";
    return renderProductCard(product).replace(
      'class="col-lg-4 col-md-6 col-sm-6"',
      'class="col-lg-3 col-md-6 col-sm-6 mix ' + genderClass + '"'
    );
  }

  function applyFilter() {
    var cards = gridEl.querySelectorAll(".mix");
    cards.forEach(function (card) {
      var show = currentFilter === "*" || card.classList.contains(currentFilter.replace(".", ""));
      card.style.display = show ? "" : "none";
    });
  }

  fetchProducts()
    .then(function (products) {
      var featured = pickFeatured(products);
      // Cards set their background-image inline (see product-card.js) rather
      // than via data-setbg + main.js's set-bg handler, since that handler
      // only runs once on window load -- before this async data arrives.
      gridEl.innerHTML = featured.map(renderFeaturedCard).join("");
    })
    .catch(function (err) {
      gridEl.innerHTML =
        '<div class="col-lg-12"><p class="grid-status">Could not load products from the API (' +
        err.message +
        ").</p></div>";
    });

  document.querySelectorAll("#home-gender-filter li").forEach(function (li) {
    li.addEventListener("click", function () {
      document.querySelectorAll("#home-gender-filter li").forEach(function (x) {
        x.classList.remove("active");
      });
      li.classList.add("active");
      currentFilter = li.getAttribute("data-filter");
      applyFilter();
    });
  });
})();
