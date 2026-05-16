(() => {
  const state = {
    sellers: [],
    buyers: [],
    products: [],
    pendingPayload: null,
  };

  const sellerState = {
    items: [],
    filtered: [],
    selected: null,
  };

  const $ = (id) => document.getElementById(id);

  const refs = {
    form: $("entryForm"),
    entryDate: $("entryDate"),

    sellerSearch: $("sellerSearch"),
    sellerId: $("sellerId"),
    sellerDropdown: $("sellerDropdown"),

    buyerId: $("buyerId"),
    productId: $("productId"),

    boxCount: $("boxCount"),
    netWeight: $("netWeight"),
    unitPrice: $("unitPrice"),
    paidAmount: $("paidAmount"),

    avgBoxWeightText: $("avgBoxWeightText"),
    totalAmountText: $("totalAmountText"),
    remainingAmountText: $("remainingAmountText"),
    paymentStatusText: $("paymentStatusText"),

    productRangeInfo: $("productRangeInfo"),
    minWeightText: $("minWeightText"),
    maxWeightText: $("maxWeightText"),
    weightCheckStatus: $("weightCheckStatus"),

    inlineWarning: $("inlineWarning"),
    inlineWarningText: $("inlineWarningText"),

    saveBtn: $("saveBtn"),
    clearBtn: $("clearBtn"),

    warningModal: $("confirmModal"),
    warningMessage: $("confirmMessage"),
    warningConfirmBtn: $("approveConfirmBtn"),
    warningCancelBtn: $("cancelConfirmBtn"),
  };

  function toast(message, type = "info") {
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

  function normalizeText(value) {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatMoney(value) {
    return `${new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0))} ₺`;
  }

  function formatNumber(value, digits = 2, suffix = "") {
    const n = Number(value || 0);
    const text = new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
    return suffix ? `${text} ${suffix}` : text;
  }

  function getSellerLabel(item) {
    return `${item.first_name || ""} ${item.last_name || ""}`.trim();
  }

  function getSelectedProduct() {
    const productId = Number(refs.productId?.value || 0);
    return state.products.find((x) => Number(x.id) === productId) || null;
  }



  function fillSelect(selectEl, items, placeholder, labelFn) {
    if (!selectEl) return;

    selectEl.innerHTML = `<option value="">${placeholder}</option>`;

    (items || []).forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = labelFn(item);
      selectEl.appendChild(opt);
    });
  }

  async function loadSellersForAutocomplete() {
    const res = await window.ApiService.sellers.getAll();
    const items = Array.isArray(res.items) ? res.items : [];

    sellerState.items = items.slice().sort((a, b) => {
      return getSellerLabel(a).localeCompare(getSellerLabel(b), "tr");
    });

    state.sellers = sellerState.items;
  }

  async function loadLookups() {
    await loadSellersForAutocomplete();

    const [buyersRes, productsRes] = await Promise.all([
      window.ApiService.buyers.getAll(),
      window.ApiService.products.getAll(),
    ]);

    state.buyers = Array.isArray(buyersRes.items) ? buyersRes.items : [];
    state.products = Array.isArray(productsRes.items) ? productsRes.items : [];

    fillSelect(refs.buyerId, state.buyers, "Alıcı seçiniz", (x) => x.name || "");
    fillSelect(refs.productId, state.products, "Ürün seçiniz", (x) => x.name || "");

    updateProductInfo();
    updateLiveSummary();
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
      .map((item) => {
        return `
          <button
            type="button"
            class="seller-option flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            data-id="${item.id}"
          >
            ${escapeHtml(getSellerLabel(item))}
          </button>
        `;
      })
      .join("");

    refs.sellerDropdown.classList.remove("hidden");

    refs.sellerDropdown.querySelectorAll(".seller-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id || 0);
        const selected = sellerState.items.find((x) => Number(x.id) === id);
        if (!selected) return;

        sellerState.selected = selected;
        refs.sellerId.value = selected.id;
        refs.sellerSearch.value = getSellerLabel(selected);
        refs.sellerDropdown.classList.add("hidden");
      });
    });
  }

  function filterSellers(keyword) {
    const q = normalizeText(keyword);

    if (!q) {
      sellerState.filtered = sellerState.items.slice(0, 20);
      renderSellerDropdown(sellerState.filtered);
      return;
    }

    sellerState.filtered = sellerState.items
      .filter((item) => {
        const label = normalizeText(getSellerLabel(item));
        return label.startsWith(q) || label.includes(q);
      })
      .slice(0, 20);

    renderSellerDropdown(sellerState.filtered);
  }

  function bindSellerAutocomplete() {
    refs.sellerSearch?.addEventListener("input", (e) => {
      refs.sellerId.value = "";
      sellerState.selected = null;
      filterSellers(e.target.value);
    });

    refs.sellerSearch?.addEventListener("focus", () => {
      filterSellers(refs.sellerSearch.value);
    });

    refs.sellerSearch?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        refs.sellerDropdown?.classList.add("hidden");
      }
    });

    document.addEventListener("click", (e) => {
      const field = refs.sellerSearch?.closest(".d360-field");
      if (!field) return;

      if (!field.contains(e.target)) {
        refs.sellerDropdown?.classList.add("hidden");
      }
    });
  }

  function setToday() {
    if (!refs.entryDate || refs.entryDate.value) return;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    refs.entryDate.value = `${yyyy}-${mm}-${dd}`;
  }

function getSummaryValues() {
  const boxCount = Number(refs.boxCount?.value || 0);
  const netWeight = Number(refs.netWeight?.value || 0);
  const unitPrice = Number(refs.unitPrice?.value || 0);
  const paidAmount = Number(refs.paidAmount?.value || 0);

  const avgBoxWeight = boxCount > 0 ? netWeight / boxCount : 0;
  const totalAmount = netWeight * unitPrice;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  let paymentStatus = "Ödenecek";

  if (totalAmount > 0) {
    if (paidAmount <= 0) {
      paymentStatus = "Ödenecek";
    } else if (paidAmount < totalAmount) {
      paymentStatus = "Kısmi Ödendi";
    } else {
      paymentStatus = "Tamamı Ödendi";
    }
  }

  return {
    boxCount,
    netWeight,
    unitPrice,
    paidAmount,
    avgBoxWeight,
    totalAmount,
    remainingAmount,
    paymentStatus,
  };
}

  function updateProductInfo() {
    const product = getSelectedProduct();

    const minWeight = Number(product?.min_box_weight || product?.min_weight || 0);
    const maxWeight = Number(product?.max_box_weight || product?.max_weight || 0);

    refs.minWeightText.textContent = minWeight > 0 ? formatNumber(minWeight, 2, "kg") : "-";
    refs.maxWeightText.textContent = maxWeight > 0 ? formatNumber(maxWeight, 2, "kg") : "-";

    if (!product) {
      refs.productRangeInfo.textContent = "Ürün seçince min-max bilgisi burada görünür.";
      refs.weightCheckStatus.textContent = "Ürün seçilmedi";
      refs.inlineWarning?.classList.add("hidden");
      return;
    }

    refs.productRangeInfo.textContent = `Beklenen kasa ağırlığı aralığı: ${refs.minWeightText.textContent} - ${refs.maxWeightText.textContent}`;
    updateWeightStatus();
  }

  function updateWeightStatus() {
    const product = getSelectedProduct();
    const { avgBoxWeight, boxCount, netWeight } = getSummaryValues();

    if (!product) {
      refs.weightCheckStatus.textContent = "Ürün seçilmedi";
      refs.inlineWarning?.classList.add("hidden");
      return false;
    }

    if (!boxCount || !netWeight) {
      refs.weightCheckStatus.textContent = "Kontrol bekleniyor";
      refs.inlineWarning?.classList.add("hidden");
      return false;
    }

    const minWeight = Number(product?.min_box_weight || product?.min_weight || 0);
    const maxWeight = Number(product?.max_box_weight || product?.max_weight || 0);

    if (minWeight > 0 && avgBoxWeight < minWeight) {
      const msg = `Ortalama kasa kilosu ${formatNumber(avgBoxWeight, 2, "kg")} görünüyor. Beklenen minimum ${formatNumber(minWeight, 2, "kg")}.`;
      refs.weightCheckStatus.textContent = "Aralık dışı";
      refs.inlineWarningText.textContent = msg;
      refs.inlineWarning?.classList.remove("hidden");
      return true;
    }

    if (maxWeight > 0 && avgBoxWeight > maxWeight) {
      const msg = `Ortalama kasa kilosu ${formatNumber(avgBoxWeight, 2, "kg")} görünüyor. Beklenen maksimum ${formatNumber(maxWeight, 2, "kg")}.`;
      refs.weightCheckStatus.textContent = "Aralık dışı";
      refs.inlineWarningText.textContent = msg;
      refs.inlineWarning?.classList.remove("hidden");
      return true;
    }

    refs.weightCheckStatus.textContent = "Uygun";
    refs.inlineWarning?.classList.add("hidden");
    return false;
  }

  function updateLiveSummary() {
    const { avgBoxWeight, totalAmount, remainingAmount, paymentStatus } = getSummaryValues();

    refs.avgBoxWeightText.textContent = formatNumber(avgBoxWeight, 2, "kg");
    refs.totalAmountText.textContent = formatMoney(totalAmount);
    refs.remainingAmountText.textContent = formatMoney(remainingAmount);
    refs.paymentStatusText.textContent = paymentStatus;

    updateWeightStatus();
  }

  function bindLiveSummary() {
[refs.boxCount, refs.netWeight, refs.unitPrice, refs.paidAmount].forEach((el) => {
  el?.addEventListener("input", updateLiveSummary);
});

    refs.productId?.addEventListener("change", () => {
      updateProductInfo();
      updateLiveSummary();
    });
  }

  function buildPayload(forceSave = false) {
    return {
      entry_date: refs.entryDate?.value || "",
      seller_id: Number(refs.sellerId?.value || 0),
      buyer_id: Number(refs.buyerId?.value || 0),
      product_id: Number(refs.productId?.value || 0),
      box_count: Number(refs.boxCount?.value || 0),
      net_weight: Number(refs.netWeight?.value || 0),
      unit_price: Number(refs.unitPrice?.value || 0),
      paid_amount: Number(refs.paidAmount?.value || 0),
      note: "",
      force_save: forceSave,
    };
  }

  function validatePayload(payload) {
    if (!payload.entry_date) return "Tarih zorunludur";
    if (!payload.seller_id) return "Satıcı seçiniz";
    if (!payload.buyer_id) return "Alıcı seçiniz";
    if (!payload.product_id) return "Ürün seçiniz";
    if (!payload.box_count || payload.box_count <= 0) return "Kasa sayısı 0'dan büyük olmalıdır";
    if (!payload.net_weight || payload.net_weight <= 0) return "Kilo 0'dan büyük olmalıdır";
    if (!payload.unit_price || payload.unit_price <= 0) return "Birim fiyat 0'dan büyük olmalıdır";
    return "";
  }

  function resetForm() {
    refs.form?.reset();
    setToday();

    refs.sellerId.value = "";
    if (refs.sellerSearch) refs.sellerSearch.value = "";
    if (refs.paidAmount) refs.paidAmount.value = "";

    sellerState.selected = null;
    sellerState.filtered = [];
    refs.sellerDropdown?.classList.add("hidden");
    refs.inlineWarning?.classList.add("hidden");

    state.pendingPayload = null;

    updateProductInfo();
    updateLiveSummary();
  }

  function openWarningModal(message) {
    if (!refs.warningModal || !refs.warningMessage) {
      toast(message, "warning");
      return;
    }

    refs.warningMessage.textContent = message;
    refs.warningModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeWarningModal() {
    refs.warningModal?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  async function submitPayload(payload) {
    if (refs.saveBtn) {
      refs.saveBtn.disabled = true;
      refs.saveBtn.classList.add("opacity-60", "pointer-events-none");
    }

    try {
      const isWeightWarning = updateWeightStatus();
      if (isWeightWarning && !payload.force_save) {
        state.pendingPayload = { ...payload, force_save: true };
        openWarningModal("Kasa ağırlığı ortalamanın dışında. Devam etmek istiyor musunuz?");
        return;
      }

      payload.total_amount = payload.net_weight * payload.unit_price;
      payload.remaining_amount = Math.max(payload.total_amount - payload.paid_amount, 0);
      payload.weight_warning = isWeightWarning;

      const data = await window.ApiService.ledgerEntries.create(payload);

      if (!data) {
        throw new Error("Kayıt oluşturulamadı");
      }

      toast("Kayıt başarıyla oluşturuldu", "success");
      closeWarningModal();
      resetForm();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      if (refs.saveBtn) {
        refs.saveBtn.disabled = false;
        refs.saveBtn.classList.remove("opacity-60", "pointer-events-none");
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = buildPayload(false);
    const error = validatePayload(payload);

    if (error) {
      toast(error, "warning");
      return;
    }

    await submitPayload(payload);
  }

  async function init() {
    setToday();
    bindSellerAutocomplete();
    bindLiveSummary();
    await loadLookups();

    refs.form?.addEventListener("submit", handleSubmit);
    refs.clearBtn?.addEventListener("click", resetForm);

    refs.warningCancelBtn?.addEventListener("click", () => {
      state.pendingPayload = null;
      closeWarningModal();
    });

    refs.warningConfirmBtn?.addEventListener("click", async () => {
      if (!state.pendingPayload) {
        closeWarningModal();
        return;
      }

      const payload = state.pendingPayload;
      state.pendingPayload = null;
      await submitPayload(payload);
    });

    refs.warningModal?.addEventListener("click", (e) => {
      if (e.target === refs.warningModal) {
        closeWarningModal();
      }
    });

    updateProductInfo();
    updateLiveSummary();
  }

  init();
})();