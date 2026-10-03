/**
 * Date and Time utilities for TRCN Laundry Cashier (Asia/Jakarta timezone)
 */

export interface WeekInfo {
  weekNumber: number; // 1, 2, 3, 4
  tabName: string; // e.g. "TRANSAKSI WEEK 1"
  dayOfMonth: number;
  monthName: string;
  year: number;
}

/**
 * Returns today's date in YYYY-MM-DD format based on Asia/Jakarta timezone
 */
export function getTodayJakartaISO(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs YYYY-MM-DD
  } catch (e) {
    // Fallback to local date string
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Determines which transaction week tab a date belongs to:
 * - Days 1..7 -> WEEK 1
 * - Days 8..14 -> WEEK 2
 * - Days 15..21 -> WEEK 3
 * - Days 22..end -> WEEK 4
 */
export function getWeekInfoForDate(isoDateStr: string): WeekInfo {
  const parts = isoDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  let weekNumber = 1;
  if (day >= 1 && day <= 7) {
    weekNumber = 1;
  } else if (day >= 8 && day <= 14) {
    weekNumber = 2;
  } else if (day >= 15 && day <= 21) {
    weekNumber = 3;
  } else {
    weekNumber = 4;
  }

  const monthNamesEn = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  return {
    weekNumber,
    tabName: `TRANSAKSI WEEK ${weekNumber}`,
    dayOfMonth: day,
    monthName: monthNamesEn[month - 1] || 'OCTOBER',
    year,
  };
}

/**
 * Format date for friendly Indonesian display
 * e.g. "Sabtu, 3 Oktober 2026"
 */
export function formatIndonesianDate(isoDateStr: string): string {
  try {
    const [year, month, day] = isoDateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  } catch (e) {
    return isoDateStr;
  }
}

/**
 * Generates month file name according to specification
 * e.g. "KASIR TRCN OCTOBER 2026"
 */
export function getMonthlySpreadsheetName(isoDateStr: string): string {
  const { monthName, year } = getWeekInfoForDate(isoDateStr);
  return `KASIR TRCN ${monthName} ${year}`;
}

/**
 * Checks if a given ISO date is today in Jakarta
 */
export function isJakartaToday(isoDateStr: string): boolean {
  return isoDateStr === getTodayJakartaISO();
}

/**
 * Formats a currency number into Indonesian Rupiah format
 * e.g. 20000 -> "Rp 20.000"
 */
export function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Rp 0';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
}
