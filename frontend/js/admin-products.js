(function () {
  if (!requireAdminAuth()) return;

  var form = document.getElementById("product-form");
  var formTitle = document.getElementById("product-form-title");
  var submitBtn = document.getElementById("pf-submit-btn");
  var cancelEditEl = document.getElementById("pf-cancel-edit");
  var messageEl = document.getElementById("product-form-message");
  var tableBody = document.getElementById("products-table-body");
  var loadingEl = document.getElementById("products-loading");
  var tableWrapEl = document.getElementById("products-table-wrap");

  var editingProductId = null;

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.className = "auth__message is-visible " + (isError ? "is-error" : "is-success");
  }

  function categoryName(slug) {
    var match = TORONTO_SHOP_CATEGORIES.filter(function (c) {
      return c.slug === slug;
    })[0];
    return match ? match.name : slug;
  }

  // Populate the category/gender <select> options once from the same
  // shared lists shop.html uses, so admin can't type a category slug that
  // doesn't actually exist in the sidebar filters.
  document.getElementById("pf-category").innerHTML = TORONTO_SHOP_CATEGORIES.map(function (c) {
    return '<option value="' + c.slug + '">' + c.name + "</option>";
  }).join("");
  document.getElementById("pf-gender").innerHTML = TORONTO_SHOP_GENDERS.map(function (g) {
    return '<option value="' + g.slug + '">' + g.name + "</option>";
  }).join("");

  // main.js runs $("select").niceSelect() synchronously at parse time --
  // before this file populates the <option>s above -- so it builds its
  // visible dropdown widget from what were then two empty <select>s. The
  // native <select>s do end up with the right options, but nice-select's
  // widget (the thing actually visible; the native select is display:none)
  // never re-reads them without an explicit nudge, leaving admin looking
  // at a dropdown with nothing in it. `update` forces that resync.
  $("#pf-category, #pf-gender").niceSelect("update");

  function resetForm() {
    editingProductId = null;
    form.reset();
    $("#pf-category, #pf-gender").niceSelect("update");
    formTitle.textContent = "Add New Product";
    submitBtn.textContent = "Add Product";
    cancelEditEl.style.display = "none";
  }

  function startEdit(product) {
    editingProductId = product.productId;
    document.getElementById("pf-name").value = product.name;
    document.getElementById("pf-description").value = product.description;
    document.getElementById("pf-category").value = product.category;
    document.getElementById("pf-gender").value = product.gender;
    document.getElementById("pf-price").value = product.price;
    document.getElementById("pf-stock").value = product.stock;
    document.getElementById("pf-image").value = product.imageUrl;
    // Same nice-select resync as above -- setting .value on the native
    // select doesn't update the visible widget's displayed text on its own.
    $("#pf-category, #pf-gender").niceSelect("update");

    formTitle.textContent = "Edit Product";
    submitBtn.textContent = "Update Product";
    cancelEditEl.style.display = "block";
    form.scrollIntoView({ behavior: "smooth" });
  }

  function renderRow(product) {
    return (
      "<tr>" +
        '<td class="admin-table__img"><img src="' + product.imageUrl + '" alt="' + escapeHtml(product.name) + '"></td>' +
        "<td>" + escapeHtml(product.name) + "</td>" +
        "<td>" + escapeHtml(categoryName(product.category)) + "</td>" +
        "<td>" + (product.gender === "men" ? "Men's" : "Women's") + "</td>" +
        "<td>$" + Number(product.price).toFixed(2) + "</td>" +
        "<td>" + product.stock + "</td>" +
        '<td><button type="button" class="admin-btn admin-btn--secondary edit-product-btn" data-id="' + product.productId + '">Edit</button></td>' +
      "</tr>"
    );
  }

  var loadedProducts = [];

  function loadProducts() {
    return fetchProducts().then(function (products) {
      loadedProducts = products;
      tableBody.innerHTML = products.map(renderRow).join("");
      loadingEl.style.display = "none";
      tableWrapEl.style.display = "block";
    });
  }

  loadProducts().catch(function (err) {
    loadingEl.textContent = "Could not load products (" + err.message + ").";
  });

  tableBody.addEventListener("click", function (e) {
    var btn = e.target.closest(".edit-product-btn");
    if (!btn) return;
    var product = loadedProducts.find(function (p) {
      return p.productId === btn.dataset.id;
    });
    if (product) startEdit(product);
  });

  cancelEditEl.addEventListener("click", function (e) {
    e.preventDefault();
    resetForm();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var body = {
      name: document.getElementById("pf-name").value.trim(),
      description: document.getElementById("pf-description").value.trim(),
      category: document.getElementById("pf-category").value,
      gender: document.getElementById("pf-gender").value,
      price: Number(document.getElementById("pf-price").value),
      stock: Number(document.getElementById("pf-stock").value),
      imageUrl: document.getElementById("pf-image").value.trim(),
    };

    var isEdit = !!editingProductId;
    var url = isEdit
      ? TORONTO_SHOP.API_BASE_URL + "/admin/products/" + editingProductId
      : TORONTO_SHOP.API_BASE_URL + "/admin/products";

    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? "Updating..." : "Adding...";

    authFetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) throw new Error((isEdit ? "PUT" : "POST") + " product failed with status " + res.status);
        return res.json();
      })
      .then(function () {
        showMessage(isEdit ? "Product updated." : "Product added.", false);
        resetForm();
        return loadProducts();
      })
      .catch(function (err) {
        showMessage(err.message, true);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = editingProductId ? "Update Product" : "Add Product";
      });
  });
})();
