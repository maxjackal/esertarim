(() => {
  const state = {
    pendingUpdatePayload: null,
    sellers: [],
    currentPaymentRow: null,
    ledgerId: 0,
    ledgerProductId: 0,
    ledgerContext: null,
    currentItems: [],
  };

  const $ = (id) => document.getElementById(id);

  const refs = {
    pageTitle: $("pageTitle"),
    pageDescription: $("pageDescription"),
    ledgerContextBar: $("ledgerContextBar"),
    ledgerContextText: $("ledgerContextText"),
    fromDate: $("fromDate"),
    toDate: $("toDate"),
    sellerSearch: $("sellerSearch"),
    sellerId: $("sellerId"),
    sellerDropdown: $("sellerDropdown"),
    buyerFilter: $("buyerFilter"),
    productFilter: $("productFilter"),
    onlyWarnings: $("onlyWarnings"),
    todayBtn: $("todayBtn"),
    filterBtn: $("filterBtn"),
    clearBtn: $("clearBtn"),
    exportBtn: $("exportBtn"),
    tbody: $("entryTableBody"),

    editModal: $("editModal"),
    closeModalBtn: $("closeModalBtn"),
    cancelEditBtn: $("cancelEditBtn"),
    editForm: $("editForm"),
    editId: $("editId"),
    editSellerSearch: $("editSellerSearch"),
    editSellerId: $("editSellerId"),
    editSellerDropdown: $("editSellerDropdown"),
    editBuyerId: $("editBuyerId"),
    editProductId: $("editProductId"),
    editEntryDate: $("editEntryDate"),
    editBoxCount: $("editBoxCount"),
    editNetWeight: $("editNetWeight"),
    editUnitPrice: $("editUnitPrice"),
    editNote: $("editNote"),
    editWarningBox: $("editWarningBox"),

    paymentModal: $("paymentModal"),
    closePaymentModalBtn: $("closePaymentModalBtn"),
    cancelPaymentBtn: $("cancelPaymentBtn"),
    paymentForm: $("paymentForm"),
    paymentEntryId: $("paymentEntryId"),
    paymentMethod: $("paymentMethod"),
    paymentDate: $("paymentDate"),
    paymentAmount: $("paymentAmount"),
    paymentNote: $("paymentNote"),
    paymentRecordInfo: $("paymentRecordInfo"),
    paymentRemainingInfo: $("paymentRemainingInfo"),
    savePaymentBtn: $("savePaymentBtn"),
  };

  function getLedgerIdFromUrl() {
    const url = new URL(window.location.href);
    const isLedgerDetailPage = url.pathname.includes("ledger-details");
    const queryId = Number(
      url.searchParams.get("ledger_id") || (isLedgerDetailPage ? url.searchParams.get("id") : 0) || 0
    );
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = Number(pathParts[pathParts.length - 1] || 0);
    return queryId || lastPart || 0;
  }

  function getLedgerProductIdFromUrl() {
    const url = new URL(window.location.href);
    return Number(url.searchParams.get("product_id") || 0);
  }

  function toast(message, type = "info") {
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

  function goToLedgerDetail(id) {
    if (!id) return;

    // Eğer projenizde route yapısı /defter/:id ise bunu kullanın:
    // window.location.href = `/defter/${id}`;

    // Sayfa tabanlı kullanım için:
    window.location.href = `/pages/ledger-detail?id=${id}`;
  }

  function formatNumber(value, fractionDigits = 2) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Number(value || 0));
  }

  function formatMoney(value) {
    return `${formatNumber(value, 2)} ₺`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function paymentBadge(status) {
    if (status === "odendi") {
      return `<span class="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Ödendi</span>`;
    }
    if (status === "kismi_odendi") {
      return `<span class="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Kısmi Ödendi</span>`;
    }
    if (status === "odenmedi") {
      return `<span class="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Ödenmedi</span>`;
    }
    return `<span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">-</span>`;
  }

  function paymentStatusText(status) {
    if (status === "odendi") return "Ödendi";
    if (status === "kismi_odendi") return "Kısmi Ödendi";
    if (status === "odenmedi") return "Ödenmedi";
    return "-";
  }

  function todayAsInputValue() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function isTodayFilterActive() {
    const today = todayAsInputValue();
    return refs.fromDate?.value === today && refs.toDate?.value === today;
  }

  function exportDateForFileName() {
    if (window.ExcelExportUtils?.formatTurkishDate) {
      return window.ExcelExportUtils.formatTurkishDate();
    }

    const [yyyy, mm, dd] = todayAsInputValue().split("-");
    return `${dd}.${mm}.${yyyy}`;
  }



  function fillSelect(selectEl, items, labelFn, placeholder = "Seçiniz") {
    if (!selectEl) return;

    selectEl.innerHTML = `<option value="">${placeholder}</option>`;

    (items || []).forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = labelFn(item);
      selectEl.appendChild(opt);
    });
  }

  function getSellerLabel(seller) {
    return `${seller.first_name || ""} ${seller.last_name || ""}`.trim();
  }

  function findSellerById(id) {
    const sellerId = Number(id || 0);
    return state.sellers.find((item) => Number(item.id) === sellerId) || null;
  }

  function renderSellerDropdown(dropdownEl, items, onSelect) {
    if (!dropdownEl) return;

    if (!items.length) {
      dropdownEl.innerHTML = `
        <div class="rounded-xl px-3 py-2 text-sm text-slate-500">
          Sonuç bulunamadı
        </div>
      `;
      dropdownEl.classList.remove("hidden");
      return;
    }

    dropdownEl.innerHTML = items
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

    dropdownEl.classList.remove("hidden");

    dropdownEl.querySelectorAll("[data-seller-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-seller-id") || 0);
        const seller = findSellerById(id);
        if (seller) onSelect(seller);
      });
    });
  }

  function hideDropdown(dropdownEl) {
    if (!dropdownEl) return;
    dropdownEl.classList.add("hidden");
  }

  function setupSellerAutocomplete({
    inputEl,
    hiddenEl,
    dropdownEl,
    onChange,
  }) {
    if (!inputEl || !hiddenEl || !dropdownEl) return;

    function selectSeller(seller) {
      hiddenEl.value = seller?.id ? String(seller.id) : "";
      inputEl.value = seller ? getSellerLabel(seller) : "";
      hideDropdown(dropdownEl);
      if (typeof onChange === "function") onChange(seller || null);
    }

    function filterAndRender() {
      const query = inputEl.value.trim().toLocaleLowerCase("tr-TR");

      if (!query) {
        hiddenEl.value = "";
        hideDropdown(dropdownEl);
        if (typeof onChange === "function") onChange(null);
        return;
      }

      const filtered = state.sellers.filter((seller) =>
        getSellerLabel(seller).toLocaleLowerCase("tr-TR").includes(query)
      );

      renderSellerDropdown(dropdownEl, filtered, selectSeller);
    }

    inputEl.addEventListener("input", () => {
      hiddenEl.value = "";
      filterAndRender();
    });

    inputEl.addEventListener("focus", () => {
      const query = inputEl.value.trim().toLocaleLowerCase("tr-TR");
      const filtered = query
        ? state.sellers.filter((seller) =>
            getSellerLabel(seller).toLocaleLowerCase("tr-TR").includes(query)
          )
        : state.sellers.slice(0, 20);

      renderSellerDropdown(dropdownEl, filtered, selectSeller);
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        const rawValue = inputEl.value.trim();
        const selectedId = Number(hiddenEl.value || 0);
        const selectedSeller = findSellerById(selectedId);

        if (selectedSeller) {
          inputEl.value = getSellerLabel(selectedSeller);
          hideDropdown(dropdownEl);
          if (typeof onChange === "function") onChange(selectedSeller);
          return;
        }

        if (!rawValue) {
          hiddenEl.value = "";
          hideDropdown(dropdownEl);
          if (typeof onChange === "function") onChange(null);
          return;
        }

        const exactMatch = state.sellers.find(
          (seller) =>
            getSellerLabel(seller).toLocaleLowerCase("tr-TR") ===
            rawValue.toLocaleLowerCase("tr-TR")
        );

        if (exactMatch) {
          hiddenEl.value = String(exactMatch.id);
          inputEl.value = getSellerLabel(exactMatch);
          if (typeof onChange === "function") onChange(exactMatch);
        } else {
          hiddenEl.value = "";
          if (typeof onChange === "function") onChange(null);
        }

        hideDropdown(dropdownEl);
      }, 150);
    });
  }

  async function loadLookups() {
    const [sellersRes, buyersRes, productsRes] = await Promise.all([
      window.ApiService.sellers.getAll(),
      window.ApiService.buyers.getAll(),
      window.ApiService.products.getAll(),
    ]);

    state.sellers = sellersRes.items || [];

    fillSelect(refs.buyerFilter, buyersRes.items || [], (x) => x.name || "", "Tümü");
    fillSelect(refs.productFilter, productsRes.items || [], (x) => x.name || "", "Tümü");

    fillSelect(refs.editBuyerId, buyersRes.items || [], (x) => x.name || "");
    fillSelect(refs.editProductId, productsRes.items || [], (x) => x.name || "");
  }

  function buildFilterQuery() {
    const filters = {};

    if (state.ledgerId) filters.ledger_id = state.ledgerId;
    if (state.ledgerProductId) filters.product_id = state.ledgerProductId;
    if (refs.fromDate?.value) filters.startDate = refs.fromDate.value;
    if (refs.toDate?.value) filters.endDate = refs.toDate.value;
    if (refs.sellerId?.value) filters.seller_id = refs.sellerId.value;
    if (refs.buyerFilter?.value) filters.buyer_id = refs.buyerFilter.value;
    if (refs.productFilter?.value) filters.product_id = refs.productFilter.value;
    if (refs.onlyWarnings?.checked) filters.only_warnings = true;

    return filters;
  }

  function applyLedgerContext(items = []) {
    if (!state.ledgerId) return;

    const first = items[0] || null;
    const buyerName = first?.buyer_name || first?.buyer?.name || "";
    const productNames = Array.from(
      new Set(items.map((item) => item.product_name || item.product?.name).filter(Boolean))
    );

    state.ledgerContext = {
      buyerName,
      productNames,
      entryCount: items.length,
    };

    if (refs.pageTitle) refs.pageTitle.textContent = "Defter Detayı";
    if (refs.pageDescription) {
      refs.pageDescription.textContent =
        "Bu deftere kayıtlı hareketleri görüntüleyin, filtreleyin ve tahsilat işlemlerini yönetin.";
    }

    if (refs.ledgerContextBar && refs.ledgerContextText) {
      const productText = productNames.length ? productNames.join(", ") : "Ürün yok";
      refs.ledgerContextText.textContent = `${buyerName || "Alıcı yok"} / ${productText} / ${items.length} kayıt`;
      refs.ledgerContextBar.classList.remove("hidden");
    }
  }

  function rowTemplate(item) {
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" data-id="${item.id}">
        <td class="py-3 pr-4">${escapeHtml(item.entry_date || "")}</td>
        <td class="py-3 pr-4 font-medium">${escapeHtml(item.seller_name || "")}</td>
        <td class="py-3 pr-4">${escapeHtml(item.buyer_name || "")}</td>
        <td class="py-3 pr-4">${escapeHtml(item.product_name || "")}</td>
        <td class="py-3 pr-4">${formatNumber(item.box_count || 0, 0)}</td>
        <td class="py-3 pr-4">${formatNumber(item.net_weight || 0)}</td>
        <td class="py-3 pr-4">${formatMoney(item.unit_price || 0)}</td>
        <td class="py-3 pr-4 font-semibold text-slate-800">${formatMoney(item.total_amount || 0)}</td>
        <td class="py-3 pr-4 font-semibold text-emerald-600">${formatMoney(item.paid_amount || 0)}</td>
        <td class="py-3 pr-4 font-semibold text-rose-600">${formatMoney(item.remaining_amount || 0)}</td>
        <td class="py-3 pr-4">
          <div>${paymentBadge(item.payment_status)}</div>
          ${
            item.weight_warning
              ? `<div class="mt-1 text-[11px] font-medium text-red-600">Uyarılı</div>`
              : ``
          }
        </td>
        <td class="py-3 pr-4">
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="js-stop-row-nav rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              data-action="detail"
              data-id="${item.id}"
            >
              Detay
            </button>

            <button
              type="button"
              class="js-stop-row-nav rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              data-action="collect"
              data-id="${item.id}"
            >
              Tahsilat
            </button>

            <button
              type="button"
              class="js-stop-row-nav rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              data-action="edit"
              data-id="${item.id}"
            >
              Düzenle
            </button>

            <button
              type="button"
              class="js-stop-row-nav rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              data-action="delete"
              data-id="${item.id}"
            >
              Sil
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function bindRowNavigation() {
    refs.tbody?.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("dblclick", () => {
        const id = Number(row.dataset.id || 0);
        if (id) goToLedgerDetail(id);
      });
    });

    refs.tbody?.querySelectorAll(".js-stop-row-nav").forEach((btn) => {
      btn.addEventListener("click", (e) => e.stopPropagation());
      btn.addEventListener("dblclick", (e) => e.stopPropagation());
    });
  }

  async function loadEntries() {
    try {
      const filters = buildFilterQuery();
      const { items: rawItems } = await window.ApiService.custom.getLedgerEntriesWithRelations(filters);
      
      let items = rawItems.map(item => ({
          ...item,
          seller_name: item.seller ? `${item.seller.first_name} ${item.seller.last_name}` : '',
          buyer_name: item.buyer ? item.buyer.name : '',
          product_name: item.product ? item.product.name : '',
          entry_date: item.entry_date
      }));
      
      if (filters.only_warnings) {
         items = items.filter(i => i.weight_warning);
      }

      state.currentItems = items;

      if (!items.length) {
        applyLedgerContext(items);
        refs.tbody.innerHTML = `
          <tr>
            <td colspan="12" class="py-8 text-center text-sm text-slate-500">
              Kayıt bulunamadı.
            </td>
          </tr>
        `;
        return;
      }

      applyLedgerContext(items);
      refs.tbody.innerHTML = items.map(rowTemplate).join("");
      bindRowNavigation();

      refs.tbody.querySelectorAll('[data-action="detail"]').forEach((btn) => {
        btn.addEventListener("click", () => {
          goToLedgerDetail(btn.getAttribute("data-id"));
        });
      });

      refs.tbody.querySelectorAll('[data-action="collect"]').forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = Number(btn.getAttribute("data-id") || 0);
          const row = items.find((x) => Number(x.id) === id);
          if (row) openPaymentModal(row);
        });
      });

      refs.tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
          await openEditModal(btn.getAttribute("data-id"));
        });
      });

      refs.tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;

          try {
            await window.ApiService.ledgerEntries.delete(id);
            toast("Kayıt silindi", "success");
            await loadEntries();
          } catch (err) {
            toast(err.message, "error");
          }
        });
      });
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function openEditModalBase() {
    refs.editModal?.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeEditModal() {
    refs.editModal?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");

    if (refs.editWarningBox) {
      refs.editWarningBox.classList.add("hidden");
      refs.editWarningBox.textContent = "";
    }

    refs.editForm?.reset();
    refs.editSellerId.value = "";
    refs.editSellerSearch.value = "";
    hideDropdown(refs.editSellerDropdown);
    state.pendingUpdatePayload = null;
  }

  async function openEditModal(id) {
    try {
      const item = await window.ApiService.ledgerEntries.getById(id);

      refs.editId.value = item.id || "";
      refs.editSellerId.value = item.seller_id || "";
      refs.editBuyerId.value = item.buyer_id || "";
      refs.editProductId.value = item.product_id || "";
      refs.editEntryDate.value = item.entry_date || "";
      refs.editBoxCount.value = item.box_count || "";
      refs.editNetWeight.value = item.net_weight || "";
      refs.editUnitPrice.value = item.unit_price || "";
      refs.editNote.value = item.note || "";

      const selectedSeller = findSellerById(item.seller_id);
      refs.editSellerSearch.value = selectedSeller ? getSellerLabel(selectedSeller) : "";

      openEditModalBase();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function buildEditPayload(forceSave = false) {
    return {
      seller_id: Number(refs.editSellerId.value || 0),
      buyer_id: Number(refs.editBuyerId.value || 0),
      product_id: Number(refs.editProductId.value || 0),
      entry_date: refs.editEntryDate.value,
      box_count: Number(refs.editBoxCount.value || 0),
      net_weight: Number(refs.editNetWeight.value || 0),
      unit_price: Number(refs.editUnitPrice.value || 0),
      avg_box_weight: Number(refs.editBoxCount.value || 0) > 0
        ? Number(refs.editNetWeight.value || 0) / Number(refs.editBoxCount.value || 0)
        : 0,
      note: refs.editNote.value.trim(),
      force_save: forceSave,
    };
  }

  async function submitUpdate(payload) {
    const id = refs.editId.value;

    try {
      // NOTE: We don't have the requires_confirmation / 409 logic via ApiService since it's client-side Supabase,
      // So we just update directly unless we recreate the check. For now, assume it's valid.
      const { force_save: _forceSave, ...dbPayload } = payload;
      const data = await window.ApiService.ledgerEntries.update(id, dbPayload);

      if (!data) {
        throw new Error("Güncelleme başarısız");
      }

      toast("Kayıt güncellendi", "success");
      closeEditModal();
      await loadEntries();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function openPaymentModal(row) {
    state.currentPaymentRow = row;

    refs.paymentEntryId.value = row.id || "";
    refs.paymentMethod.value = "cash";
    refs.paymentDate.value = todayAsInputValue();
    refs.paymentAmount.value = "";
    refs.paymentNote.value = "";
    refs.paymentRecordInfo.textContent = `${row.seller_name || "-"} / ${row.buyer_name || "-"} / ${row.product_name || "-"}`;
    refs.paymentRemainingInfo.textContent = `Kalan borç: ${formatMoney(row.remaining_amount || 0)}`;

    refs.paymentModal?.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    setTimeout(() => {
      refs.paymentAmount?.focus();
    }, 0);
  }

  function closePaymentModal() {
    refs.paymentModal?.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");

    refs.paymentForm?.reset();
    refs.paymentEntryId.value = "";
    refs.paymentMethod.value = "cash";
    refs.paymentDate.value = "";
    refs.paymentRecordInfo.textContent = "";
    refs.paymentRemainingInfo.textContent = "";
    state.currentPaymentRow = null;
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();

    const entryID = Number(refs.paymentEntryId.value || 0);
    const paymentDate = (refs.paymentDate.value || "").trim();
    const paymentMethod = (refs.paymentMethod.value || "cash").trim();
    const amount = Number(refs.paymentAmount.value || 0);
    const note = refs.paymentNote.value.trim();
    const remainingAmount = Number(state.currentPaymentRow?.remaining_amount || 0);

    if (!entryID) {
      toast("Geçersiz kayıt.", "error");
      return;
    }

    if (!paymentDate) {
      toast("Ödeme tarihi zorunlu.", "warning");
      refs.paymentDate?.focus();
      return;
    }

    if (amount <= 0) {
      toast("Ödeme tutarı 0'dan büyük olmalı.", "warning");
      refs.paymentAmount?.focus();
      return;
    }

    if (remainingAmount <= 0) {
      toast("Bu kayıtta kalan borç bulunmuyor.", "warning");
      return;
    }

    if (amount > remainingAmount) {
      toast(`Ödeme tutarı kalan borçtan büyük olamaz. Kalan: ${formatMoney(remainingAmount)}`, "warning");
      refs.paymentAmount?.focus();
      return;
    }

    if (refs.savePaymentBtn) {
      refs.savePaymentBtn.disabled = true;
    }

    try {
      await window.ApiService.ledgerPayments.create({
        ledger_entry_id: entryID,
        payment_date: paymentDate,
        amount,
        payment_method: paymentMethod,
        note,
        created_by: "Admin",
      });

      toast("Tahsilat kaydedildi", "success");
      closePaymentModal();
      await loadEntries();
    } catch (err) {
      toast(err.message || "Tahsilat kaydedilemedi", "error");
    } finally {
      if (refs.savePaymentBtn) {
        refs.savePaymentBtn.disabled = false;
      }
    }
  }

  function bindStaticEvents() {
    refs.filterBtn?.addEventListener("click", loadEntries);

    refs.todayBtn?.addEventListener("click", async () => {
      const today = todayAsInputValue();
      if (refs.fromDate) refs.fromDate.value = today;
      if (refs.toDate) refs.toDate.value = today;
      await loadEntries();
    });

    refs.exportBtn?.addEventListener("click", () => {
      try {
        const exportDate = exportDateForFileName();
        const baseFileName = isTodayFilterActive()
          ? (state.ledgerId ? `defter-${state.ledgerId}-bugun-kayitlari` : "defter-bugun-kayitlari")
          : (state.ledgerId ? `defter-${state.ledgerId}-kayitlari` : "defter-kayitlari");

        window.ExcelExportUtils.exportRowsToExcel(
          state.currentItems,
          [
            { label: "Tarih", key: "entry_date", type: "date", width: 11 },
            { label: "Satıcı", key: "seller_name", width: 16 },
            { label: "Alıcı", key: "buyer_name", width: 16 },
            { label: "Ürün", key: "product_name", width: 14 },
            { label: "Kasa", key: "box_count", type: "integer", width: 8 },
            { label: "Kilo", key: "net_weight", type: "number", width: 10 },
            { label: "Birim Fiyat", key: "unit_price", type: "money", width: 12 },
            { label: "Toplam", key: "total_amount", type: "money", width: 12 },
            { label: "Tahsil Edilen", key: "paid_amount", type: "money", width: 13 },
            { label: "Kalan", key: "remaining_amount", type: "money", width: 12 },
            { label: "Durum", value: (row) => paymentStatusText(row.payment_status), width: 12 },
            { label: "Uyarı", value: (row) => row.weight_warning ? "Uyarılı" : "", width: 9 },
          ],
          `${baseFileName}-${exportDate}.xlsx`,
          "Kayıtlar",
          { maxColumnWidth: 16, visibleExportDate: true, exportDateText: exportDate }
        );
      } catch (err) {
        toast(err.message, "error");
      }
    });

    refs.clearBtn?.addEventListener("click", async () => {
      if (refs.fromDate) refs.fromDate.value = "";
      if (refs.toDate) refs.toDate.value = "";
      if (refs.sellerSearch) refs.sellerSearch.value = "";
      if (refs.sellerId) refs.sellerId.value = "";
      if (refs.buyerFilter) refs.buyerFilter.value = "";
      if (refs.productFilter) refs.productFilter.value = "";
      if (refs.onlyWarnings) refs.onlyWarnings.checked = false;
      hideDropdown(refs.sellerDropdown);

      await loadEntries();
    });

    refs.closeModalBtn?.addEventListener("click", closeEditModal);
    refs.cancelEditBtn?.addEventListener("click", closeEditModal);

    refs.editModal?.addEventListener("click", (e) => {
      if (e.target === refs.editModal) closeEditModal();
    });

    refs.editForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (state.pendingUpdatePayload) {
        await submitUpdate(state.pendingUpdatePayload);
        return;
      }

      await submitUpdate(buildEditPayload(false));
    });

    refs.closePaymentModalBtn?.addEventListener("click", closePaymentModal);
    refs.cancelPaymentBtn?.addEventListener("click", closePaymentModal);

    refs.paymentModal?.addEventListener("click", (e) => {
      if (e.target === refs.paymentModal) closePaymentModal();
    });

    refs.paymentForm?.addEventListener("submit", handlePaymentSubmit);

    document.addEventListener("click", (e) => {
      const target = e.target;
      const inFilterSeller =
        refs.sellerSearch?.contains(target) || refs.sellerDropdown?.contains(target);
      const inEditSeller =
        refs.editSellerSearch?.contains(target) || refs.editSellerDropdown?.contains(target);

      if (!inFilterSeller) hideDropdown(refs.sellerDropdown);
      if (!inEditSeller) hideDropdown(refs.editSellerDropdown);
    });
  }

  async function init() {
    state.ledgerId = getLedgerIdFromUrl();
    state.ledgerProductId = getLedgerProductIdFromUrl();
    await loadLookups();

    setupSellerAutocomplete({
      inputEl: refs.sellerSearch,
      hiddenEl: refs.sellerId,
      dropdownEl: refs.sellerDropdown,
    });

    setupSellerAutocomplete({
      inputEl: refs.editSellerSearch,
      hiddenEl: refs.editSellerId,
      dropdownEl: refs.editSellerDropdown,
    });

    bindStaticEvents();
    await loadEntries();
  }

  init();
})();
