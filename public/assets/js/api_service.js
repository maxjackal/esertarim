(() => {
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
      if (error) throw new Error(error.message);
      return { items: data || [] };
    },
    getById: async (id) => {
      const { data, error } = await window.sb.from(tableName).select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return data;
    },
    create: async (payload) => {
      const allowedColumns = tableSchemas[tableName];
      const sanitized = allowedColumns ? Object.fromEntries(Object.entries(payload).filter(([k]) => allowedColumns.includes(k))) : payload;
      const { data, error } = await window.sb.from(tableName).insert([sanitized]).select();
      if (error) throw new Error(error.message);
      return data ? data[0] : null;
    },
    update: async (id, payload) => {
      const allowedColumns = tableSchemas[tableName];
      const sanitized = allowedColumns ? Object.fromEntries(Object.entries(payload).filter(([k]) => allowedColumns.includes(k))) : payload;
      const { data, error } = await window.sb.from(tableName).update(sanitized).eq('id', id).select();
      if (error) throw new Error(error.message);
      return data ? data[0] : null;
    },
    delete: async (id) => {
      const { error } = await window.sb.from(tableName).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }
  });

  const tableSchemas = {
    buyers: ['id', 'name', 'phone', 'address', 'created_at', 'note'],
    sellers: ['id', 'first_name', 'last_name', 'phone', 'address', 'created_at', 'note'],
    products: ['id', 'name', 'created_at', 'min_box_weight', 'max_box_weight'],
    ledger_entries: ['id', 'created_at', 'buyer_id', 'seller_id', 'product_id', 'box_count', 'net_weight', 'total_amount', 'remaining_amount', 'unit_price', 'paid_amount', 'note', 'weight_warning', 'entry_date'],
    ledger_payments: ['id', 'created_at', 'note', 'status', 'ledger_entry_id', 'amount', 'payment_method', 'payment_date']
  };

  window.ApiService = {
    products: createCrudMethods('products'),
    buyers: createCrudMethods('buyers'),
    sellers: createCrudMethods('sellers'),
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
          
          if (filters.startDate) query = query.gte('entry_date', filters.startDate);
          if (filters.endDate) query = query.lte('entry_date', filters.endDate);
          if (filters.buyer_id) query = query.eq('buyer_id', filters.buyer_id);
          if (filters.seller_id) query = query.eq('seller_id', filters.seller_id);
          if (filters.product_id) query = query.eq('product_id', filters.product_id);
          if (filters.status) query = query.eq('status', filters.status);

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
