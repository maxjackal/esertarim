(() => {
  const entryId = Number(new URLSearchParams(window.location.search).get("id") || 0);

  const els = {
    detailEntryDate: document.getElementById("detailEntryDate"),
    detailSellerName: document.getElementById("detailSellerName"),
    detailBuyerName: document.getElementById("detailBuyerName"),
    detailProductName: document.getElementById("detailProductName"),
    detailBoxCount: document.getElementById("detailBoxCount"),
    detailNetWeight: document.getElementById("detailNetWeight"),
    detailUnitPrice: document.getElementById("detailUnitPrice"),
    detailPaymentStatus: document.getElementById("detailPaymentStatus"),
    detailTotalAmount: document.getElementById("detailTotalAmount"),
    detailPaidAmount: document.getElementById("detailPaidAmount"),
    detailRemainingAmount: document.getElementById("detailRemainingAmount"),
    detailNote: document.getElementById("detailNote"),
paymentMethod: document.getElementById("paymentMethod"),
    paymentDate: document.getElementById("paymentDate"),
    paymentAmount: document.getElementById("paymentAmount"),
    paymentNote: document.getElementById("paymentNote"),
    savePaymentBtn: document.getElementById("savePaymentBtn"),
    exportPaymentsBtn: document.getElementById("exportPaymentsBtn"),
    paymentTableBody: document.getElementById("paymentTableBody"),
  };

  let currentEntry = null;
  let currentPayments = [];

  function showToastSafe(type, message) {
    if (window.Toast?.show) {
      window.Toast.show(message, type);
      return;
    }
    if (typeof window.showToast === "function") {
      window.showToast(type, message);
      return;
    }
    alert(message);
  }
function getPaymentMethodLabel(method) {
  switch (method) {
    case "cash":
      return "Nakit";
    case "bank":
      return "Banka";
    case "card":
      return "Kart";
    default:
      return "-";
  }
}
  function formatMoney(value) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatNumber(value, fractionDigits = 2) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getPaymentStatusLabel(status) {
    switch (status) {
      case "odendi":
        return "Ödendi";
      case "kismi_odendi":
        return "Kısmi Ödendi";
      case "odenmedi":
        return "Ödenmedi";
      default:
        return "-";
    }
  }

  function getPaymentStatusClass(status) {
    switch (status) {
      case "odendi":
        return "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700";
      case "kismi_odendi":
        return "inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700";
      case "odenmedi":
        return "inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700";
      default:
        return "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700";
    }
  }



  function renderEntryDetail(item) {
    currentEntry = item || null;

    els.detailEntryDate.textContent = item?.entry_date || "-";
    els.detailSellerName.textContent = item?.seller_name || "-";
    els.detailBuyerName.textContent = item?.buyer_name || "-";
    els.detailProductName.textContent = item?.product_name || "-";
    els.detailBoxCount.textContent = item ? `${formatNumber(item.box_count || 0, 0)} kasa` : "-";
    els.detailNetWeight.textContent = item ? `${formatNumber(item.net_weight || 0)} kg` : "-";
    els.detailUnitPrice.textContent = formatMoney(item?.unit_price || 0);
    els.detailTotalAmount.textContent = formatMoney(item?.total_amount || 0);
    els.detailPaidAmount.textContent = formatMoney(item?.paid_amount || 0);
    els.detailRemainingAmount.textContent = formatMoney(item?.remaining_amount || 0);
    els.detailNote.textContent = item?.note?.trim() ? item.note : "-";

    els.detailPaymentStatus.innerHTML = `
      <span class="${getPaymentStatusClass(item?.payment_status)}">
        ${escapeHtml(getPaymentStatusLabel(item?.payment_status))}
      </span>
    `;
  }

function renderPayments(items) {
  const tbody = els.paymentTableBody;
  if (!tbody) return;
  currentPayments = Array.isArray(items) ? items : [];

  if (!Array.isArray(items) || !items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-sm text-slate-500">
          Henüz tahsilat hareketi bulunmuyor.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items
    .map(
      (item) => `
        <tr class="border-b border-slate-100 align-top ${item.status === "cancelled" ? "opacity-60" : ""}">
          <td class="py-3 pr-4 font-medium text-slate-800">
            ${escapeHtml(item.payment_date || "-")}
          </td>
          <td class="py-3 pr-4 font-semibold ${item.status === "cancelled" ? "text-slate-400 line-through" : "text-emerald-600"}">
            ${formatMoney(item.amount || 0)}
          </td>
          <td class="py-3 pr-4 text-slate-600">
            ${escapeHtml(getPaymentMethodLabel(item.payment_method))}
          </td>
          <td class="py-3 pr-4 text-slate-600 whitespace-pre-line">
            ${escapeHtml(item.note || "-")}
            ${
              item.status === "cancelled" && item.cancel_note
                ? `<div class="mt-1 text-xs text-rose-600">İptal Notu: ${escapeHtml(item.cancel_note)}</div>`
                : ""
            }
          </td>
          <td class="py-3 pr-4 text-slate-500">
            ${
              item.status === "cancelled"
                ? escapeHtml(item.cancelled_by || item.created_by || "-")
                : escapeHtml(item.created_by || "-")
            }
          </td>
          <td class="py-3 pr-4 text-slate-500">
            ${escapeHtml(item.created_at || "-")}
          </td>
          <td class="py-3 pr-4">
  <div class="flex flex-wrap gap-2">
    <a
      href="/tahsilat-makbuzu/${item.id}"
      target="_blank"
      class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      Makbuz
    </a>
    ${
      item.status === "active"
        ? `
          <button
            type="button"
            class="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            data-action="cancel-payment"
            data-payment-id="${item.id}"
          >
            İptal Et
          </button>
        `
        : `<span class="text-xs font-semibold text-slate-400">İptal Edildi</span>`
    }
  </div>
</td>
        </tr>
      `
    )
    .join("");

  tbody.querySelectorAll('[data-action="cancel-payment"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      cancelPayment(Number(btn.getAttribute("data-payment-id") || 0));
    });
  });
}

  async function loadEntryDetail() {
    const { items } = await window.ApiService.custom.getLedgerEntriesWithRelations({ id: entryId });
    if (items.length > 0) {
      const item = items[0];
      item.seller_name = item.seller ? `${item.seller.first_name} ${item.seller.last_name}` : '';
      item.buyer_name = item.buyer ? item.buyer.name : '';
      item.product_name = item.product ? item.product.name : '';
      item.entry_date = item.entry_date;
      renderEntryDetail(item);
    }
  }

  async function loadPayments() {
    const { data, error } = await window.sb
      .from("ledger_payments")
      .select("id,created_at,note,status,ledger_entry_id,amount,payment_method,payment_date")
      .eq("ledger_entry_id", entryId)
      .order("payment_date", { ascending: false });

    if (error) throw error;
    renderPayments(data || []);
  }

function resetPaymentForm() {
  if (els.paymentAmount) els.paymentAmount.value = "";
  if (els.paymentNote) els.paymentNote.value = "";
  if (els.paymentMethod) els.paymentMethod.value = "cash";
}

  function setDefaultPaymentDate() {
    if (!els.paymentDate) return;
    if (els.paymentDate.value) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    els.paymentDate.value = `${yyyy}-${mm}-${dd}`;
  }

  async function savePayment() {
    if (!entryId) {
      showToastSafe("error", "Geçersiz kayıt id");
      return;
    }

    const paymentDate = (els.paymentDate?.value || "").trim();
    const amount = Number(els.paymentAmount?.value || 0);
    const note = (els.paymentNote?.value || "").trim();

    if (!paymentDate) {
      showToastSafe("warning", "Ödeme tarihi zorunludur");
      els.paymentDate?.focus();
      return;
    }

    if (!amount || amount <= 0) {
      showToastSafe("warning", "Ödeme tutarı 0'dan büyük olmalıdır");
      els.paymentAmount?.focus();
      return;
    }

    if (currentEntry && Number(currentEntry.remaining_amount || 0) <= 0) {
      showToastSafe("warning", "Bu kayıtta kalan borç bulunmuyor");
      return;
    }

    if (currentEntry && amount > Number(currentEntry.remaining_amount || 0)) {
      showToastSafe("warning", "Ödeme tutarı kalan borçtan büyük olamaz");
      els.paymentAmount?.focus();
      return;
    }

    if (els.savePaymentBtn) {
      els.savePaymentBtn.disabled = true;
      els.savePaymentBtn.classList.add("opacity-60", "pointer-events-none");
    }

    try {
      await window.ApiService.ledgerPayments.create({
        ledger_entry_id: entryId,
        payment_date: paymentDate,
        amount,
        payment_method: els.paymentMethod?.value || "cash",
        note,
        created_by: "Admin",
      });

      sessionStorage.setItem("receivable_updated", "1");
      showToastSafe("success", "Tahsilat kaydedildi");
      resetPaymentForm();
      setDefaultPaymentDate();
      await loadEntryDetail();
      await loadPayments();
    } catch (err) {
      showToastSafe("error", err.message || "Tahsilat kaydedilemedi");
    } finally {
      if (els.savePaymentBtn) {
        els.savePaymentBtn.disabled = false;
        els.savePaymentBtn.classList.remove("opacity-60", "pointer-events-none");
      }
    }
  }

  async function cancelPayment(paymentId) {
    if (!paymentId) {
      showToastSafe("error", "Geçersiz ödeme id");
      return;
    }

    const note = window.prompt("İptal nedeni girin (opsiyonel):", "");
    if (note === null) return;

    try {
      await window.ApiService.ledgerPayments.update(paymentId, {
        status: "cancelled",
        cancel_note: note.trim(),
        cancelled_by: "Admin",
      });

      sessionStorage.setItem("receivable_updated", "1");
      showToastSafe("success", "Ödeme iptal edildi");
      await loadEntryDetail();
      await loadPayments();
    } catch (err) {
      showToastSafe("error", err.message || "Ödeme iptal edilemedi");
    }
  }

  async function init() {
    if (!entryId) {
      showToastSafe("error", "Kayıt id bulunamadı");
      return;
    }

    setDefaultPaymentDate();

    try {
      await loadEntryDetail();
      await loadPayments();
    } catch (err) {
      showToastSafe("error", err.message || "Detay bilgileri yüklenemedi");
    }
  }

  window.cancelPayment = cancelPayment;
  els.savePaymentBtn?.addEventListener("click", savePayment);
  els.exportPaymentsBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportRowsToExcel(
        currentPayments,
        [
          { label: "Tarih", key: "payment_date", type: "date" },
          { label: "Tutar", key: "amount", type: "money" },
          { label: "Yöntem", value: (row) => getPaymentMethodLabel(row.payment_method) },
          { label: "Açıklama", key: "note" },
          { label: "İşlem Yapan", value: (row) => row.status === "cancelled" ? (row.cancelled_by || row.created_by || "-") : (row.created_by || "-") },
          { label: "Oluşturulma", key: "created_at" },
          { label: "Durum", value: (row) => row.status === "cancelled" ? "İptal Edildi" : "Aktif" },
        ],
        `tahsilat-hareketleri-${entryId}.xlsx`,
        "Tahsilatlar"
      );
    } catch (err) {
      showToastSafe("error", err.message);
    }
  });
  window.addEventListener("DOMContentLoaded", init);
})();
