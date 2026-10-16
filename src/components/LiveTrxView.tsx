import React, { useState } from 'react';
import {
  Activity,
  Coins,
  CheckCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle,
  CreditCard,
  Banknote,
  Sparkles,
  Info,
  Phone,
  Layers,
  HelpCircle,
  Plus,
  Pencil,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import { DayBlockResult, SheetTransactionRow, TransactionInput } from '../services/sheetsApi';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';
import { EditTransactionModal } from './EditTransactionModal';
import { ReceiptModal } from './ReceiptModal';

interface LiveTrxViewProps {
  selectedDate: string;
  dayBlock: DayBlockResult | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenSheetSelector: () => void;
  onGoToBatch?: () => void;
  onUpdateTransaction?: (rowNumber: number, data: TransactionInput) => Promise<void>;
  onMoveTransaction?: (
    sourceRowNumber: number,
    sourceTrx: SheetTransactionRow,
    targetDateStr: string,
    updatedData: TransactionInput,
    reason: string
  ) => Promise<void>;
  onDeleteTransaction?: (rowNumber: number, trx: SheetTransactionRow, reason: string) => Promise<void>;
  isUpdating?: boolean;
  spreadsheetName: string | null;
}

export const LiveTrxView: React.FC<LiveTrxViewProps> = ({
  selectedDate,
  dayBlock,
  isLoading,
  error,
  onRefresh,
  onOpenSheetSelector,
  onGoToBatch,
  onUpdateTransaction,
  onMoveTransaction,
  onDeleteTransaction,
  isUpdating = false,
  spreadsheetName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LUNAS' | 'TIDAK LUNAS'>('ALL');
  const [showRawInspector, setShowRawInspector] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<SheetTransactionRow | null>(null);
  const [receiptTransaction, setReceiptTransaction] = useState<SheetTransactionRow | null>(null);

  // Deletion modal state for cashier / admin
  const [deletingTrx, setDeletingTrx] = useState<SheetTransactionRow | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingTrx, setIsDeletingTrx] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter filled transactions
  const filledRows = (dayBlock?.rows || []).filter((r) => !r.isEmpty);

  // RULE (Issue #4): Pending transactions are NOT included in total transactions or money until paid!
  const paidRows = filledRows.filter(
    (r) => r.status?.toUpperCase() === 'LUNAS' || (r.bayar !== undefined && r.bayar > 0)
  );
  const pendingRows = filledRows.filter((r) => !paidRows.includes(r));

  // Live aggregated totals directly from paid rows (guarantees immediate update and pending is excluded until paid!)
  const liveTotalCash = paidRows.reduce((sum, r) => sum + (r.hargaCash || 0), 0);
  const liveTotalQris = paidRows.reduce((sum, r) => sum + (r.hargaQris || 0), 0);
  const liveTotalWasher = filledRows.reduce((sum, r) => sum + (r.washerCoins || 0), 0);
  const liveTotalDryer = filledRows.reduce((sum, r) => sum + (r.dryerCoins || 0), 0);
  const liveTotalBayar = paidRows.reduce((sum, r) => {
    if (r.bayar && r.bayar > 0) return sum + r.bayar;
    return sum + (r.hargaCash || 0) + (r.hargaQris || 0);
  }, 0);

  const displayTotalCash = Math.max(dayBlock?.headerRow?.totalCash || 0, liveTotalCash);
  const displayTotalQris = Math.max(dayBlock?.headerRow?.totalQris || 0, liveTotalQris);
  const displayTotalBayar = Math.max(dayBlock?.headerRow?.totalTxBayar || 0, liveTotalBayar);
  const displayTotalWasher = Math.max(dayBlock?.headerRow?.totalWasher || 0, liveTotalWasher);
  const displayTotalDryer = Math.max(dayBlock?.headerRow?.totalDryer || 0, liveTotalDryer);
  // Total transaction count only counts PAID transactions per Issue #4
  const displayTxCount = paidRows.length;

  const handleConfirmDelete = async () => {
    if (!deletingTrx || !deleteReason.trim()) {
      setDeleteError('Alasan penghapusan wajib diisi!');
      return;
    }
    if (!onDeleteTransaction) return;
    setIsDeletingTrx(true);
    setDeleteError(null);
    try {
      await onDeleteTransaction(deletingTrx.rowNumber, deletingTrx, deleteReason.trim());
      setDeletingTrx(null);
      setDeleteReason('');
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus transaksi.');
    } finally {
      setIsDeletingTrx(false);
    }
  };

  const filteredRows = filledRows.filter((row) => {
    const matchesSearch =
      !searchQuery ||
      row.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.phoneNumber.includes(searchQuery) ||
      row.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.paket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.note.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'LUNAS' && row.status.toUpperCase() === 'LUNAS') ||
      (statusFilter === 'TIDAK LUNAS' && row.status.toUpperCase() !== 'LUNAS');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3">
      {/* If No Spreadsheet connected */}
      {!spreadsheetName && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
          <FileSpreadsheet className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="font-bold text-amber-900 text-sm">Belum Ada Spreadsheet Terhubung</h3>
          <p className="text-xs text-amber-800 max-w-sm mx-auto">
            Hubungkan file Google Sheet kasir bulanan Anda (misal: <code>KASIR TRCN OCTOBER 2026</code>) untuk mulai membaca transaksi.
          </p>
          <button
            onClick={onOpenSheetSelector}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition"
          >
            Pilih Google Sheet Sekarang
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-900">Gagal Membaca Data dari Sheet</p>
            <p className="mt-0.5">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-2 text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Coba Muat Ulang
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 py-6 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-medium text-slate-600">
            Membaca Day Block tanggal {formatIndonesianDate(selectedDate)} dari Google Sheets...
          </div>
        </div>
      )}

      {/* Loaded Content */}
      {!isLoading && dayBlock && (
        <>
          {/* Day Block Summary Cards (Sums from Day Header row) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Total Bayar */}
            <div className="col-span-2 bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-blue-200 text-xs font-medium mb-1">
                <span>TOTAL TRANSAKSI HARI INI</span>
                <span className="text-[11px] bg-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                  {displayTxCount} Lunas{pendingRows.length > 0 ? ` (+${pendingRows.length} Pending)` : ''}
                </span>
              </div>
              <div className="text-2xl font-black tracking-tight">
                {formatRupiah(displayTotalBayar)}
              </div>
              <div className="text-[11px] text-blue-200 mt-1 flex items-center gap-2">
                <span>Cash: {formatRupiah(displayTotalCash)}</span>
                <span>•</span>
                <span>QRIS: {formatRupiah(displayTotalQris)}</span>
              </div>
            </div>

            {/* Washer Coins */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 font-bold shrink-0">
                W
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-600 uppercase">Koin Washer</div>
                <div className="text-lg font-black text-slate-800">
                  {displayTotalWasher}{' '}
                  <span className="text-xs font-normal text-slate-500">koin</span>
                </div>
              </div>
            </div>

            {/* Dryer Coins */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                D
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-600 uppercase">Koin Dryer</div>
                <div className="text-lg font-black text-slate-800">
                  {displayTotalDryer}{' '}
                  <span className="text-xs font-normal text-slate-500">koin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari customer, paket, atau item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white"
              />
            </div>

            {/* Status Tabs & Action */}
            <div className="flex items-center space-x-2">
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({filledRows.length})
                </button>
                <button
                  onClick={() => setStatusFilter('LUNAS')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === 'LUNAS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Lunas
                </button>
                <button
                  onClick={() => setStatusFilter('TIDAK LUNAS')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === 'TIDAK LUNAS' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-800'
                  }`}
                >
                  Pending
                </button>
              </div>

              {onGoToBatch && (
                <button
                  onClick={onGoToBatch}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Input</span> Transaksi
                </button>
              )}
            </div>
          </div>

          {/* Transaction Cards List */}
          {filteredRows.length > 0 ? (
            <div className="space-y-2">
              {filteredRows.map((trx) => {
                const isLunas = trx.status.toUpperCase() === 'LUNAS';

                return (
                  <div
                    key={trx.rowNumber}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-2"
                  >
                    {/* Top Row: Slot #, Customer, Status, Bayar */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {trx.slotNumber}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <span>{trx.customer || 'Tanpa Nama'}</span>
                            {trx.paymentMode && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  trx.paymentMode === 'QRIS'
                                    ? 'bg-blue-100 text-blue-700'
                                    : trx.paymentMode === 'CASH'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {trx.paymentMode}
                              </span>
                            )}
                          </div>
                          {trx.phoneNumber && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{trx.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Bayar & Status Badge */}
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-slate-900">
                          {formatRupiah(trx.bayar || trx.hargaCash + trx.hargaQris)}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isLunas
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50'
                              : 'bg-amber-100 text-amber-800 border border-amber-300/50'
                          }`}
                        >
                          {trx.status || 'BELUM LUNAS'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Paket, Item & Jumlah */}
                    <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-600 uppercase block">Paket:</span>
                        <span className="font-medium text-slate-800">{trx.paket || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-600 uppercase block">Item Tambahan:</span>
                        <span className="font-medium text-slate-800">
                          {trx.item ? `${trx.item} (${trx.jumlah || '1'})` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Coins & Split breakdown + Note */}
                    <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-1.5 border-t border-slate-100">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-semibold border border-cyan-200/50">
                          Washer: <b>{trx.washerCoins}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-semibold border border-orange-200/50">
                          Dryer: <b>{trx.dryerCoins}</b>
                        </span>
                        {trx.hargaCash > 0 && trx.hargaQris > 0 && (
                          <span className="text-slate-600">
                            Cash {formatRupiah(trx.hargaCash)} + QRIS {formatRupiah(trx.hargaQris)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {trx.note && (
                          <div className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Note: {trx.note}
                          </div>
                        )}
                        {/* Print / View Receipt Button */}
                        <button
                          type="button"
                          onClick={() => setReceiptTransaction(trx)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition-all transform active:scale-95 active:brightness-95 hover:shadow-xs cursor-pointer select-none"
                          title="Cetak & Download Struk"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Struk</span>
                        </button>
                        {onUpdateTransaction && (
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(trx)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-all transform active:scale-95 active:brightness-95 hover:shadow-xs cursor-pointer select-none"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        {onDeleteTransaction && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingTrx(trx);
                              setDeleteReason('');
                              setDeleteError(null);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-all transform active:scale-95 active:brightness-95 hover:shadow-xs cursor-pointer select-none"
                            title="Hapus Transaksi (Dengan Alasan Kasir)"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
              <Activity className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">
                {filledRows.length === 0
                  ? `Belum Ada Transaksi pada ${formatIndonesianDate(selectedDate)}`
                  : 'Tidak ada transaksi yang cocok dengan pencarian.'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {filledRows.length === 0
                  ? 'Belum ada transaksi yang dicatat untuk tanggal ini.'
                  : 'Ubah kata kunci pencarian atau filter status untuk melihat transaksi lainnya.'}
              </p>
              {filledRows.length === 0 && onGoToBatch && (
                <div className="pt-2">
                  <button
                    onClick={onGoToBatch}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Input Transaksi Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Verification Drawer: Raw Sheet Row Inspector */}
          <div className="pt-2">
            <button
              onClick={() => setShowRawInspector(!showRawInspector)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Inspeksi Baris Sheet (Verifikasi Tahap 1: Read-Only & Formula)</span>
              </div>
              {showRawInspector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawInspector && (
              <div className="mt-2 bg-slate-900 text-slate-200 rounded-xl p-3 text-xs font-mono overflow-x-auto space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5 text-[11px]">
                  <span>Target Tab: <b className="text-emerald-400">{dayBlock.tabName}</b></span>
                  <span>Header Baris Sheet: <b className="text-blue-400">Row {dayBlock.headerRow?.rowNumber}</b></span>
                  <span>Baris Kosong Pertama: <b className="text-amber-400">{dayBlock.firstEmptyRow ? `Row ${dayBlock.firstEmptyRow}` : 'Penuh'}</b></span>
                </div>

                <div className="text-[11px] text-slate-300 space-y-1">
                  <div className="text-slate-400 font-sans">
                    ✓ <b>Proteksi Formula:</b> Kolom L (BAYAR) dibaca langsung dari formula sheet <code>=IF(M="LUNAS", N(J)+N(K), 0)</code>.
                  </div>
                  <div className="text-slate-400 font-sans">
                    ✓ <b>Proteksi Kolom O:</b> Panel side <code>BALANCE COIN</code> di kolom O tidak dimodifikasi.
                  </div>
                </div>

                {/* Table representation */}
                <div className="overflow-x-auto max-h-64 mt-2">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300">
                        <th className="p-1 border border-slate-700">Row</th>
                        <th className="p-1 border border-slate-700">No</th>
                        <th className="p-1 border border-slate-700">B (Cust)</th>
                        <th className="p-1 border border-slate-700">D (Mode)</th>
                        <th className="p-1 border border-slate-700">G (Paket)</th>
                        <th className="p-1 border border-slate-700">H (W)</th>
                        <th className="p-1 border border-slate-700">I (D)</th>
                        <th className="p-1 border border-slate-700">L (Bayar)</th>
                        <th className="p-1 border border-slate-700">M (Status)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayBlock.rows.map((r) => (
                        <tr
                          key={r.rowNumber}
                          className={r.isEmpty ? 'text-slate-500' : 'text-slate-200 bg-slate-800/40'}
                        >
                          <td className="p-1 border border-slate-800 font-bold text-amber-400">{r.rowNumber}</td>
                          <td className="p-1 border border-slate-800">{r.slotNumber}</td>
                          <td className="p-1 border border-slate-800 truncate max-w-[100px]">{r.customer || '-'}</td>
                          <td className="p-1 border border-slate-800">{r.paymentMode || '-'}</td>
                          <td className="p-1 border border-slate-800 truncate max-w-[90px]">{r.paket || '-'}</td>
                          <td className="p-1 border border-slate-800">{r.washerCoins}</td>
                          <td className="p-1 border border-slate-800">{r.dryerCoins}</td>
                          <td className="p-1 border border-slate-800 text-emerald-400 font-bold">{r.bayar}</td>
                          <td className="p-1 border border-slate-800">{r.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Edit Transaction Modal */}
          <EditTransactionModal
            isOpen={Boolean(editingTransaction)}
            onClose={() => setEditingTransaction(null)}
            transaction={editingTransaction}
            targetTabName={dayBlock.tabName}
            selectedDate={selectedDate}
            onSaveEdit={async (rowNum, data) => {
              if (onUpdateTransaction) {
                await onUpdateTransaction(rowNum, data);
              }
            }}
            onMoveTransaction={onMoveTransaction}
            onDeleteTransaction={onDeleteTransaction}
            isSaving={isUpdating}
          />

          {/* Customer Receipt Modal */}
          <ReceiptModal
            isOpen={Boolean(receiptTransaction)}
            onClose={() => setReceiptTransaction(null)}
            transaction={receiptTransaction}
            selectedDate={selectedDate}
          />

          {/* Delete Transaction Modal for Cashier / Admin (Issue #3) */}
          {deletingTrx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm sm:text-base">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <span>Hapus Transaksi #{deletingTrx.slotNumber}</span>
                  </div>
                  <button
                    onClick={() => {
                      setDeletingTrx(null);
                      setDeleteReason('');
                      setDeleteError(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pelanggan:</span>
                    <span className="font-bold text-slate-800">{deletingTrx.customer || 'Tanpa Nama'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paket Layanan:</span>
                    <span className="font-semibold text-slate-800">{deletingTrx.paket || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Transaksi:</span>
                    <span className="font-black text-rose-600">
                      {formatRupiah(deletingTrx.bayar || deletingTrx.hargaCash + deletingTrx.hargaQris)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <b>Pemberitahuan Kasir:</b> Setiap penghapusan transaksi akan otomatis dicatat dalam log audit dan mengirimkan notifikasi ke Owner &amp; Admin.
                  </span>
                </div>

                {deleteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                    {deleteError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Alasan Penghapusan (Wajib diisi):
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Contoh: Customer batal mencuci / salah input transaksi..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingTrx(null);
                      setDeleteReason('');
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingTrx || !deleteReason.trim()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                  >
                    {isDeletingTrx ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <span>Konfirmasi Hapus</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
