(() => {
  const state = {
    sellers: [],
  };

  const refs = {
    sellerSearch: document.getElementById("sellerSearch"),
    sellerId: document.getElementById("sellerId"),
    sellerDropdown: document.getElementById("sellerDropdown"),

    fromDate: document.getElementById("fromDate"),
    toDate: document.getElementById("toDate"),
    filterBtn: document.getElementById("filterBtn"),
    printBtn: document.getElementById("printBtn"),
    csvBtn: document.getElementById("csvBtn"),
    excelBtn: document.getElementById("excelBtn"),

    entryCountText: document.getElementById("entryCountText"),
    totalBoxesText: document.getElementById("totalBoxesText"),
    totalWeightText: document.getElementById("totalWeightText"),
    totalAmountText: document.getElementById("totalAmountText"),
    totalRemainingText: document.getElementById("totalRemainingText"),

    tbody: document.getElementById("reportTableBody"),
  };

  function toast(message) {
    if (window.Toast?.show) {
      window.Toast.show(message, "error");
      return;
    }
    alert(message);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  function getSellerLabel(item) {
    return `${item.first_name || ""} ${item.last_name || ""}`.trim();
  }

  function findSellerById(id) {
    const sellerID = Number(id || 0);
    return state.sellers.find((x) => Number(x.id) === sellerID) || null;
  }



  function paymentText(status) {
    if (status === "odendi") return "Ödendi";
    if (status === "kismi_odendi") return "Kısmi";
    return "Ödenecek";
  }

  function buildFilters() {
    const filters = {};

    if (refs.fromDate?.value) filters.startDate = refs.fromDate.value;
    if (refs.toDate?.value) filters.endDate = refs.toDate.value;

    return filters;
  }

  function rowTemplate(item) {
    return `
      <tr class="border-b border-slate-100">
        <td class="py-3 pr-4">${item.entry_date || ""}</td>
        <td class="py-3 pr-4 font-medium">${item.buyer_name || ""}</td>
        <td class="py-3 pr-4">${item.product_name || ""}</td>
        <td class="py-3 pr-4">${item.box_count || 0}</td>
        <td class="py-3 pr-4">${formatNumber(item.net_weight)}</td>
        <td class="py-3 pr-4">${formatNumber(item.unit_price)} ₺</td>
        <td class="py-3 pr-4">${formatNumber(item.total_amount)} ₺</td>
        <td class="py-3 pr-4">${formatNumber(item.paid_amount)} ₺</td>
        <td class="py-3 pr-4">${formatNumber(item.remaining_amount)} ₺</td>
        <td class="py-3 pr-4">${paymentText(item.payment_status)}</td>
      </tr>
    `;
  }

  function renderSummary(summary) {
    refs.entryCountText.textContent = summary.entry_count || 0;
    refs.totalBoxesText.textContent = summary.total_boxes || 0;
    refs.totalWeightText.textContent = formatNumber(summary.total_weight);
    refs.totalAmountText.textContent = `${formatNumber(summary.total_amount)} ₺`;
    refs.totalRemainingText.textContent = `${formatNumber(summary.total_remaining)} ₺`;
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
        const sellerID = Number(btn.getAttribute("data-seller-id") || 0);
        const seller = findSellerById(sellerID);
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
        const selectedSeller = findSellerById(refs.sellerId.value);

        if (selectedSeller) {
          refs.sellerSearch.value = getSellerLabel(selectedSeller);
        } else if (!refs.sellerSearch.value.trim()) {
          refs.sellerId.value = "";
        }

        hideSellerDropdown();
      }, 150);
    });

    document.addEventListener("click", (e) => {
      const target = e.target;
      const clickedInside =
        refs.sellerSearch?.contains(target) ||
        refs.sellerDropdown?.contains(target);

      if (!clickedInside) {
        hideSellerDropdown();
      }
    });
  }

  async function loadSellers() {
    try {
      const data = await window.ApiService.sellers.getAll();
      state.sellers = data.items || [];
    } catch (err) {
      toast(err.message);
    }
  }

  async function loadReport() {
    const sellerID = refs.sellerId.value;

    if (!sellerID) {
      toast("Lütfen bir satıcı seçiniz.");
      return;
    }

    try {
      const filters = buildFilters();
      filters.seller_id = sellerID;
      
      const { items: rawItems } = await window.ApiService.custom.getLedgerEntriesWithRelations(filters);
      
      let summary = {
          entry_count: 0,
          total_boxes: 0,
          total_weight: 0,
          total_amount: 0,
          total_remaining: 0
      };

      const items = rawItems.map(item => {
          summary.entry_count++;
          summary.total_boxes += (item.box_count || 0);
          summary.total_weight += (item.net_weight || 0);
          summary.total_amount += (item.total_amount || 0);
          summary.total_remaining += (item.remaining_amount || 0);

          return {
              ...item,
              buyer_name: item.buyer ? item.buyer.name : '',
              product_name: item.product ? item.product.name : '',
              entry_date: item.entry_date
          };
      });

      renderSummary(summary);
      refs.tbody.innerHTML = items.map(rowTemplate).join("");

      if (!items.length) {
        refs.tbody.innerHTML = `
          <tr>
            <td colspan="10" class="py-8 text-center text-slate-500">
              Kayıt bulunamadı.
            </td>
          </tr>
        `;
      }
    } catch (err) {
      toast(err.message);
    }
  }

  refs.filterBtn?.addEventListener("click", loadReport);

  refs.printBtn?.addEventListener("click", () => {
    window.print();
  });

  refs.csvBtn?.addEventListener("click", () => {
    toast("Sunucusuz sürümde CSV dışa aktarma geçici olarak devre dışıdır.");
  });

  refs.excelBtn?.addEventListener("click", () => {
    toast("Sunucusuz sürümde Excel dışa aktarma geçici olarak devre dışıdır.");
  });

  async function init() {
    await loadSellers();
    setupSellerAutocomplete();
  }

  init();
})();