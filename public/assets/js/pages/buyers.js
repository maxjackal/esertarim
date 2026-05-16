(() => {
  const API = "/api/v1/buyers";

  const refs = {
    form: document.getElementById("buyerForm"),
    name: document.getElementById("name"),
    phone: document.getElementById("phone"),
    plateNo: document.getElementById("plateNo"),
    exportBtn: document.getElementById("exportBtn"),
    tbody: document.getElementById("buyerTableBody"),
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
        <td class="py-3 pr-4 font-medium">${escapeHtml(item.name || "")}</td>
        <td class="py-3 pr-4">${escapeHtml(item.plate_no || "-")}</td>
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

  async function loadBuyers() {
    try {
      const data = await window.ApiService.buyers.getAll();
      refs.tbody.innerHTML = (data.items || []).map(rowTemplate).join("");

      refs.tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!confirm("Bu alıcıyı silmek istediğinize emin misiniz?")) return;

          try {
            await window.ApiService.buyers.delete(id);
            toast("Alıcı silindi", "success");
            await loadBuyers();
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
      phone: refs.phone.value.trim(),
      plate_no: refs.plateNo.value.trim(),
      address: "",
      note: "",
    };

    try {
      await window.ApiService.buyers.create(payload);

      refs.form.reset();
      toast("Alıcı eklendi", "success");
      await loadBuyers();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  refs.exportBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportTableToExcel("#buyerTable", "alicilar.xlsx", "Alıcılar");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  loadBuyers();
})();
