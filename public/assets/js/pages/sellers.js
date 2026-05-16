(() => {
  const API = "/api/v1/sellers";

  const refs = {
    form: document.getElementById("sellerForm"),
    firstName: document.getElementById("firstName"),
    lastName: document.getElementById("lastName"),
    phone: document.getElementById("phone"),
    exportBtn: document.getElementById("exportBtn"),
    tbody: document.getElementById("sellerTableBody"),
  };
  const escapeHtml = window.AppSecurity?.escapeHtml || ((value) => String(value ?? ""));

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
        <td class="py-3 pr-4 font-medium">${escapeHtml(`${item.first_name || ""} ${item.last_name || ""}`.trim())}</td>
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

  async function loadSellers() {
    try {
      const data = await window.ApiService.sellers.getAll();
      refs.tbody.innerHTML = (data.items || []).map(rowTemplate).join("");

      refs.tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!confirm("Bu satıcıyı silmek istediğinize emin misiniz?")) return;

          try {
            await window.ApiService.sellers.delete(id);
            toast("Satıcı silindi", "success");
            await loadSellers();
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
      first_name: refs.firstName.value.trim(),
      last_name: refs.lastName.value.trim(),
      phone: refs.phone.value.trim(),
      address: "",
      note: "",
    };

    try {
      await window.ApiService.sellers.create(payload);

      refs.form.reset();
      toast("Satıcı eklendi", "success");
      await loadSellers();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  refs.exportBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportTableToExcel("#sellerTable", "saticilar.xlsx", "Satıcılar");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  loadSellers();
})();
