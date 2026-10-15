import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  User,
  Calendar,
  Clock,
  Banknote,
  Search,
  Check,
} from 'lucide-react';
import {
  DeletionAuditRecord,
  getDeletionAuditLogs,
  markDeletionLogAsRead,
  markAllDeletionLogsAsRead,
  clearDeletionAuditLogs,
} from '../services/deletionAudit';
import { formatRupiah } from '../utils/dateUtils';
import { isRootSuperAdmin } from '../config/roles';

interface DeletionNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export const DeletionNotificationModal: React.FC<DeletionNotificationModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [logs, setLogs] = useState<DeletionAuditRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CASHIER'>('ALL');
  const [search, setSearch] = useState('');

  const refreshLogs = () => {
    setLogs(getDeletionAuditLogs());
  };

  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
    const handleUpdate = () => refreshLogs();
    window.addEventListener('trcn_deletion_audit_updated', handleUpdate);
    return () => window.removeEventListener('trcn_deletion_audit_updated', handleUpdate);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAsRead = (id: string) => {
    markDeletionLogAsRead(id);
    refreshLogs();
  };

  const handleMarkAllRead = () => {
    markAllDeletionLogsAsRead();
    refreshLogs();
  };

  const handleClearAll = () => {
    if (confirm('Hapus seluruh riwayat audit penghapusan transaksi? (Hanya Super Admin)')) {
      clearDeletionAuditLogs();
      refreshLogs();
    }
  };

  const isSuperAdmin = isRootSuperAdmin(currentUserEmail);

  const filteredLogs = logs.filter((item) => {
    if (filter === 'UNREAD' && item.isReadByAdmin) return false;
    if (filter === 'CASHIER' && item.deletedByRole !== 'cashier') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        item.customer.toLowerCase().includes(q) ||
        item.deletedByName.toLowerCase().includes(q) ||
        item.deletedByEmail.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.paket.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const unreadCount = logs.filter((r) => !r.isReadByAdmin && r.deletedByRole === 'cashier').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <Bell className="w-5 h-5 text-amber-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Notifikasi &amp; Log Hapus Transaksi</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] bg-rose-500/80 text-white font-mono px-2 py-0.5 rounded-full">
                    {unreadCount} Baru dari Kasir
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300">
                Pemberitahuan audit transaksi yang dihapus oleh staf kasir maupun admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua ({logs.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                filter === 'UNREAD'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Belum Dibaca</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('CASHIER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                filter === 'CASHIER'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Oleh Kasir ({logs.filter((l) => l.deletedByRole === 'cashier').length})
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-2.5 py-1.5 text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
            {isSuperAdmin && logs.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2 py-1.5 text-slate-400 hover:text-rose-600 font-medium transition cursor-pointer"
                title="Hapus riwayat audit"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pelanggan, staf kasir, atau alasan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white"
            />
          </div>
        </div>

        {/* List of Deletion Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="font-semibold text-slate-600 text-sm">Tidak Ada Transaksi yang Dihapus</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {filter === 'UNREAD'
                  ? 'Semua notifikasi penghapusan telah dibaca.'
                  : 'Belum ada riwayat transaksi yang dihapus oleh staf kasir maupun admin.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((item) => {
              const isCashier = item.deletedByRole === 'cashier';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !item.isReadByAdmin && isCashier
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-300/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCashier ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            Slot #{item.slotNumber} - {item.customer}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                              isCashier
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isCashier ? 'Dihapus oleh Kasir' : 'Dihapus oleh Admin'}
                          </span>
                          {!item.isReadByAdmin && isCashier && (
                            <span className="w-2 h-2 rounded-full bg-rose-500" title="Belum dibaca" />
                          )}
                        </div>

                        {/* Sub detail: date & time */}
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.formattedTime}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {item.deletedByName} ({item.deletedByEmail})
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">{item.tabName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: nominal amount */}
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-sm text-slate-900">
                        {formatRupiah(item.totalBayar)}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        {item.paymentMode}
                      </span>
                    </div>
                  </div>

                  {/* Transaction content snapshot */}
                  <div className="mt-2.5 p-2 bg-slate-50 rounded-lg text-xs grid grid-cols-2 gap-2 border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paket:</span>
                      <span className="font-medium text-slate-700">{item.paket}</span>
                    </div>
                    {item.item && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Item:</span>
                        <span className="font-medium text-slate-700">{item.item}</span>
                      </div>
                    )}
                  </div>

                  {/* Deletion Reason (Mandatory for Kasir) */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-start justify-between gap-2">
                    <div className="text-xs">
                      <span className="font-bold text-amber-900 text-[11px]">Alasan Penghapusan: </span>
                      <span className="font-semibold text-slate-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                        "{item.reason}"
                      </span>
                    </div>

                    {!item.isReadByAdmin && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Total {logs.length} catatan audit penghapusan transaksi
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
