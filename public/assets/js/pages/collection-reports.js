(() => {
  const state = {
    sellers: [],
    currentItems: [],
  };

  const $ = (id) => document.getElementById(id);

  const refs = {
    fromDate: $("fromDate"),
    toDate: $("toDate"),
    paymentMethodFilter: $("paymentMethodFilter"),

    sellerSearch: $("sellerSearch"),
    sellerId: $("sellerId"),
    sellerDropdown: $("sellerDropdown"),

    buyerFilter: $("buyerFilter"),
    productFilter: $("productFilter"),
    filterBtn: $("filterBtn"),
    clearBtn: $("clearBtn"),
    exportBtn: $("exportBtn"),
    totalCount: $("totalCount"),
    totalAmount: $("totalAmount"),
    tbody: $("reportTableBody"),
  };

  function toast(message, type = "info") {
    if (window.showToast) {
      window.showToast(type, message);
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getSellerLabel(item) {
    return `${item.first_name || ""} ${item.last_name || ""}`.trim();
  }

  function findSellerById(id) {
    const sellerId = Number(id || 0);
    return state.sellers.find((x) => Number(x.id) === sellerId) || null;
  }

  function paymentMethodLabel(value) {
    switch (value) {
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



  function fillSelect(selectEl, items, labelFn, placeholder = "Tümü") {
    if (!selectEl) return;

    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    (items || []).forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = labelFn(item);
      selectEl.appendChild(opt);
    });
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
        const sellerId = Number(btn.getAttribute("data-seller-id") || 0);
        const seller = findSellerById(sellerId);
        if (!seller) return;

        refs.sellerId.value = String(seller.id);
        refs.sellerSearch.value = getSellerLabel(seller);
        hideSellerDropdown();
      });
    });
  }

  function setupSellerAutocomplete() {
    if (!refs.sellerSearch || !refs.sellerId || !refs.sellerDropdown) return;

    refs.sellerSearch.addEventListener("input", () => {
      const query = refs.sellerSearch.value.trim().toLocaleLowerCase("tr-TR");

      refs.sellerId.value = "";

      if (!query) {
        hideSellerDropdown();
        return;
      }

      const filtered = state.sellers.filter((seller) =>
        getSellerLabel(seller).toLocaleLowerCase("tr-TR").includes(query)
      );

      renderSellerDropdown(filtered);
    });

    refs.sellerSearch.addEventListener("focus", () => {
      const query = refs.sellerSearch.value.trim().toLocaleLowerCase("tr-TR");

      const filtered = query
        ? state.sellers.filter((seller) =>
            getSellerLabel(seller).toLocaleLowerCase("tr-TR").includes(query)
          )
        : state.sellers.slice(0, 20);

      renderSellerDropdown(filtered);
    });

    refs.sellerSearch.addEventListener("blur", () => {
      setTimeout(() => {
        const rawValue = refs.sellerSearch.value.trim();
        const selectedSeller = findSellerById(refs.sellerId.value);

        if (selectedSeller) {
          refs.sellerSearch.value = getSellerLabel(selectedSeller);
          hideSellerDropdown();
          return;
        }

        if (!rawValue) {
          refs.sellerId.value = "";
          hideSellerDropdown();
          return;
        }

        const exactMatch = state.sellers.find(
          (seller) =>
            getSellerLabel(seller).toLocaleLowerCase("tr-TR") ===
            rawValue.toLocaleLowerCase("tr-TR")
        );

        if (exactMatch) {
          refs.sellerId.value = String(exactMatch.id);
          refs.sellerSearch.value = getSellerLabel(exactMatch);
        } else {
          refs.sellerId.value = "";
        }

        hideSellerDropdown();
      }, 150);
    });

    document.addEventListener("click", (e) => {
      const target = e.target;
      const clickedInside =
        refs.sellerSearch?.contains(target) || refs.sellerDropdown?.contains(target);

      if (!clickedInside) {
        hideSellerDropdown();
      }
    });
  }

  async function loadLookups() {
    const [sellersRes, buyersRes, productsRes] = await Promise.all([
      window.ApiService.sellers.getAll(),
      window.ApiService.buyers.getAll(),
      window.ApiService.products.getAll(),
    ]);

    state.sellers = sellersRes.items || [];

    fillSelect(refs.buyerFilter, buyersRes.items || [], (x) => x.name);
    fillSelect(refs.productFilter, productsRes.items || [], (x) => x.name);
  }

  function buildFilters() {
    const filters = {};

    if (refs.fromDate.value) filters.startDate = refs.fromDate.value;
    if (refs.toDate.value) filters.endDate = refs.toDate.value;
    if (refs.paymentMethodFilter.value) filters.payment_method = refs.paymentMethodFilter.value;
    if (refs.sellerId.value) filters.seller_id = refs.sellerId.value;
    if (refs.buyerFilter.value) filters.buyer_id = refs.buyerFilter.value;
    if (refs.productFilter.value) filters.product_id = refs.productFilter.value;

    return filters;
  }

  async function loadReports() {
    try {
      const filters = buildFilters();
      const { items: rawItems } = await window.ApiService.custom.getPaymentsWithRelations(filters);
      
      let items = rawItems.filter(item => item.status !== 'cancelled').map(item => {
          const entry = item.ledger_entry || {};
          return {
              ...item,
              seller_name: entry.seller ? `${entry.seller.first_name} ${entry.seller.last_name}` : '',
              buyer_name: entry.buyer ? entry.buyer.name : '',
              product_name: entry.product ? entry.product.name : '',
              seller_id: entry.seller_id,
              buyer_id: entry.buyer_id,
              product_id: entry.product_id
          };
      });
      
      if (filters.seller_id) items = items.filter(i => String(i.seller_id) === String(filters.seller_id));
      if (filters.buyer_id) items = items.filter(i => String(i.buyer_id) === String(filters.buyer_id));
      if (filters.product_id) items = items.filter(i => String(i.product_id) === String(filters.product_id));
      state.currentItems = items;

      refs.totalCount.textContent = items.length || 0;
      refs.totalAmount.textContent = formatMoney(items.reduce((sum, item) => sum + (item.amount || 0), 0));

      if (!items.length) {
        refs.tbody.innerHTML = `
          <tr>
            <td colspan="8" class="py-8 text-center text-sm text-slate-500">
              Tahsilat kaydı bulunamadı.
            </td>
          </tr>
        `;
        return;
      }

      refs.tbody.innerHTML = items.map((item) => `
        <tr class="border-b border-slate-100">
          <td class="py-3 pr-4">${escapeHtml(item.payment_date || "")}</td>
          <td class="py-3 pr-4">${escapeHtml(item.seller_name || "")}</td>
          <td class="py-3 pr-4">${escapeHtml(item.buyer_name || "")}</td>
          <td class="py-3 pr-4">${escapeHtml(item.product_name || "")}</td>
          <td class="py-3 pr-4 font-semibold text-emerald-600">${formatMoney(item.amount || 0)}</td>
          <td class="py-3 pr-4">${paymentMethodLabel(item.payment_method)}</td>
          <td class="py-3 pr-4">${escapeHtml(item.note || "")}</td>
          <td class="py-3 pr-4">${escapeHtml(item.created_by || "-")}</td>
        </tr>
      `).join("");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  refs.filterBtn?.addEventListener("click", loadReports);

  refs.clearBtn?.addEventListener("click", async () => {
    refs.fromDate.value = "";
    refs.toDate.value = "";
    refs.paymentMethodFilter.value = "";
    refs.sellerSearch.value = "";
    refs.sellerId.value = "";
    hideSellerDropdown();
    refs.buyerFilter.value = "";
    refs.productFilter.value = "";
    await loadReports();
  });

  refs.exportBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportRowsToExcel(
        state.currentItems,
        [
          { label: "Ödeme Tarihi", key: "payment_date", type: "date" },
          { label: "Satıcı", key: "seller_name" },
          { label: "Alıcı", key: "buyer_name" },
          { label: "Ürün", key: "product_name" },
          { label: "Tutar", key: "amount", type: "money" },
          { label: "Yöntem", value: (row) => paymentMethodLabel(row.payment_method) },
          { label: "Açıklama", key: "note" },
          { label: "İşlem Yapan", key: "created_by" },
        ],
        "tahsilat-raporu.xlsx",
        "Tahsilat Raporu"
      );
    } catch (err) {
      toast(err.message, "error");
    }
  });

  async function init() {
    await loadLookups();
    setupSellerAutocomplete();
    await loadReports();
  }

  init();
})();
