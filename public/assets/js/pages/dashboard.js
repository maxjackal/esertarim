(() => {
  const $ = (id) => document.getElementById(id);

  const refs = {
    dashboardDate: $("dashboardDate"),
    filterBtn: $("filterBtn"),

    entryCount: $("entryCount"),
    totalAmount: $("totalAmount"),
    todayCollection: $("todayCollection"),
    openReceivables: $("openReceivables"),
    totalBoxes: $("totalBoxes"),
    totalWeight: $("totalWeight"),
    totalRemaining: $("totalRemaining"),

    topProductsBody: $("topProductsBody"),
    topSellersBody: $("topSellersBody"),
    topDebtorsBody: $("topDebtorsBody"),
    recentEntriesBody: $("recentEntriesBody"),
  };

 function toast(message, type = "info") {
  if (window.Toast?.show) {
    window.Toast.show(message, type);
    return;
  }
  alert(message);
}

  function formatMoney(value) {
    return `${new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0))} ₺`;
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

  function buildQuery() {
    const params = new URLSearchParams();
    if (refs.dashboardDate?.value) {
      params.set("date", refs.dashboardDate.value);
    }
    return params.toString() ? `?${params.toString()}` : "";
  }



  function renderSummary(summary = {}) {
    refs.entryCount.textContent = summary.entry_count || 0;
    refs.totalAmount.textContent = formatMoney(summary.total_amount || 0);
    refs.todayCollection.textContent = formatMoney(summary.today_collection || 0);
    refs.openReceivables.textContent = formatMoney(summary.open_receivables || 0);
    refs.totalBoxes.textContent = formatNumber(summary.total_boxes || 0, 0);
    refs.totalWeight.textContent = `${formatNumber(summary.total_weight || 0)} kg`;
    refs.totalRemaining.textContent = formatMoney(summary.total_remaining || 0);
  }

  function renderTopProducts(items = []) {
    if (!items.length) {
      refs.topProductsBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-sm text-slate-500">
            Veri bulunamadı.
          </td>
        </tr>
      `;
      return;
    }

    refs.topProductsBody.innerHTML = items
      .map(
        (item) => `
          <tr class="border-b border-slate-100">
            <td class="py-3 pr-4 font-medium text-slate-800">
              ${escapeHtml(item.product_name || "")}
            </td>
            <td class="py-3 pr-4">${item.entry_count || 0}</td>
            <td class="py-3 pr-4">${formatNumber(item.total_boxes || 0, 0)}</td>
            <td class="py-3 pr-4">${formatNumber(item.total_weight || 0)}</td>
            <td class="py-3 pr-4 font-semibold text-slate-800">
              ${formatMoney(item.total_amount || 0)}
            </td>
          </tr>
        `
      )
      .join("");
  }

  function renderTopSellers(items = []) {
    if (!items.length) {
      refs.topSellersBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-sm text-slate-500">
            Veri bulunamadı.
          </td>
        </tr>
      `;
      return;
    }

    refs.topSellersBody.innerHTML = items
      .map(
        (item) => `
          <tr class="border-b border-slate-100">
            <td class="py-3 pr-4 font-medium text-slate-800">
              ${escapeHtml(item.seller_name || "")}
            </td>
            <td class="py-3 pr-4">${item.entry_count || 0}</td>
            <td class="py-3 pr-4">${formatNumber(item.total_weight || 0)}</td>
            <td class="py-3 pr-4 font-semibold text-slate-800">
              ${formatMoney(item.total_amount || 0)}
            </td>
            <td class="py-3 pr-4 font-semibold text-amber-600">
              ${formatMoney(item.total_remaining || 0)}
            </td>
          </tr>
        `
      )
      .join("");
  }

  function renderTopDebtors(items = []) {
    if (!items.length) {
      refs.topDebtorsBody.innerHTML = `
        <tr>
          <td colspan="2" class="py-8 text-center text-sm text-slate-500">
            Açık bakiye bulunan alıcı yok.
          </td>
        </tr>
      `;
      return;
    }

    refs.topDebtorsBody.innerHTML = items
      .map(
        (item) => `
          <tr class="border-b border-slate-100">
            <td class="py-3 pr-4 font-medium text-slate-800">
              ${escapeHtml(item.buyer_name || "")}
            </td>
            <td class="py-3 pr-4 font-semibold text-rose-600">
              ${formatMoney(item.remaining_amount || 0)}
            </td>
          </tr>
        `
      )
      .join("");
  }

  function renderRecentEntries(items = []) {
    if (!items.length) {
      refs.recentEntriesBody.innerHTML = `
        <tr>
          <td colspan="9" class="py-8 text-center text-sm text-slate-500">
            Kayıt bulunamadı.
          </td>
        </tr>
      `;
      return;
    }

    refs.recentEntriesBody.innerHTML = items
      .map(
        (item) => `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-3 pr-4">${escapeHtml(item.entry_date || "")}</td>
            <td class="py-3 pr-4">${escapeHtml(item.seller_name || "")}</td>
            <td class="py-3 pr-4">${escapeHtml(item.buyer_name || "")}</td>
            <td class="py-3 pr-4">${escapeHtml(item.product_name || "")}</td>
            <td class="py-3 pr-4">${formatNumber(item.box_count || 0, 0)}</td>
            <td class="py-3 pr-4">${formatNumber(item.net_weight || 0)}</td>
            <td class="py-3 pr-4 font-semibold text-slate-800">${formatMoney(item.total_amount || 0)}</td>
            <td class="py-3 pr-4 font-semibold text-amber-600">${formatMoney(item.remaining_amount || 0)}</td>
            <td class="py-3 pr-4">
              <a
                href="/pages/ledger-detail?id=${item.id}"
                class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Detay
              </a>
            </td>
          </tr>
        `
      )
      .join("");
  }

  async function loadDashboard() {
    try {
      refs.filterBtn?.setAttribute("disabled", "disabled");
      refs.filterBtn?.classList.add("opacity-60", "pointer-events-none");

      const filters = {};
      if (refs.dashboardDate?.value) {
        filters.date = refs.dashboardDate.value;
      }
      
      const { items: entries } = await window.ApiService.custom.getLedgerEntriesWithRelations(filters);
      
      const summary = {
          entry_count: entries.length,
          total_amount: entries.reduce((sum, e) => sum + (e.total_amount || 0), 0),
          total_boxes: entries.reduce((sum, e) => sum + (e.box_count || 0), 0),
          total_weight: entries.reduce((sum, e) => sum + (e.net_weight || 0), 0),
          total_remaining: entries.reduce((sum, e) => sum + (e.remaining_amount || 0), 0)
      };
      
      const { items: payments } = await window.ApiService.ledgerPayments.getAll();
      const todayStr = new Date().toISOString().split('T')[0];
      summary.today_collection = payments
          .filter(p => (p.payment_date || '').startsWith(todayStr))
          .reduce((sum, p) => sum + (p.amount || 0), 0);
          
      summary.open_receivables = summary.total_remaining; // simple assumption
      
      const recent_entries = entries.slice(0, 10).map(e => ({
          ...e,
          seller_name: e.seller ? `${e.seller.first_name} ${e.seller.last_name}` : '',
          buyer_name: e.buyer ? e.buyer.name : '',
          product_name: e.product ? e.product.name : '',
      }));
      
      // Top debtors dummy (can be computed by aggregating remaining_amount by buyer)
      const debtorsMap = {};
      entries.forEach(e => {
         if(e.remaining_amount > 0 && e.buyer) {
             debtorsMap[e.buyer.name] = (debtorsMap[e.buyer.name] || 0) + e.remaining_amount;
         }
      });
      const top_debtors = Object.entries(debtorsMap)
         .map(([buyer_name, remaining_amount]) => ({ buyer_name, remaining_amount }))
         .sort((a,b) => b.remaining_amount - a.remaining_amount).slice(0, 5);

      const top_products = [];
      const top_sellers = [];

      renderSummary(summary);
      renderTopProducts(top_products);
      renderTopSellers(top_sellers);
      renderTopDebtors(top_debtors);
      renderRecentEntries(recent_entries);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      refs.filterBtn?.removeAttribute("disabled");
      refs.filterBtn?.classList.remove("opacity-60", "pointer-events-none");
    }
  }

  function setDefaultDate() {
    if (!refs.dashboardDate) return;
    if (refs.dashboardDate.value) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    refs.dashboardDate.value = `${yyyy}-${mm}-${dd}`;
  }

  refs.filterBtn?.addEventListener("click", loadDashboard);

  window.addEventListener("DOMContentLoaded", () => {
    setDefaultDate();
    loadDashboard();
  });
})();
