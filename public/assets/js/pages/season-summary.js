(() => {
  const state = {
    sellers: [],
    currentRows: [],
    productSummary: [],
    sellerSummary: [],
    buyerSummary: [],
  };

  const $ = (id) => document.getElementById(id);

  const refs = {
    sellerSearch: $("sellerSearch"),
    sellerId: $("sellerId"),
    sellerDropdown: $("sellerDropdown"),
    buyerFilter: $("buyerFilter"),
    productFilter: $("productFilter"),
    fromDate: $("fromDate"),
    toDate: $("toDate"),
    filterBtn: $("filterBtn"),
    clearBtn: $("clearBtn"),
    printBtn: $("printBtn"),
    csvBtn: $("csvBtn"),
    excelBtn: $("excelBtn"),
    totalTonText: $("totalTonText"),
    totalAmountText: $("totalAmountText"),
    totalPaidText: $("totalPaidText"),
    totalRemainingText: $("totalRemainingText"),
    collectionRateText: $("collectionRateText"),
    totalBoxesText: $("totalBoxesText"),
    avgUnitPriceText: $("avgUnitPriceText"),
    entryCountText: $("entryCountText"),
    topSellerText: $("topSellerText"),
    topSellerSubText: $("topSellerSubText"),
    topProductText: $("topProductText"),
    topProductSubText: $("topProductSubText"),
    topDebtText: $("topDebtText"),
    topDebtSubText: $("topDebtSubText"),
    productSummaryBody: $("productSummaryBody"),
    sellerSummaryBody: $("sellerSummaryBody"),
    buyerSummaryBody: $("buyerSummaryBody"),
  };

  function toast(message, type = "info") {
    if (window.Toast?.show) {
      window.Toast.show(message, type);
      return;
    }
    alert(message);
  }

  function toNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function formatNumber(value, digits = 2) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(toNumber(value));
  }

  function formatMoney(value) {
    return `${formatNumber(value)} ₺`;
  }

  function formatTon(kgValue) {
    return `${formatNumber(toNumber(kgValue) / 1000)} ton`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSellerLabel(item) {
    return `${item.first_name || ""} ${item.last_name || ""}`.trim();
  }

  function findSellerById(id) {
    const sellerId = Number(id || 0);
    return state.sellers.find((item) => Number(item.id) === sellerId) || null;
  }

  function fillSelect(selectEl, items, labelFn, placeholder) {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    (items || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = labelFn(item);
      selectEl.appendChild(option);
    });
  }

  function buildFilters() {
    const filters = {};
    if (refs.sellerId?.value) filters.seller_id = refs.sellerId.value;
    if (refs.buyerFilter?.value) filters.buyer_id = refs.buyerFilter.value;
    if (refs.productFilter?.value) filters.product_id = refs.productFilter.value;
    if (refs.fromDate?.value) filters.startDate = refs.fromDate.value;
    if (refs.toDate?.value) filters.endDate = refs.toDate.value;
    return filters;
  }

  function emptyGroup(name) {
    return {
      name,
      entry_count: 0,
      box_count: 0,
      net_weight: 0,
      total_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
    };
  }

  function groupBy(rows, keyFn, nameFn) {
    const map = new Map();

    rows.forEach((row) => {
      const key = keyFn(row) || "-";
      if (!map.has(key)) {
        map.set(key, emptyGroup(nameFn(row) || "-"));
      }

      const group = map.get(key);
      group.entry_count += 1;
      group.box_count += toNumber(row.box_count);
      group.net_weight += toNumber(row.net_weight);
      group.total_amount += toNumber(row.total_amount);
      group.paid_amount += toNumber(row.paid_amount);
      group.remaining_amount += toNumber(row.remaining_amount);
    });

    return Array.from(map.values());
  }

  function normalizeEntry(item) {
    return {
      ...item,
      seller_name: item.seller ? getSellerLabel(item.seller) : "-",
      buyer_name: item.buyer?.name || "-",
      product_name: item.product?.name || "-",
      box_count: toNumber(item.box_count),
      net_weight: toNumber(item.net_weight),
      total_amount: toNumber(item.total_amount),
      paid_amount: toNumber(item.paid_amount),
      remaining_amount: toNumber(item.remaining_amount),
      unit_price: toNumber(item.unit_price),
    };
  }

  function summarize(rows) {
    const summary = rows.reduce(
      (acc, row) => {
        acc.entry_count += 1;
        acc.open_entry_count += toNumber(row.remaining_amount) > 0 ? 1 : 0;
        acc.box_count += toNumber(row.box_count);
        acc.net_weight += toNumber(row.net_weight);
        acc.total_amount += toNumber(row.total_amount);
        acc.paid_amount += toNumber(row.paid_amount);
        acc.remaining_amount += toNumber(row.remaining_amount);
        return acc;
      },
      {
        entry_count: 0,
        open_entry_count: 0,
        box_count: 0,
        net_weight: 0,
        total_amount: 0,
        paid_amount: 0,
        remaining_amount: 0,
      }
    );

    summary.collection_rate = summary.total_amount > 0 ? (summary.paid_amount / summary.total_amount) * 100 : 0;
    summary.avg_unit_price = summary.net_weight > 0 ? summary.total_amount / summary.net_weight : 0;

    return summary;
  }

  function renderTotals(summary) {
    refs.totalTonText.textContent = formatTon(summary.net_weight);
    refs.totalAmountText.textContent = formatMoney(summary.total_amount);
    refs.totalPaidText.textContent = formatMoney(summary.paid_amount);
    refs.totalRemainingText.textContent = formatMoney(summary.remaining_amount);
    refs.collectionRateText.textContent = `${formatNumber(summary.collection_rate)}%`;
    refs.totalBoxesText.textContent = formatNumber(summary.box_count, 0);
    refs.avgUnitPriceText.textContent = `${formatMoney(summary.avg_unit_price)}/kg`;
    refs.entryCountText.textContent = `${summary.entry_count} / ${summary.open_entry_count}`;
  }

  function renderHighlights() {
    const topSeller = state.sellerSummary[0] || null;
    const topProduct = state.productSummary[0] || null;
    const topDebt = [...state.buyerSummary].sort((a, b) => b.remaining_amount - a.remaining_amount)[0] || null;

    refs.topSellerText.textContent = topSeller?.name || "-";
    refs.topSellerSubText.textContent = topSeller ? formatTon(topSeller.net_weight) : "0.00 ton";
    refs.topProductText.textContent = topProduct?.name || "-";
    refs.topProductSubText.textContent = topProduct ? formatTon(topProduct.net_weight) : "0.00 ton";
    refs.topDebtText.textContent = topDebt?.name || "-";
    refs.topDebtSubText.textContent = topDebt ? formatMoney(topDebt.remaining_amount) : "0.00 ₺";
  }

  function emptyRow(colspan) {
    return `
      <tr>
        <td colspan="${colspan}" class="py-8 text-center text-slate-500">
          Kayıt bulunamadı.
        </td>
      </tr>
    `;
  }

  function renderProductRows(rows) {
    if (!rows.length) {
      refs.productSummaryBody.innerHTML = emptyRow(4);
      return;
    }

    refs.productSummaryBody.innerHTML = rows
      .map(
        (item) => `
          <tr class="border-b border-slate-100">
            <td class="py-3 pr-4 font-medium">${escapeHtml(item.name)}</td>
            <td class="py-3 pr-4">${formatTon(item.net_weight)}</td>
            <td class="py-3 pr-4 font-semibold text-slate-800">${formatMoney(item.total_amount)}</td>
            <td class="py-3 pr-4 font-semibold text-rose-600">${formatMoney(item.remaining_amount)}</td>
          </tr>
        `
      )
      .join("");
  }

  function renderSellerRows(rows) {
    if (!rows.length) {
      refs.sellerSummaryBody.innerHTML = emptyRow(4);
      return;
    }

    refs.sellerSummaryBody.innerHTML = rows
      .map(
        (item) => `
          <tr class="border-b border-slate-100">
            <td class="py-3 pr-4 font-medium">${escapeHtml(item.name)}</td>
            <td class="py-3 pr-4">${formatTon(item.net_weight)}</td>
            <td class="py-3 pr-4 font-semibold text-emerald-600">${formatMoney(item.paid_amount)}</td>
            <td class="py-3 pr-4 font-semibold text-rose-600">${formatMoney(item.remaining_amount)}</td>
          </tr>
        `
      )
      .join("");
  }

  function renderBuyerRows(rows) {
    if (!rows.length) {
      refs.buyerSummaryBody.innerHTML = emptyRow(4);
      return;
    }

    refs.buyerSummaryBody.innerHTML = rows
      .map(
        (item) => `
          <tr class="border-b border-slate-100">
            <td class="py-3 pr-4 font-medium">${escapeHtml(item.name)}</td>
            <td class="py-3 pr-4">${formatMoney(item.total_amount)}</td>
            <td class="py-3 pr-4 font-semibold text-emerald-600">${formatMoney(item.paid_amount)}</td>
            <td class="py-3 pr-4 font-semibold text-rose-600">${formatMoney(item.remaining_amount)}</td>
          </tr>
        `
      )
      .join("");
  }

  function renderReport(rows) {
    const summary = summarize(rows);
    state.productSummary = groupBy(rows, (row) => row.product_id, (row) => row.product_name)
      .sort((a, b) => b.net_weight - a.net_weight);
    state.sellerSummary = groupBy(rows, (row) => row.seller_id, (row) => row.seller_name)
      .sort((a, b) => b.net_weight - a.net_weight);
    state.buyerSummary = groupBy(rows, (row) => row.buyer_id, (row) => row.buyer_name)
      .sort((a, b) => b.remaining_amount - a.remaining_amount);

    renderTotals(summary);
    renderHighlights();
    renderProductRows(state.productSummary);
    renderSellerRows(state.sellerSummary);
    renderBuyerRows(state.buyerSummary);
  }

  function hideSellerDropdown() {
    refs.sellerDropdown?.classList.add("hidden");
  }

  function renderSellerDropdown(items) {
    if (!refs.sellerDropdown) return;

    if (!items.length) {
      refs.sellerDropdown.innerHTML = `
        <div class="rounded-xl px-3 py-2 text-sm text-slate-500">
          Sonuç bulunamadı
        </div>
      `;
      refs.sellerDropdown.classList.remove("hidden");
      return;
    }

    refs.sellerDropdown.innerHTML = items
      .map(
        (item) => `
          <button
            type="button"
            class="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            data-seller-id="${item.id}"
          >
            ${escapeHtml(getSellerLabel(item))}
          </button>
        `
      )
      .join("");

    refs.sellerDropdown.classList.remove("hidden");

    refs.sellerDropdown.querySelectorAll("[data-seller-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const seller = findSellerById(btn.getAttribute("data-seller-id"));
        if (!seller) return;
        refs.sellerId.value = String(seller.id);
        refs.sellerSearch.value = getSellerLabel(seller);
        hideSellerDropdown();
      });
    });
  }

  function filterSellers(keyword) {
    const query = normalizeText(keyword);
    const items = state.sellers
      .filter((seller) => {
        const label = normalizeText(getSellerLabel(seller));
        return !query || label.startsWith(query) || label.includes(query);
      })
      .slice(0, 20);

    renderSellerDropdown(items);
  }

  function setupSellerAutocomplete() {
    if (!refs.sellerSearch || !refs.sellerId || !refs.sellerDropdown) return;

    refs.sellerSearch.addEventListener("input", () => {
      refs.sellerId.value = "";
      filterSellers(refs.sellerSearch.value);
    });

    refs.sellerSearch.addEventListener("focus", () => {
      filterSellers(refs.sellerSearch.value);
    });

    refs.sellerSearch.addEventListener("blur", () => {
      setTimeout(() => {
        const seller = findSellerById(refs.sellerId.value);
        if (seller) refs.sellerSearch.value = getSellerLabel(seller);
        if (!seller && !refs.sellerSearch.value.trim()) refs.sellerId.value = "";
        hideSellerDropdown();
      }, 150);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      const clickedInside = refs.sellerSearch?.contains(target) || refs.sellerDropdown?.contains(target);
      if (!clickedInside) hideSellerDropdown();
    });
  }

  async function loadFilterData() {
    const [sellersRes, buyersRes, productsRes] = await Promise.all([
      window.ApiService.sellers.getAll(),
      window.ApiService.buyers.getAll(),
      window.ApiService.products.getAll(),
    ]);

    state.sellers = sellersRes.items || [];
    fillSelect(refs.buyerFilter, buyersRes.items || [], (item) => item.name || "", "Tüm Alıcılar");
    fillSelect(refs.productFilter, productsRes.items || [], (item) => item.name || "", "Tüm Ürünler");
  }

  async function loadReport() {
    try {
      const { items } = await window.ApiService.custom.getLedgerEntriesWithRelations(buildFilters());
      state.currentRows = (items || []).map(normalizeEntry);
      renderReport(state.currentRows);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function clearFilters() {
    refs.sellerSearch.value = "";
    refs.sellerId.value = "";
    refs.buyerFilter.value = "";
    refs.productFilter.value = "";
    refs.fromDate.value = "";
    refs.toDate.value = "";
    loadReport();
  }

  function exportRows() {
    return [
      { section: "Ürün Özeti", rows: state.productSummary },
      { section: "Satıcı Özeti", rows: state.sellerSummary },
      { section: "Alıcı Borç Özeti", rows: state.buyerSummary },
    ].flatMap((section) => [
      { name: section.section },
      ...section.rows,
      {},
    ]);
  }

  function exportColumns() {
    return [
      { label: "Başlık", key: "name" },
      { label: "Kayıt", key: "entry_count", type: "integer" },
      { label: "Kasa", key: "box_count", type: "integer" },
      { label: "Ton", value: (row) => (row.net_weight ? row.net_weight / 1000 : ""), type: "number" },
      { label: "Toplam", key: "total_amount", type: "money" },
      { label: "Ödenen", key: "paid_amount", type: "money" },
      { label: "Kalan", key: "remaining_amount", type: "money" },
    ];
  }

  refs.filterBtn?.addEventListener("click", loadReport);
  refs.clearBtn?.addEventListener("click", clearFilters);
  refs.printBtn?.addEventListener("click", () => window.print());
  refs.csvBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportRowsToCsv(exportRows(), exportColumns(), "sezon-ozeti.csv", "Sezon Özeti");
    } catch (err) {
      toast(err.message, "error");
    }
  });
  refs.excelBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportRowsToExcel(exportRows(), exportColumns(), "sezon-ozeti.xlsx", "Sezon Özeti");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  async function init() {
    try {
      await loadFilterData();
      setupSellerAutocomplete();
      await loadReport();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  init();
})();
