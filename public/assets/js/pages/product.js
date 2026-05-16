(() => {
  const API = "/api/v1/products";

  const refs = {
    form: document.getElementById("productForm"),
    name: document.getElementById("name"),
    minWeight: document.getElementById("minWeight"),
    maxWeight: document.getElementById("maxWeight"),
    exportBtn: document.getElementById("exportBtn"),
    tbody: document.getElementById("productTableBody"),
  };

  function toast(message, type = "info") {
    if (window.Toast?.show) {
      window.Toast.show(message, type);
      return;
    }
    alert(message);
  }

  function rowTemplate(item) {
    return `
      <tr class="border-b border-slate-100">
        <td class="py-3 pr-4 font-medium">${item.name}</td>
        <td class="py-3 pr-4">${item.min_box_weight}</td>
        <td class="py-3 pr-4">${item.max_box_weight}</td>
        <td class="py-3 pr-4">
          <button
            class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            data-id="${item.id}"
            data-action="delete"
          >
            Sil
          </button>
        </td>
      </tr>
    `;
  }

  async function loadProducts() {
    try {
      const data = await window.ApiService.products.getAll();
      refs.tbody.innerHTML = (data.items || []).map(rowTemplate).join("");

      refs.tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

          try {
            await window.ApiService.products.delete(id);
            toast("Ürün silindi", "success");
            await loadProducts();
          } catch (err) {
            toast(err.message, "error");
          }
        });
      });
    } catch (err) {
      toast(err.message);
    }
  }

  refs.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: refs.name.value.trim(),
      min_box_weight: Number(refs.minWeight.value || 0),
      max_box_weight: Number(refs.maxWeight.value || 0),
    };

    try {
      await window.ApiService.products.create(payload);

      refs.form.reset();
      toast("Ürün eklendi", "success");
      await loadProducts();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  refs.exportBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportTableToExcel("#productTable", "urunler.xlsx", "Ürünler");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  loadProducts();
})();
