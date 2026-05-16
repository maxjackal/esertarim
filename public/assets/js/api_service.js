(() => {
  const logSupabaseError = (error) => {
    console.error("Supabase error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  };

  const toNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === "") return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const toNullableNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const toNullableString = (value) => {
    const text = String(value ?? "").trim();
    return text ? text : null;
  };

  const getPaymentStatus = (totalAmount, paidAmount) => {
    const total = toNumber(totalAmount);
    const paid = toNumber(paidAmount);
    if (total <= 0 || paid <= 0) return "odenmedi";
    if (paid >= total) return "odendi";
    return "kismi_odendi";
  };

  const normalizeLedgerEntryPayload = (payload, existing = {}) => {
    const boxCount = toNumber(payload.box_count ?? existing.box_count);
    const netWeight = toNumber(payload.net_weight ?? existing.net_weight);
    const unitPrice = toNumber(payload.unit_price ?? existing.unit_price);
    const paidAmount = toNumber(payload.paid_amount ?? existing.paid_amount);
    const totalAmount = netWeight * unitPrice;
    const remainingAmount = Math.max(totalAmount - paidAmount, 0);

    return {
      ...payload,
      buyer_id: toNullableNumber(payload.buyer_id ?? existing.buyer_id),
      seller_id: toNullableNumber(payload.seller_id ?? existing.seller_id),
      product_id: toNullableNumber(payload.product_id ?? existing.product_id),
      ledger_id: toNullableNumber(payload.ledger_id ?? existing.ledger_id),
      entry_date: toNullableString(payload.entry_date ?? existing.entry_date),
      box_count: boxCount,
      net_weight: netWeight,
      avg_box_weight: boxCount > 0 ? netWeight / boxCount : 0,
      unit_price: unitPrice,
      paid_amount: paidAmount,
      total_amount: totalAmount,
      remaining_amount: remainingAmount,
      payment_status: getPaymentStatus(totalAmount, paidAmount),
      note: toNullableString(payload.note),
      weight_warning: Boolean(payload.weight_warning),
    };
  };

  const normalizeLedgerPaymentPayload = (payload) => ({
    ledger_entry_id: toNullableNumber(payload.ledger_entry_id),
    payment_date: toNullableString(payload.payment_date),
    amount: toNumber(payload.amount),
    payment_method: toNullableString(payload.payment_method) || "cash",
    note: toNullableString(payload.note),
    status: payload.status || "active",
  });

  const sanitizePayload = (tableName, payload) => {
    const cleaned = { ...payload };
    for (const [k, v] of Object.entries(cleaned)) {
      if (v === "") cleaned[k] = null;
    }
    const allowedColumns = tableSchemas[tableName];
    if (!allowedColumns) return cleaned;
    return Object.fromEntries(Object.entries(cleaned).filter(([k]) => allowedColumns.includes(k)));
  };

  const getOrCreateLedger = async ({ buyer_id }) => {
    const buyerId = toNullableNumber(buyer_id);

    if (!buyerId) {
      throw new Error("Defter oluşturmak için alıcı seçilmelidir.");
    }

    const ledgerRes = await window.sb
      .from("ledgers")
      .select("id")
      .eq("buyer_id", buyerId)
      .limit(1)
      .maybeSingle();

    if (ledgerRes.error) {
      logSupabaseError(ledgerRes.error);
      throw new Error("Defter sorgulanırken hata oluştu: " + ledgerRes.error.message);
    }

    if (ledgerRes.data?.id) return ledgerRes.data.id;

    const newLedgerPayload = sanitizePayload("ledgers", {
      buyer_id: buyerId,
    });

    const newLedger = await window.sb.from("ledgers").insert([newLedgerPayload]).select("id").single();
    if (!newLedger.error && newLedger.data?.id) return newLedger.data.id;

    if (newLedger.error?.code === "23505") {
      const fallback = await window.sb
        .from("ledgers")
        .select("id")
        .eq("buyer_id", buyerId)
        .limit(1)
        .maybeSingle();
      if (!fallback.error && fallback.data?.id) return fallback.data.id;
    }

    if (newLedger.error) {
      logSupabaseError(newLedger.error);
      throw new Error("Defter oluşturulamadı: " + newLedger.error.message);
    }

    throw new Error("Defter oluşturulamadı.");
  };

  const adjustEntryPayment = async (entryId, deltaAmount) => {
    const id = toNullableNumber(entryId);
    const delta = toNumber(deltaAmount);
    if (!id || !delta) return;

    const { data: entry, error: entryError } = await window.sb
      .from("ledger_entries")
      .select("id,total_amount,paid_amount")
      .eq("id", id)
      .single();

    if (entryError) {
      logSupabaseError(entryError);
      throw new Error("Kayıt bakiyesi okunamadı: " + entryError.message);
    }

    const totalAmount = toNumber(entry.total_amount);
    const paidAmount = Math.max(toNumber(entry.paid_amount) + delta, 0);
    const updatePayload = sanitizePayload("ledger_entries", {
      paid_amount: paidAmount,
      remaining_amount: Math.max(totalAmount - paidAmount, 0),
      payment_status: getPaymentStatus(totalAmount, paidAmount),
    });

    const { error: updateError } = await window.sb
      .from("ledger_entries")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      logSupabaseError(updateError);
      throw new Error("Kayıt bakiyesi güncellenemedi: " + updateError.message);
    }
  };

  const createCrudMethods = (tableName) => ({
    getAll: async (queryParams = {}) => {
      let query = window.sb.from(tableName).select('*');
      
      if (queryParams.order) {
         query = query.order(queryParams.order, { ascending: queryParams.ascending ?? true });
      } else {
         query = query.order('id', { ascending: false }); // Varsayılan sıralama
      }

      if (queryParams.eq) {
          for (const [key, value] of Object.entries(queryParams.eq)) {
             if (value !== null && value !== undefined && value !== '') {
                 query = query.eq(key, value);
             }
          }
      }
      
      if (queryParams.ilike) {
         for (const [key, value] of Object.entries(queryParams.ilike)) {
             if (value) query = query.ilike(key, `%${value}%`);
         }
      }

      const { data, error } = await query;
      if (error) {
        logSupabaseError(error);
        throw new Error(error.message);
      }
      return { items: data || [] };
    },
    getById: async (id) => {
      const { data, error } = await window.sb.from(tableName).select('*').eq('id', id).single();
      if (error) {
        logSupabaseError(error);
        throw new Error(error.message);
      }
      return data;
    },
    create: async (payload) => {
      if (tableName === 'ledger_entries') {
        payload = normalizeLedgerEntryPayload(payload);
        if (!payload.ledger_id) {
          payload.ledger_id = await getOrCreateLedger(payload);
        }
      }

      if (tableName === 'ledger_payments') {
        payload = normalizeLedgerPaymentPayload(payload);
      }

      const sanitized = sanitizePayload(tableName, payload);
      const { data, error } = await window.sb.from(tableName).insert([sanitized]).select();
      if (error) {
        logSupabaseError(error);
        throw new Error(error.message);
      }
      const created = data ? data[0] : null;

      if (tableName === 'ledger_payments' && created?.status !== "cancelled") {
        await adjustEntryPayment(created.ledger_entry_id, created.amount);
      }

      return created;
    },
    update: async (id, payload) => {
      let before = null;
      if (tableName === 'ledger_payments') {
        const { data: oldRow, error: oldError } = await window.sb
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        if (oldError) {
          logSupabaseError(oldError);
          throw new Error(oldError.message);
        }
        before = oldRow;
        payload = normalizeLedgerPaymentPayload({ ...before, ...payload });
      }

      if (tableName === 'ledger_entries') {
        const { data: existing, error: existingError } = await window.sb
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        if (existingError) {
          logSupabaseError(existingError);
          throw new Error(existingError.message);
        }

        payload = normalizeLedgerEntryPayload(payload, existing);
        if (!payload.ledger_id) {
          payload.ledger_id = await getOrCreateLedger(payload);
        }
      }

      const sanitized = sanitizePayload(tableName, payload);
      const { data, error } = await window.sb.from(tableName).update(sanitized).eq('id', id).select();
      if (error) {
        logSupabaseError(error);
        throw new Error(error.message);
      }
      const updated = data ? data[0] : null;

      if (
        tableName === 'ledger_payments' &&
        before?.status !== "cancelled" &&
        updated?.status === "cancelled"
      ) {
        await adjustEntryPayment(before.ledger_entry_id, -toNumber(before.amount));
      }

      return updated;
    },
    delete: async (id) => {
      const { error } = await window.sb.from(tableName).delete().eq('id', id);
      if (error) {
        logSupabaseError(error);
        throw new Error(error.message);
      }
      return true;
    }
  });

  const tableSchemas = {
    buyers: ['id', 'name', 'phone', 'plate_no', 'address', 'created_at', 'note'],
    sellers: ['id', 'first_name', 'last_name', 'phone', 'address', 'created_at', 'note'],
    products: ['id', 'name', 'created_at', 'min_box_weight', 'max_box_weight'],
    ledgers: ['id', 'buyer_id', 'created_at'],
    ledger_entries: ['id', 'ledger_id', 'created_at', 'buyer_id', 'seller_id', 'product_id', 'box_count', 'net_weight', 'avg_box_weight', 'total_amount', 'remaining_amount', 'unit_price', 'paid_amount', 'payment_status', 'note', 'weight_warning', 'entry_date'],
    ledger_payments: ['id', 'created_at', 'note', 'status', 'ledger_entry_id', 'amount', 'payment_method', 'payment_date']
  };

  window.ApiService = {
    products: createCrudMethods('products'),
    buyers: createCrudMethods('buyers'),
    sellers: createCrudMethods('sellers'),
    ledgers: createCrudMethods('ledgers'),
    ledgerEntries: createCrudMethods('ledger_entries'),
    ledgerPayments: createCrudMethods('ledger_payments'),
    
    // Kompleks (Join içeren) Sorgular
    custom: {
       getLedgerEntriesWithRelations: async (filters = {}) => {
          // Supabase'in Foreign Key ilişkilerini kullanarak join atıyoruz.
          let query = window.sb.from('ledger_entries').select(`
             *,
             buyer:buyer_id (id, name),
             seller:seller_id (id, first_name, last_name),
             product:product_id (id, name)
          `).order('entry_date', { ascending: false });
          
          if (filters.id) query = query.eq('id', filters.id);
          if (filters.date) query = query.eq('entry_date', filters.date);
          if (filters.startDate) query = query.gte('entry_date', filters.startDate);
          if (filters.endDate) query = query.lte('entry_date', filters.endDate);
          if (filters.buyer_id) query = query.eq('buyer_id', filters.buyer_id);
          if (filters.seller_id) query = query.eq('seller_id', filters.seller_id);
          if (filters.product_id) query = query.eq('product_id', filters.product_id);
          if (filters.status) query = query.eq('payment_status', filters.status);

          const { data, error } = await query;
          if (error) throw new Error(error.message);
          return { items: data || [] };
       },
       
       getPaymentsWithRelations: async (filters = {}) => {
          let query = window.sb.from('ledger_payments').select(`
             *,
             ledger_entry:ledger_entry_id (
                id,
                entry_date,
                buyer:buyer_id (id, name),
                seller:seller_id (id, first_name, last_name),
                product:product_id (id, name)
             )
          `).order('payment_date', { ascending: false });

          if (filters.ledger_entry_id) query = query.eq('ledger_entry_id', filters.ledger_entry_id);
          if (filters.startDate) query = query.gte('payment_date', filters.startDate);
          if (filters.endDate) query = query.lte('payment_date', filters.endDate);
          if (filters.payment_method) query = query.eq('payment_method', filters.payment_method);

          const { data, error } = await query;
          if (error) throw new Error(error.message);
          return { items: data || [] };
       },

       getDashboardStats: async () => {
          // Basit bir dashboard hesaplaması için gerekli verileri tek seferde çekebilirsiniz
          // veya ayrı ayrı fetch edebilirsiniz.
          // Örnekte ayrı ayrı alıp JS'de topluyoruz.
          const [buyersRes, sellersRes, productsRes] = await Promise.all([
             window.sb.from('buyers').select('*', { count: 'exact', head: true }),
             window.sb.from('sellers').select('*', { count: 'exact', head: true }),
             window.sb.from('products').select('*', { count: 'exact', head: true })
          ]);
          
          return {
             total_buyers: buyersRes.count || 0,
             total_sellers: sellersRes.count || 0,
             total_products: productsRes.count || 0
          };
       }
    }
  };
})();
