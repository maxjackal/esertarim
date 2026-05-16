(() => {
  const refs = {
    buyerFilter: document.getElementById("buyerFilter"),
    productFilter: document.getElementById("productFilter"),
    filterBtn: document.getElementById("filterBtn"),
    tbody: document.getElementById("ledgerTableBody"),
  };

  function toast(message, type = "info") {
    if (window.Toast?.show) {
      window.Toast.show(message, type);
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



  function fillSelect(selectEl, items, placeholder, labelKey) {
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    (items || []).forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item[labelKey];
      selectEl.appendChild(opt);
    });
  }

  function rowTemplate(item) {
    return `
      <tr class="border-b border-slate-100">
        <td class="py-3 pr-4 font-medium">${item.buyer_name || ""}</td>
        <td class="py-3 pr-4">${item.product_name || ""}</td>
        <td class="py-3 pr-4">${item.entry_count || 0}</td>
        <td class="py-3 pr-4">${item.total_boxes || 0}</td>
        <td class="py-3 pr-4">${formatNumber(item.total_weight)}</td>
        <td class="py-3 pr-4">${formatNumber(item.total_amount)} ₺</td>
        <td class="py-3 pr-4">${formatNumber(item.total_remaining)} ₺</td>
        <td class="py-3 pr-4">${item.last_entry_date || "-"}</td>
        <td class="py-3 pr-4">
          <a
            href="/pages/ledger-detail.html?id=${item.id}"
            class="inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Detay
          </a>
        </td>
      </tr>
    `;
  }

  async function loadLookups() {
    try {
      const [buyersRes, productsRes] = await Promise.all([
        window.ApiService.buyers.getAll(),
        window.ApiService.products.getAll(),
      ]);

      fillSelect(refs.buyerFilter, buyersRes.items || [], "Tüm Alıcılar", "name");
      fillSelect(refs.productFilter, productsRes.items || [], "Tüm Ürünler", "name");
    } catch (err) {
      toast(err.message);
    }
  }

  async function loadLedgers() {
    try {
      const filters = {};
      if (refs.buyerFilter.value) filters.buyer_id = refs.buyerFilter.value;
      if (refs.productFilter.value) filters.product_id = refs.productFilter.value;

      const { items } = await window.ApiService.custom.getLedgerEntriesWithRelations(filters);
      
      const ledgerGroups = {};
      items.forEach(e => {
          const key = `${e.buyer_id}_${e.product_id}`;
          if (!ledgerGroups[key]) {
              ledgerGroups[key] = {
                  id: e.id, // Just an entry id for detail link
                  buyer_name: e.buyer?.name,
                  product_name: e.product?.name,
                  entry_count: 0,
                  total_boxes: 0,
                  total_weight: 0,
                  total_amount: 0,
                  total_remaining: 0,
                  last_entry_date: e.entry_date
              };
          }
          const group = ledgerGroups[key];
          group.entry_count++;
          group.total_boxes += (e.box_count || 0);
          group.total_weight += (e.net_weight || 0);
          group.total_amount += (e.total_amount || 0);
          group.total_remaining += (e.remaining_amount || 0);
          if (new Date(e.entry_date) > new Date(group.last_entry_date)) {
              group.last_entry_date = e.entry_date;
              group.id = e.id;
          }
      });
      
      const groupedItems = Object.values(ledgerGroups);

      refs.tbody.innerHTML = groupedItems.map(rowTemplate).join("");
    } catch (err) {
      toast(err.message);
    }
  }

  refs.filterBtn.addEventListener("click", loadLedgers);

  async function init() {
    await loadLookups();
    await loadLedgers();
  }

  init();
})();