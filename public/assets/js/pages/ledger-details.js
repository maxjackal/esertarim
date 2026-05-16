(() => {
const url = new URL(window.location.href);
const queryId = Number(url.searchParams.get("id") || 0);
const pathParts = url.pathname.split("/").filter(Boolean);
const lastPart = Number(pathParts[pathParts.length - 1] || 0);

const ledgerId = queryId || lastPart;
let currentItems = [];

  const els = {
    summaryBuyerName: document.getElementById("summaryBuyerName"),
    summaryProductName: document.getElementById("summaryProductName"),
    summaryEntryCount: document.getElementById("summaryEntryCount"),
    summaryTotalBoxes: document.getElementById("summaryTotalBoxes"),
    summaryTotalWeight: document.getElementById("summaryTotalWeight"),
    summaryTotalAmount: document.getElementById("summaryTotalAmount"),
    summaryTotalPaid: document.getElementById("summaryTotalPaid"),
    summaryTotalRemaining: document.getElementById("summaryTotalRemaining"),

    fromDate: document.getElementById("fromDate"),
    toDate: document.getElementById("toDate"),
    filterBtn: document.getElementById("filterBtn"),
    clearFilterBtn: document.getElementById("clearFilterBtn"),

    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportExcelBtn: document.getElementById("exportExcelBtn"),

    ledgerItemsTableBody: document.getElementById("ledgerItemsTableBody"),
  };

  function showToastSafe(type, message) {
    if (typeof window.showToast === "function") {
      window.showToast(type, message);
      return;
    }
    alert(message);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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



  function getQueryParams() {
    const params = new URLSearchParams();

    const from = (els.fromDate?.value || "").trim();
    const to = (els.toDate?.value || "").trim();

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    return params.toString();
  }

  function renderSummary(summary) {
    els.summaryBuyerName.textContent = summary?.buyer_name || "-";
    els.summaryProductName.textContent = summary?.product_name || "-";
    els.summaryEntryCount.textContent = String(summary?.entry_count || 0);
    els.summaryTotalBoxes.textContent = formatNumber(summary?.total_boxes || 0, 0);
    els.summaryTotalWeight.textContent = formatNumber(summary?.total_weight || 0, 2);
    els.summaryTotalAmount.textContent = formatMoney(summary?.total_amount || 0);
    els.summaryTotalPaid.textContent = formatMoney(summary?.total_paid || 0);
    els.summaryTotalRemaining.textContent = formatMoney(summary?.total_remaining || 0);
  }

  function renderItems(items) {
    const tbody = els.ledgerItemsTableBody;
    if (!tbody) return;

    if (!Array.isArray(items) || !items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="py-8 text-center text-sm text-slate-500">
            Bu deftere ait kayıt bulunamadı.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items
      .map(
        (item) => `
          <tr class="border-b border-slate-100 align-top hover:bg-slate-50/60">
            <td class="py-3 pr-4 font-medium text-slate-800">
              ${escapeHtml(item.entry_date || "-")}
            </td>
            <td class="py-3 pr-4 text-slate-700">
              ${escapeHtml(item.seller_name || "-")}
            </td>
            <td class="py-3 pr-4 text-slate-700">
              ${formatNumber(item.box_count || 0, 0)}
            </td>
            <td class="py-3 pr-4 text-slate-700">
              ${formatNumber(item.net_weight || 0, 2)}
            </td>
            <td class="py-3 pr-4 text-slate-700">
              ${formatNumber(item.avg_box_weight || 0, 2)}
            </td>
            <td class="py-3 pr-4 text-slate-700">
              ${formatMoney(item.unit_price || 0)}
            </td>
            <td class="py-3 pr-4 font-semibold text-slate-900">
              ${formatMoney(item.total_amount || 0)}
            </td>
            <td class="py-3 pr-4 font-semibold text-emerald-700">
              ${formatMoney(item.paid_amount || 0)}
            </td>
            <td class="py-3 pr-4 font-semibold text-rose-700">
              ${formatMoney(item.remaining_amount || 0)}
            </td>
            <td class="py-3 pr-4">
              <span class="${getPaymentStatusClass(item.payment_status)}">
                ${escapeHtml(getPaymentStatusLabel(item.payment_status))}
              </span>
            </td>
            <td class="py-3 pr-4">
              ${
                item.weight_warning
                  ? `<div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                       ${escapeHtml(item.weight_warning_message || "Kasa ağırlık uyarısı var")}
                     </div>`
                  : `<span class="text-xs text-slate-400">-</span>`
              }
            </td>
            <td class="py-3 pr-4 text-slate-600 whitespace-pre-line">
              ${escapeHtml(item.note || "-")}
            </td>
          </tr>
        `
      )
      .join("");
  }

  async function loadLedgerDetail() {
    if (!ledgerId) {
      showToastSafe("error", "Geçersiz defter id");
      return;
    }

    // First fetch the base entry to know which buyer/product we are talking about
    const baseEntry = await window.ApiService.ledgerEntries.getById(ledgerId);
    if (!baseEntry) {
      showToastSafe("error", "Kayıt bulunamadı");
      return;
    }

    const filters = {
       buyer_id: baseEntry.buyer_id,
       product_id: baseEntry.product_id
    };

    const from = (els.fromDate?.value || "").trim();
    const to = (els.toDate?.value || "").trim();
    if (from) filters.startDate = from;
    if (to) filters.endDate = to;

    const { items: rawItems } = await window.ApiService.custom.getLedgerEntriesWithRelations(filters);
    
    let summary = {
      buyer_name: rawItems[0]?.buyer?.name || "-",
      product_name: rawItems[0]?.product?.name || "-",
      entry_count: 0,
      total_boxes: 0,
      total_weight: 0,
      total_amount: 0,
      total_paid: 0,
      total_remaining: 0
    };

    let items = rawItems.map(item => {
      summary.entry_count++;
      summary.total_boxes += (item.box_count || 0);
      summary.total_weight += (item.net_weight || 0);
      summary.total_amount += (item.total_amount || 0);
      summary.total_paid += (item.paid_amount || 0);
      summary.total_remaining += (item.remaining_amount || 0);

      return {
          ...item,
          seller_name: item.seller ? `${item.seller.first_name} ${item.seller.last_name}` : '',
          entry_date: item.entry_date,
          avg_box_weight: item.box_count ? item.net_weight / item.box_count : 0
      };
    });
    currentItems = items;

    renderSummary(summary);
    renderItems(items);
  }

  function syncUrlWithFilters() {
    const url = new URL(window.location.href);

    url.searchParams.set("id", String(ledgerId));

    const from = (els.fromDate?.value || "").trim();
    const to = (els.toDate?.value || "").trim();

    if (from) {
      url.searchParams.set("from", from);
    } else {
      url.searchParams.delete("from");
    }

    if (to) {
      url.searchParams.set("to", to);
    } else {
      url.searchParams.delete("to");
    }

    window.history.replaceState({}, "", url.toString());
  }

  function hydrateFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (els.fromDate) els.fromDate.value = params.get("from") || "";
    if (els.toDate) els.toDate.value = params.get("to") || "";
  }

  function exportFile(type) {
    const columns = [
      { label: "Tarih", key: "entry_date", type: "date" },
      { label: "Satıcı", key: "seller_name" },
      { label: "Kasa", key: "box_count", type: "integer" },
      { label: "Kilo", key: "net_weight", type: "number" },
      { label: "Ortalama Kasa", key: "avg_box_weight", type: "number" },
      { label: "Birim Fiyat", key: "unit_price", type: "money" },
      { label: "Toplam", key: "total_amount", type: "money" },
      { label: "Tahsil Edilen", key: "paid_amount", type: "money" },
      { label: "Kalan", key: "remaining_amount", type: "money" },
      { label: "Durum", value: (row) => getPaymentStatusLabel(row.payment_status) },
      { label: "Uyarı", value: (row) => row.weight_warning ? (row.weight_warning_message || "Kasa ağırlık uyarısı var") : "" },
      { label: "Not", key: "note" },
    ];

    try {
      if (type === "csv") {
        window.ExcelExportUtils.exportRowsToCsv(currentItems, columns, `defter-detayi-${ledgerId}.csv`, "Defter Detayı");
        return;
      }

      window.ExcelExportUtils.exportRowsToExcel(currentItems, columns, `defter-detayi-${ledgerId}.xlsx`, "Defter Detayı");
    } catch (err) {
      showToastSafe("error", err.message || "Dışa aktarma başarısız");
    }
  }

  async function handleFilter() {
    try {
      syncUrlWithFilters();
      await loadLedgerDetail();
    } catch (err) {
      showToastSafe("error", err.message || "Defter detayı yüklenemedi");
    }
  }

  async function handleClearFilter() {
    if (els.fromDate) els.fromDate.value = "";
    if (els.toDate) els.toDate.value = "";

    try {
      syncUrlWithFilters();
      await loadLedgerDetail();
    } catch (err) {
      showToastSafe("error", err.message || "Defter detayı yüklenemedi");
    }
  }

  async function init() {
    if (!ledgerId) {
      showToastSafe("error", "Defter id bulunamadı");
      return;
    }

    hydrateFiltersFromUrl();

    els.filterBtn?.addEventListener("click", handleFilter);
    els.clearFilterBtn?.addEventListener("click", handleClearFilter);
    els.exportCsvBtn?.addEventListener("click", () => exportFile("csv"));
    els.exportExcelBtn?.addEventListener("click", () => exportFile("excel"));

    try {
      await loadLedgerDetail();
    } catch (err) {
      showToastSafe("error", err.message || "Defter detayı yüklenemedi");
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
