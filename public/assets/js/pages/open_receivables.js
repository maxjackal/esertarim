(() => {
  const state = {
    sellers: [],
    currentItems: [],
  };

  const $ = (id) => document.getElementById(id);

  const refs = {
    fromDate: $("fromDate"),
    toDate: $("toDate"),

    sellerSearch: $("sellerSearch"),
    sellerId: $("sellerId"),
    sellerDropdown: $("sellerDropdown"),

    buyerFilter: $("buyerFilter"),
    productFilter: $("productFilter"),
    filterBtn: $("filterBtn"),
    clearBtn: $("clearBtn"),
    exportBtn: $("exportBtn"),
    totalCount: $("totalCount"),
    totalRemaining: $("totalRemaining"),
    tbody: $("receivableTableBody"),
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

  function paymentBadge(status) {
    if (status === "odendi") {
      return `<span class="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Ödendi</span>`;
    }
    if (status === "kismi_odendi") {
      return `<span class="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Kısmi Ödendi</span>`;
    }
    return `<span class="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Ödenmedi</span>`;
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
    if (refs.sellerId.value) filters.seller_id = refs.sellerId.value;
    if (refs.buyerFilter.value) filters.buyer_id = refs.buyerFilter.value;
    if (refs.productFilter.value) filters.product_id = refs.productFilter.value;

    return filters;
  }

  function goToDetail(id) {
    window.location.href = `/pages/ledger-detail?id=${id}`;
  }

  async function loadReceivables() {
    try {
      const filters = buildFilters();
      const { items: rawItems } = await window.ApiService.custom.getLedgerEntriesWithRelations(filters);
      
      const items = rawItems.filter(item => (item.remaining_amount || 0) > 0).map(item => ({
          ...item,
          seller_name: item.seller ? `${item.seller.first_name} ${item.seller.last_name}` : '',
          buyer_name: item.buyer ? item.buyer.name : '',
          product_name: item.product ? item.product.name : '',
          entry_date: item.entry_date
      }));
      state.currentItems = items;

      refs.totalCount.textContent = items.length || 0;
      refs.totalRemaining.textContent = formatMoney(items.reduce((sum, item) => sum + (item.remaining_amount || 0), 0));

      if (!items.length) {
        refs.tbody.innerHTML = `
          <tr>
            <td colspan="9" class="py-8 text-center text-sm text-slate-500">
              Açık alacak kaydı bulunamadı.
            </td>
          </tr>
        `;
        return;
      }

      refs.tbody.innerHTML = items.map((item) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="py-3 pr-4">${escapeHtml(item.entry_date || "")}</td>
          <td class="py-3 pr-4">${escapeHtml(item.seller_name || "")}</td>
          <td class="py-3 pr-4">${escapeHtml(item.buyer_name || "")}</td>
          <td class="py-3 pr-4">${escapeHtml(item.product_name || "")}</td>
          <td class="py-3 pr-4 font-semibold text-slate-800">${formatMoney(item.total_amount)}</td>
          <td class="py-3 pr-4 font-semibold text-emerald-600">${formatMoney(item.paid_amount)}</td>
          <td class="py-3 pr-4 font-semibold text-rose-600">${formatMoney(item.remaining_amount)}</td>
          <td class="py-3 pr-4">${paymentBadge(item.payment_status)}</td>
          <td class="py-3 pr-4">
            <button
              type="button"
              class="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              data-id="${item.id}"
            >
              Detay
            </button>
          </td>
        </tr>
      `).join("");

      refs.tbody.querySelectorAll("button[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => goToDetail(btn.dataset.id));
      });
    } catch (err) {
      toast(err.message, "error");
    }
  }

  refs.filterBtn?.addEventListener("click", loadReceivables);

  refs.clearBtn?.addEventListener("click", async () => {
    refs.fromDate.value = "";
    refs.toDate.value = "";
    refs.sellerSearch.value = "";
    refs.sellerId.value = "";
    hideSellerDropdown();
    refs.buyerFilter.value = "";
    refs.productFilter.value = "";
    await loadReceivables();
  });

  refs.exportBtn?.addEventListener("click", () => {
    try {
      window.ExcelExportUtils.exportRowsToExcel(
        state.currentItems,
        [
          { label: "Tarih", key: "entry_date", type: "date" },
          { label: "Satıcı", key: "seller_name" },
          { label: "Alıcı", key: "buyer_name" },
          { label: "Ürün", key: "product_name" },
          { label: "Toplam", key: "total_amount", type: "money" },
          { label: "Tahsil Edilen", key: "paid_amount", type: "money" },
          { label: "Kalan", key: "remaining_amount", type: "money" },
          { label: "Durum", value: (row) => row.payment_status === "odendi" ? "Ödendi" : row.payment_status === "kismi_odendi" ? "Kısmi Ödendi" : "Ödenmedi" },
        ],
        "acik-alacaklar.xlsx",
        "Açık Alacaklar"
      );
    } catch (err) {
      toast(err.message, "error");
    }
  });

  async function init() {
    await loadLookups();
    setupSellerAutocomplete();

    if (sessionStorage.getItem("receivable_updated")) {
      sessionStorage.removeItem("receivable_updated");
      await loadReceivables();
    } else {
      await loadReceivables();
    }
  }

  init();
})();
