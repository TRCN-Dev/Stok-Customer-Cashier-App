/**
 * Google Sheet Template Generator for TRCN Laundry
 * Creates complete monthly spreadsheets (KASIR TRCN <MONTH> <YEAR>) and TRCN STOK
 * with exact day blocks, 20 numbered rows per day, formulas, and coin tab.
 */

import { SpreadsheetInfo } from './sheetsApi';

interface DayBlockDefinition {
  dayNumber: number;
  dateStr: string; // e.g. "1-Oct-2026"
}

/**
 * Returns number of days in a given month and year
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Formats date into standard sheet format e.g. "1-Oct-2026"
 */
export function formatSheetDateString(year: number, monthIndex: number, day: number): string {
  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${monthShorts[monthIndex]}-${year}`;
}

/**
 * Generates the full 2D values array for a TRANSAKSI WEEK tab
 */
function buildWeekTabValues(
  weekNumber: number,
  startDay: number,
  endDay: number,
  monthIndex: number,
  year: number
): (string | number)[][] {
  const values: (string | number)[][] = [];

  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthShorts[monthIndex];

  // Row 1: Title
  values.push([
    `TRCN LAUNDRY - TRANSAKSI MINGGU ${weekNumber} (${monthName.toUpperCase()} ${year})`,
    '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ]);

  // Row 2: Price Reference & Weekly Summary
  values.push([
    'HARGA: CUCI+KERING 20K | CUCI 10K | KERING 15K',
    '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ]);

  // Row 3 (1-indexed row 3): Headers A..O
  values.push([
    'NO',
    'CUSTOMER',
    'PHONE NUMBER',
    'QRIS / CASH',
    'ITEM',
    'JUMLAH',
    'PAKET',
    'WASHER',
    'DRYER',
    'HARGA CASH',
    'HARGA QRIS',
    'BAYAR',
    'STATUS',
    'NOTE',
    'BALANCE COIN'
  ]);

  // Starting sheet row for first day block header is row 4 (1-indexed)
  let currentSheetRow = 4;

  for (let day = startDay; day <= endDay; day++) {
    const headerRowNum = currentSheetRow;
    const itemStartRow = headerRowNum + 1;
    const itemEndRow = headerRowNum + 20;
    const dateStr = `${day}-${monthName}-${year}`;

    // Header Row of the Day Block (1 row)
    // Col A: empty
    // Col B: Date
    // Col H (Washer sum): =SUM(H{start}:H{end})
    // Col I (Dryer sum): =SUM(I{start}:I{end})
    // Col J (Cash sum): =SUM(J{start}:J{end})
    // Col K (QRIS sum): =SUM(K{start}:K{end})
    // Col M: "TOTAL TX"
    // Col N (Total bayar): =SUM(L{start}:L{end})
    // Col O: "BALANCE COIN"
    values.push([
      '',
      dateStr,
      '',
      '',
      '',
      '',
      '',
      `=SUM(H${itemStartRow}:H${itemEndRow})`,
      `=SUM(I${itemStartRow}:I${itemEndRow})`,
      `=SUM(J${itemStartRow}:J${itemEndRow})`,
      `=SUM(K${itemStartRow}:K${itemEndRow})`,
      '',
      'TOTAL TX',
      `=SUM(L${itemStartRow}:L${itemEndRow})`,
      'BALANCE COIN'
    ]);
    currentSheetRow++;

    // 20 Numbered Rows
    for (let slot = 1; slot <= 20; slot++) {
      const slotRowNum = currentSheetRow;
      // Formula for Col L (BAYAR): =IF(M{row}="LUNAS",N(J{row})+N(K{row}),0)
      values.push([
        slot,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `=IF(M${slotRowNum}="LUNAS",N(J${slotRowNum})+N(K${slotRowNum}),0)`,
        '',
        '',
        ''
      ]);
      currentSheetRow++;
    }

    // 1 Blank Row separator
    values.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    currentSheetRow++;
  }

  return values;
}

/**
 * Creates a brand new monthly spreadsheet in Google Drive
 * e.g. "KASIR TRCN OCTOBER 2026"
 */
export async function createMonthlySpreadsheet(
  monthIndex: number, // 0-indexed (9 = October)
  year: number,
  accessToken: string
): Promise<SpreadsheetInfo> {
  const monthNamesEn = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const monthName = monthNamesEn[monthIndex] || 'OCTOBER';
  const spreadsheetTitle = `KASIR TRCN ${monthName} ${year}`;

  const daysInMonth = getDaysInMonth(year, monthIndex);

  // 1. Create Spreadsheet with exact tabs
  const createPayload = {
    properties: {
      title: spreadsheetTitle,
    },
    sheets: [
      { properties: { title: 'TRANSAKSI WEEK 1', gridProperties: { rowCount: 180, columnCount: 16 } } },
      { properties: { title: 'TRANSAKSI WEEK 2', gridProperties: { rowCount: 180, columnCount: 16 } } },
      { properties: { title: 'TRANSAKSI WEEK 3', gridProperties: { rowCount: 180, columnCount: 16 } } },
      { properties: { title: 'TRANSAKSI WEEK 4', gridProperties: { rowCount: 260, columnCount: 16 } } },
      { properties: { title: 'COIN', gridProperties: { rowCount: 50, columnCount: 10 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membuat spreadsheet baru (${createRes.status})`);
  }

  const newSheetData = await createRes.json();
  const spreadsheetId = newSheetData.spreadsheetId;

  // 2. Prepare Tab values
  // Week 1: 1..7
  const week1Values = buildWeekTabValues(1, 1, 7, monthIndex, year);
  // Week 2: 8..14
  const week2Values = buildWeekTabValues(2, 8, 14, monthIndex, year);
  // Week 3: 15..21
  const week3Values = buildWeekTabValues(3, 15, 21, monthIndex, year);
  // Week 4: 22..end of month
  const week4Values = buildWeekTabValues(4, 22, daysInMonth, monthIndex, year);

  // COIN tab values
  const coinValues: (string | number)[][] = [
    ['TANGGAL', 'WASHER', 'DRYER', 'NOTE']
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    coinValues.push([`${d}-${monthName.slice(0, 3)}-${year}`, '', '', '']);
  }

  // 3. Batch Update values into all sheets
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: "'TRANSAKSI WEEK 1'!A1:O" + week1Values.length, values: week1Values },
      { range: "'TRANSAKSI WEEK 2'!A1:O" + week2Values.length, values: week2Values },
      { range: "'TRANSAKSI WEEK 3'!A1:O" + week3Values.length, values: week3Values },
      { range: "'TRANSAKSI WEEK 4'!A1:O" + week4Values.length, values: week4Values },
      { range: "'COIN'!A1:D" + coinValues.length, values: coinValues },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    console.warn('Batch update values warning:', err);
  }

  return {
    id: spreadsheetId,
    name: spreadsheetTitle,
    tabs: ['TRANSAKSI WEEK 1', 'TRANSAKSI WEEK 2', 'TRANSAKSI WEEK 3', 'TRANSAKSI WEEK 4', 'COIN'],
  };
}

/**
 * Creates the TRCN STOK spreadsheet with ITEMS and RESTOCK tabs
 */
export async function createStockSpreadsheet(accessToken: string): Promise<SpreadsheetInfo> {
  const spreadsheetTitle = 'TRCN STOK';

  const createPayload = {
    properties: {
      title: spreadsheetTitle,
    },
    sheets: [
      { properties: { title: 'ITEMS', gridProperties: { rowCount: 100, columnCount: 10 } } },
      { properties: { title: 'RESTOCK', gridProperties: { rowCount: 200, columnCount: 10 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membuat spreadsheet stok (${createRes.status})`);
  }

  const newSheetData = await createRes.json();
  const spreadsheetId = newSheetData.spreadsheetId;

  // Initial seed data from prompt
  const itemsValues = [
    ['ITEM', 'HARGA', 'STOK AWAL'],
    ['SOKLIN LIQUID 1K', 1000, 180],
    ['DOWNY 1K', 1000, 150],
    ['DETERJEN TRI 2K', 2000, 50],
    ['PLASTIK 2K', 2000, 50],
    ['PLASTIK 3K', 3000, 50],
  ];

  const restockValues = [
    ['TANGGAL', 'ITEM', 'QTY', 'NOTE']
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'ITEMS'!A1:C" + itemsValues.length, values: itemsValues },
          { range: "'RESTOCK'!A1:D" + restockValues.length, values: restockValues },
        ],
      }),
    }
  );

  return {
    id: spreadsheetId,
    name: spreadsheetTitle,
    tabs: ['ITEMS', 'RESTOCK'],
  };
}
