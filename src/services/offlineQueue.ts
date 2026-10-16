/**
 * Offline Transaction Queue & Auto-Sync Service
 * Allows cashier to add transactions while offline and sync when online
 */

import { TransactionInput, saveBatchTransactions, SaveBatchResult } from './sheetsApi';
import { getWeekInfoForDate } from '../utils/dateUtils';

export interface OfflineQueueItem {
  id: string;
  createdAt: string;
  isoDateStr: string;
  targetWeekTab: string;
  transactions: TransactionInput[];
}

const STORAGE_KEY = 'trcn_offline_tx_queue';

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse offline queue:', e);
  }
  return [];
}

export function saveOfflineQueue(items: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trcn_offline_queue_updated', { detail: items }));
    }
  } catch (e) {
    console.error('Failed to save offline queue:', e);
  }
}

export function addToOfflineQueue(
  isoDateStr: string,
  targetWeekTab: string,
  transactions: TransactionInput[]
): OfflineQueueItem {
  const current = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    isoDateStr,
    targetWeekTab,
    transactions,
  };
  const updated = [...current, newItem];
  saveOfflineQueue(updated);
  return newItem;
}

export function getOfflineQueueCount(): number {
  const queue = getOfflineQueue();
  return queue.reduce((sum, item) => sum + item.transactions.length, 0);
}

export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

/**
 * Attempts to sync all queued offline transactions to Google Sheets
 */
export async function syncOfflineQueue(
  spreadsheetId: string,
  accessToken: string
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, errors: [] };
  }

  const remaining: OfflineQueueItem[] = [];
  const errors: string[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      const weekInfo = getWeekInfoForDate(item.isoDateStr);
      await saveBatchTransactions(
        spreadsheetId,
        item.targetWeekTab || weekInfo.tabName,
        item.isoDateStr,
        item.transactions,
        accessToken
      );
      syncedCount += item.transactions.length;
    } catch (err: any) {
      errors.push(`Gagal sinkron batch tanggal ${item.isoDateStr}: ${err.message}`);
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  return {
    success: remaining.length === 0,
    syncedCount,
    errors,
  };
}
