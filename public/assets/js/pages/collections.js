(() => {
  const state = {
    currentRecord: null,
    sellers: [],
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
    paymentStatusFilter: $("paymentStatusFilter"),
    onlyOpen: $("onlyOpen"),
    filterBtn: $("filterBtn"),
    clearBtn: $("clearBtn"),
    tbody: $("collectionsTableBody"),

    paymentModal: $("paymentModal"),
    closePaymentModalBtn: $("closePaymentModalBtn"),
    cancelPaymentBtn: $("cancelPaymentBtn"),
    paymentForm: $("paymentForm"),
    paymentEntryId: $("paymentEntryId"),
    paymentAmount: $("paymentAmount"),
    paymentDate: $("paymentDate"),
    paymentMethod: $("paymentMethod"),
    paymentNote: $("paymentNote"),
    paymentRecordInfo: $("paymentRecordInfo"),
    paymentRemainingInfo: $("paymentRemainingInfo"),
  };

  function toast(message, type = "info") {
    if (window.Toast?.show) {
      window.Toast.show(message, type);
      return;
    }
    alert(message);
  }

  function formatNumber(value, minFractionDigits = 2, maxFractionDigits = 2) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    }).format(Number(value || 0));
  }

  function paymentText(status) {
    if (status === "odendi") return "Ödendi";
    if (status === "kismi_odendi") return "Kısmi Ödendi";
    return "Ödenecek";
  }

  function todayAsInputValue() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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
    try {
      const [sellersRes, buyersRes, productsRes] = await Promise.all([
        window.ApiService.sellers.getAll(),
        window.ApiService.buyers.getAll(),
        window.ApiService.products.getAll(),
      ]);

      state.sellers = sellersRes.items || [];

      fillSelect(
        refs.buyerFilter,
        buyersRes.items || [],
        (x) => x.name || ""
      );

      fillSelect(
        refs.productFilter,
        productsRes.items || [],
        (x) => x.name || ""
      );
    } catch (err) {
      toast(err.message || "Liste verileri yüklenemedi", "error");
    }
  }

  function buildFilters() {
    const filters = {};

    if (refs.fromDate?.value) filters.startDate = refs.fromDate.value;
    if (refs.toDate?.value) filters.endDate = refs.toDate.value;
    if (refs.sellerId?.value) filters.seller_id = refs.sellerId.value;
    if (refs.buyerFilter?.value) filters.buyer_id = refs.buyerFilter.value;
    if (refs.productFilter?.value) filters.product_id = refs.productFilter.value;
    if (refs.paymentStatusFilter?.value) filters.status = refs.paymentStatusFilter.value;
    if (refs.onlyOpen?.checked) filters.only_open = true;

    return filters;
  }

  function rowTemplate(item) {
    const totalAmount = Number(item.total_amount || 0);
    const paidAmount = Number(item.paid_amount || 0);
    const remainingAmount = Number(item.remaining_amount || 0);

    return `
      <tr class="border-b border-slate-100">
        <td class="py-3 pr-4">${item.entry_date || ""}</td>
        <td class="py-3 pr-4 font-medium">${item.seller_name || ""}</td>
        <td class="py-3 pr-4">${item.buyer_name || ""}</td>
        <td class="py-3 pr-4">${item.product_name || ""}</td>
        <td class="py-3 pr-4">${formatNumber(totalAmount)} ₺</td>
        <td class="py-3 pr-4">${formatNumber(paidAmount)} ₺</td>
        <td class="py-3 pr-4 font-semibold">${formatNumber(remainingAmount)} ₺</td>
        <td class="py-3 pr-4">${paymentText(item.payment_status)}</td>
        <td class="py-3 pr-4">
          ${
            remainingAmount > 0
              ? `
                <button
                  type="button"
                  class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  data-action="payment"
                  data-id="${item.id}"
                >
                  Ödeme Al
                </button>
              `
              : `<span class="text-xs text-slate-400">Kapalı</span>`
          }
        </td>
      </tr>
    `;
  }

  function bindPaymentButtons(items) {
    refs.tbody
      ?.querySelectorAll('[data-action="payment"]')
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-id"));
          const row = (items || []).find((x) => Number(x.id) === id);
          if (row) {
            openPaymentModal(row);
          }
        });
      });
  }

  async function loadCollections() {
    try {
      const filters = buildFilters();
      const { items: rawItems } = await window.ApiService.custom.getLedgerEntriesWithRelations(filters);
      
      let items = rawItems.map(item => ({
          ...item,
          seller_name: item.seller ? `${item.seller.first_name} ${item.seller.last_name}` : '',
          buyer_name: item.buyer ? item.buyer.name : '',
          product_name: item.product ? item.product.name : '',
          entry_date: item.date || item.entry_date
      }));
      
      if (filters.only_open) {
          items = items.filter(item => (item.remaining_amount || 0) > 0);
      }

      if (!items.length) {
        refs.tbody.innerHTML = `
          <tr>
            <td colspan="9" class="py-8 text-center text-slate-500">
              Kayıt bulunamadı.
            </td>
          </tr>
        `;
        return;
      }

      refs.tbody.innerHTML = items.map(rowTemplate).join("");
      bindPaymentButtons(items);
    } catch (err) {
      refs.tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-8 text-center text-rose-600">
            ${err.message || "Tahsilatlar yüklenemedi."}
          </td>
        </tr>
      `;
      toast(err.message || "Tahsilatlar yüklenemedi", "error");
    }
  }

  function openPaymentModal(row) {
    state.currentRecord = row;

    refs.paymentEntryId.value = row.id || "";
    refs.paymentAmount.value = "";
    refs.paymentDate.value = todayAsInputValue();
    refs.paymentMethod.value = "cash";
    refs.paymentNote.value = "";

    refs.paymentRecordInfo.textContent = `${row.seller_name || "-"} / ${row.buyer_name || "-"} / ${row.product_name || "-"}`;
    refs.paymentRemainingInfo.textContent = `Kalan borç: ${formatNumber(row.remaining_amount || 0)} ₺`;

    refs.paymentModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    setTimeout(() => {
      refs.paymentAmount?.focus();
    }, 0);
  }

  function closePaymentModal() {
    refs.paymentModal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");

    refs.paymentForm?.reset();
    refs.paymentEntryId.value = "";
    refs.paymentDate.value = "";
    refs.paymentMethod.value = "cash";
    refs.paymentRecordInfo.textContent = "";
    refs.paymentRemainingInfo.textContent = "";

    state.currentRecord = null;
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();

    const entryID = refs.paymentEntryId.value;
    const amount = Number(refs.paymentAmount.value || 0);
    const note = refs.paymentNote.value.trim();
    const paymentMethod = (refs.paymentMethod.value || "cash").trim();

    let paymentDate = refs.paymentDate.value.trim();
    if (!paymentDate) {
      paymentDate = todayAsInputValue();
      refs.paymentDate.value = paymentDate;
    }

    const remainingAmount = Number(state.currentRecord?.remaining_amount || 0);

    if (!entryID) {
      toast("Geçersiz kayıt.", "error");
      return;
    }

    if (!paymentDate) {
      toast("Ödeme tarihi zorunlu.", "warning");
      return;
    }

    if (amount <= 0) {
      toast("Ödeme tutarı 0'dan büyük olmalı.", "warning");
      return;
    }

    if (remainingAmount <= 0) {
      toast("Bu kayıtta kalan borç bulunmuyor.", "warning");
      return;
    }

    if (amount > remainingAmount) {
      toast(
        `Ödeme tutarı kalan borçtan büyük olamaz. Kalan: ${formatNumber(remainingAmount)} ₺`,
        "warning"
      );
      return;
    }

    const payload = {
      payment_date: paymentDate,
      amount,
      payment_method: paymentMethod,
      note,
      created_by: "Admin",
    };

    console.log("POST payload:", payload);

    try {
      await window.ApiService.ledgerPayments.create({
        ledger_entry_id: entryID,
        payment_date: paymentDate,
        amount,
        payment_method: paymentMethod,
        note,
        created_by: "Admin",
      });

      toast("Ödeme başarıyla işlendi.", "success");
      closePaymentModal();
      await loadCollections();
    } catch (err) {
      console.error("payment error:", err);
      toast(err.message || "Ödeme kaydedilemedi.", "error");
    }
  }

  function bindEvents() {
    refs.filterBtn?.addEventListener("click", loadCollections);

    refs.clearBtn?.addEventListener("click", async () => {
      refs.fromDate.value = "";
      refs.toDate.value = "";
      refs.sellerSearch.value = "";
      refs.sellerId.value = "";
      hideSellerDropdown();

      refs.buyerFilter.value = "";
      refs.productFilter.value = "";
      refs.paymentStatusFilter.value = "";
      refs.onlyOpen.checked = true;

      await loadCollections();
    });

    refs.closePaymentModalBtn?.addEventListener("click", closePaymentModal);
    refs.cancelPaymentBtn?.addEventListener("click", closePaymentModal);

    refs.paymentModal?.addEventListener("click", (e) => {
      if (e.target === refs.paymentModal) {
        closePaymentModal();
      }
    });

    refs.paymentForm?.addEventListener("submit", handlePaymentSubmit);
  }

  async function init() {
    bindEvents();
    await loadLookups();
    setupSellerAutocomplete();
    await loadCollections();
  }

  init();
})();