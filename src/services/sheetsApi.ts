/**
 * Google Sheets API Service for TRCN Laundry Cashier
 * Direct client-side calls with OAuth Bearer token
 */

import { getWeekInfoForDate } from '../utils/dateUtils';

export interface DayHeaderSummary {
  rowNumber: number; // 1-indexed sheet row
  dateText: string;
  totalWasher: number;
  totalDryer: number;
  totalCash: number;
  totalQris: number;
  totalTxBayar: number;
  label: string; // "TOTAL TX"
}

export interface SheetTransactionRow {
  rowNumber: number; // 1-indexed sheet row
  slotNumber: number; // 1 to 20
  isEmpty: boolean;
  customer: string;
  phoneNumber: string;
  paymentMode: string; // QRIS / CASH
  item: string;
  jumlah: string;
  paket: string;
  washerCoins: number;
  dryerCoins: number;
  hargaCash: number;
  hargaQris: number;
  bayar: number; // Rendered formula value
  bayarFormula?: string; // e.g. '=IF(M4="LUNAS",N(J4)+N(K4),0)'
  status: 'LUNAS' | 'TIDAK LUNAS' | string;
  note: string;
}

export interface DayBlockResult {
  found: boolean;
  tabName: string;
  dayOfMonth: number;
  headerRow?: DayHeaderSummary;
  rows: SheetTransactionRow[];
  firstEmptyRow?: number; // 1-indexed sheet row for writing next transaction
  filledRowCount: number;
  rawRows?: any[][];
  error?: string;
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
  tabs: string[];
}

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * Searches user's Google Drive for spreadsheets (especially KASIR TRCN ...)
 */
export async function searchDriveSpreadsheets(accessToken: string): Promise<DriveFileInfo[]> {
  const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,modifiedTime)`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Drive search error:', response.status, errorText);
    throw new Error(`Gagal mencari file di Google Drive (${response.status}). Periksa koneksi akun Google.`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Fetches spreadsheet metadata (name and tab sheet names)
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetInfo> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(title,sheetId,index)`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File spreadsheet dengan ID "${spreadsheetId}" tidak ditemukan. Pastikan link/ID benar.`);
    } else if (response.status === 403) {
      throw new Error('Akses ke Google Sheet ditolak. Pastikan akun Google Anda memiliki akses ke file ini.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal membaca informasi spreadsheet (${response.status}).`);
  }

  const data = await response.json();
  const tabs = (data.sheets || []).map((s: any) => s.properties?.title as string);

  return {
    id: spreadsheetId,
    name: data.properties?.title || 'Spreadsheet TRCN',
    tabs,
  };
}

/**
 * Helper to parse numbers safely
 */
function parseNum(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Normalizes date strings for comparison
 * e.g. "1-Oct-2026", "01/10/2026", "2026-10-01", "1 Oct 2026", "1"
 */
function isDateMatch(cellValue: any, dayOfMonth: number, isoDateStr: string): boolean {
  if (cellValue === undefined || cellValue === null) return false;
  const str = String(cellValue).trim().toLowerCase();
  if (!str) return false;

  const [y, m, d] = isoDateStr.split('-').map(Number);
  const dayStr = String(dayOfMonth);
  const dayPadded = String(dayOfMonth).padStart(2, '0');

  // Exact ISO
  if (str === isoDateStr) return true;

  // Exact number of day in month (e.g. 1 or 01)
  if (str === dayStr || str === dayPadded) return true;

  // Month aliases
  const monthShorts = ['jan', 'feb', 'mar', 'apr', 'may', 'mei', 'jun', 'jul', 'aug', 'agu', 'sep', 'oct', 'okt', 'nov', 'dec', 'des'];
  const monthIdx = m - 1;
  const currentMonthShort = monthShorts[monthIdx] || '';

  // Patterns like "1-oct-2026", "01-oct", "1 oct", "01/10", "1/10/2026"
  if (str.includes(currentMonthShort) && (str.includes(` ${dayStr} `) || str.startsWith(`${dayStr}-`) || str.startsWith(`${dayPadded}-`) || str.startsWith(`${dayStr} `) || str.startsWith(`${dayPadded} `))) {
    return true;
  }

  // Numerical day/month e.g. "1/10" or "01/10" or "1-10" or "01-10"
  if (str.startsWith(`${dayStr}/${m}`) || str.startsWith(`${dayPadded}/${m}`) || str.startsWith(`${dayStr}-${m}`) || str.startsWith(`${dayPadded}-${m}`)) {
    return true;
  }

  return false;
}

/**
 * Finds the actual tab name in the spreadsheet that matches the target week number (1..4)
 */
export function findBestMatchingWeekTab(
  availableTabs: string[],
  weekNumber: number
): string | null {
  if (!availableTabs || availableTabs.length === 0) return null;
  const wStr = String(weekNumber);

  // 1. Exact match (case-insensitive & trimmed) e.g. "TRANSAKSI WEEK 1"
  const exact = availableTabs.find(
    (t) => t.trim().toUpperCase() === `TRANSAKSI WEEK ${wStr}`
  );
  if (exact) return exact;

  // 2. Contains "TRANSAKSI" and "WEEK" and week number e.g. "TRANSAKSI October 2026 - Week 1"
  const withTxAndWeek = availableTabs.find((t) => {
    const upper = t.toUpperCase();
    return (
      upper.includes('TRANSAKSI') &&
      (upper.includes(`WEEK ${wStr}`) ||
        upper.includes(`WEEK${wStr}`) ||
        upper.includes(`WEEK-${wStr}`) ||
        upper.includes(`MINGGU ${wStr}`))
    );
  });
  if (withTxAndWeek) return withTxAndWeek;

  // 3. Contains "WEEK" and week number, excluding non-transaction tabs
  const withWeek = availableTabs.find((t) => {
    const upper = t.toUpperCase();
    return (
      (upper.includes(`WEEK ${wStr}`) ||
        upper.includes(`WEEK${wStr}`) ||
        upper.includes(`MINGGU ${wStr}`)) &&
      !upper.includes('STOCK') &&
      !upper.includes('STOK') &&
      !upper.includes('COIN') &&
      !upper.includes('NOTE') &&
      !upper.includes('JOBDESC')
    );
  });
  if (withWeek) return withWeek;

  // 4. Any tab containing "TRANSAKSI" and the number
  const withTx = availableTabs.find((t) => {
    const upper = t.toUpperCase();
    return upper.includes('TRANSAKSI') && upper.includes(wStr);
  });
  if (withTx) return withTx;

  return null;
}

/**
 * Reads a day block of transactions from the target week tab in the spreadsheet
 */
export async function readDayBlock(
  spreadsheetId: string,
  targetWeekTab: string,
  isoDateStr: string,
  accessToken: string,
  availableTabs?: string[]
): Promise<DayBlockResult> {
  const weekInfo = getWeekInfoForDate(isoDateStr);
  let tabs = availableTabs;

  // If availableTabs not provided or empty, fetch spreadsheet sheet titles
  if (!tabs || tabs.length === 0) {
    try {
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        tabs = (metaData.sheets || []).map((s: any) => s.properties?.title as string);
      }
    } catch (e) {
      console.warn('Failed to fetch spreadsheet metadata in readDayBlock:', e);
    }
  }

  // Determine actual target tab
  let targetTab = targetWeekTab;
  if (tabs && tabs.length > 0) {
    const matched = findBestMatchingWeekTab(tabs, weekInfo.weekNumber);
    if (matched) {
      targetTab = matched;
    } else {
      const candidateTabs = tabs.filter(
        (t) => !t.toUpperCase().includes('NOTE') && !t.toUpperCase().includes('JOBDESC')
      );
      return {
        found: false,
        tabName: targetWeekTab,
        dayOfMonth: weekInfo.dayOfMonth,
        rows: [],
        filledRowCount: 0,
        error: `Tab untuk Minggu ke-${weekInfo.weekNumber} tidak ditemukan di Google Sheet. Tab yang terdeteksi: ${
          candidateTabs.join(', ') || tabs.join(', ')
        }`,
      };
    }
  }

  // Fetch up to 500 rows of columns A..N to support unlimited transaction rows per day block
  const safeTab = targetTab.replace(/'/g, "''");
  const range = `'${safeTab}'!A1:N500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File spreadsheet atau tab "${targetTab}" tidak ditemukan.`);
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gagal mengambil data tab "${targetTab}" (${response.status})`);
  }

  const data = await response.json();
  const rawRows: any[][] = data.values || [];

  if (rawRows.length < 4) {
    return {
      found: false,
      tabName: targetTab,
      dayOfMonth: weekInfo.dayOfMonth,
      rows: [],
      filledRowCount: 0,
      error: `Tab "${targetTab}" belum memiliki data atau struktur Day Block yang sesuai.`,
    };
  }

  // Scan for Day Block header:
  // Look for a row starting from index 3 (row 4 in sheet) where Column B matches the date or day
  // Or where Column M contains "TOTAL TX" and Col A is empty or date
  let headerRowIndex = -1;

  for (let i = 3; i < rawRows.length; i++) {
    const row = rawRows[i] || [];
    const colB = row[1]; // Column B (index 1)
    const colM = row[12]; // Column M (index 12)

    // Check if this row is a day block header
    const hasTotalTxLabel = String(colM || '').toUpperCase().includes('TOTAL TX');
    const matchesDate = isDateMatch(colB, weekInfo.dayOfMonth, isoDateStr);

    if (matchesDate || (hasTotalTxLabel && isDateMatch(colB, weekInfo.dayOfMonth, isoDateStr))) {
      headerRowIndex = i;
      break;
    }
  }

  // If not found by date string matching, calculate standard slot in week:
  if (headerRowIndex === -1) {
    let dayIndexInWeek = 0;
    if (weekInfo.weekNumber === 1) {
      dayIndexInWeek = weekInfo.dayOfMonth - 1;
    } else if (weekInfo.weekNumber === 2) {
      dayIndexInWeek = weekInfo.dayOfMonth - 8;
    } else if (weekInfo.weekNumber === 3) {
      dayIndexInWeek = weekInfo.dayOfMonth - 15;
    } else {
      dayIndexInWeek = weekInfo.dayOfMonth - 22;
    }

    if (dayIndexInWeek >= 0 && dayIndexInWeek <= 6) {
      const calculatedRow = 3 + dayIndexInWeek * 22;
      if (calculatedRow < rawRows.length) {
        headerRowIndex = calculatedRow;
      }
    }
  }

  if (headerRowIndex === -1 || headerRowIndex >= rawRows.length) {
    return {
      found: false,
      tabName: targetTab,
      dayOfMonth: weekInfo.dayOfMonth,
      rows: [],
      filledRowCount: 0,
      error: `Blok tanggal ${isoDateStr} (Hari ke-${weekInfo.dayOfMonth}) tidak ditemukan pada tab "${targetTab}".`,
    };
  }

  const headerRowData = rawRows[headerRowIndex] || [];
  const headerSummary: DayHeaderSummary = {
    rowNumber: headerRowIndex + 1,
    dateText: String(headerRowData[1] || `Hari ke-${weekInfo.dayOfMonth}`),
    totalWasher: parseNum(headerRowData[7]),
    totalDryer: parseNum(headerRowData[8]),
    totalCash: parseNum(headerRowData[9]),
    totalQris: parseNum(headerRowData[10]),
    label: String(headerRowData[12] || 'TOTAL TX'),
    totalTxBayar: parseNum(headerRowData[13]),
  };

  // Find where the next day header begins (so we can read unlimited rows for this day)
  let nextDayHeaderIndex = rawRows.length;
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = (rawRows[i] || []) as any[];
    const colM = String(row[12] || '').toUpperCase();
    if (colM.includes('TOTAL TX')) {
      nextDayHeaderIndex = i;
      break;
    }
  }

  // Dynamic row extraction: supports unlimited transaction rows (default min 20 rows, or more if present)
  const rows: SheetTransactionRow[] = [];
  let firstEmptyRow: number | undefined = undefined;
  let filledRowCount = 0;

  const totalSlotsToScan = Math.max(20, nextDayHeaderIndex - (headerRowIndex + 1));

  for (let offset = 1; offset <= totalSlotsToScan; offset++) {
    const rowIndex = headerRowIndex + offset;
    // Don't cross into the next day's header
    if (rowIndex >= nextDayHeaderIndex && nextDayHeaderIndex < rawRows.length) {
      break;
    }

    const row = (rawRows[rowIndex] || []) as any[];
    const sheetRowNumber = rowIndex + 1; // 1-indexed

    const parsedSlot = parseNum(row[0]);
    const slotNumber = parsedSlot > 0 ? parsedSlot : offset;

    const customer = String(row[1] || '').trim();
    const phoneNumber = String(row[2] || '').trim();
    const paymentMode = String(row[3] || '').trim();
    const item = String(row[4] || '').trim();
    const jumlah = String(row[5] || '').trim();
    const paket = String(row[6] || '').trim();
    const washerCoins = parseNum(row[7]);
    const dryerCoins = parseNum(row[8]);
    const hargaCash = parseNum(row[9]);
    const hargaQris = parseNum(row[10]);
    const bayar = parseNum(row[11]);
    const status = String(row[12] || '').trim() as 'LUNAS' | 'TIDAK LUNAS' | string;
    const note = String(row[13] || '').trim();

    // Check if slot is empty: no customer and no bayar/amounts
    const isEmpty = !customer && !phoneNumber && !item && !paket && hargaCash === 0 && hargaQris === 0;

    if (!isEmpty) {
      filledRowCount++;
    } else if (firstEmptyRow === undefined) {
      firstEmptyRow = sheetRowNumber;
    }

    rows.push({
      rowNumber: sheetRowNumber,
      slotNumber,
      isEmpty,
      customer,
      phoneNumber,
      paymentMode: paymentMode || (hargaCash > 0 && hargaQris > 0 ? 'SPLIT' : hargaCash > 0 ? 'CASH' : hargaQris > 0 ? 'QRIS' : ''),
      item,
      jumlah,
      paket,
      washerCoins,
      dryerCoins,
      hargaCash,
      hargaQris,
      bayar,
      status: status || (isEmpty ? '' : 'PENDING'),
      note,
    });
  }

  return {
    found: true,
    tabName: targetTab,
    dayOfMonth: weekInfo.dayOfMonth,
    headerRow: headerSummary,
    rows,
    firstEmptyRow,
    filledRowCount,
    rawRows: rawRows.slice(headerRowIndex, headerRowIndex + 22),
  };
}

export interface TransactionInput {
  customer: string;
  phoneNumber: string;
  paymentMode: 'QRIS' | 'CASH' | 'SPLIT';
  item: string;
  jumlah: string;
  paket: string;
  washerCoins: number;
  dryerCoins: number;
  hargaCash: number;
  hargaQris: number;
  status: 'LUNAS' | 'TIDAK LUNAS';
  note: string;
}

export interface SaveBatchResult {
  success: boolean;
  tabName: string;
  savedCount: number;
  savedSlots: number[];
  savedRows: number[];
}

/**
 * Saves a batch of transactions into the first empty numbered rows of the day block.
 * CRITICAL SAFETY RULES ENFORCED:
 * 1. Writes ONLY into empty numbered rows (Col A: 1..20) of the target day block.
 * 2. NEVER overwrites Col L (BAYAR formula) or header/total formulas.
 * 3. NEVER overwrites Col O (BALANCE COIN side panel).
 * 4. NEVER appends rows at the bottom of the tab.
 */
export async function saveBatchTransactions(
  spreadsheetId: string,
  targetWeekTab: string,
  isoDateStr: string,
  transactions: TransactionInput[],
  accessToken: string,
  availableTabs?: string[]
): Promise<SaveBatchResult> {
  if (!transactions || transactions.length === 0) {
    throw new Error('Tidak ada data transaksi yang disimpan.');
  }

  // 1. Fetch current day block to determine exact empty slots
  const dayBlock = await readDayBlock(spreadsheetId, targetWeekTab, isoDateStr, accessToken, availableTabs);
  if (!dayBlock.found) {
    throw new Error(dayBlock.error || `Blok tanggal ${isoDateStr} tidak ditemukan di Google Sheet.`);
  }

  const emptySlots = dayBlock.rows.filter((r) => r.isEmpty);
  const safeTab = dayBlock.tabName.replace(/'/g, "''");
  const updateData: { range: string; values: any[][] }[] = [];
  const savedSlots: number[] = [];
  const savedRows: number[] = [];

  const lastExistingRow = dayBlock.rows.length > 0 
    ? dayBlock.rows[dayBlock.rows.length - 1].rowNumber 
    : (dayBlock.headerRow ? dayBlock.headerRow.rowNumber + 20 : 24);
  const lastExistingSlot = dayBlock.rows.length > 0 
    ? dayBlock.rows[dayBlock.rows.length - 1].slotNumber 
    : 20;

  let extraCount = 0;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    let rowNum: number;
    let slotNum: number;

    if (i < emptySlots.length) {
      // Use existing pre-numbered empty slot
      const targetSlot = emptySlots[i];
      rowNum = targetSlot.rowNumber;
      slotNum = targetSlot.slotNumber;

      // Range 1: Columns B to K (Inputs: Customer, Phone, PaymentMode, Item, Jumlah, Paket, Washer, Dryer, HargaCash, HargaQris)
      // Note: Column A (slot number) and Column L (formula) are preserved
      updateData.push({
        range: `'${safeTab}'!B${rowNum}:K${rowNum}`,
        values: [
          [
            tx.customer || '',
            tx.phoneNumber || '',
            tx.paymentMode || 'CASH',
            tx.item || '',
            tx.jumlah || '',
            tx.paket || '',
            tx.washerCoins || 0,
            tx.dryerCoins || 0,
            tx.hargaCash || 0,
            tx.hargaQris || 0,
          ],
        ],
      });

      // Range 2: Columns M to N (Status, Note)
      updateData.push({
        range: `'${safeTab}'!M${rowNum}:N${rowNum}`,
        values: [[tx.status || 'LUNAS', tx.note || '']],
      });
    } else {
      // User requested: "dont make it only limited to 20 baris make it more its oke"
      // Write beyond 20 rows dynamically!
      extraCount++;
      rowNum = lastExistingRow + extraCount;
      slotNum = lastExistingSlot + extraCount;

      // Range A to N: write slot number in A, formula in L
      updateData.push({
        range: `'${safeTab}'!A${rowNum}:N${rowNum}`,
        values: [
          [
            slotNum,
            tx.customer || '',
            tx.phoneNumber || '',
            tx.paymentMode || 'CASH',
            tx.item || '',
            tx.jumlah || '',
            tx.paket || '',
            tx.washerCoins || 0,
            tx.dryerCoins || 0,
            tx.hargaCash || 0,
            tx.hargaQris || 0,
            `=IF(M${rowNum}="LUNAS",N(J${rowNum})+N(K${rowNum}),0)`,
            tx.status || 'LUNAS',
            tx.note || '',
          ],
        ],
      });
    }

    savedSlots.push(slotNum);
    savedRows.push(rowNum);
  }

  // 2. Execute batch update
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updateData,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal menyimpan transaksi ke Google Sheet (${response.status})`);
  }

  return {
    success: true,
    tabName: dayBlock.tabName,
    savedCount: transactions.length,
    savedSlots,
    savedRows,
  };
}

/**
 * Updates an existing transaction row in the sheet.
 * Preserves Col A (slot number), Col L (BAYAR formula), and Col O (side panel BALANCE COIN).
 */
export async function updateSingleTransaction(
  spreadsheetId: string,
  tabName: string,
  rowNumber: number,
  tx: TransactionInput,
  accessToken: string
): Promise<boolean> {
  const safeTab = tabName.replace(/'/g, "''");
  const updateData = [
    {
      range: `'${safeTab}'!B${rowNumber}:K${rowNumber}`,
      values: [
        [
          tx.customer || '',
          tx.phoneNumber || '',
          tx.paymentMode || 'CASH',
          tx.item || '',
          tx.jumlah || '',
          tx.paket || '',
          tx.washerCoins || 0,
          tx.dryerCoins || 0,
          tx.hargaCash || 0,
          tx.hargaQris || 0,
        ],
      ],
    },
    {
      range: `'${safeTab}'!M${rowNumber}:N${rowNumber}`,
      values: [[tx.status || 'LUNAS', tx.note || '']],
    },
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updateData,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal memperbarui transaksi baris ${rowNumber} (${response.status})`);
  }
  return true;
}

export interface CoinLedgerResult {
  found: boolean;
  ledgerWasher: number;
  ledgerDryer: number;
  monthlyTotalWasher: number;
  monthlyTotalDryer: number;
  rows: { dateStr: string; washer: number; dryer: number; note: string }[];
}

/**
 * Reads the COIN tab in the spreadsheet
 */
export async function readCoinSheet(
  spreadsheetId: string,
  isoDateStr: string,
  accessToken: string
): Promise<CoinLedgerResult> {
  const range = "'COIN'!A1:D60";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueRenderOption=FORMATTED_VALUE`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return { found: false, ledgerWasher: 0, ledgerDryer: 0, monthlyTotalWasher: 0, monthlyTotalDryer: 0, rows: [] };
    }
    const data = await response.json();
    const rows = data.values || [];
    if (rows.length < 2) {
      return { found: true, ledgerWasher: 0, ledgerDryer: 0, monthlyTotalWasher: 0, monthlyTotalDryer: 0, rows: [] };
    }

    const parts = isoDateStr.split('-').map(Number);
    const dayNum = parts[2];
    const dayStr = String(dayNum);
    const dayPadded = String(dayNum).padStart(2, '0');

    let ledgerWasher = 0;
    let ledgerDryer = 0;
    let monthlyTotalWasher = 0;
    let monthlyTotalDryer = 0;
    const parsedRows: { dateStr: string; washer: number; dryer: number; note: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const dateCell = String(r[0] || '').trim();
      const w = parseNum(r[1]);
      const d = parseNum(r[2]);
      const note = String(r[3] || '');

      monthlyTotalWasher += w;
      monthlyTotalDryer += d;
      parsedRows.push({ dateStr: dateCell, washer: w, dryer: d, note });

      // Match selected date in COIN tab
      if (
        dateCell.startsWith(`${dayStr}-`) ||
        dateCell.startsWith(`${dayPadded}-`) ||
        dateCell.startsWith(`${dayStr}/`) ||
        dateCell.startsWith(`${dayPadded}/`) ||
        dateCell === isoDateStr
      ) {
        ledgerWasher += w;
        ledgerDryer += d;
      }
    }

    return {
      found: true,
      ledgerWasher,
      ledgerDryer,
      monthlyTotalWasher,
      monthlyTotalDryer,
      rows: parsedRows,
    };
  } catch (e) {
    console.warn('Could not read COIN sheet:', e);
    return { found: false, ledgerWasher: 0, ledgerDryer: 0, monthlyTotalWasher: 0, monthlyTotalDryer: 0, rows: [] };
  }
}

/**
 * Saves manual opname into the COIN tab
 */
export async function saveCoinOpname(
  spreadsheetId: string,
  isoDateStr: string,
  washer: number,
  dryer: number,
  note: string,
  accessToken: string
): Promise<boolean> {
  const weekInfo = getWeekInfoForDate(isoDateStr);
  const dateStr = `${weekInfo.dayOfMonth}-${weekInfo.monthName.slice(0, 3)}-${weekInfo.year}`;

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'COIN'!A:D:append?valueInputOption=USER_ENTERED`;
  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[dateStr, washer, dryer, note || 'Opname Kasir']],
    }),
  });

  return response.ok;
}

/**
 * Reads customer list from Google Spreadsheet if a tab like PELANGGAN / CUSTOMER exists
 */
export async function readCustomersFromSpreadsheet(
  spreadsheetId: string,
  accessToken: string,
  preferredTabName?: string
): Promise<{
  found: boolean;
  tabMissing?: boolean;
  tabName?: string;
  customers: any[];
  availableTabs?: string[];
  error?: string;
}> {
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) {
      throw new Error(`Gagal membaca metadata spreadsheet: ${metaRes.statusText}`);
    }
    const metaData = await metaRes.json();
    const sheetTitles: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);

    let targetTab = preferredTabName;
    if (!targetTab) {
      const candidates = [
        'PELANGGAN',
        'CUSTOMER',
        'CUSTOMERS',
        'DATA PELANGGAN',
        'DATA CUSTOMER',
        'MEMBER',
        'MEMBERS',
        'DATA MEMBER',
        'KONSUMEN',
        'CLIENT',
        'PELANGGAN TRCN',
        'DAFTAR PELANGGAN',
      ];
      targetTab =
        sheetTitles.find((t) => candidates.includes(t.trim().toUpperCase())) ||
        sheetTitles.find(
          (t) =>
            t.toUpperCase().includes('PELANGGAN') ||
            t.toUpperCase().includes('CUSTOMER') ||
            t.toUpperCase().includes('MEMBER') ||
            t.toUpperCase().includes('KONSUMEN')
        );
    }

    if (!targetTab) {
      return {
        found: false,
        tabMissing: true,
        customers: [],
        availableTabs: sheetTitles,
        error: 'Tab PELANGGAN atau CUSTOMER belum ditemukan di Google Sheet ini.',
      };
    }

    const rangeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      targetTab
    )}'!A1:Z2000?valueRenderOption=FORMATTED_VALUE`;
    const rangeRes = await fetch(rangeUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!rangeRes.ok) {
      throw new Error(`Gagal membaca data tab ${targetTab}`);
    }
    const rangeData = await rangeRes.json();
    const rawRows: any[][] = rangeData.values || [];

    if (rawRows.length === 0) {
      return { found: true, tabName: targetTab, customers: [], availableTabs: sheetTitles };
    }

    let startIdx = 0;
    let colCode = 0;
    let colName = 1;
    let colAddress = 2;
    let colPhone = 3;

    const headerRow = (rawRows[0] || []).map((h) => String(h || '').trim().toUpperCase());
    const hasHeader = headerRow.some(
      (h) =>
        h.includes('KODE') ||
        h.includes('CODE') ||
        h.includes('NAMA') ||
        h.includes('CUSTOMER') ||
        h.includes('PHONE') ||
        h.includes('HP')
    );

    if (hasHeader) {
      startIdx = 1;
      headerRow.forEach((col, idx) => {
        if (col.includes('KODE') || col.includes('CODE') || col.includes('ID')) colCode = idx;
        else if (col.includes('NAMA') || col.includes('CUSTOMER') || col.includes('MEMBER') || col.includes('NAME'))
          colName = idx;
        else if (
          col.includes('ALAMAT') ||
          col.includes('ADDRESS') ||
          col.includes('ADRESS') ||
          col.includes('WILAYAH') ||
          col.includes('KOS')
        )
          colAddress = idx;
        else if (
          col.includes('HP') ||
          col.includes('PHONE') ||
          col.includes('WA') ||
          col.includes('TELEPON') ||
          col.includes('TELP')
        )
          colPhone = idx;
      });
    }

    const customers: any[] = [];
    for (let i = startIdx; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;
      const name = String(row[colName] || '').trim();
      if (!name) continue;

      const code = String(row[colCode] || '').trim();
      const address = String(row[colAddress] || 'UNAI').trim();
      const phone = String(row[colPhone] || '').trim();

      customers.push({
        code: code || `TRCN-${String(i + 1).padStart(3, '0')}`,
        name: name.toUpperCase(),
        address: address || 'UNAI',
        phone: phone || '',
      });
    }

    return { found: true, tabName: targetTab, customers, availableTabs: sheetTitles };
  } catch (err: any) {
    console.error('Error reading customers from spreadsheet:', err);
    return { found: false, customers: [], error: err.message || 'Gagal membaca tab pelanggan' };
  }
}

/**
 * Appends a new customer row to the PELANGGAN / CUSTOMER sheet tab.
 * If tab does not exist, it will auto-create the tab and seed header first!
 */
export async function appendCustomerToSpreadsheet(
  spreadsheetId: string,
  accessToken: string,
  customer: { code: string; name: string; address: string; phone: string },
  targetTabName = 'PELANGGAN'
): Promise<boolean> {
  try {
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      targetTabName
    )}'!A:D:append?valueInputOption=USER_ENTERED`;
    let res = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[customer.code, customer.name, customer.address, customer.phone]],
      }),
    });

    if (!res.ok) {
      // If error is due to missing tab, auto-create tab and retry!
      const errText = await res.text();
      console.warn(`Append customer failed (${res.status}), checking if tab "${targetTabName}" needs creation:`, errText);
      
      const seedRes = await createAndSeedCustomerSheetTab(
        spreadsheetId,
        accessToken,
        [customer],
        targetTabName
      );
      return seedRes.success;
    }

    return res.ok;
  } catch (e) {
    console.warn('Could not append customer to sheet:', e);
    return false;
  }
}

/**
 * Creates a tab named 'PELANGGAN' in the Google Spreadsheet and seeds all customer records
 */
export async function createAndSeedCustomerSheetTab(
  spreadsheetId: string,
  accessToken: string,
  customers: { code: string; name: string; address: string; phone: string }[],
  tabName = 'PELANGGAN'
): Promise<{ success: boolean; tabName: string; seededCount: number; error?: string }> {
  try {
    // 1. Check if tab already exists, if not create it
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) throw new Error(`Gagal akses spreadsheet: ${metaRes.statusText}`);
    const metaData = await metaRes.json();
    const sheetTitles: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);

    if (!sheetTitles.includes(tabName)) {
      // Add sheet
      const addSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      const addRes = await fetch(addSheetUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                },
              },
            },
          ],
        }),
      });
      if (!addRes.ok) {
        const errJson = await addRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'Gagal membuat tab PELANGGAN');
      }
    }

    // 2. Seed header and data
    const values = [
      ['CODE', 'NAME', 'ADRESS', 'NO PHONE'],
      ...customers.map((c) => [c.code, c.name, c.address, c.phone]),
    ];

    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      tabName
    )}'!A1:D${values.length}?valueInputOption=USER_ENTERED`;
    const writeRes = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!writeRes.ok) {
      const errJson = await writeRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Gagal mengisi data pelanggan');
    }

    return { success: true, tabName, seededCount: customers.length };
  } catch (err: any) {
    console.error('Error creating/seeding customer tab:', err);
    return {
      success: false,
      tabName,
      seededCount: 0,
      error: err.message || 'Gagal menyiapkan tab pelanggan di Google Sheet',
    };
  }
}

/**
 * Returns all tab names in the spreadsheet
 */
export async function getSpreadsheetTabNames(
  spreadsheetId: string,
  accessToken: string
): Promise<string[]> {
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return [];
    const metaData = await metaRes.json();
    return (metaData.sheets || []).map((s: any) => s.properties.title);
  } catch (e) {
    return [];
  }
}
