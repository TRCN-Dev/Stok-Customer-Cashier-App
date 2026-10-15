/**
 * Audit & Notification Service for Transaction Deletions
 * Tracks any transaction deleted by Cashier or Admin and alerts Owner & Admin
 */

import { formatIndonesianDate } from '../utils/dateUtils';

export interface DeletionAuditRecord {
  id: string;
  timestamp: string; // ISO string
  formattedTime: string; // e.g. 14 Okt 2026, 19:45 WIB
  deletedByEmail: string;
  deletedByName: string;
  deletedByRole: 'cashier' | 'admin' | 'owner';
  targetDate: string; // YYYY-MM-DD
  tabName: string;
  rowNumber: number;
  slotNumber: number;
  customer: string;
  phoneNumber?: string;
  paket: string;
  item?: string;
  totalBayar: number;
  paymentMode: string;
  reason: string;
  isReadByAdmin: boolean;
  notifiedAt: string;
}

const STORAGE_KEY = 'trcn_deletion_audit_log';

/**
 * Returns all deletion audit records sorted newest first
 */
export function getDeletionAuditLogs(): DeletionAuditRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    }
  } catch (e) {
    console.error('Failed to parse deletion audit logs:', e);
  }
  return [];
}

/**
 * Saves deletion audit records to localStorage and notifies listeners
 */
export function saveDeletionAuditLogs(records: DeletionAuditRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trcn_deletion_audit_updated', { detail: records }));
    }
  } catch (e) {
    console.error('Failed to save deletion audit logs:', e);
  }
}

/**
 * Records a deletion event and dispatches notification
 */
export function addDeletionAuditLog(data: {
  deletedByEmail: string;
  deletedByName?: string;
  deletedByRole: 'cashier' | 'admin' | 'owner';
  targetDate: string;
  tabName: string;
  rowNumber: number;
  slotNumber: number;
  customer: string;
  phoneNumber?: string;
  paket: string;
  item?: string;
  totalBayar: number;
  paymentMode: string;
  reason: string;
}): DeletionAuditRecord {
  const current = getDeletionAuditLogs();
  const now = new Date();
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const dateFormatted = formatIndonesianDate(now.toISOString().split('T')[0]);
  const formattedTime = `${dateFormatted}, ${hours}:${minutes} WIB`;

  const newRecord: DeletionAuditRecord = {
    id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    formattedTime,
    deletedByEmail: data.deletedByEmail || 'kasir@trcn.com',
    deletedByName: data.deletedByName || (data.deletedByEmail ? data.deletedByEmail.split('@')[0] : 'Kasir'),
    deletedByRole: data.deletedByRole,
    targetDate: data.targetDate,
    tabName: data.tabName,
    rowNumber: data.rowNumber,
    slotNumber: data.slotNumber,
    customer: data.customer || 'Tanpa Nama',
    phoneNumber: data.phoneNumber || '',
    paket: data.paket || '-',
    item: data.item || '',
    totalBayar: data.totalBayar || 0,
    paymentMode: data.paymentMode || 'CASH',
    reason: data.reason.trim() || 'Dihapus oleh staf kasir',
    isReadByAdmin: false,
    notifiedAt: now.toISOString(),
  };

  const updated = [newRecord, ...current];
  saveDeletionAuditLogs(updated);
  return newRecord;
}

/**
 * Returns count of unread deletions for admin / owner
 */
export function getUnreadDeletionCount(): number {
  const list = getDeletionAuditLogs();
  return list.filter((r) => !r.isReadByAdmin && r.deletedByRole === 'cashier').length;
}

/**
 * Mark a specific deletion record as read
 */
export function markDeletionLogAsRead(id: string): void {
  const current = getDeletionAuditLogs();
  const updated = current.map((r) => (r.id === id ? { ...r, isReadByAdmin: true } : r));
  saveDeletionAuditLogs(updated);
}

/**
 * Mark all deletion records as read
 */
export function markAllDeletionLogsAsRead(): void {
  const current = getDeletionAuditLogs();
  const updated = current.map((r) => ({ ...r, isReadByAdmin: true }));
  saveDeletionAuditLogs(updated);
}

/**
 * Delete / purge audit history (Super Admin only)
 */
export function clearDeletionAuditLogs(): void {
  saveDeletionAuditLogs([]);
}
