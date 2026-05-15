(() => {
  const paymentId = Number(window.location.pathname.split("/").pop() || 0);

  const $ = (id) => document.getElementById(id);

  const refs = {
    receiptNo: $("receiptNo"),
    receiptFooterNo: $("receiptFooterNo"),
    paymentDate: $("paymentDate"),
    createdBy: $("createdBy"),
    sellerName: $("sellerName"),
    buyerName: $("buyerName"),
    productName: $("productName"),
    entryDate: $("entryDate"),
    amount: $("amount"),
    paymentMethod: $("paymentMethod"),
    note: $("note"),
  };

  function formatMoney(value) {
    return `${new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0))} ₺`;
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



  async function loadReceipt() {
    if (!paymentId) {
      if (window.Toast?.show) window.Toast.show("Geçersiz ödeme id", "error");
      else alert("Geçersiz ödeme id");
      return;
    }

    try {
      const { data, error } = await window.sb.from('ledger_payments').select(`
        *,
        ledger_entry:ledger_entry_id (
          date,
          buyer:buyer_id (name),
          seller:seller_id (first_name, last_name),
          product:product_id (name)
        )
      `).eq('id', paymentId).single();

      if (error) throw error;
      if (!data) throw new Error("Makbuz bulunamadı");
      
      const entry = data.ledger_entry || {};
      const seller = entry.seller || {};
      const receiptNo = `TAH-${String(data.id).padStart(5, '0')}`;

      refs.receiptNo.textContent = receiptNo;
      refs.receiptFooterNo.textContent = `Makbuz No: ${receiptNo}`;
      refs.paymentDate.textContent = data.payment_date || "-";
      refs.createdBy.textContent = data.created_by || "-";
      refs.sellerName.textContent = `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || "-";
      refs.buyerName.textContent = entry.buyer?.name || "-";
      refs.productName.textContent = entry.product?.name || "-";
      refs.entryDate.textContent = entry.date || "-";
      refs.amount.textContent = formatMoney(data.amount || 0);
      refs.paymentMethod.textContent = paymentMethodLabel(data.payment_method);
      refs.note.textContent = data.note || "-";

      document.title = `${receiptNo} | Tahsilat Makbuzu | Eser Tarım`;
    } catch (err) {
      if (window.Toast?.show) window.Toast.show(err.message || "Makbuz yüklenemedi", "error");
      else alert(err.message || "Makbuz yüklenemedi");
    }
  }

  loadReceipt();
})();