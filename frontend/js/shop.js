(function () {
  var PAGE_SIZE = 12;

  var allProducts = [];
  var filtered = [];
  var currentPage = 1;

  var state = {
    category: "",
    gender: "",
    search: "",
    sort: "default",
  };

  var gridEl = document.getElementById("shop-product-grid");
  var countEl = document.getElementById("shop-results-count");
  var paginationEl = document.getElementById("shop-pagination");
  var categoryListEl = document.getElementById("category-filter-list");
  var genderListEl = document.getElementById("gender-filter-list");
  var breadcrumbEl = document.getElementById("shop-breadcrumb-title");

  function readStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    state.category = params.get("category") || "";
    state.gender = params.get("gender") || "";
  }

  function writeStateToUrl() {
    var params = new URLSearchParams();
    if (state.category) params.set("category", state.category);
    if (state.gender) params.set("gender", state.gender);
    var qs = params.toString();
    var url = window.location.pathname + (qs ? "?" + qs : "");
    window.history.pushState(null, "", url);
  }

  function categoryName(slug) {
    var match = TORONTO_SHOP_CATEGORIES.filter(function (c) {
      return c.slug === slug;
    })[0];
    return match ? match.name : slug;
  }

  function updateBreadcrumb() {
    var parts = [];
    if (state.category) parts.push(categoryName(state.category));
    if (state.gender) parts.push(state.gender === "men" ? "Men's" : "Women's");
    breadcrumbEl.textContent = parts.length ? parts.join(" - ") : "Shop";
  }

  function renderSidebar() {
    // Category counts respect the current gender filter (and vice versa) so
    // the sidebar always reflects what you'd actually see if you clicked it.
    var categoryHtml = '<li class="' + (state.category === "" ? "active" : "") + '" data-category="">' +
      "<a>All Categories</a></li>";
    TORONTO_SHOP_CATEGORIES.forEach(function (c) {
      var count = allProducts.filter(function (p) {
        return p.category === c.slug && (!state.gender || p.gender === state.gender);
      }).length;
      categoryHtml +=
        '<li class="' + (state.category === c.slug ? "active" : "") + '" data-category="' + c.slug + '">' +
        "<a>" + c.name + " (" + count + ")</a></li>";
    });
    categoryListEl.innerHTML = categoryHtml;

    var genderHtml = '<li class="' + (state.gender === "" ? "active" : "") + '" data-gender="">' +
      "<a>All</a></li>";
    TORONTO_SHOP_GENDERS.forEach(function (g) {
      var count = allProducts.filter(function (p) {
        return p.gender === g.slug && (!state.category || p.category === state.category);
      }).length;
      genderHtml +=
        '<li class="' + (state.gender === g.slug ? "active" : "") + '" data-gender="' + g.slug + '">' +
        "<a>" + g.name + " (" + count + ")</a></li>";
    });
    genderListEl.innerHTML = genderHtml;

    categoryListEl.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("click", function () {
        state.category = li.getAttribute("data-category");
        currentPage = 1;
        writeStateToUrl();
        applyFilters();
      });
    });
    genderListEl.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("click", function () {
        state.gender = li.getAttribute("data-gender");
        currentPage = 1;
        writeStateToUrl();
        applyFilters();
      });
    });
  }

  function applyFilters() {
    filtered = allProducts.filter(function (p) {
      if (state.category && p.category !== state.category) return false;
      if (state.gender && p.gender !== state.gender) return false;
      if (state.search && p.name.toLowerCase().indexOf(state.search.toLowerCase()) === -1) return false;
      return true;
    });

    if (state.sort === "price-asc") {
      filtered.sort(function (a, b) {
        return a.price - b.price;
      });
    } else if (state.sort === "price-desc") {
      filtered.sort(function (a, b) {
        return b.price - a.price;
      });
    }

    updateBreadcrumb();
    renderSidebar();
    renderGrid();
  }

  function renderGrid() {
    var total = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (total === 0) {
      gridEl.innerHTML = '<div class="col-lg-12"><p class="grid-status">No products match these filters.</p></div>';
      countEl.textContent = "Showing 0 of 0 results";
    } else {
      gridEl.innerHTML = pageItems.map(renderProductCard).join("");
      countEl.textContent =
        "Showing " + (start + 1) + "-" + Math.min(start + PAGE_SIZE, total) + " of " + total + " results";
    }

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }
    var html = "";
    for (var i = 1; i <= totalPages; i++) {
      html += '<a class="' + (i === currentPage ? "active" : "") + '" data-page="' + i + '">' + i + "</a>";
    }
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        currentPage = parseInt(a.getAttribute("data-page"), 10);
        renderGrid();
        window.scrollTo({ top: gridEl.offsetTop - 100, behavior: "smooth" });
      });
    });
  }

  document.getElementById("shop-search-form").addEventListener("submit", function (e) {
    e.preventDefault();
    state.search = document.getElementById("shop-search-input").value.trim();
    currentPage = 1;
    applyFilters();
  });

  document.getElementById("shop-sort-select").addEventListener("change", function (e) {
    state.sort = e.target.value;
    applyFilters();
  });

  window.addEventListener("popstate", function () {
    readStateFromUrl();
    currentPage = 1;
    applyFilters();
  });

  readStateFromUrl();

  fetchProducts()
    .then(function (products) {
      allProducts = products;
      applyFilters();
    })
    .catch(function (err) {
      gridEl.innerHTML =
        '<div class="col-lg-12"><p class="grid-status">Could not load products from the API (' +
        err.message +
        ").</p></div>";
      countEl.textContent = "";
    });
})();
