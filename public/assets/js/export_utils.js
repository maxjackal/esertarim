(() => {
  const ACTION_HEADERS = new Set(["işlem", "islem", "actions", "action"]);
  const MONEY_FORMAT = '#,##0.00 "₺"';
  const NUMBER_FORMAT = "#,##0.00";
  const INTEGER_FORMAT = "#,##0";
  const DATE_FORMAT = "yyyy-mm-dd";
  const DEFAULT_WATERMARK = "ESER TARIM YUSUF ESER";

  function ensureXlsx() {
    if (!window.XLSX) {
      throw new Error("Excel kütüphanesi yüklenemedi. Lütfen bağlantınızı kontrol edin.");
    }
  }

  function normalizeFileName(fileName) {
    const fallback = "rapor.xlsx";
    const raw = String(fileName || fallback).trim() || fallback;
    return /\.(xlsx|xls|csv)$/i.test(raw) ? raw : `${raw}.xlsx`;
  }

  function isHidden(el) {
    if (!el) return true;
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return true;
    const style = window.getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  function isExcludedHeader(text) {
    const key = String(text || "").trim().toLocaleLowerCase("tr-TR");
    return !key || ACTION_HEADERS.has(key);
  }

  function parseTurkishNumber(text) {
    const raw = String(text ?? "").replace(/\s/g, "");
    if (!raw) return null;
    const cleaned = raw.replace(/[₺%]/g, "");
    if (!/^-?[\d.,]+$/.test(cleaned)) return null;

    const decimalComma = cleaned.includes(",");
    const normalized = decimalComma
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  function parseDate(text) {
    const raw = String(text ?? "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function inferCell(value, explicitType) {
    if (value === null || value === undefined || value === "") return { v: "" };
    if (value instanceof Date) return { v: value, t: "d", z: DATE_FORMAT };
    if (typeof value === "number") return { v: value, t: "n", z: NUMBER_FORMAT };

    const text = String(value).trim();
    if (!text) return { v: "" };

    if (explicitType === "date") {
      const date = parseDate(text);
      if (date) return { v: date, t: "d", z: DATE_FORMAT };
    }

    if (explicitType === "money") {
      const number = parseTurkishNumber(text);
      if (number !== null) return { v: number, t: "n", z: MONEY_FORMAT };
    }

    if (explicitType === "number" || explicitType === "integer") {
      const number = parseTurkishNumber(text);
      if (number !== null) {
        return { v: number, t: "n", z: explicitType === "integer" ? INTEGER_FORMAT : NUMBER_FORMAT };
      }
    }

    if (!explicitType) {
      const date = parseDate(text);
      if (date) return { v: date, t: "d", z: DATE_FORMAT };

      const number = parseTurkishNumber(text);
      if (number !== null && /[0-9]/.test(text)) {
        return { v: number, t: "n", z: text.includes("₺") ? MONEY_FORMAT : NUMBER_FORMAT };
      }
    }

    return { v: text, t: "s" };
  }

  function applyWatermark(ws, watermarkText = DEFAULT_WATERMARK) {
    if (!watermarkText) return;

    const watermark = String(watermarkText).trim();
    if (!watermark) return;

    ws["!headerFooter"] = {
      oddHeader: `&C&KDDDDDD&36${watermark}`,
      evenHeader: `&C&KDDDDDD&36${watermark}`,
      firstHeader: `&C&KDDDDDD&36${watermark}`,
    };
    ws["!pageSetup"] = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    };
    ws["!margins"] = {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    };
  }

  function getColumnWidth(rows, columns, index, header, options = {}) {
    const col = columns[index] || {};
    if (col.width) return { wch: col.width };

    const minWidth = col.minWidth || options.minColumnWidth || 8;
    const maxWidth = col.maxWidth || options.maxColumnWidth || 22;
    const contentWidth = Math.max(
      String(header).length + 2,
      ...rows.map((row) => String(
        typeof col.value === "function" ? col.value(row) : row?.[col.key] ?? ""
      ).length + 2),
      minWidth
    );

    return { wch: Math.min(contentWidth, maxWidth) };
  }

  function sheetFromRows(rows, columns, options = {}) {
    const headers = columns.map((col) => col.label);
    const watermarkText = options.watermarkText ?? DEFAULT_WATERMARK;
    const watermark = String(watermarkText || "").trim();
    const hasVisibleWatermark = watermark && options.visibleWatermark !== false;
    const headerRowIndex = hasVisibleWatermark ? 1 : 0;
    const aoa = hasVisibleWatermark ? [[watermark], headers] : [headers];

    rows.forEach((row) => {
      aoa.push(columns.map((col) => {
        const value = typeof col.value === "function" ? col.value(row) : row?.[col.key];
        return inferCell(value, col.type);
      }));
    });

    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    aoa.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (!cell || typeof cell !== "object" || !("v" in cell)) return;
        const ref = window.XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        ws[ref] = { ...ws[ref], ...cell };
      });
    });
    if (hasVisibleWatermark && headers.length) {
      ws["!merges"] = [
        ...(ws["!merges"] || []),
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      ];
      ws["!rows"] = [{ hpt: 24 }];
    }
    ws["!cols"] = headers.map((header, index) => getColumnWidth(rows, columns, index, header, options));
    if (rows.length) {
      ws["!autofilter"] = {
        ref: window.XLSX.utils.encode_range({
          s: { r: headerRowIndex, c: 0 },
          e: { r: headerRowIndex + rows.length, c: headers.length - 1 },
        }),
      };
    }
    applyWatermark(ws, watermarkText);
    return ws;
  }

  function exportRowsToExcel(rows, columns, fileName = "rapor.xlsx", sheetName = "Rapor", options = {}) {
    ensureXlsx();
    const usableColumns = (columns || []).filter((col) => col && col.label && !col.hidden);
    const ws = sheetFromRows(rows || [], usableColumns, options);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, sheetName || "Rapor");
    window.XLSX.writeFile(wb, normalizeFileName(fileName));
  }

  function exportRowsToCsv(rows, columns, fileName = "rapor.csv", sheetName = "Rapor", options = {}) {
    ensureXlsx();
    const usableColumns = (columns || []).filter((col) => col && col.label && !col.hidden);
    const ws = sheetFromRows(rows || [], usableColumns, options);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, sheetName || "Rapor");
    window.XLSX.writeFile(wb, normalizeFileName(fileName).replace(/\.xlsx$/i, ".csv"), { bookType: "csv" });
  }

  function exportTableToExcel(tableSelector, fileName = "rapor.xlsx", sheetName = "Rapor", options = {}) {
    const table = typeof tableSelector === "string" ? document.querySelector(tableSelector) : tableSelector;
    if (!table) throw new Error("Dışa aktarılacak tablo bulunamadı.");

    const headers = Array.from(table.querySelectorAll("thead th"));
    const includedIndexes = headers
      .map((th, index) => ({ th, index, label: th.textContent.trim() }))
      .filter(({ th, label }) => !isHidden(th) && !isExcludedHeader(label))
      .filter(({ index }) => {
        const firstCell = table.querySelector(`tbody tr td:nth-child(${index + 1})`);
        return !firstCell?.querySelector?.('input[type="checkbox"]');
      });

    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .filter((tr) => !isHidden(tr) && tr.querySelectorAll("td").length)
      .map((tr) => {
        const cells = Array.from(tr.children);
        const item = {};
        includedIndexes.forEach(({ index, label }) => {
          item[label] = cells[index]?.innerText?.trim() || "";
        });
        return item;
      })
      .filter((row) => Object.values(row).some((value) => value !== ""));

    exportRowsToExcel(rows, includedIndexes.map(({ label }) => ({ label, key: label })), fileName, sheetName, options);
  }

  window.ExcelExportUtils = {
    exportTableToExcel,
    exportRowsToExcel,
    exportRowsToCsv,
  };
  window.exportTableToExcel = exportTableToExcel;
  window.exportRowsToExcel = exportRowsToExcel;
})();
